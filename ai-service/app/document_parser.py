"""Turns uploaded ID / credit-history / vehicle documents into clean text —
the "Docling / MarkItDown" tool card. We use MarkItDown here: it's the
lighter of the two (no torch/OCR-model download needed for text-native PDFs),
which fits running everything on a laptop. Swap in `docling.DocumentConverter`
in-place of `MarkItDown().convert()` if you need heavier layout-aware OCR for
scanned documents.
"""

import logging
from pathlib import Path

from markitdown import MarkItDown

logger = logging.getLogger("spotshield.document_parser")

_converter = MarkItDown()

# Image files are handled by the Ollama vision pass instead — MarkItDown has
# no OCR backend configured here, so route only text-bearing formats through it.
PARSEABLE_SUFFIXES = {".pdf", ".docx", ".doc", ".txt", ".csv", ".html", ".xlsx", ".pptx"}


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    if path.suffix.lower() not in PARSEABLE_SUFFIXES:
        return ""
    try:
        result = _converter.convert(str(path))
        return (result.text_content or "").strip()
    except Exception as exc:
        logger.warning("MarkItDown could not parse %s: %s", path, exc)
        return ""


def extract_all(document_rows: list[dict], uploads_dir: Path) -> dict[str, str]:
    """doc_type -> extracted text, for every parseable uploaded document."""
    texts: dict[str, str] = {}
    for doc in document_rows:
        file_path = uploads_dir / doc["file_path"]
        text = extract_text(str(file_path))
        if text:
            texts[doc["doc_type"]] = text
    return texts
