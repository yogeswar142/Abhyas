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

## Backend (Next.js & Hono)

**Project structure & API boundary:**
- Place route handlers under `src/app/api/` or use Next.js Server Actions.
- If Hono is introduced, run it as a sub-router under `/api/[[...route]]/route.ts`.
- Keep API logic lean: validate input with Zod, run business logic, query Supabase, and return a clean JSON payload.

**Zod Input Validation:**
- Never process user input directly in database queries. Always validate schemas on the server boundary first.
- Example:
  ```ts
  import { z } from 'zod';
  export const CreateInterviewSchema = z.object({
    role: z.string().min(1).max(100),
    company: z.string().min(1).max(100),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    duration: z.number().int().min(15).max(60),
    type: z.enum(['behavioral', 'system-design', 'technical', 'product', 'custom']),
  });
  ```

---

## Database Efficiency (Supabase + PostgreSQL)

As we are running on a **Supabase Free Tier plan**, we must stay strictly within network, CPU, and connection limits. Efficiency and performance must be treated as primary engineering constraints.

### 1. Optimize RLS Policies (Critical)
- **Do not run dynamic functions per row**: Avoid calling `auth.uid()` directly in a policy `USING` clause. With large tables, Postgres will call `auth.uid()` for every single row scanned, causing CPU spikes.
- **Wrap in a SELECT statement**: Always wrap identity helper functions in a subquery `(select auth.uid())` so Postgres executes it once and caches the result for the entire query.
  ```sql
  -- Incorrect (Runs auth.uid() per row)
  create policy "Users can view own interviews" on interviews
    using (auth.uid() = user_id);

  -- Correct (Executes once and caches)
  create policy "Users can view own interviews" on interviews
    to authenticated
    using ((select auth.uid()) = user_id);
  ```

### 2. Indexes on All Query Keys
- Every foreign key, filter criteria (`WHERE` clauses), and sort key (`ORDER BY`) must have an index.
- Use **composite indexes** for queries filtering on multiple columns (e.g. `user_id` and `status`).
- Use **partial indexes** if querying a subset of active rows to minimize index size.
  ```sql
  -- Index foreign key + ordering
  create index interviews_user_id_created_at_idx on interviews (user_id, created_at desc);
  ```

### 3. Eliminate N+1 Queries & Redundant Hits
- **Batch fetching**: When rendering lists (e.g., sessions with their latest reports), query the database using joins or subqueries instead of running multiple independent queries in loops.
- **Explicit Selects**: Never use `select('*')` unless you actually need every column. Select only the necessary columns to reduce memory usage and network payload.
  ```ts
  // Correct: select specific columns
  const { data } = await supabase
    .from('interviews')
    .select('id, role, company, status, created_at')
    .eq('user_id', userId);
  ```

### 4. Connection Pool Management
- Do not instantiate new Supabase clients per request on the server. Reuse a single shared instance or utilize `@supabase/ssr` contexts.
- Avoid persistent WebSockets / Realtime subscriptions unless absolutely required by the user interface. Prefer stateless HTTPS queries.

### 5. Enforce Query Limits & Pagination
- Set hard limits on all list endpoints and user queries. Never fetch unbounded tables.
  ```ts
  const { data } = await supabase
    .from('interviews')
    .select('id, role, company')
    .limit(20);
  ```

### 6. Correct Schema Data Types
- Use `uuid` for IDs instead of `text` or sequence ints.
- Use `timestamptz` for dates to store timezone-aware timestamps.
- Use `varchar(N)` or constraints instead of unbounded `text` where size limits are known.

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

## Design System

All UI work on Abhyas must follow this design system exactly. The goal is a design that feels like **Linear, Stripe, or Notion** — premium, intentional, and monochrome with a single green accent. Not an "AI startup" landing page.

### Color Tokens (`src/app/globals.css`)

All values are defined as CSS custom properties in `:root` and `.light-theme`. **Never hardcode hex values in components** — always use the token.

#### Dark Mode (default)
| Token | Value | Usage |
|---|---|---|
| `--bg-0` | `#09090B` | Page background |
| `--bg-1` | `#111113` | Section alternates, nav |
| `--bg-2` | `#18181B` | Cards, inputs |
| `--bg-3` | `#27272A` | Elevated cards, active states |
| `--surface` | `rgba(255,255,255,0.03)` | Subtle surface overlays |
| `--surface-hv` | `rgba(255,255,255,0.055)` | Hover surface overlays |
| `--border` | `rgba(255,255,255,0.08)` | Default borders |
| `--border-hv` | `rgba(255,255,255,0.15)` | Hover / focus borders |
| `--text-0` | `#FAFAFA` | Primary text, headings |
| `--text-1` | `#A1A1AA` | Secondary text, subheadings |
| `--text-2` | `#71717A` | Muted labels, descriptions |
| `--text-3` | `#3F3F46` | Disabled, placeholders |
| `--accent` | `#22C55E` | **Primary CTA only** |
| `--accent-hv` | `#16A34A` | Hover state for accent |
| `--accent-dim` | `rgba(34,197,94,0.10)` | Glow / shadow on accent |
| `--accent-soft` | `rgba(34,197,94,0.06)` | Tinted backgrounds |
| `--success` | `#22C55E` | Success states |
| `--warning` | `#F59E0B` | Warning states |
| `--error` | `#EF4444` | Error states |

