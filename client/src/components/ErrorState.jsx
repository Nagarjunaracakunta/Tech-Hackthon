export default function ErrorState({ message, title = "Something went wrong" }) {
  return (
    <div className="state-block state-error">
      <div className="state-icon">!</div>
      <div className="state-title">{title}</div>
      <div className="state-desc">{message}</div>
    </div>
  );
}
