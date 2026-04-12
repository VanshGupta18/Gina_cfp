# GINA — Grounded Insight from Natural language Analytics

**NatWest Code for Purpose · 2026**

---

## What is GINA?

**GINA** turns plain English questions into **answers you can trust** over **your own** tabular data. A non-technical user uploads a CSV, chats in natural language, and gets **clear explanations**, **charts**, and **transparent SQL**—without writing queries or configuring dashboards.

The name captures the product promise:

| | |
|---|---|
| **Grounded** | Every number is produced by **running real SQL** on **your** dataset in PostgreSQL—not invented from model weights. We follow **Table-Augmented Generation (TAG)**: the model reasons *with* the table, not *instead* of it. |
| **Insight** | Beyond a single cell: trends, breakdowns, comparisons, and optional **verification queries** when the pipeline detects explain-style questions. |
| **Natural language** | You ask in everyday language; a **planner** interprets intent, then specialist steps generate **read-only** SQL and **narration**. |
| **Analytics** | End-to-end flow from **upload** (with client-side PII handling) through **semantic profiling**, **vector-backed schema context**, **query pipeline**, and **streaming UI** feedback. |

---

## The problem we solve

Spreadsheets hide structure. Dashboards take time to build. SQL excludes most people. Teams still need **fast, accurate answers** from operational CSVs—donations, expenses, grants—without a data engineering project for every question.

**GINA** bridges that gap: **conversational analytics** with **auditability** (show the SQL), **progress you can see** (Server-Sent Events step trace), and **sensible fallbacks** when models disagree (template SQL, multiple LLM tiers).

---

## How GINA works (high level)

1. **Sign in** — Supabase Auth (OAuth / JWT). The backend verifies every API call.
2. **Upload** — CSVs are processed with a **PII shield** in the browser before upload; redacted files land in **S3**, and schema is profiled and enriched for semantic search (**pgvector**).
3. **Ask** — You type a question. The **planner** classifies complexity and routes the pipeline.
4. **Query pipeline** — **SQL generation** uses the right tier for the job (e.g. Groq for planning and narration, Hugging Face for heavier text-to-SQL when needed, **deterministic templates** as a last resort). SQL is **validated** and executed under a **read-only** posture.
5. **Answer** — A **narrator** turns tabular results into short prose; the UI can show **charts**, **follow-up suggestions**, and **expandable SQL** (including a secondary verification query when applicable).

Architectural patterns we explicitly build on are documented in [`docs/Architecture.md`](docs/Architecture.md): TAG-style grounding, collaborating-agent style routing vs generation, and tiered models for reliability and cost.

---

## What judges see in the product

- A **modern chat** with **live pipeline steps** (planner → SQL → execution → narration) streamed over **SSE**.
- **Grounded outputs**: narrative and visuals tied to **executed** queries, with **SQL disclosure** for transparency.
- **Demo datasets** and **snapshot** tooling where configured, so flows are easy to evaluate consistently.

---

## Technology stack

| Layer | Choices |
|--------|---------|
| **Frontend** | Next.js (App Router), React, Tailwind CSS, Recharts, Supabase client (`@supabase/ssr`) |
| **Backend** | Node.js, Fastify, SSE, Zod-validated configuration |
| **Data & auth** | PostgreSQL + **pgvector**, Supabase Auth (JWT) |
| **Storage** | AWS S3 for uploaded CSVs |
| **Models** | Groq (planner / narrator / SQL fallback), Hugging Face (SQL tier + embeddings), optional Gemini for narration |

Dependencies are listed in [`backend/package.json`](backend/package.json) and [`frontend/package.json`](frontend/package.json).

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | Next.js UI, auth, upload, chat, SSE client for `/api/query` |
| `backend/` | Fastify API, full query pipeline, migrations, seeds, snapshots |
| `docs/` | Architecture, API contracts, audits, implementation notes |

---

## Local setup

### Prerequisites

- **Node.js** 20+ and npm  
- **PostgreSQL** compatible with `backend/migrations/001_initial_schema.sql` (e.g. Supabase)  
- **`psql`** on your PATH for `npm run migrate`

### 1. Clone

```bash
git clone https://github.com/<your-username>/<repository>.git
cd <repository>
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, Supabase, AWS, HF, Groq, Gemini (see docs)
npm install
npm run migrate    # requires psql; loads backend/.env
npm run dev        # http://localhost:3001 (or PORT in .env)
```

- **Production:** `npm run build && npm start`  
- **Tests:** `npm test`  

Validated environment variables: `backend/src/config/env.ts` · full reference: [`docs/Backend_Master.md`](docs/Backend_Master.md#2-environment-variables).

### 3. Frontend

```bash
cd ../frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL → backend origin (e.g. http://localhost:3001)
# NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase
npm install
npm run dev        # http://localhost:3000
```

- **Production build:** `npm run build && npm start`

---

## How the UI maps to the pipeline (implementation)

1. User sends a question — [`ChatInput`](frontend/components/chat/ChatInput.tsx) builds [`QueryPayload`](frontend/types/index.ts).  
2. [`streamQuery`](frontend/lib/api/query.ts) calls `POST /api/query` with the Supabase JWT; the response is **Server-Sent Events**.  
3. Each `event: step` updates [`usePipeline`](frontend/lib/hooks/usePipeline.ts); [`PipelineStep`](frontend/components/chat/PipelineStep.tsx) maps backend steps to labels.  
4. `event: result` delivers narrative, chart, SQL, optional secondary SQL, follow-ups.  
5. [`OutputCard`](frontend/components/output/OutputCard.tsx) renders the answer; [`SQLExpand`](frontend/components/output/SQLExpand.tsx) shows primary (and verification) SQL.  

Backend flow: planner → SQL generation (templates / Groq / Hugging Face) → validation → read-only execution → optional secondary query → narration. Details: [`docs/Backend_Master.md`](docs/Backend_Master.md).

---

## Documentation (`docs/`)

| Document | Contents |
|----------|----------|
| [`docs/Architecture.md`](docs/Architecture.md) | System overview, deployment topology, design patterns |
| [`docs/Backend_Master.md`](docs/Backend_Master.md) | API, SSE events, env vars, pipeline |
| [`docs/Frontend_Master.md`](docs/Frontend_Master.md) | UI structure, routes, contracts |
| [`docs/Backend_Implementation_Plan.md`](docs/Backend_Implementation_Plan.md) | Backend delivery notes |
| [`docs/Backend_Audit.md`](docs/Backend_Audit.md) / [`docs/Frontend_Audit.md`](docs/Frontend_Audit.md) | Audits |

---

## For submission

- Do **not** commit `.env`, `.env.local`, or secrets; use `.env.example` files as templates.  
- After pushing to GitHub, your submission link is: `https://github.com/<your-username>/<repository>`.  
- Add a **LICENSE** if the programme requires one.
