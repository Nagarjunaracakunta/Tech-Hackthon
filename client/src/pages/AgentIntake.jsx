import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import DocumentCard from "../components/DocumentCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import ScoringPipeline from "../components/ScoringPipeline.jsx";
import Icon from "../components/Icon.jsx";

const DOC_TILES = [
  { type: "identity", label: "Identity", icon: "identity" },
  { type: "credit_history", label: "Credit History", icon: "credit" },
  { type: "vehicle_doc", label: "Registration", icon: "vehicleDoc" },
  { type: "vehicle_photo", label: "Vehicle Photo", icon: "camera" },
];

const emptyForm = {
  applicant_name: "",
  vehicle_desc: "",
  vehicle_value: "",
  declared_credit_score: "",
  prior_insurance_history: "",
  agent_name: "",
};

function Steps({ current }) {
  const items = [
    { n: 1, label: "Applicant" },
    { n: 2, label: "Documents" },
    { n: 3, label: "Analysis" },
    { n: 4, label: "Decision" },
  ];
  return (
    <div className="steps">
      {items.map((item, i) => (
        <div key={item.n} style={{ display: "contents" }}>
          <div className={`step-item ${current === item.n ? "is-current" : ""} ${current > item.n ? "is-done" : ""}`}>
            <span className="step-dot">{current > item.n ? "✓" : String(item.n).padStart(2, "0")}</span>
            <span className="step-label">{item.label}</span>
          </div>
          {i < items.length - 1 && <div className="step-sep" />}
        </div>
      ))}
    </div>
  );
}

export default function AgentIntake() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [caseId, setCaseId] = useState(null);
  const [uploaded, setUploaded] = useState({}); // { docType: filename }
  const [uploadErrors, setUploadErrors] = useState({}); // { docType: message }
  const [busy, setBusy] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState(null);

  const allDocsUploaded = DOC_TILES.every((t) => uploaded[t.type]);
  const currentStep = !caseId ? 1 : scoring ? 3 : 2;

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
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function backToApplicant() {
    setCaseId(null);
  }

  async function handleUpload(docType, file) {
    if (!caseId || !file) return;
    setError(null);
    setUploadErrors((u) => ({ ...u, [docType]: null }));
    try {
      await api.uploadDocument(caseId, docType, file);
      setUploaded((u) => ({ ...u, [docType]: file.name }));
    } catch (err) {
      setUploadErrors((u) => ({ ...u, [docType]: "Upload failed" }));
      setError(err.message);
    }
  }

  async function getDecision() {
    setScoring(true);
    setError(null);
    try {
      await api.scoreCase(caseId);
      navigate(`/cases/${caseId}`);
    } catch (err) {
      setError(err.message);
      setScoring(false);
    }
  }

  const uploadedCount = DOC_TILES.filter((t) => uploaded[t.type]).length;

  return (
    <div className="page page-narrow">
      <div className="eyebrow">Field Intake</div>
      <h1 className="page-title">New Vehicle Assessment</h1>

      <Steps current={currentStep} />

      {error && <div className="error-banner">{error}</div>}

      {!caseId ? (
        <form className="card card-pad" onSubmit={startCase}>
          <div className="visual-field-card">
            <span className="visual-field-label"><Icon name="applicant" size={12} /> Applicant</span>
            <input
              className="visual-field-input"
              required
              value={form.applicant_name}
              onChange={(e) => updateField("applicant_name", e.target.value)}
              placeholder="Rahul Sharma"
            />
          </div>

          <div className="visual-field-card">
            <span className="visual-field-label"><Icon name="vehicle" size={12} /> Vehicle</span>
            <input
              className="visual-field-input"
              required
              value={form.vehicle_desc}
              onChange={(e) => updateField("vehicle_desc", e.target.value)}
              placeholder="Hyundai Creta"
            />
          </div>

          <div className="metric-field-row">
            <div className="metric-field">
              <div className="metric-field-value-wrap">
                <span className="metric-field-prefix">$</span>
                <input
                  className="metric-field-input"
                  required
                  type="number"
                  min="0"
                  value={form.vehicle_value}
                  onChange={(e) => updateField("vehicle_value", e.target.value)}
                  placeholder="18000"
                />
              </div>
              <span className="metric-field-label">Vehicle Value</span>
            </div>
            <div className="metric-field">
              <input
                className="metric-field-input"
                type="number"
                value={form.declared_credit_score}
                onChange={(e) => updateField("declared_credit_score", e.target.value)}
                placeholder="—"
              />
              <span className="metric-field-label">Credit Score</span>
            </div>
          </div>

          <div className="field">
            <label>Agent <span className="field-hint">optional</span></label>
            <input
              value={form.agent_name}
              onChange={(e) => updateField("agent_name", e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="field">
            <label>Insurance history <span className="field-hint">optional</span></label>
            <textarea
              rows={2}
              value={form.prior_insurance_history}
              onChange={(e) => updateField("prior_insurance_history", e.target.value)}
              placeholder="e.g. 'No prior claims' or 'Policy lapsed with previous vendor'"
            />
          </div>

          <div className="form-footer">
            <span />
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Starting…" : "Continue →"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card card-pad">
          <SectionHeader title="Documents" icon="docs" />

          <div className="doc-progress">
            <span>{uploadedCount}/{DOC_TILES.length} uploaded</span>
            <div className="doc-progress-track">
              <div
                className="doc-progress-fill"
                style={{ width: `${(uploadedCount / DOC_TILES.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="doc-grid">
            {DOC_TILES.map((tile) => (
              <DocumentCard
                key={tile.type}
                label={tile.label}
                icon={tile.icon}
                filename={uploaded[tile.type]}
                error={uploadErrors[tile.type]}
                onSelect={(file) => handleUpload(tile.type, file)}
              />
            ))}
          </div>

          {scoring && <ScoringPipeline />}

          <div className="form-footer">
            <button className="btn btn-secondary" type="button" onClick={backToApplicant} disabled={scoring}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!allDocsUploaded || scoring}
              onClick={getDecision}
            >
              {scoring ? "Analyzing…" : "Get instant decision →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
