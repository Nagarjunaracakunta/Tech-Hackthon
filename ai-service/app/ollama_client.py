"""Wraps the local Ollama daemon — runs Llama 3.2 for text (case summaries,
document read-back) and Qwen2.5-VL for the vehicle-photo vision pass.

Ollama itself is a separate native install (`brew install ollama` /
https://ollama.com) — it isn't a pip package, so it can't be provisioned by
`pip install -r requirements.txt`. Every function here degrades gracefully
(returns `None` / an explanatory string) if the daemon isn't running or the
model hasn't been pulled yet, so the rest of the pipeline (retrieval,
XGBoost scoring, decisioning) still works without it.
"""

import base64
import io
import logging

import ollama
from PIL import Image

from .config import OLLAMA_HOST, OLLAMA_TEXT_MODEL, OLLAMA_VISION_MODEL

logger = logging.getLogger("spotshield.ollama")

_client = ollama.Client(host=OLLAMA_HOST)


def is_available() -> bool:
    try:
        _client.list()
        return True
    except Exception:
        return False


def summarize_case(applicant_name: str, vehicle_desc: str, document_text: str) -> str | None:
    """Llama 3.2 turns the parsed ID / credit-history / vehicle-doc text into
    a short underwriter-facing case summary."""
    prompt = (
        "You are a motor-insurance underwriting assistant. Write a 2-3 "
        "sentence case summary for the human underwriter, in plain English, "
        "based only on the facts below. Do not invent numbers.\n\n"
        f"Applicant: {applicant_name}\n"
        f"Vehicle: {vehicle_desc}\n"
        f"Extracted document text:\n{document_text[:4000] or '(no documents parsed yet)'}"
    )
    try:
        resp = _client.chat(
            model=OLLAMA_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.2},
        )
        return resp["message"]["content"].strip()
    except Exception as exc:  # daemon down, model not pulled, etc.
        logger.warning("Ollama text summary unavailable: %s", exc)
        return None


def analyze_vehicle_photo(photo_path: str) -> dict | None:
    """Qwen2.5-VL looks at the uploaded vehicle photo and reports whether it
    plausibly matches the declared vehicle, plus any visible damage — this is
    the real vision pass that replaces the old sha256-hash mock."""
    try:
        image_b64 = _load_and_downscale_image(photo_path)
    except OSError as exc:
        logger.warning("Could not read vehicle photo %s: %s", photo_path, exc)
        return None

    prompt = (
        "Look at this vehicle photo submitted with an insurance application. "
        "Reply with exactly two lines:\n"
        "MATCH_SCORE: <integer 0-100, how plausible/consistent this looks as "
        "a genuine, undamaged vehicle photo suitable for underwriting>\n"
        "NOTES: <one short sentence on condition/visible damage/quality>"
    )
    try:
        resp = _client.chat(
            model=OLLAMA_VISION_MODEL,
            messages=[{"role": "user", "content": prompt, "images": [image_b64]}],
            # A full-resolution phone photo tokenizes to well over Ollama's
            # default 4096-token context in Qwen2.5-VL's dynamic-resolution
            # vision encoder; downscaling (below) plus a larger context here
            # keeps that from erroring out on real uploads.
            options={"temperature": 0.1, "num_ctx": 8192},
        )
        text = resp["message"]["content"]
        return _parse_vision_reply(text)
    except Exception as exc:
        logger.warning("Ollama vision analysis unavailable: %s", exc)
        return None


def _load_and_downscale_image(photo_path: str, max_side: int = 896) -> str:
    """Shrinks the photo before sending it to the vision model — a full-res
    phone photo produces far more vision tokens than Qwen2.5-VL's default
    context window, and underwriting-plausibility checks don't need full
    resolution anyway."""
    with Image.open(photo_path) as img:
        img = img.convert("RGB")
        img.thumbnail((max_side, max_side), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")


def _parse_vision_reply(text: str) -> dict:
    match_score = None
    notes = None
    for line in text.splitlines():
        line = line.strip()
        if line.upper().startswith("MATCH_SCORE"):
            digits = "".join(c for c in line.split(":", 1)[-1] if c.isdigit())
            if digits:
                match_score = max(0, min(100, int(digits)))
        elif line.upper().startswith("NOTES"):
            notes = line.split(":", 1)[-1].strip()
    return {"match_score": match_score, "notes": notes or text.strip()[:280]}
