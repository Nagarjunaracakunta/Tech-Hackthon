import Icon from "./Icon.jsx";

// One required-document tile in the intake workspace. Purely presentational —
// the upload itself still goes through AgentIntake's handleUpload/api.uploadDocument.
export default function DocumentCard({ label, icon, filename, error, onSelect }) {
  const isDone = Boolean(filename) && !error;
  const status = error ? "error" : isDone ? "done" : "empty";
  const iconName = error ? "alert" : isDone ? "check" : icon || "docs";

  return (
    <div className={`doc-card is-${status}`}>
      <div>
        <div className="doc-card-top">
          <div className="doc-card-icon">
            <Icon name={iconName} size={16} />
          </div>
          <div className="doc-card-type">{label}</div>
        </div>

        <div className="doc-card-body">
          {isDone && (
            <>
              <span className="doc-card-filename">{filename}</span>
              <span className="doc-card-status">Uploaded</span>
            </>
          )}
          {error && <span className="doc-card-status">{error}</span>}
        </div>
      </div>

      <div className="doc-card-action">
        <label>
          {isDone ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => onSelect(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );
}
