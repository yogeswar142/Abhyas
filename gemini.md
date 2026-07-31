# Gemini Rules — Abhyas

Engineering and prompting rules for working on the Abhyas codebase with AI assistance.
These apply to every code change, database interaction, and feature addition.

---

## Core Rules

**Be specific, not verbose.**
When writing a prompt or a function, say exactly what you mean. Don't add context that doesn't affect the output. Long prompts with vague requirements produce mediocre code.

**One thing per prompt.**
Ask for one file, one function, or one fix at a time. Batching unrelated changes into a single prompt increases the chance of silent errors.

**Always supply the surrounding context.**
Before asking for a change, show the relevant file or function. Never describe what code does — show it.

**Don't ask to generate boilerplate you already have.**
Reuse existing patterns from the codebase. If a pattern doesn't exist yet, define it once in the right place, then reference it.

---

## Code Quality

**No commented-out code.** Delete it. That's what git is for.

**No dead imports.** Every import must be used.

**No `any` types in TypeScript.** Define the shape properly or use `unknown` and narrow it.

**No magic numbers.** If a number appears more than once, name it.

**Keep functions short.** If a function does two things, split it. If it needs a comment to explain what it does, rename it instead.

**Prefer explicit over clever.** A readable `if` statement beats a two-liner that requires a second read.

**Error paths are first-class.** Handle failures before the happy path. If something can go wrong, write that branch first.

---

## Frontend (Next.js 16 + React 19 + Tailwind v4 + shadcn/ui)

**Component structure:**
```
src/
  app/           # Next.js app router pages and layouts
  components/
    ui/          # shadcn primitives (never modify directly)
    [feature]/   # feature-scoped components
  lib/           # utilities, api clients, constants
  hooks/         # custom React hooks
  types/         # shared TypeScript types
```

**Naming:**
- Components: `PascalCase`
- Files: `kebab-case`
- Hooks: `useFeatureName`
- Constants: `SCREAMING_SNAKE_CASE`

**Server vs client:**
- Default to Server Components.
- Only add `'use client'` when you need interactivity (event handlers, state, browser APIs).
- Never put `'use client'` on a layout.

**Data fetching:**
- Fetch in Server Components. Pass data down as props.
- For client-side mutations, use Server Actions or a typed API route.
- Never fetch inside a `useEffect` when a Server Component can do it.

**shadcn/ui:**
- Use existing primitives. Don't re-implement `Button`, `Dialog`, `Select`, etc.
- Extend through `className` and `variant` props, not by rewriting the component.
- Run `npx shadcn@latest add [component]` to add new ones.

**Tailwind v4:**
- Define design tokens in `app/globals.css` using CSS variables.
- Avoid arbitrary values like `w-[327px]`. If you need it once, name it.
- Keep utility classes grouped: layout → spacing → typography → color → state.

---

## Backend (FastAPI)

**Project structure:**
```
backend/
  app/
    api/         # route handlers, grouped by feature
    core/        # config, security, dependencies
    models/      # SQLAlchemy models
    schemas/     # Pydantic request/response schemas
    services/    # business logic, never in route handlers
    db/          # database setup, migrations
  tests/
  alembic/       # migration files
  main.py
```

**Routes are thin.**
No business logic in route handlers. Route handlers validate input, call a service, return the result.

```python
@router.post("/sessions", response_model=SessionResponse)
async def create_session(body: CreateSessionRequest, db: AsyncSession = Depends(get_db)):
    return await session_service.create(db, body)
```

**Always use async.**
All database calls, external API calls, and I/O must be `async`. Use `AsyncSession` from SQLAlchemy.

**Pydantic schemas are not models.**
Keep SQLAlchemy models and Pydantic schemas separate. Never return a raw ORM object from a route.

**Dependency injection for everything shared.**
Database sessions, current user, rate limiters — all via `Depends()`. Never instantiate these inside a function.

**Config:**
```python
# core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_key: str
    gemini_api_key: str
    
    class Config:
        env_file = ".env"
```
No hardcoded values. No secrets in code. No `os.getenv` scattered across files.

---

## Database (PostgreSQL + Supabase)

**Migrations are mandatory.**
Every schema change goes through Alembic. Never alter a table manually in production.

```bash
# Generate a migration
alembic revision --autogenerate -m "add sessions table"

# Apply
alembic upgrade head
```

**Never use raw SQL strings.**
Use SQLAlchemy ORM or SQLAlchemy `text()` with bound parameters for anything dynamic.

```python
# Wrong
query = f"SELECT * FROM users WHERE email = '{email}'"

# Right
result = await db.execute(select(User).where(User.email == email))
```

**Connection pooling.**
Use `asyncpg` with SQLAlchemy async engine. Set `pool_size`, `max_overflow`, and `pool_pre_ping=True`.

```python
engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

**Indexes on anything you query.**
Every foreign key, every `WHERE` field, every `ORDER BY` field needs an index. Define them in migrations, not as afterthoughts.

**Soft deletes, not hard deletes.**
Add `deleted_at: timestamp | null` to sensitive tables. Never `DELETE` user data.

**Row-level security via Supabase.**
Define RLS policies for every table users can access. Never rely solely on application-level checks.

**Transactions for multi-step writes.**
If you write to more than one table, use a transaction.

```python
async with db.begin():
    await db.execute(insert_session)
    await db.execute(insert_transcript)
```

---

## AI / Gemini Integration

**Stream responses, don't block.**
Use the streaming API. Don't make users wait 8 seconds for a full response before showing anything.

**System prompts are code.**
Version-control them. Store them in `backend/app/prompts/`. One file per prompt type.

**Temperature discipline.**
- Structured output (JSON, scores, summaries): `temperature=0.1`
- Conversational interview: `temperature=0.7`
- Never use `temperature=1.0` in production

**Always validate model output.**
Parse JSON from the model with Pydantic. If parsing fails, catch it, log it, return a graceful error — never surface the raw model output to the user.

**Rate limiting:**
Apply per-user rate limits on all AI endpoints. Track usage in the database.

---

## Security

**Auth via Supabase JWT.**
Verify the JWT on every protected route. Never skip this in "dev mode."

**No secrets in `.env.example`.**
Show the key names, not the values.

```
GEMINI_API_KEY=
SUPABASE_KEY=
DATABASE_URL=
```

**CORS is explicit.**
List allowed origins. Never use `*` in production.

**Input validation at the boundary.**
Validate and sanitize everything at the Pydantic schema level before it reaches a service or a database query.

---

## Git

**One commit = one change.**
Don't commit unrelated changes together.

**Commit message format:**
```
feat: add session creation endpoint
fix: handle null transcript in feedback parser
chore: add pool_pre_ping to database engine
refactor: move session logic to service layer
```

**Never commit:**
- `.env` files
- `__pycache__`, `.pyc`
- `node_modules`
- API keys, tokens, secrets of any kind

---

## What not to do

- Don't add abstraction layers you don't need yet.
- Don't add a cache before you've measured a slow query.
- Don't write a test for code that doesn't exist yet.
- Don't use `TODO` comments as a substitute for a GitHub issue.
- Don't ship a feature without error states.
- Don't log sensitive user data (email, full transcript content in plain text).
