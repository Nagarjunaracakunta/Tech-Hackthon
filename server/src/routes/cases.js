import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { upload } from "../middleware/upload.js";
import { analyzeCase, REQUIRED_DOC_TYPES } from "../services/aiService.js";

export const casesRouter = Router();

function serializeCase(row) {
  return {
    ...row,
    vehicle_value: row.vehicle_value,
    outlier_flags: row.outlier_flags ? JSON.parse(row.outlier_flags) : [],
    cross_sell: row.cross_sell ? JSON.parse(row.cross_sell) : [],
    risk_reasons: row.risk_reasons ? JSON.parse(row.risk_reasons) : [],
    ai_notes: row.ai_notes ? JSON.parse(row.ai_notes) : [],
  };
}

// POST /api/cases — Step 1: agent starts a new case for a lead they're meeting.
casesRouter.post("/", (req, res) => {
  const {
    applicant_name,
    vehicle_desc,
    vehicle_value,
    declared_credit_score,
    prior_insurance_history,
    agent_name,
  } = req.body;

  if (!applicant_name || !vehicle_desc || vehicle_value == null) {
    return res.status(400).json({
      error: "applicant_name, vehicle_desc, and vehicle_value are required.",
    });
  }

  const id = nanoid(10);
  db.prepare(
    `INSERT INTO cases
      (id, applicant_name, vehicle_desc, vehicle_value, declared_credit_score,
       prior_insurance_history, agent_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'collecting')`
  ).run(
    id,
    applicant_name,
    vehicle_desc,
    Number(vehicle_value),
    declared_credit_score != null ? Number(declared_credit_score) : null,
    prior_insurance_history || null,
    agent_name || null
  );

  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id);
  res.status(201).json(serializeCase(row));
});

// GET /api/cases — the verification queue: every case, newest first.
casesRouter.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM cases ORDER BY created_at DESC").all();
  res.json(rows.map(serializeCase));
});

// GET /api/cases/:id — one case, with its uploaded documents.
casesRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Case not found." });
  const documents = db
    .prepare("SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at ASC")
    .all(req.params.id);
  res.json({ ...serializeCase(row), documents });
});

// POST /api/cases/:id/documents — Step 2: agent uploads a doc/photo through
// the live-chat intake screen. field name "file", body field "doc_type" is
// one of: identity | credit_history | vehicle_doc | vehicle_photo | incident_photo
casesRouter.post("/:id/documents", upload.single("file"), (req, res) => {
  const caseRow = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!caseRow) return res.status(404).json({ error: "Case not found." });
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')." });

  const { doc_type } = req.body;
  const validTypes = [...REQUIRED_DOC_TYPES, "incident_photo"];
  if (!validTypes.includes(doc_type)) {
    return res.status(400).json({
      error: `doc_type must be one of: ${validTypes.join(", ")}`,
    });
  }

  const docId = nanoid(10);
  db.prepare(
    `INSERT INTO documents (id, case_id, doc_type, file_path, original_name)
     VALUES (?, ?, ?, ?, ?)`
  ).run(docId, req.params.id, doc_type, req.file.filename, req.file.originalname);

  const documents = db
    .prepare("SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at ASC")
    .all(req.params.id);

  res.status(201).json({ document: { id: docId, doc_type, file: req.file.filename }, documents });
});

// POST /api/cases/:id/score — Step 3: run the SpotShield AI service
// (LangGraph: validate -> enrich -> retrieve -> score -> decide -> recommend,
// backed by Ollama, MarkItDown, LlamaIndex+Qdrant and XGBoost) and get an
// immediate approve/reject/review decision, plus any cross-sell offer. This
// is the "spot decision" moment from the deck.
casesRouter.post("/:id/score", async (req, res) => {
  const caseRow = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!caseRow) return res.status(404).json({ error: "Case not found." });

  let result;
  try {
    result = await analyzeCase(req.params.id);
  } catch (err) {
    return res.status(502).json({
      error: `AI service unavailable: ${err.message}. Start it with "cd ai-service && source .venv/bin/activate && uvicorn app.main:app --port 8001".`,
    });
  }

  db.prepare(
    `UPDATE cases SET
       status = ?, risk_score = ?, risk_band = ?, image_match = ?,
       outlier_flags = ?, decision = ?, decision_reason = ?, cross_sell = ?,
       ai_summary = ?, risk_reasons = ?, ai_notes = ?,
       scored_at = datetime('now')
     WHERE id = ?`
  ).run(
    result.status,
    result.risk_score,
    result.risk_band,
    result.image_match,
    JSON.stringify(result.outlier_flags),
    result.decision,
    result.decision_reason,
    JSON.stringify(result.cross_sell),
    result.ai_summary || null,
    JSON.stringify(result.risk_reasons || []),
    JSON.stringify(result.ai_notes || []),
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  res.json(serializeCase(updated));
});
