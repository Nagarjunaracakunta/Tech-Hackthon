#!/bin/sh
set -e

echo "[entrypoint] starting Ollama daemon..."
ollama serve &

echo "[entrypoint] waiting for Ollama..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "[entrypoint] Ollama ready."
    break
  fi
  sleep 1
done

echo "[entrypoint] starting AI service (FastAPI/uvicorn) on :8001..."
(cd /app/ai-service && uvicorn app.main:app --host 0.0.0.0 --port 8001) &

echo "[entrypoint] waiting for AI service..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8001/health >/dev/null 2>&1; then
    echo "[entrypoint] AI service ready."
    break
  fi
  sleep 1
done

echo "[entrypoint] starting Node API + client on :${PORT:-7860}..."
cd /app/server
exec node src/index.js
