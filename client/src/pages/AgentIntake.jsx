import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import ChatBubble from "../components/ChatBubble.jsx";

const DOC_TILES = [
  { type: "identity", label: "ID document" },
  { type: "credit_history", label: "Credit history" },
  { type: "vehicle_doc", label: "Vehicle registration doc" },
  { type: "vehicle_photo", label: "Vehicle photo" },
];

const emptyForm = {
  applicant_name: "",
  vehicle_desc: "",
  vehicle_value: "",
  declared_credit_score: "",
  prior_insurance_history: "",
  agent_name: "",
};

export default function AgentIntake() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [caseId, setCaseId] = useState(null);
  const [uploaded, setUploaded] = useState({}); // { docType: filename }
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const allDocsUploaded = DOC_TILES.every((t) => uploaded[t.type]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function startCase(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.createCase({
        ...form,
        vehicle_value: Number(form.vehicle_value),
        declared_credit_score: form.declared_credit_score
          ? Number(form.declared_credit_score)
          : null,
      });
      setCaseId(created.id);
      setMessages([
        { from: "ai", text: `Case opened for ${created.applicant_name}. Upload the documents and vehicle photo when ready.` },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(docType, file) {
    if (!caseId || !file) return;
    setError(null);
    try {
      await api.uploadDocument(caseId, docType, file);
      setUploaded((u) => ({ ...u, [docType]: file.name }));
      const label = DOC_TILES.find((t) => t.type === docType).label;
      setMessages((m) => [
        ...m,
        { from: "agent", text: `${label} uploaded (${file.name})` },
        { from: "ai", text: "Got it — verifying now." },
      ]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function getDecision() {
    setBusy(true);
    setError(null);
    try {
      await api.scoreCase(caseId);
      navigate(`/cases/${caseId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Start a new case</h1>
      <p className="subtitle">
        One agent, one visit — collect everything, then get an instant decision.
      </p>

      {error && (
        <div style={{ color: "#c0392b", marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      {!caseId ? (
        <form className="card" onSubmit={startCase}>
          <div className="field">
            <label>Applicant name</label>
            <input
              required
              value={form.applicant_name}
              onChange={(e) => updateField("applicant_name", e.target.value)}
              placeholder="Ravi K."
            />
          </div>
          <div className="field">
            <label>Vehicle</label>
            <input
              required
              value={form.vehicle_desc}
              onChange={(e) => updateField("vehicle_desc", e.target.value)}
              placeholder="Sedan"
            />
          </div>
          <div className="field">
            <label>Vehicle value ($)</label>
            <input
              required
              type="number"
              value={form.vehicle_value}
              onChange={(e) => updateField("vehicle_value", e.target.value)}
              placeholder="18000"
            />
          </div>
          <div className="field">
            <label>Declared credit score (optional)</label>
            <input
              type="number"
              value={form.declared_credit_score}
              onChange={(e) => updateField("declared_credit_score", e.target.value)}
              placeholder="720"
            />
          </div>
          <div className="field">
            <label>Prior insurance history (optional)</label>
            <textarea
              rows={2}
              value={form.prior_insurance_history}
              onChange={(e) => updateField("prior_insurance_history", e.target.value)}
              placeholder="e.g. 'No prior claims' or 'Policy lapsed with previous vendor'"
            />
          </div>
          <div className="field">
            <label>Agent name (optional)</label>
            <input
              value={form.agent_name}
              onChange={(e) => updateField("agent_name", e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Starting…" : "Open case & start chat"}
          </button>
        </form>
      ) : (
        <>
          <div className="chat-panel">
            {messages.map((m, i) => (
              <ChatBubble key={i} from={m.from}>
                {m.text}
              </ChatBubble>
            ))}

            <div className="upload-row">
              {DOC_TILES.map((tile) => (
                <label
                  key={tile.type}
                  className={`upload-tile ${uploaded[tile.type] ? "done" : ""}`}
                >
                  {uploaded[tile.type] ? `✓ ${tile.label}` : `Upload ${tile.label}`}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleUpload(tile.type, e.target.files[0])}
                  />
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn btn-primary"
              disabled={!allDocsUploaded || busy}
              onClick={getDecision}
            >
              {busy ? "Scoring…" : "Get instant decision"}
            </button>
            {!allDocsUploaded && (
              <span className="reason-text" style={{ marginLeft: 12 }}>
                Upload all four items to unlock the decision.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
