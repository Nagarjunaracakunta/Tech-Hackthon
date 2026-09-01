export default function KanbanCard({ id, applicant, vehicle, value, riskScore, riskBand, dateLabel, onClick }) {
  return (
    <div
      className="kanban-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" ? onClick?.() : null)}
    >
      <div className="kanban-card-top">
        <span className="kanban-card-name">{applicant}</span>
        {riskScore != null && <span className={`risk-badge ${riskBand}`}>{riskScore}</span>}
      </div>
      <div className="kanban-card-sub">
        {vehicle}
        {value != null && ` · ${value}`}
      </div>
      <div className="kanban-card-foot">
        <span className="mono">{id}</span>
        <span>{dateLabel}</span>
      </div>
    </div>
  );
}
