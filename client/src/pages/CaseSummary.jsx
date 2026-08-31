import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";

export default function CaseSummary() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCase(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p style={{ color: "#c0392b" }}>{error}</p>;
  if (!data) return <p>Loading…</p>;

  const decisionLabel =
    data.decision === "approved" ? "✓ APPROVED" : data.decision === "rejected" ? "✕ REJECTED" : "⚠ NEEDS REVIEW";

  return (
    <div>
      <Link to="/queue" style={{ fontSize: 13, color: "#5a6478" }}>
        ← Back to queue
      </Link>
      <h1 style={{ marginTop: 8 }}>Case summary</h1>
      <p className="subtitle">
        {data.applicant_name} — {data.vehicle_desc}, ${data.vehicle_value?.toLocaleString()}
      </p>

      {data.risk_score == null ? (
        <div className="card">
          This case hasn't been scored yet. Go back to the queue and open it from the
          intake screen, or call the score endpoint directly.
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="label">Risk score</div>
              <div className="value">
                {data.risk_score}/100{" "}
                <span className={`badge ${data.risk_band}`}>{data.risk_band}</span>
              </div>
            </div>
            <StatCard
              label="Image match"
              value={data.image_match != null ? `${data.image_match}%` : "—"}
            />
          </div>

          <div className={`decision-banner ${data.decision}`}>
            <span>{decisionLabel}</span>
            <span style={{ fontWeight: 400, fontSize: 13 }}>decided on the spot</span>
          </div>
          <p className="reason-text">{data.decision_reason}</p>

          {data.outlier_flags?.length > 0 && (
            <p className="reason-text">
              Flags: {data.outlier_flags.join(", ")}
            </p>
          )}

          {data.ai_summary && (
            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                AI case summary <span style={{ fontWeight: 400, color: "#5a6478" }}>(Llama 3.2 via Ollama)</span>
              </div>
              <p className="reason-text" style={{ margin: 0 }}>{data.ai_summary}</p>
            </div>
          )}

          {data.risk_reasons?.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Key risk factors <span style={{ fontWeight: 400, color: "#5a6478" }}>(XGBoost)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.risk_reasons.map((r) => (
                  <li key={r.feature} className="reason-text">
                    {r.label} {r.direction} the score ({r.contribution > 0 ? "+" : ""}
                    {r.contribution} pts)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.ai_notes?.length > 0 && (
            <p className="reason-text" style={{ marginTop: 10, color: "#9aa0ac" }}>
              {data.ai_notes.join(" ")}
            </p>
          )}

          {data.cross_sell?.length > 0 && (
            <div className="crosssell-box" style={{ marginTop: 18 }}>
              <div className="title">This lead also qualifies for:</div>
              {data.cross_sell.map((c) => (
                <span key={c} className="pill">
                  {c}
                </span>
              ))}
            </div>
          )}

          <p className="reason-text" style={{ marginTop: 18, fontStyle: "italic" }}>
            Vehicle images are kept on file for future claim comparison.
          </p>
        </>
      )}

      <h3 style={{ marginTop: 32, color: "#1e2761" }}>Uploaded documents</h3>
      <ul>
        {data.documents?.map((d) => (
          <li key={d.id}>
            <a href={`/uploads/${d.file_path}`} target="_blank" rel="noreferrer">
              {d.doc_type}: {d.original_name || d.file_path}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
