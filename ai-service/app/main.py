import logging

from fastapi import FastAPI, HTTPException

from . import db, ollama_client, retrieval
from .graph import run_case_pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spotshield.main")

app = FastAPI(title="SpotShield AI Service")


@app.get("/health")
def health():
    return {
        "ok": True,
        "ollama_reachable": ollama_client.is_available(),
    }


@app.post("/analyze/{case_id}")
def analyze(case_id: str):
    """Runs the LangGraph validate -> enrich -> retrieve -> score -> decide ->
    recommend pipeline for one case and returns the decision. The Node API
    persists the result — this service is stateless per request except for
    the shared SQLite DB (read) and the Qdrant case index (written on the
    way out, below)."""
    case = db.fetch_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    documents = db.fetch_documents(case_id)

    result = run_case_pipeline(case, documents)

    response = {
        "status": result["status"],
        "risk_score": result["risk_score"],
        "risk_band": result["risk_band"],
        "image_match": result.get("image_match"),
        "outlier_flags": result.get("outlier_flags", []),
        "decision": result["decision"],
        "decision_reason": result["decision_reason"],
        "cross_sell": result.get("cross_sell", []),
        "ai_summary": result.get("case_summary"),
        "ai_notes": result.get("ai_notes", []),
        "risk_reasons": result.get("risk_reasons", []),
        "similar_cases": result.get("similar_cases", []),
        "policy_context": result.get("policy_context", []),
        "vision": result.get("vision"),
    }

    # Index the now-decided case so future similar applicants retrieve it.
    retrieval.index_scored_case({**case, **{k: response[k] for k in ("risk_score", "risk_band", "decision", "decision_reason")}})

    return response
