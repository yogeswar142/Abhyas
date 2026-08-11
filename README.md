# Abhyas AI

Most people prepare for interviews alone — reading leetcode solutions, rehearsing answers in their head, or asking a friend who's equally nervous. It doesn't work.

**Abhyas** is a platform where you practice with an AI that behaves like an actual interviewer. It listens, pushes back, and gives you a structured breakdown of what went wrong — not just encouragement.

The name is Sanskrit for *practice*. That's the entire premise.

---

## What we're building

A mock interview platform that adapts to the candidate, not the other way around.

When you start a session, you pick your target role and company. The AI takes it from there — asking real questions, following up when your answer is vague, and challenging your assumptions when you're too comfortable. After the session, you get a report that breaks down your performance across clarity, structure, confidence, and technical accuracy.

We're not trying to simulate a friendly conversation. We're trying to simulate pressure.

**Session types:**
- Behavioral (STAR method, leadership, conflict)
- System design
- Technical coding walk-throughs
- Product sense and metrics
- Custom — paste a JD, get a tailored session in seconds

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 · React 19 · Tailwind v4 · shadcn/ui |
| Backend | FastAPI (Python) |
| Database | PostgreSQL via Supabase |

---

## Running locally

### Option 1: Using Docker (Recommended for Team Members)

### 3. Run the App

#### Step 1: Start Backend & Frontend via Docker
```bash
docker compose up
```
This runs:
- **Backend (Hono)**: `http://localhost:4000`
- **Frontend (Next.js)**: `http://localhost:3000`

#### Step 2: Start Ollama & Abhyas Local Bridge Manually
Since `@abhyas/bridge` directly connects your browser with your local GPU/CPU hardware and interactive CLI model selection, run it natively on your host machine:

1. **Start Ollama** (in a separate terminal or desktop app):
   ```bash
   ollama serve
   ```

2. **Start Abhyas Bridge**:
   ```bash
   cd packages/abhyas
   npm run dev
   ```
   *Or build & run CLI:*
   ```bash
   npm run build && npx abhyas-bridge run
   ```

3. Open `http://localhost:3000`, paste the printed bridge URL (e.g. `http://localhost:11435`) during pre-session setup, and begin your interview! Using Node.js locally

```bash
git clone https://github.com/yogeswar142/Abhyas.git
cd Abhyas

npm install
cp .env.local.example .env.local
npm run dev
```
Open `http://localhost:3000`.


---

## Status

We're in early development. The landing page is live. The platform is being built.

If you're a candidate who wants early access, or an engineer who wants to contribute — reach out.

---

## License

[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)

This project is open-source software built to help candidates and students practice for free on their local devices. Under AGPL-3.0:
- Anyone is free to use, modify, and host this software locally or for personal use.
- Any company or individual offering a modified version of this software as a hosted service or commercial product **must publish their source code publicly under the same AGPL-3.0 license**.

