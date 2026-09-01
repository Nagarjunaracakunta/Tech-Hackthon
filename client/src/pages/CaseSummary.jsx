import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import RiskScore from "../components/RiskScore.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Icon from "../components/Icon.jsx";

const SUMMARY_CLAMP = 190;

function AiSummary({ text }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > SUMMARY_CLAMP;
  const shown = expanded || !isLong ? text : text.slice(0, SUMMARY_CLAMP).trimEnd() + "…";
  return (
    <>
      <p className="summary-text">{shown}</p>
      {isLong && (
        <button type="button" className="read-more-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

const DOC_LABELS = {
  identity: "Identity",
  credit_history: "Credit History",
  vehicle_doc: "Vehicle Registration",
  vehicle_photo: "Vehicle Photo",
  incident_photo: "Incident Photo",
};
const DOC_ICONS = {
  identity: "identity",
  credit_history: "credit",
  vehicle_doc: "vehicleDoc",
  vehicle_photo: "camera",
  incident_photo: "camera",
};
const REQUIRED_DOC_ORDER = ["identity", "credit_history", "vehicle_doc", "vehicle_photo"];

function impactLevel(contribution) {
  const abs = Math.abs(contribution);
  if (abs >= 8) return "high";
  if (abs >= 3) return "medium";
  return "low";
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CaseSummary() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCase(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page"><ErrorState message={error} /></div>;
  if (!data) return <div className="page"><LoadingState label="Loading case…" /></div>;

  const documentsByType = Object.fromEntries((data.documents || []).map((d) => [d.doc_type, d]));
  const extraDocs = (data.documents || []).filter((d) => !REQUIRED_DOC_ORDER.includes(d.doc_type));
  const statusForBadge = data.decision || data.status;

  return (
    <div className="page">
      <Link to="/queue" className="back-link">← Back to Queue</Link>

      <div className="case-header">
        <div>
          <div className="case-heading">
            <h1 className="mono">Case {data.id}</h1>
            <StatusBadge status={statusForBadge} />
          </div>
          <div className="case-meta">
            <span className="meta-item"><Icon name="applicant" size={14} />{data.applicant_name}</span>
            <span className="sep">·</span>
            <span className="meta-item"><Icon name="vehicle" size={14} />{data.vehicle_desc}</span>
            <span className="sep">·</span>
            <span className="meta-item">
              <Icon name="dollar" size={14} />
              {data.vehicle_value != null ? `$${data.vehicle_value.toLocaleString()}` : "—"}
            </span>
          </div>
        </div>
        <div className="submitted">
          Submitted
          <div className="submitted-date">{formatDateTime(data.created_at) || "—"}</div>
        </div>
      </div>

      {data.risk_score == null ? (
        <div className="card card-pad">
          <EmptyState title="Not scored yet" description="Finish document upload to request a decision." />
        </div>
      ) : (
        <>
          <div className="card risk-panel">
            <RiskScore score={data.risk_score} band={data.risk_band} />
            <div className="risk-panel-body">
              <div className="eyebrow">AI Assessment</div>
              <div className="risk-panel-decision">
                <StatusBadge status={data.decision} />
                {data.image_match != null && (
                  <span className="page-subtitle" style={{ margin: 0 }}>
                    {data.image_match}% vehicle-photo match
                  </span>
                )}
              </div>
              <p className="risk-panel-reason">{data.decision_reason}</p>
              {data.outlier_flags?.length > 0 && (
                <div className="risk-panel-flags">
                  {data.outlier_flags.map((f) => (
                    <span key={f} className="flag-chip">{f.replaceAll("_", " ")}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid-2col">
            <div className="stack">
              {data.risk_reasons?.length > 0 && (
                <div className="card card-pad">
                  <SectionHeader title="Risk Factors" subtitle="What drove this score" icon="chart" />
                  <div>
                    {data.risk_reasons.map((r) => {
                      const positive = r.direction === "increased"; // increases the score = lowers risk
                      const level = impactLevel(r.contribution);
                      return (
                        <div className="factor-row" key={r.feature}>
                          <span className={`factor-icon ${positive ? "positive" : "negative"}`}>
                            <Icon name={positive ? "check" : "alert"} size={13} />
                          </span>
                          <div className="factor-body">
                            <div className="factor-label">{r.label}</div>
                            <div className={`factor-impact impact-${level}`}>
                              {level === "high" ? "High" : level === "medium" ? "Medium" : "Low"} impact ·{" "}
                              {positive ? "lowered risk" : "raised risk"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.ai_summary && (
                <div className="card card-pad">
                  <SectionHeader title="Assessment" subtitle="Llama 3.2 via Ollama" icon="brain" />
                  <AiSummary text={data.ai_summary} />
                </div>
              )}

              {data.ai_notes?.length > 0 && (
                <div className="notice-banner">{data.ai_notes.join(" ")}</div>
              )}

              {data.cross_sell?.length > 0 && (
                <div className="card card-pad">
                  <SectionHeader title="Recommended" icon="gift" />
                  <div className="crosssell-grid">
                    {data.cross_sell.map((c) => (
                      <div key={c} className="crosssell-card">
                        <div className="crosssell-icon"><Icon name="gift" size={16} /></div>
                        <div className="product-name">{c}</div>
                        <div className="product-tag">Recommended</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card card-pad">
              <SectionHeader title="Documents" icon="docs" />
              <div className="doc-list">
                {REQUIRED_DOC_ORDER.map((type) => {
                  const doc = documentsByType[type];
                  return (
                    <div className="doc-list-row" key={type}>
                      <span className={`doc-list-icon ${doc ? "done" : "missing"}`}>
                        <Icon name={doc ? "check" : DOC_ICONS[type] || "docs"} size={13} />
                      </span>
                      <div className="doc-list-info">
                        <div className="doc-list-type">{DOC_LABELS[type] || type}</div>
                        {doc && <div className="doc-list-file">{doc.original_name || doc.file_path}</div>}
                      </div>
                      {doc && (
                        <a className="doc-list-link" href={`/uploads/${doc.file_path}`} target="_blank" rel="noreferrer">
                          View
                        </a>
                      )}
                    </div>
                  );
                })}
                {extraDocs.map((doc) => (
                  <div className="doc-list-row" key={doc.id}>
                    <span className="doc-list-icon done"><Icon name="check" size={13} /></span>
                    <div className="doc-list-info">
                      <div className="doc-list-type">{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>
                      <div className="doc-list-file">{doc.original_name || doc.file_path}</div>
                    </div>
                    <a className="doc-list-link" href={`/uploads/${doc.file_path}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
