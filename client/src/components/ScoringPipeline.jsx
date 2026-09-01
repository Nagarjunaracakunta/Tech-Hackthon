import Icon from "./Icon.jsx";

const STAGES = [
  { key: "documents", label: "Documents", icon: "docs" },
  { key: "analyzing", label: "Analyzing", icon: "search" },
  { key: "risk", label: "Risk Assessment", icon: "chart" },
  { key: "decision", label: "Decision", icon: "fork" },
];

// Shown while the real /score request is in flight. Stage 1 is always
// "done" (documents are already uploaded) and stage 2 pulses to show work
// is happening — there's no per-step progress from the API, so this is an
// honest "processing" indicator, not simulated step-by-step data.
export default function ScoringPipeline() {
  return (
    <div className="scoring-pipeline">
      {STAGES.map((s, i) => (
        <div className="scoring-pipeline-item" key={s.key}>
          <div className={`scoring-pipeline-node ${i === 0 ? "is-done" : i === 1 ? "is-active" : ""}`}>
            <Icon name={i === 0 ? "check" : s.icon} size={16} />
          </div>
          <span className="scoring-pipeline-label">{s.label}</span>
          {i < STAGES.length - 1 && <div className="scoring-pipeline-arrow">→</div>}
        </div>
      ))}
    </div>
  );
}
