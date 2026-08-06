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

# TTS-only mode: no Ollama required — only /tts/generate endpoint is served
CMD ["node", "dist/cli.js", "run", "--tts-only", "--port", "11435"]
