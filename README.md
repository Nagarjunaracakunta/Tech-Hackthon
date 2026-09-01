---
title: SpotShield AI
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# SpotShield AI — starter app

A working prototype of the flow from the Stage 2 deck: one field agent opens a
case, uploads a lead's documents and a vehicle photo through a live-chat style
screen, and gets an instant approve/reject decision plus a cross-sell offer
for good leads.

This is a **real, runnable full-stack app** — not a mockup, and the "AI" is
now the real open-source AI stack from the deck's "Under the Hood" slide, not
a rule-based placeholder:

| Tool card | What runs it |
|---|---|
| Ollama + Llama 3.2 / Qwen2.5-VL | `ai-service/app/ollama_client.py` — reads documents & the vehicle photo, writes the case summary |
| LangGraph | `ai-service/app/graph.py` — the agent that runs each case: validate → enrich → retrieve → score → decide → recommend |
| MarkItDown (Docling-compatible) | `ai-service/app/document_parser.py` — turns uploaded ID/credit-history/vehicle docs into clean text |
| LlamaIndex + Qdrant | `ai-service/app/retrieval.py` — finds similar past cases & vendor-policy clauses to sharpen each risk score |
| SQLite | `server/spotshield.db` — one lightweight home for applications, documents and (now) AI-derived fraud signals |
| XGBoost (scikit-learn) | `ai-service/app/risk_model.py` — the real-time risk score, with plain-English reasons from XGBoost's own SHAP-style feature contributions |

## Stack

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), file uploads via `multer`. Owns the REST API, the database and the uploaded files.
- **AI service:** Python + FastAPI, calling out to a local Ollama daemon. Owns document parsing, retrieval and risk scoring. Node calls it over HTTP for every `/score` request.
- **Frontend:** React + Vite, plain CSS using the deck's brand colors.

## Project layout

```
spotshield-app/
  server/          Express API + SQLite database + file uploads
    src/
      index.js               app entrypoint
      db.js                   SQLite schema
      routes/cases.js          REST API for cases & documents
      services/aiService.js    HTTP client for the AI service's /analyze endpoint
      middleware/upload.js     multer file-upload config
    uploads/         uploaded documents/photos land here (gitignored)
  ai-service/      Python AI service (Ollama, LangGraph, MarkItDown, LlamaIndex+Qdrant, XGBoost)
    app/
      main.py                 FastAPI app — POST /analyze/{case_id}, GET /health
      graph.py                 LangGraph pipeline: validate -> enrich -> retrieve -> score -> decide -> recommend
      ollama_client.py         Llama 3.2 (text) + Qwen2.5-VL (vehicle photo) calls
      document_parser.py       MarkItDown text extraction
      retrieval.py              LlamaIndex + Qdrant similar-case & policy retrieval
      risk_model.py             XGBoost load/predict + feature engineering
      db.py                     read-only access to the shared SQLite DB
    data/
      train_risk_model.py       trains and saves the XGBoost model
      vendor_policies/           sample policy docs indexed for retrieval
    models/risk_xgb.json        the trained model (checked in so the app works out of the box)
    qdrant_data/                 local on-disk Qdrant store (gitignored, built on first run)
  client/          React app
    src/
      pages/AgentIntake.jsx   Step 1-2: open a case, live-chat upload
      pages/CaseSummary.jsx    Step 3: risk score, decision, AI summary, cross-sell
      pages/Queue.jsx           the verification queue (all cases)
```

## Running it locally

