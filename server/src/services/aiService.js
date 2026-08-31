// Thin client for the SpotShield AI service (../../ai-service) — the
// Python/FastAPI process running the real "approved open-source AI stack"
// from the deck's "Under the Hood" slide: Ollama (Llama 3.2 / Qwen2.5-VL),
// LangGraph, MarkItDown, LlamaIndex+Qdrant and XGBoost. Node stays the
// system of record (SQLite, uploads, the REST API the frontend talks to)
// and just calls out to this service for the actual scoring/decisioning.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

export const REQUIRED_DOC_TYPES = ["identity", "credit_history", "vehicle_doc", "vehicle_photo"];

export async function analyzeCase(caseId) {
  const res = await fetch(`${AI_SERVICE_URL}/analyze/${caseId}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `AI service returned ${res.status}`);
  }
  return res.json();
}
