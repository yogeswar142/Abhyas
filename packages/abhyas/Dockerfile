FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci

COPY . .

# Build TypeScript
RUN npx tsc --skipLibCheck 2>/dev/null || npm run build

EXPOSE 11435

ENV ABHYAS_PORT=11435
ENV OLLAMA_URL=http://host.docker.internal:11434

# Full mode: serves Edge-TTS (/tts/generate) AND Ollama proxy (/interview/chat, /health).
# TTS works even when Ollama is offline. Start Ollama on the host (localhost:11434) for interview AI.
CMD ["node", "dist/cli.js", "run", "--port", "11435"]
