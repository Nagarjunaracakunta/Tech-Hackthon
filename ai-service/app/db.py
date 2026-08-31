import sqlite3

from .config import DB_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def fetch_case(case_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        return dict(row) if row else None


def fetch_documents(case_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at ASC",
            (case_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def fetch_scored_cases(exclude_case_id: str | None = None) -> list[dict]:
    """Past cases that already have a decision — the corpus LlamaIndex/Qdrant
    retrieves "similar past cases" from to sharpen each new risk score."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM cases WHERE decision IS NOT NULL AND id != ? ORDER BY scored_at DESC LIMIT 200",
            (exclude_case_id or "",),
        ).fetchall()
        return [dict(r) for r in rows]
