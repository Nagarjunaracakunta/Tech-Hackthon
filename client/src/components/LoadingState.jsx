export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="state-block">
      <div className="state-icon">…</div>
      <div className="state-title">{label}</div>
    </div>
  );
}
