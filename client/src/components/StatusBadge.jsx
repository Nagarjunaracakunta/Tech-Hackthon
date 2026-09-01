// Maps a case's decision/status value to a consistent color + label.
// Color never carries meaning alone — the text label is always shown too.
const LABELS = {
  approved: "Approved",
  rejected: "Rejected",
  review: "Needs Review",
  collecting: "Collecting",
  scored: "Scored",
};

export default function StatusBadge({ status }) {
  const tone = status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "review" ? "review" : "neutral";
  const label = LABELS[status] || status || "Unknown";
  return (
    <span className={`status-badge ${tone}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
