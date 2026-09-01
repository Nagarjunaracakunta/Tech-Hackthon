export default function EmptyState({ title, description, action }) {
  return (
    <div className="state-block">
      <div className="state-icon">□</div>
      <div className="state-title">{title}</div>
      {description && <div className="state-desc">{description}</div>}
      {action}
    </div>
  );
}
