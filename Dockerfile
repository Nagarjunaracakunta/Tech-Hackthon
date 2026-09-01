# SpotShield — single-container build for a Hugging Face Docker Space.
# Bundles: React client (built + served statically), Node/Express API,
# Python/FastAPI AI service, and the Ollama daemon with its models baked
# in at build time (so a cold start doesn't need to re-download them).

FROM node:20-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates build-essential git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

COPY ai-service/requirements.txt ai-service/requirements.txt
RUN pip install --no-cache-dir -r ai-service/requirements.txt

COPY server/package*.json server/
RUN cd server && npm ci --omit=dev

COPY ai-service/ ai-service/
COPY server/ server/
COPY --from=client-build /app/client/dist client/dist

# Pre-pull models at build time — bakes them into the image layer so the
# container doesn't hit the network (or a cold-start delay) for them later.
# Swapped to smaller/faster models here vs. the deck's full-size stack —
# see README's "Model choices" note for why.
ENV OLLAMA_HOST=http://127.0.0.1:11434
RUN ollama serve & \
    for i in $(seq 1 30); do curl -sf http://127.0.0.1:11434/api/tags >/dev/null && break; sleep 1; done && \
    ollama pull llama3.2:3b && \
    ollama pull moondream && \
    ollama pull nomic-embed-text && \
    (pkill ollama || true) && sleep 1

ENV OLLAMA_TEXT_MODEL=llama3.2:3b \
    OLLAMA_VISION_MODEL=moondream \
    OLLAMA_EMBED_MODEL=nomic-embed-text \
    AI_SERVICE_URL=http://127.0.0.1:8001 \
    PORT=7860

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 7860
CMD ["/app/entrypoint.sh"]
