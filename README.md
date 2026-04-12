# Gina — Talk to Data

Natural-language analytics over uploaded CSVs: a **Next.js** chat UI talks to a **Fastify** backend that plans queries, generates read-only SQL (Groq, Hugging Face, templates), runs it on **PostgreSQL**, and narrates results. Auth via **Supabase**; files in **S3**.

**Stack:** Node.js · TypeScript · Fastify · Next.js (App Router) · PostgreSQL + pgvector · Supabase Auth · AWS S3 · SSE streaming.

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | Next.js 15 UI, Supabase client, SSE client for `/api/query` |
| `backend/` | Fastify API, pipeline (planner → SQL → DB → narrator), migrations |
| `docs/` | Architecture and API specs (see below) |

---

## Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** with extensions used in `backend/migrations/001_initial_schema.sql` (e.g. Supabase hosted Postgres)
- **`psql`** on your PATH (for `npm run migrate` — applies the SQL migration file)

---

## Dependencies

Install per package (no root workspace `package.json`):

- **Backend:** see [`backend/package.json`](backend/package.json) — Fastify, `@supabase/supabase-js`, `pg`, `groq-sdk`, `@huggingface/inference`, AWS SDK, etc.
- **Frontend:** see [`frontend/package.json`](frontend/package.json) — Next.js 15, React 18, Tailwind, Recharts, `@supabase/ssr`

---

## Setup

### 1. Clone

```bash
git clone https://github.com/<your-username>/<repository>.git
cd <repository>
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, Supabase, AWS, HF, Groq, Gemini keys (see docs)
npm install
npm run migrate    # requires psql; loads backend/.env
npm run dev        # http://localhost:3001 (or PORT in .env)
```

- **Production:** `npm run build && npm start`
- **Tests:** `npm test`

Environment variables are validated at startup (`backend/src/config/env.ts`). Full annotated list: [`docs/Backend_Master.md`](docs/Backend_Master.md#2-environment-variables).

### 3. Frontend

```bash
cd ../frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL to your backend origin (e.g. http://localhost:3001)
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase
npm install
npm run dev        # http://localhost:3000
```

- **Production build:** `npm run build && npm start`

---

## How the chat maps to the pipeline

1. User sends a question — [`ChatInput`](frontend/components/chat/ChatInput.tsx) builds [`QueryPayload`](frontend/types/index.ts).
2. [`streamQuery`](frontend/lib/api/query.ts) calls `POST /api/query` with the Supabase JWT; the response is **Server-Sent Events**.
3. Each `event: step` updates [`usePipeline`](frontend/lib/hooks/usePipeline.ts); [`PipelineStep`](frontend/components/chat/PipelineStep.tsx) maps backend step names to labels.
4. `event: result` delivers narrative, chart, SQL, optional secondary SQL, follow-ups.
5. [`OutputCard`](frontend/components/output/OutputCard.tsx) renders the answer; [`SQLExpand`](frontend/components/output/SQLExpand.tsx) shows primary (and verification) SQL.

Backend: planner → SQL generation (templates / Groq / HF) → validation → read-only execution → optional secondary `GROUP BY` → narration. Details: [`docs/Backend_Master.md`](docs/Backend_Master.md).

---

## Documentation (`docs/`)

| Document | Contents |
|----------|----------|
| [`docs/Architecture.md`](docs/Architecture.md) | System overview |
| [`docs/Backend_Master.md`](docs/Backend_Master.md) | API, SSE events, env vars, pipeline |
| [`docs/Frontend_Master.md`](docs/Frontend_Master.md) | UI structure, routes, contracts |
| [`docs/Backend_Implementation_Plan.md`](docs/Backend_Implementation_Plan.md) | Backend delivery notes |
| [`docs/Backend_Audit.md`](docs/Backend_Audit.md) / [`docs/Frontend_Audit.md`](docs/Frontend_Audit.md) | Audits |

---

## Submitting this project

1. Push the repo to GitHub (do **not** commit `.env`, `.env.local`, or secrets).
2. Confirm `.gitignore` excludes env files and build output (`node_modules`, `backend/dist`, `frontend/.next`).
3. Use your public repo URL for submission, for example: `https://github.com/<your-username>/<repository-name>`.

---

## License / attribution

Project context: **NatWest Code for Purpose 2026** (see `backend/package.json` description). Add a `LICENSE` file if your submission requires one.
