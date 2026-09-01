export default function KanbanColumn({ label, accent, children, count, emptyLabel = "No cases" }) {
  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span className={`status-badge ${accent}`}>
          <span className="dot" />
          {label}
        </span>
        <span className="kanban-count">{count}</span>
      </div>
      <div className="kanban-cards">
        {count === 0 ? <div className="kanban-empty">{emptyLabel}</div> : children}
      </div>
    </div>
  );
}
