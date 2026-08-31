import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Queue() {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listCases().then(setCases).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Verification queue</h1>
      <p className="subtitle">Every case this app has ever opened, newest first.</p>

      {error && <p style={{ color: "#c0392b" }}>{error}</p>}

      <table className="queue">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Vehicle</th>
            <th>Risk score</th>
            <th>Decision</th>
            <th>Cross-sell</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} onClick={() => (window.location.href = `/cases/${c.id}`)}>
              <td>{c.applicant_name}</td>
              <td>
                {c.vehicle_desc} · ${c.vehicle_value?.toLocaleString()}
              </td>
              <td>
                {c.risk_score != null ? (
                  <>
                    {c.risk_score} <span className={`badge ${c.risk_band}`}>{c.risk_band}</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td>{c.decision || c.status}</td>
              <td>{c.cross_sell?.length ? c.cross_sell.join(", ") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {cases.length === 0 && !error && (
        <p className="reason-text">
          No cases yet. <Link to="/">Start one</Link>.
        </p>
      )}
    </div>
  );
}
