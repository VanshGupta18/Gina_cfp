# GINA — Grounded Insight from Natural language Analytics

**NatWest Code for Purpose · 2026**

---

## What is GINA?

**GINA** turns plain English questions into **answers you can trust** over **your own** tabular data. A user uploads a CSV, chats in natural language, and gets **clear explanations**, **charts**, and **transparent SQL**—without writing queries or configuring dashboards.

| Feature            | Description |
|--------------------|-------------|
| **Grounded**       | Numbers come from **running real SQL** on **your** dataset in PostgreSQL—not invented from model weights. We follow **Table-Augmented Generation (TAG)**: the model reasons *with* the table, not *instead* of it. |
| **Insight**        | More than a single figure: trends, breakdowns, comparisons, and optional **verification queries** when the pipeline detects explain-style questions. |
| **Natural language** | You ask in everyday language; a **planner** interprets intent, then specialist steps generate **read-only** SQL and **narration**. |
| **Analytics**      | End-to-end flow from **upload** (client-side PII handling before the network) through **semantic profiling**, **vector-backed schema context** (pgvector), **query pipeline**, and **streaming UI** feedback. |

---

## The problem

Spreadsheets hide structure. Dashboards take time to build. SQL excludes most people. Teams still need **fast, accurate answers** from operational CSVs—without a new data engineering project for every question.

**GINA** offers **conversational analytics** with **auditability** (show the SQL), **visible progress** (Server-Sent Events step trace), and **tiered fallbacks** when models disagree (deterministic templates, Groq, Hugging Face).

---

## How it works

1. **Sign in** — Supabase Auth (OAuth / JWT). The API verifies every request.
2. **Upload** — A **PII shield** runs in the browser before upload; redacted files go to **S3**; the backend profiles schema and builds semantic context (**pgvector**).
3. **Ask** — You type a question. The **planner** classifies complexity and routes the pipeline.
4. **Query pipeline** — **SQL generation** picks an appropriate tier (Groq for planning and narration, Hugging Face for heavier text-to-SQL when needed, **deterministic templates** as a last resort). SQL is **validated** and executed **read-only**.
5. **Answer** — A **narrator** turns results into prose; the UI shows **charts**, **follow-up suggestions**, and **expandable SQL** (including secondary “verification” SQL when applicable).

Design patterns (TAG-style grounding, collaborating-agent routing, tiered models) are described in [`docs/Architecture.md`](docs/Architecture.md).

---

## What is in the app

- A **chat** with **live pipeline steps** (planner → SQL → execution → narration) over **SSE**.
- **Grounded outputs**: copy and visuals tied to **executed** queries, with **SQL disclosure**.
- **Demo datasets** and **snapshot** flows where enabled, for repeatable evaluation.

---

## Technology stack

| Layer | Choices |
|--------|---------|
| **Frontend** | Next.js (App Router), React, Tailwind CSS, Recharts, Supabase (`@supabase/ssr`) |
| **Backend** | Node.js, Fastify, SSE, Zod-validated config |
| **Data & auth** | PostgreSQL + **pgvector**, Supabase Auth (JWT) |
| **Storage** | AWS S3 (uploaded CSVs) |
| **Models** | Groq (planner / narrator / SQL fallback), Hugging Face (SQL tier + embeddings), optional Gemini (narration) |

Full dependency lists: [`backend/package.json`](backend/package.json), [`frontend/package.json`](frontend/package.json).

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | Next.js UI, auth, upload, chat, SSE client for `/api/query` |
| `backend/` | Fastify API, query pipeline, migrations, seeds, snapshots |
| `docs/` | Architecture, API contracts, audits, route coverage notes |

---

## Local setup

### Prerequisites

- **Node.js** 20+ and npm  
- **PostgreSQL** compatible with `backend/migrations/001_initial_schema.sql` (e.g. Supabase)  
- **`psql`** on your PATH for `npm run migrate`

### Clone

```bash
git clone https://github.com/vanshGupta18/Gina_cfp.git
cd Gina_cfp
```

### Backend

```bash
cd backend
cp .env.example .env
# Fill DATABASE_URL, Supabase, AWS, HF, Groq, Gemini — see docs
npm install
npm run migrate    # requires psql; reads backend/.env
npm run dev        # default http://localhost:3001
```

- **Production:** `npm run build && npm start`  
- **Tests:** `npm test`  

Env validation: `backend/src/config/env.ts`

### Frontend

```bash
cd ../frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL → backend (e.g. http://localhost:3001)
# NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev        # http://localhost:3000
```

- **Production:** `npm run build && npm start`

---

## Code map: UI ↔ pipeline

1. [`ChatInput`](frontend/components/chat/ChatInput.tsx) builds [`QueryPayload`](frontend/types/index.ts).  
2. [`streamQuery`](frontend/lib/api/query.ts) → `POST /api/query` with JWT; response is **SSE**.  
3. `event: step` → [`usePipeline`](frontend/lib/hooks/usePipeline.ts) / [`PipelineStep`](frontend/components/chat/PipelineStep.tsx).  
4. `event: result` → narrative, chart, SQL, optional secondary SQL, follow-ups.  
5. [`OutputCard`](frontend/components/output/OutputCard.tsx) + [`SQLExpand`](frontend/components/output/SQLExpand.tsx) for answers and SQL.  

Backend: planner → SQL (templates / Groq / HF) → validate → read-only execute → optional secondary query → narration

---

## Documentation

| Document | Contents |
|----------|----------|
| [`docs/Architecture.md`](docs/Architecture.md) | Topology, patterns, layers |