#### Light Mode overrides (`.light-theme`)
| Token | Value |
|---|---|
| `--bg-0` | `#FAFAFA` |
| `--bg-1` | `#F4F4F5` |
| `--bg-2` | `#E4E4E7` |
| `--bg-3` | `#D4D4D8` |
| `--text-0` | `#09090B` |
| `--text-1` | `#27272A` |
| `--text-2` | `#52525B` |
| `--text-3` | `#71717A` |
| `--accent` | `#16A34A` *(darker for contrast on white)* |
| `--accent-hv` | `#15803D` |

### Gradient
Only two gradient uses are permitted:
1. **Hero headline italic word** — `linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)`
2. **CTA section `<em>` word** — same gradient

No other gradient backgrounds, borders, or text in the entire UI.

### Typography
- **Font**: `Inter` (weights 400, 500, 600, 700, 800) for all UI text
- **Accent font**: `Instrument Serif` italic — used only for the hero headline word and CTA `<em>` word
- **Heading scale**: `clamp()` based — see `.hero-headline` and `.section-headline` in CSS
- **Line height**: 1.6 for body, 1.07–1.1 for headings, 1.7 for descriptions
- **Letter spacing**: `-0.04em` for large headings, `-0.025em` for card titles, `0.08–0.12em` for eyebrows/labels

### Spacing & Radius
| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Buttons, tags, small chips |
| `--radius` | `12px` | Cards, inputs |
| `--radius-lg` | `18px` | Hero cards, modals |
| `--radius-xl` | `28px` | Large containers |

Section padding: `8rem 2rem` desktop, `4–5rem 1.25rem` mobile.

### Component Rules

**Buttons:**
- Primary CTA: `background: var(--accent)`, `color: #ffffff`, pill or rounded-sm
- Ghost: `color: var(--text-2)`, no background, hover reveals `var(--surface-hv)`
- Never use gradient backgrounds on buttons

**Cards:**
- Background: `var(--bg-1)` or `var(--bg-2)`
- Border: `1px solid var(--border)`
- Hover: `border-color: var(--border-hv)`, `transform: translateY(-2px)`
- No box-shadow glow effects — use subtle `var(--shadow)` only

**Status / Live indicators:**
- Use `var(--accent)` (green) for "live", "active", "success" dots — this is the only semantic use of color outside of CTAs
- Error states: `var(--error)` (#EF4444)
- Warnings: `var(--warning)` (#F59E0B)

**Section eyebrows (labels above headings):**
- `font-size: 0.72rem`, `font-weight: 600`, `letter-spacing: 0.12em`, `text-transform: uppercase`, `color: var(--text-3)`

### Design Anti-Patterns — Never Do These

- **No purple** (`#7c3aed`, `#8b5cf6`, `#a78bfa`) anywhere in the UI
- **No purple → blue → cyan gradients** — this is the #1 "AI startup" signal
- **No pink** (`#ec4899`, `#f43f5e`) in the design
- **No per-element rainbow coloring** — e.g. step 1 purple, step 2 blue, step 3 pink
- **No glowing box-shadows** in purple/blue (`0 0 15px rgba(124,58,237,0.4)`)
- **No gradient clip-text** except the two permitted gradient uses above
- **No gradient backgrounds on buttons, cards, or badges** other than the hero/CTA text
- **No scroll progress bars in multiple colors** — use `bg-white/20`
- **No AI orb** (the generic purple→blue→cyan glowing sphere used on every AI landing page)
- **Don't add color to sections just to distinguish them** — use typography hierarchy instead
- **No container padding collisions (squishing)** — when building complex layouts inside wrapper elements (like `Card`), always set `padding="none"` (or `p-0`) on the wrapper if it contains headers, scroll elements, or footers. Align inner layout blocks directly to outer borders to prevent double-padding and elements overlapping.
- **No low contrast text on background fills** — never use low contrast/dimmed text colors (like secondary text on soft green/tinted backgrounds). Ensure text on any container fill uses high contrast colors (like primary white `var(--text-0)` or `#FAFAFA`) to guarantee instant readability.

### The Rule of One Accent
The green `#22C55E` appears in:
1. Primary CTA buttons ("Begin your practice", "Start Pro trial", etc.)
2. The hero italic headline word
3. The CTA section `<em>` word  
4. Status dots (live session indicator)
5. Score bar fill
6. Active tag states (selected interview type)
7. The Pro pricing card border (subtle: `rgba(34,197,94,0.28)`)
8. The plan badge on the Pro card

Everywhere else is zinc neutral. If you're tempted to add green somewhere else, **don't**.

---

## What not to do

- Don't add abstraction layers you don't need yet.
- Don't add a cache before you've measured a slow query.
- Don't write a test for code that doesn't exist yet.
- Don't use `TODO` comments as a substitute for a GitHub issue.
- Don't ship a feature without error states.
- Don't log sensitive user data (email, full transcript content in plain text).
- Don't introduce new colors outside the design system tokens above.
