// SQLite persistence — deliberately lightweight, matching the "one lightweight home
// for every vehicle and applicant record" tool card on the deck's "Under the Hood" slide.
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "spotshield.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    applicant_name TEXT NOT NULL,
    vehicle_desc TEXT NOT NULL,
    vehicle_value INTEGER NOT NULL,
    declared_credit_score INTEGER,
    prior_insurance_history TEXT,
    status TEXT NOT NULL DEFAULT 'collecting', -- collecting | scored | approved | rejected | review
    risk_score INTEGER,
    risk_band TEXT,               -- low | medium | high
    image_match INTEGER,
    outlier_flags TEXT,           -- JSON array of strings, e.g. ["credit_mismatch"]
    decision TEXT,                -- approved | rejected | review
    decision_reason TEXT,
    cross_sell TEXT,              -- JSON array, e.g. ["Term Life","Health Cover"]
    agent_name TEXT,
    ai_summary TEXT,               -- Ollama/Llama-generated case summary
    risk_reasons TEXT,             -- JSON array of {feature,label,contribution,direction} from XGBoost
    ai_notes TEXT,                 -- JSON array of strings, e.g. degraded-mode notices
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    scored_at TEXT
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    doc_type TEXT NOT NULL,  -- identity | credit_history | vehicle_doc | vehicle_photo | incident_photo
    file_path TEXT NOT NULL,
    original_name TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate DBs created before the AI-service columns existed.
const existingColumns = new Set(db.prepare("PRAGMA table_info(cases)").all().map((c) => c.name));
for (const [name, ddl] of [
  ["ai_summary", "ALTER TABLE cases ADD COLUMN ai_summary TEXT"],
  ["risk_reasons", "ALTER TABLE cases ADD COLUMN risk_reasons TEXT"],
  ["ai_notes", "ALTER TABLE cases ADD COLUMN ai_notes TEXT"],
]) {
  if (!existingColumns.has(name)) db.exec(ddl);
}
