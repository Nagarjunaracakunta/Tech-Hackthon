"""LangGraph agent that runs each case: validate -> enrich -> retrieve ->
score -> decide -> recommend. This replaces the old hand-rolled
`riskEngine.scoreCase()` — each step below is a graph node instead of a
plain function call, so the flow can branch (missing docs short-circuits
straight to a review decision) and every step's output is inspectable state.
"""

import logging
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, StateGraph

from . import document_parser, ollama_client, retrieval, risk_model
from .config import REQUIRED_DOC_TYPES, UPLOADS_DIR

logger = logging.getLogger("spotshield.graph")


class CaseState(TypedDict, total=False):
    case: dict
    documents: list[dict]
    missing_docs: list[str]
    doc_texts: dict[str, str]
    case_summary: str | None
    vision: dict | None
    image_match: int | None
    similar_cases: list[dict]
    policy_context: list[dict]
    risk_score: int
    risk_band: str
    risk_reasons: list[dict]
    outlier_flags: list[str]
    decision: str
    decision_reason: str
    status: str
    cross_sell: list[str]
    ai_notes: list[str]


def validate_node(state: CaseState) -> CaseState:
    present = {d["doc_type"] for d in state["documents"]}
    missing = [t for t in REQUIRED_DOC_TYPES if t not in present]
    return {"missing_docs": missing, "outlier_flags": (["incomplete_documents"] if missing else [])}


def enrich_node(state: CaseState) -> CaseState:
    case = state["case"]
    documents = state["documents"]
    ai_notes: list[str] = []

    doc_texts = document_parser.extract_all(documents, UPLOADS_DIR)

    vision = None
    photo_doc = next((d for d in documents if d["doc_type"] == "vehicle_photo"), None)
    if photo_doc:
        vision = ollama_client.analyze_vehicle_photo(str(UPLOADS_DIR / photo_doc["file_path"]))
        if vision is None:
            ai_notes.append("Vehicle photo vision analysis unavailable (Ollama/Qwen2.5-VL not reachable).")

    combined_text = "\n\n".join(f"[{k}]\n{v}" for k, v in doc_texts.items())
    case_summary = ollama_client.summarize_case(case["applicant_name"], case["vehicle_desc"], combined_text)
    if case_summary is None:
        ai_notes.append("Case summary unavailable (Ollama/Llama 3.2 not reachable).")

    return {
        "doc_texts": doc_texts,
        "vision": vision,
        "image_match": vision["match_score"] if vision else None,
        "case_summary": case_summary,
        "ai_notes": ai_notes,
    }


def retrieve_node(state: CaseState) -> CaseState:
    case = state["case"]
    similar = retrieval.retrieve_similar_cases(case)
    query = f"{case['vehicle_desc']} risk score {state.get('image_match')} credit {case.get('declared_credit_score')}"
    policies = retrieval.retrieve_relevant_policies(query)
    return {"similar_cases": similar, "policy_context": policies}


def score_node(state: CaseState) -> CaseState:
    case = state["case"]
    features = risk_model.build_features(
        declared_credit_score=case.get("declared_credit_score"),
        prior_insurance_history=case.get("prior_insurance_history"),
        missing_doc_count=len(state["missing_docs"]),
        image_match=state.get("image_match"),
        vehicle_value=case.get("vehicle_value", 0),
        similar_cases=state.get("similar_cases", []),
    )
    score, reasons = risk_model.predict(features)
    band = "low" if score >= 80 else "medium" if score >= 50 else "high"

    flags = list(state.get("outlier_flags", []))
    if features["adverse_history"]:
        flags.append("adverse_prior_history")
    if state.get("image_match") is not None and state["image_match"] < 60:
        flags.append("image_mismatch")

    return {
        "risk_score": score,
        "risk_band": band,
        "risk_reasons": reasons,
        "outlier_flags": list(dict.fromkeys(flags)),
    }


def decide_node(state: CaseState) -> CaseState:
    missing = state["missing_docs"]
    score = state.get("risk_score", 0)
    image_match = state.get("image_match")
    reasons = state.get("risk_reasons", [])
    reason_bits = ", ".join(f"{r['label']} {r['direction']} it" for r in reasons) or None

    if missing:
        decision, status = "review", "review"
        reason = f"Missing required document(s): {', '.join(missing)}."
    elif score >= 80 and (image_match is None or image_match >= 70):
        decision, status = "approved", "approved"
        reason = (
            f"XGBoost risk score {score}/100 (low risk)"
            + (f" and {image_match}% vehicle-photo match" if image_match is not None else "")
            + " — approved on the spot."
            + (f" Key factors: {reason_bits}." if reason_bits else "")
        )
    elif score < 40 or (image_match is not None and image_match < 50):
        decision, status = "rejected", "rejected"
        reason = (
            f"XGBoost risk score {score}/100"
            + (f" with only {image_match}% vehicle-photo match" if image_match is not None else "")
            + " — too high risk to approve automatically."
            + (f" Key factors: {reason_bits}." if reason_bits else "")
        )
    else:
        decision, status = "review", "review"
        reason = f"XGBoost risk score {score}/100 is borderline — flagged for a human underwriter." + (
            f" Key factors: {reason_bits}." if reason_bits else ""
        )

    return {"decision": decision, "status": status, "decision_reason": reason}


def recommend_node(state: CaseState) -> CaseState:
    score = state.get("risk_score", 0)
    flags = state.get("outlier_flags", [])
    cross_sell = []
    if state["decision"] == "approved" and score >= 85 and not flags:
        cross_sell = ["Term Life", "Health Cover"]
    return {"cross_sell": cross_sell}


def build_graph():
    graph = StateGraph(CaseState)
    graph.add_node("validate", validate_node)
    graph.add_node("enrich", enrich_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("score", score_node)
    graph.add_node("decide", decide_node)
    graph.add_node("recommend", recommend_node)

    graph.set_entry_point("validate")
    graph.add_edge("validate", "enrich")
    graph.add_edge("enrich", "retrieve")
    graph.add_edge("retrieve", "score")
    graph.add_edge("score", "decide")
    graph.add_edge("decide", "recommend")
    graph.add_edge("recommend", END)
    return graph.compile()


_compiled_graph = None


def run_case_pipeline(case: dict, documents: list[dict]) -> CaseState:
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    initial: CaseState = {"case": case, "documents": documents}
    return _compiled_graph.invoke(initial)
