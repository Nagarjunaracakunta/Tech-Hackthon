"""LlamaIndex + Qdrant — finds similar past cases and relevant vendor-policy
clauses to sharpen each new risk score (the "Under the Hood" retrieval tool
card). Runs against a local on-disk Qdrant store (no server to stand up) and
embeds with Ollama's `nomic-embed-text`, so the whole thing stays local.

If Ollama isn't reachable (embedding calls fail), every function here
degrades to returning an empty result instead of raising — retrieval is an
enrichment step, not a hard dependency for scoring a case.
"""

import logging
from pathlib import Path

from llama_index.core import Document, Settings, StorageContext, VectorStoreIndex
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

from .config import (
    OLLAMA_EMBED_MODEL,
    OLLAMA_HOST,
    QDRANT_CASES_COLLECTION,
    QDRANT_PATH,
    QDRANT_POLICIES_COLLECTION,
    VENDOR_POLICIES_DIR,
)

logger = logging.getLogger("spotshield.retrieval")

Settings.embed_model = OllamaEmbedding(model_name=OLLAMA_EMBED_MODEL, base_url=OLLAMA_HOST)

_qdrant_client: QdrantClient | None = None
_policy_index: VectorStoreIndex | None = None
_case_index: VectorStoreIndex | None = None


def _get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        Path(QDRANT_PATH).mkdir(parents=True, exist_ok=True)
        _qdrant_client = QdrantClient(path=QDRANT_PATH)
    return _qdrant_client


def _get_policy_index() -> VectorStoreIndex:
    global _policy_index
    if _policy_index is not None:
        return _policy_index

    vector_store = QdrantVectorStore(client=_get_qdrant_client(), collection_name=QDRANT_POLICIES_COLLECTION)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    existing = _get_qdrant_client().count(QDRANT_POLICIES_COLLECTION, exact=True).count if _get_qdrant_client().collection_exists(QDRANT_POLICIES_COLLECTION) else 0
    if existing:
        _policy_index = VectorStoreIndex.from_vector_store(vector_store)
        return _policy_index

    docs = []
    for path in sorted(VENDOR_POLICIES_DIR.glob("*.md")):
        docs.append(Document(text=path.read_text(), metadata={"source": path.name}))
    _policy_index = VectorStoreIndex.from_documents(docs, storage_context=storage_context)
    return _policy_index


def _get_case_index() -> VectorStoreIndex:
    global _case_index
    if _case_index is not None:
        return _case_index

    vector_store = QdrantVectorStore(client=_get_qdrant_client(), collection_name=QDRANT_CASES_COLLECTION)
    if _get_qdrant_client().collection_exists(QDRANT_CASES_COLLECTION):
        _case_index = VectorStoreIndex.from_vector_store(vector_store)
    else:
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        _case_index = VectorStoreIndex.from_documents([], storage_context=storage_context)
    return _case_index


def _case_document_text(case_row: dict) -> str:
    return (
        f"Applicant {case_row.get('applicant_name')} — vehicle: {case_row.get('vehicle_desc')} "
        f"(value {case_row.get('vehicle_value')}). Declared credit score: "
        f"{case_row.get('declared_credit_score')}. Prior insurance history: "
        f"{case_row.get('prior_insurance_history') or 'none declared'}. "
        f"Decision: {case_row.get('decision')} (risk {case_row.get('risk_score')}/100, "
        f"band {case_row.get('risk_band')}). Reason: {case_row.get('decision_reason')}"
    )


def index_scored_case(case_row: dict) -> None:
    """Upserts a just-scored case into the case index so future lookalikes
    can retrieve it. Called once a case has a decision."""
    try:
        index = _get_case_index()
        doc = Document(
            text=_case_document_text(case_row),
            doc_id=case_row["id"],
            metadata={
                "case_id": case_row["id"],
                "risk_band": case_row.get("risk_band"),
                "decision": case_row.get("decision"),
            },
        )
        index.insert(doc)
    except Exception as exc:
        logger.warning("Could not index case %s into Qdrant: %s", case_row.get("id"), exc)


def retrieve_similar_cases(case_row: dict, top_k: int = 3) -> list[dict]:
    try:
        index = _get_case_index()
        retriever = index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(_case_document_text(case_row))
        return [
            {
                "case_id": n.metadata.get("case_id"),
                "decision": n.metadata.get("decision"),
                "risk_band": n.metadata.get("risk_band"),
                "score": round(float(n.score), 3) if n.score is not None else None,
                "text": n.text,
            }
            for n in nodes
        ]
    except Exception as exc:
        logger.warning("Similar-case retrieval unavailable: %s", exc)
        return []


def retrieve_relevant_policies(query_text: str, top_k: int = 2) -> list[dict]:
    try:
        index = _get_policy_index()
        retriever = index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(query_text)
        return [
            {"source": n.metadata.get("source"), "text": n.text, "score": round(float(n.score), 3) if n.score is not None else None}
            for n in nodes
        ]
    except Exception as exc:
        logger.warning("Vendor-policy retrieval unavailable: %s", exc)
        return []
