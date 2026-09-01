import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import EmptyState from "../components/EmptyState.jsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "review", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Queue() {
  const navigate = useNavigate();
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.listCases().then(setCases).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const list = cases || [];
    return {
      total: list.length,
      review: list.filter((c) => c.decision === "review").length,
      approved: list.filter((c) => c.decision === "approved").length,
      rejected: list.filter((c) => c.decision === "rejected").length,
    };
  }, [cases]);

  const rows = useMemo(() => {
    const list = cases || [];
    const q = query.trim().toLowerCase();
    return list
      .filter((c) => filter === "all" || c.decision === filter)
      .filter(
        (c) =>
          !q ||
          c.applicant_name?.toLowerCase().includes(q) ||
          c.vehicle_desc?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q)
      )
      .sort((a, b) => (b.risk_score ?? -1) - (a.risk_score ?? -1));
  }, [cases, filter, query]);

  return (
    <div className="page">
      <div className="queue-canvas">
        <div className="section-header" style={{ marginBottom: 22 }}>
          <h1 className="page-title">Verification Queue</h1>
          <Link to="/" className="btn btn-primary">+ New Case</Link>
        </div>

        {error && <ErrorState message={error} />}
        {!error && cases === null && <LoadingState label="Loading cases…" />}

        {!error && cases !== null && (
          <>
            <div className="stat-grid">
              <StatCard label="Total Cases" value={stats.total} icon="layers" glass />
              <StatCard label="Needs Review" value={stats.review} accent="review" icon="alert" glass />
              <StatCard label="Approved" value={stats.approved} accent="approved" icon="check" glass />
              <StatCard label="Rejected" value={stats.rejected} accent="rejected" icon="cross" glass />
            </div>

            <div className="toolbar">
              <div className="search-input">
                <span className="search-icon">⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search cases"
                />
              </div>
              <div className="filter-pills">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-pill ${filter === f.key ? "active" : ""}`}
                    onClick={() => setFilter(f.key)}
                    type="button"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {cases.length === 0 ? (
              <EmptyState
                title="No cases yet"
                description="Every case opened by a field agent will appear here."
                action={<Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Start a case</Link>}
              />
            ) : rows.length === 0 ? (
              <EmptyState title="No matching cases" description="Try a different search term." />
            ) : (
              <div className="worklist glass-panel">
                <div className="worklist-head">
                  <span className="wl-rank">#</span>
                  <span className="wl-applicant">Applicant</span>
                  <span className="wl-vehicle">Vehicle</span>
                  <span className="wl-risk">Risk</span>
                  <span className="wl-status">Status</span>
                  <span className="wl-action" />
                </div>
                {rows.map((c, i) => {
                  const status = c.decision || c.status;
                  const band = c.risk_band || "medium";
                  return (
                    <div className="worklist-row" key={c.id} onClick={() => navigate(`/cases/${c.id}`)}>
                      <span className="wl-rank">{i + 1}</span>
                      <span className="wl-applicant">
                        <span className="wl-avatar">{initials(c.applicant_name)}</span>
                        <span className="wl-applicant-text">
                          <span className="wl-name">{c.applicant_name}</span>
                          <span className="wl-date">{formatDate(c.created_at)}</span>
                        </span>
                      </span>
                      <span className="wl-vehicle">
                        <span className="wl-vehicle-name">{c.vehicle_desc}</span>
                        <span className="wl-vehicle-value">
                          {c.vehicle_value != null ? `$${c.vehicle_value.toLocaleString()}` : "—"}
                        </span>
                      </span>
                      <span className="wl-risk">
                        {c.risk_score != null ? (
                          <span className="wl-risk-wrap">
                            <span className={`wl-risk-value risk-${band}`}>{c.risk_score}</span>
                            <span className="wl-risk-track">
                              <span className={`wl-risk-fill risk-${band}`} style={{ width: `${c.risk_score}%` }} />
                            </span>
                          </span>
                        ) : (
                          <span className="wl-risk-pending">—</span>
                        )}
                      </span>
                      <span className="wl-status">
                        <StatusBadge status={status} />
                      </span>
                      <span className="wl-action">View →</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
