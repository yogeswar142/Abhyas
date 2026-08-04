# Abhyas

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

Run the app effortlessly without Node/dependency setup issues:

```bash
git clone https://github.com/yogeswar142/Abhyas.git
cd Abhyas

# Development mode (Hot-reloading enabled)
docker compose -f docker-compose.dev.yml up

# Production build mode
docker compose up --build
```
Open `http://localhost:3000`.

### Option 2: Using Node.js locally

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

MIT