You need **Node.js 18+**, **Python 3.11+**, and **[Ollama](https://ollama.com/download)** installed.

### 1. Install & start Ollama, and pull the models

```bash
ollama serve   # in its own terminal, if it isn't already running as a service
ollama pull llama3.2:3b       # text — case summaries, document read-back
ollama pull qwen2.5vl:7b      # vision — vehicle photo analysis
ollama pull nomic-embed-text  # embeddings — powers the LlamaIndex/Qdrant retrieval
```

These are small, laptop-pullable stand-ins for the full-size models named on
the deck (Llama 3.3 70B / the larger Qwen2.5-VL checkpoints). Swap them in by
setting `OLLAMA_TEXT_MODEL` / `OLLAMA_VISION_MODEL` env vars once you have the
hardware for them — nothing else in the code needs to change.

If Ollama isn't running or a model isn't pulled, the AI service **doesn't
crash** — document parsing, retrieval and XGBoost scoring still work, and the
response's `ai_notes` field says which AI features were skipped and why.

### 2. Set up and run the AI service

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate        # .venv\Scripts\activate on Windows
pip install -r requirements.txt
python data/train_risk_model.py  # trains models/risk_xgb.json (already checked in — rerun anytime)
uvicorn app.main:app --port 8001
```

XGBoost needs the OpenMP runtime on macOS: `brew install libomp` if you hit a
`libomp.dylib` load error.

### 3. Run the backend and frontend (two more terminals)

```bash
# Terminal 2 — backend (http://localhost:4000)
cd server
npm install
npm run dev

# Terminal 3 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and
`/uploads` requests to the backend, so you don't need to configure CORS or a
second URL — just use the app. The backend in turn calls the AI service at
`http://localhost:8001` (override with the `AI_SERVICE_URL` env var).

## The flow, end to end

1. **New Case** (`/`) — fill in applicant, vehicle and (optionally) declared
   credit score / prior insurance history, then "Open case & start chat."
2. Upload the four required items (ID, credit history, vehicle doc, vehicle
   photo) through the chat-style upload tiles — each one posts to
   `POST /api/cases/:id/documents`.
3. Once all four are in, click **Get instant decision** — this calls
   `POST /api/cases/:id/score` on the Node API, which calls
   `POST /analyze/:id` on the AI service. That runs the LangGraph pipeline:
   - **validate** — checks the four required documents are present.
   - **enrich** — MarkItDown extracts text from the ID/credit-history/vehicle
     documents; Qwen2.5-VL looks at the vehicle photo; Llama 3.2 writes a
     short case summary.
   - **retrieve** — LlamaIndex/Qdrant finds similar past cases (from the same
     SQLite history) and relevant vendor-policy clauses.
   - **score** — XGBoost predicts a 0-100 risk score from the assembled
     features, with its top contributing factors.
   - **decide** — applies the approve/reject/review thresholds and writes a
     plain-English reason.
   - **recommend** — flags a cross-sell offer for strong, clean leads.

   The result — risk score, band, image match, decision, reason, AI summary,
   top risk factors, and any degraded-mode notices — is persisted to SQLite
   and returned.
4. You land on the **Case Summary** screen, now showing the AI-generated
   summary and the XGBoost risk factors alongside the decision.
5. **Queue** (`/queue`) lists every case ever opened — the back-office
   "verification queue" view from earlier iterations of the deck.

## API reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/cases` | Create a case (applicant, vehicle, credit score, prior history) |
| GET | `/api/cases` | List all cases (the queue) |
| GET | `/api/cases/:id` | Get one case + its uploaded documents |
| POST | `/api/cases/:id/documents` | Upload a document/photo (`multipart/form-data`, fields `file` + `doc_type`) |
| POST | `/api/cases/:id/score` | Runs the AI service's LangGraph pipeline and gets a decision |

AI service (called by the Node backend, not the frontend directly):

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Reports whether Ollama is reachable |
| POST | `/analyze/:case_id` | Runs validate → enrich → retrieve → score → decide → recommend for one case |

## Wiring in the real, full-scale models later

Everything in `ai-service/` is real, working code against the real
libraries — the only things scaled down for a laptop are the model sizes and
using an embedded Qdrant instead of a standalone server. To go further:

- Set `OLLAMA_TEXT_MODEL=llama3.3` / `OLLAMA_VISION_MODEL=<full Qwen2.5-VL tag>`
  once you have the hardware/bandwidth to run them.
- Point `retrieval.py` at a standalone Qdrant server (`qdrant_client.QdrantClient(url=...)`
  instead of the local `path=` mode) if you need it shared across machines.
- Retrain `risk_xgb.json` on real historical case outcomes instead of the
  synthetic bootstrap set in `data/train_risk_model.py` once enough real
  decisions have accumulated in `cases`.
- `ollama_client.analyze_vehicle_photo()` is also where you'd later add the
  pre-/post-incident photo comparison for claims fraud (the deck's "Protect"
  step) — store the original photo's embedding and diff it against a new
  upload at claim time.

## Not included yet (on purpose, to keep this a fast starting point)

- Authentication / multiple agent logins
- A real credit-bureau API or cross-vendor insurance-history lookup (still
  keyword/field-based inputs into the model, not live integrations)
- The pre-/post-incident claims-comparison flow (only the storage hook exists)
- Deployment config (this runs locally; deploying is a separate step)
