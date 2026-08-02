# @abhyas/bridge

Local bridge between the Abhyas website and Ollama on your machine.

## Quick start

```bash
cd packages/abhyas
npm install
npm run build
npx abhyas-bridge run
```

1. Ensure Ollama is running and a model is pulled.
2. Pick a model when prompted (auto-selects if only one).
3. Copy the printed URL (port auto-resolves if busy).
4. Paste it into Abhyas → Settings → Local AI (or the interview pre-check).

## Commands

- `abhyas-bridge run` — start bridge (interactive model select + auto-port)
- `abhyas-bridge health` — check Ollama
- `abhyas-bridge models` — list models

Flags: `--port`, `--model`, `--ollama`

## API

- `GET /health` — status + models
- `GET /models` — model list
- `POST /chat` — raw Ollama chat (SSE)
- `POST /interview/chat` — interviewer prompts + capped generation (SSE)
