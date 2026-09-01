import os
from pathlib import Path

AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
SERVER_DIR = AI_SERVICE_DIR.parent / "server"

# Shared with the Node backend — the "one lightweight home for applications,
# documents and fraud baselines" tool card.
DB_PATH = Path(os.environ.get("SPOTSHIELD_DB_PATH", SERVER_DIR / "spotshield.db"))
UPLOADS_DIR = Path(os.environ.get("SPOTSHIELD_UPLOADS_DIR", SERVER_DIR / "uploads"))

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
# Small, laptop-pullable stand-ins for the full-size models named on the deck
# ("Llama 3.3" / "Qwen2.5-VL"). Swap these for the 70B / full VL checkpoints
# by setting the env vars once you have the hardware/bandwidth for them.
OLLAMA_TEXT_MODEL = os.environ.get("OLLAMA_TEXT_MODEL", "llama3.2:3b")
OLLAMA_VISION_MODEL = os.environ.get("OLLAMA_VISION_MODEL", "moondream")
OLLAMA_EMBED_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")

QDRANT_PATH = str(AI_SERVICE_DIR / "qdrant_data")
QDRANT_CASES_COLLECTION = "spotshield_cases"
QDRANT_POLICIES_COLLECTION = "spotshield_vendor_policies"

VENDOR_POLICIES_DIR = AI_SERVICE_DIR / "data" / "vendor_policies"
RISK_MODEL_PATH = AI_SERVICE_DIR / "models" / "risk_xgb.json"

REQUIRED_DOC_TYPES = ["identity", "credit_history", "vehicle_doc", "vehicle_photo"]
