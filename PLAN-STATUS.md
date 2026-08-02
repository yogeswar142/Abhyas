# Abhyas — Session Plan & Status

Last updated: 2026-08-02  
Branch context: `omega` · hybrid local AI mock interview platform

---

## Vision (locked)

Desktop voice-first AI mock interviews with hybrid local+cloud architecture.  
**This phase focus:** package + bridge connect + mic verify + AI text replies.  
**Deferred:** Whisper STT, Piper TTS, RAG, knowledge graph, cloud planner, real evaluation engine.

---

## Plans we made

### Architecture decisions

| Decision | Choice |
|----------|--------|
| AI path | Browser → `@abhyas/bridge` → Ollama (not through Hono) |
| Discovery | User pastes bridge localhost URL (no auto LAN discovery) |
| Connect + mic | Pre-session gate on `/interview/[id]` before questions |
| Voice | Mic verify only; AI replies = text for now |
| Prompts | Live inside `@abhyas/bridge`; applied on `/interview/chat` |
| Hono backend | Persistence only (Supabase interviews/messages) |
| UI safety | Prefer `--v-*` inline styles; avoid Tailwind breakage |

### Slice 1 — `@abhyas/bridge` package

- Working CLI (`abhyas-bridge run / health / models`)
- Short pretty terminal logs
- Interactive model select when multiple models found
- Auto-port resolve if preferred port busy
- Interviewer prompts by type + difficulty (short answers, one question at a time)
- HTTP: `GET /health`, `GET /models`, `POST /chat`, `POST /interview/chat` (SSE)

### Slice 2 — Backend

- No Ollama proxy through Hono
- Keep interviews/messages APIs as persistence
- No auto-port on Hono required for this phase

### Slice 3 — Frontend

- `src/lib/bridge.ts` client + `localStorage` (`abhyas.bridge`)
- Pre-session: paste URL → test health → pick model
- Mic verification: real `getUserMedia` + level meter + optional Web Speech “what we heard”
- Interview session streams AI text via bridge; persist messages via Hono
- Settings tab for default bridge URL/model

### Explicitly deferred (later phases)

- Whisper / Piper / full voice loop
- Cloud planner (Gemini/OpenAI)
- RAG / knowledge graph
- Real scoring/evaluation engine
- npm publish of bridge
- Auto-discovery without paste URL

---

## Session wrap / scoring (added 2026-08-02)

### Done
- System chat: interviewer joined / left + analyzing wait message
- Closing reply: premade templates + short local-model performance line
- Efficient scoring: per-turn `/interview/score-turn` (one Q+A only), average at end — no full transcript dump
- Status `analyzing` while scoring; then evaluation report
- Dashboard/Reports show **Calculating…** for analyzing; excluded from avg metrics until `completed` with scores

### DB migration required
Run: `supabase/migrations/20260802000001_system_messages_and_turn_scores.sql`
(allows `system` sender + `turn_scores` JSONB + stats avg only when scored)

### Bridge endpoints
- `POST /interview/score-turn`
- `POST /interview/closing`


### Done (earlier phase)

| Item | Location | Notes |
|------|----------|--------|
| Bridge modules | `packages/abhyas/src/` | `cli`, `server`, `ollama`, `port`, `logger`, `prompts/interviewer` |
| Package build | `packages/abhyas/dist/` | `tsc` succeeded; `bin` → `dist/cli.js` |
| Package README | `packages/abhyas/README.md` | How to run + paste URL |
| Frontend bridge client | `src/lib/bridge.ts` | health, stream SSE, localStorage, score-turn, closing |
| Session prep UI | `src/components/interview/SessionPrep.tsx` | Connect + mic gate |
| Interview page wired | `src/app/(app)/interview/[id]/page.tsx` | Join/leave/closing/analyzing + per-turn scores |
| Settings Local AI tab | `src/app/(app)/settings/page.tsx` | URL + test + model + save to localStorage |
| Ollama smoke test | local machine | `/health` healthy; `/interview/chat` SSE streamed with `qwen2.5:3b` |

### Still deferred / later

| Item | Status |
|------|--------|
| Voice (Whisper / TTS) | Deferred by design |
| Full browser UI walkthrough | Confirm styled pages in browser |
| Create-page mic bars | Cosmetic only; real check is on session prep |

### How to use now

```bash
cd packages/abhyas && npm run build && npx abhyas-bridge run
# or non-interactive:
npx abhyas-bridge run --model qwen2.5:3b
```

1. Copy printed URL (e.g. `http://localhost:11435`)
2. Settings → Local AI → paste → Test → Save  
   **or** paste during interview pre-session gate
3. Create interview → mic verify → start → text AI replies

### Success criteria checklist

- [x] `abhyas-bridge run` detects Ollama, model pick, auto-port, prints pasteable URL
- [x] Website accepts URL + health/models (prep + Settings)
- [x] Mic level + heard preview (Speech API when available)
- [x] Interview asks via local model prompts (wired)
- [x] Confirmed `/health` + streaming chat against real Ollama
- [x] Settings Local AI section
- [ ] Optional: full browser click-through on styled pages

---

## Key files

```
packages/abhyas/src/cli.ts
packages/abhyas/src/server.ts
packages/abhyas/src/prompts/interviewer.ts
src/lib/bridge.ts
src/components/interview/SessionPrep.tsx
src/app/(app)/interview/[id]/page.tsx
src/app/(app)/settings/page.tsx
Project-Blueprint.md
PLAN-STATUS.md
```
