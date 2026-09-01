const BAND_LABEL = { low: "Low Risk", medium: "Medium Risk", high: "High Risk" };

export default function RiskScore({ score, band }) {
  return (
    <div className="risk-score-block">
      <div className="risk-score-value">
        {score}
        <span className="of100">/100</span>
      </div>
      {band && <span className={`risk-badge ${band}`}>{BAND_LABEL[band] || band}</span>}
    </div>
  );
}
