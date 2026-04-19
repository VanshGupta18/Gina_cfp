# GINA — 5-Minute Demo Video Script

**Team Neurotic · NatWest Code for Purpose · 26APR0021_01 Talk to Data**

This is the shooting script. Read it straight through; VO is in blockquotes, on-screen actions are bullets, diagram cue-points are called out in bold. Total runtime: **5:00**.

---

## Shot-map cheat card

```mermaid
flowchart LR
    openBlock["0:00 Elevator + Diagram 1"] --> diffBlock["0:30 Differentiators + D6/D5"]
    diffBlock --> liveBlock["0:50 Live showcase + D4 overlay"]
    liveBlock --> archBlock["3:05 Backend + D2 -> D3"]
    archBlock --> closeBlock["4:25 Frontend close"]
```

| Block | Timecode | Runtime | Diagram on screen | Pillar |
|-------|----------|---------|-------------------|--------|
| A. Elevator open | 0:00 – 0:30 | 30 s | **Diagram 1** (What is GINA in 30s) | Clarity + Trust |
| B. Differentiators | 0:30 – 0:50 | 20 s | **Diagram 6** then **Diagram 5** | Trust + Speed |
| C. Live showcase | 0:50 – 3:05 | 2 min 15 s | **Diagram 4** overlay during PII moment | All 3 |
| D. How it works | 3:05 – 4:25 | 1 min 20 s | **Diagram 2** → **Diagram 3** (D5 + D6 flash at end) | Trust + Speed |
| E. Frontend close | 4:25 – 5:00 | 35 s | App UI → landing | Clarity |

**Anchor numbers (do not deviate on camera):**
- Eval: **24 / 24** on `saas-eval-advanced`, **11 / 12** on `saas-eval-basic` ⇒ **35 / 36 ≈ 97%** overall. Source: [`eval/bundles/saas-eval-advanced/results/result-summary.md`](../eval/bundles/saas-eval-advanced/results/result-summary.md), [`eval/bundles/micro/results/result-summary.md`](../eval/bundles/micro/results/result-summary.md).
- Latency: avg end-to-end **~7.4 s**, DB execution **~213 ms**, n = 336. Source: [`eval/Operational analytics/analytics.md`](../eval/Operational%20analytics/analytics.md).
- Never say "96%" or "100%" — say **"97% on our graded eval set, 35 of 36 cases"**.
- Embeddings: **HuggingFace `BAAI/bge-small-en-v1.5`, 384-dim, stored in `schema_embeddings` with pgvector.**
- Planner intents (literal from [`backend/src/pipeline/planner.ts`](../backend/src/pipeline/planner.ts)): `conversational`, `simple_query`, `complex_query`, `follow_up_cache`.
- SQL tier routing: **simple → Groq Maverick only**; **complex → HF SQLCoder → Groq Maverick fallback**. No deterministic templates.

---

## Block A — Elevator open · 0:00 – 0:30 (30 s, ~80 words)

**On screen:**
- 0:00 – 0:25 — GINA landing page (deployed URL), clean, no cursor.
- 0:25 – 0:30 — cut to **Diagram 1** ("What is GINA in 30 seconds") full-frame.

**VO:**

> "Hi, we're team **Neurotic**, and this is our submission to the *Talk to Data* problem statement.
>
> Meet **GINA — Grounded Insights from Natural-language Analytics**.
>
> Upload any CSV or Excel workbook, ask a question in plain English, and GINA streams back a **chart**, a **plain-language answer**, the **exact SQL it ran**, and the **columns it used** — every number grounded in real SQL on your data, not guessed by a model.
>
> **Clarity, trust, speed** — the three pillars of the brief — baked into every answer."

---

## Block B — What makes us different · 0:30 – 0:50 (20 s, ~60 words)

**On screen:**
- 0:30 – 0:40 — **Diagram 6** (Evaluation harness) full-frame; the **"saas-eval-advanced: 24/24 passed"** badge visible.
- 0:40 – 0:50 — cross-fade to **Diagram 5** (Speed story) — stage-timing bars + SSE timeline.

**VO:**

> "Four things make GINA different.
>
> **Accuracy** — *97%* on our graded eval set, 35 of 36 cases, run against the real API end-to-end.
>
> **Speed** — database execution around 200 milliseconds, with live streamed pipeline steps.
>
> **Trust** — server-side PII shield, SELECT-only SQL on a read-only role, and the SQL is always shown.
>
> **Smart routing** — simple questions take a fast model, complex ones take a specialised text-to-SQL model, with automatic fallback."

---

## Block C — Live showcase · 0:50 – 3:05 (2 min 15 s)

Screen recording is continuous through this block. Keep the cursor deliberate; pause ~1 s on each artifact so viewers can read it.

### C1. Sign-in + dataset pick · 0:50 – 1:05 (15 s)

**On screen:**
- Landing → click **Sign in with Google** ([`frontend/components/landing/AuthModal.tsx`](../frontend/components/landing/AuthModal.tsx)).
- OAuth completes → app shell loads with sidebar visible.

**VO:**

> "Sign in with Google via Supabase — a JWT is attached to every API call.
> I'll upload our demo CSV now."

### C2. Upload + PII shield + semantic layer · 1:05 – 1:45 (40 s)

**On screen:**
- Drag `neurotic_gina_demo.csv` onto [`UploadModal`](../frontend/components/upload/UploadModal.tsx). (If showing Excel support, a `.xlsx` with two sheets works too — each sheet becomes its own dataset in the sidebar, e.g. `DemoBook — Sales`, `DemoBook — Support`.)
- **`PIISummaryBanner`** lights up with the redacted columns: `full_name`, `email`, `phone`, `billing_address`, `support_note`. Method chip reads **"AI-assisted scan"**.
- [`UnderstandingCard`](../frontend/components/upload/UnderstandingCard.tsx) renders a one-sentence dataset summary.
- **Overlay: Diagram 4 (Trust & safety)** picture-in-picture, top-right corner, for ~6 seconds while the banner is on screen.

**VO (~105 words, delivered briskly):**

> "GINA accepts **CSVs and multi-sheet Excel workbooks** — each sheet becomes its own dataset with its own schema.
>
> On the backend, a **PII shield** runs before the file is stored: a **Groq LLM classifier** tags sensitive columns, with a deterministic regex fallback for emails, phones, and addresses — so names, contact details, and free-text notes are **redacted before any SQL ever touches the data**.
>
> GINA then profiles every column, uses Groq to enrich it with a business label and description, writes a plain-English **Understanding Card**, and indexes each column into a **pgvector semantic layer** using Hugging Face embeddings — so the planner can ground on *your* columns, not a generic dump."

### C3. Question 1 — "Understand what changed" (fires secondary query) · 1:45 – 2:30 (45 s)

This hits use-case **1** from the brief (drivers behind a change) and — because it starts with *"why"* — **fires the secondary query** step on camera.

**On screen:**
- Type verbatim (from [`demo/DEMO_QUESTIONS.md`](DEMO_QUESTIONS.md) Q1): **"Why did net revenue drop around weeks 9 to 12?"** Enter.
- [`ThinkingPill`](../frontend/components/chat/ThinkingPill.tsx) + [`PipelineStep`](../frontend/components/chat/PipelineStep.tsx) stream live. The viewer should see **five** stages land in order:
  1. planner
  2. sql_generation
  3. db_execution
  4. **"Breaking down drivers"** ← this is the `secondary_query` step
  5. narration
- Result card: narrative names **South marketing cut** + **SMB churn**; chart renders.
- Click **"See how this was calculated"** → [`SQLExpand`](../frontend/components/output/SQLExpand.tsx) opens. Point at the **two** labelled blocks: primary SQL **and** **"SECONDARY SQL (VERIFICATION)"** — the breakdown GROUP BY.
- Point at [`CitationChips`](../frontend/components/output/CitationChips.tsx): `net_revenue_usd`, `marketing_spend_usd`, `churned_subscribers`, `region`, `segment`.

**VO (~125 words):**

> "Plain English in. Watch the stages land live. The planner classifies the question and picks the relevant columns from the semantic layer. The SQL is generated and executed — and because the question starts with *why* and the numbers have moved materially, GINA automatically fires a **secondary verification query** — see the step labelled *Breaking down drivers* — to decompose the drop by category. Then it narrates.
>
> The answer names the drivers: a **marketing-spend cut in South** plus **elevated SMB churn** across weeks 9 to 12.
>
> Open the SQL panel and you see **both queries** — the primary, and the secondary verification query GINA ran under the hood — plus every column it cited. Fully auditable."

### C4. Question 2 — "Compare" (no secondary query) · 2:30 – 3:00 (30 s)

Hits use-case **2** (comparison with a consistent metric). No *why* keyword, so no secondary-query step this time — a natural contrast with Q1.

**On screen:**
- Type (Q3): **"Compare churn rate between Paid Social and Partner over the last 4 weeks."** Enter.
- Pipeline streams again: planner → sql_generation → db_execution → narration. **No** "Breaking down drivers" step this time.
- Bar chart shows Paid Social materially higher churn than Partner; narrative spells it out.
- Quick expand of SQL, quick hover on citation chips, then close.

**VO (~60 words):**

> "A comparison question. It doesn't start with *why*, so no secondary breakdown fires — just a clean planner → SQL → execute → narrate path.
>
> GINA applies a **consistent metric** — churn rate equals churned divided by active — and returns the chart plus the reason.
>
> **Same trust shape every time**: narrative, chart, SQL, citations."

### C5. Follow-up suggestion click · 3:00 – 3:05 (5 s)

**On screen:**
- Click one chip in [`FollowUpSuggestions`](../frontend/components/output/FollowUpSuggestions.tsx) (e.g. the refund outlier or the complaints spike).
- Pipeline trace starts. **Cut out as it begins** — don't wait for the result.

**VO:**

> "One click, and the conversation keeps going."

---

## Block D — How it works · 3:05 – 4:25 (1 min 20 s)

Full-bleed diagrams. No UI footage in this block.

### D1. System architecture · 3:05 – 3:35 (30 s, ~80 words) — **Diagram 2**

**On screen:** **Diagram 2** (System architecture) fills the frame.

**VO:**

> "Under the hood: a **Next.js** frontend, a **Fastify** backend streaming over **Server-Sent Events**, **PostgreSQL with pgvector** holding both your dataset *and* a **semantic layer** of Hugging Face column embeddings, and **S3** for redacted uploads. Everything is authenticated with **Supabase JWT**.
>
> Two LLM providers do the heavy lifting: **Groq** for planning, PII classification, and narration; **Hugging Face SQLCoder** for complex text-to-SQL. No deterministic-template dead-ends — every path is grounded and validated."

### D2. Single-query pipeline · 3:35 – 4:10 (35 s, ~115 words) — **Diagram 3**

**On screen:** cross-fade to **Diagram 3** (Single-query swimlane). Let the viewer see the `step / result / error` callouts.

**VO:**

> "One question walks this lane. The **planner** classifies intent into four buckets — conversational, simple, complex, or a cached follow-up — and picks the relevant columns from the semantic layer.
>
> Based on intent, **SQL generation routes**: simple questions hit a fast Groq model; complex questions hit the specialised SQLCoder, with Groq as automatic fallback. The **validator** then enforces SELECT-only, single-statement, a table whitelist, and blocks system tables, before we execute as the **`readonly_agent`** DB role with a server-enforced **LIMIT 100**.
>
> If the user asks *why* and the numbers move, a **secondary verification query** fires to decompose the change. Results go to the **narrator**, everything is cached for 24 hours, and every `step`, `result`, and `error` is streamed back."

### D3. Measured, not claimed · 4:10 – 4:25 (15 s, ~40 words) — **Diagram 5 + Diagram 6**

**On screen:** split frame — **Diagram 5** (Speed story) left, **Diagram 6** (Eval harness, 24/24 badge) right.

**VO:**

> "And we **measure** it. **`pipeline_runs`** telemetry gives per-stage latency in production; the **eval harness** runs real HTTP against the real API with gold JSON — **24 of 24** on the advanced bundle, **35 of 36** overall. No synthetic mocks."

---

## Block E — Frontend close · 4:25 – 5:00 (35 s, ~95 words)

**On screen:**
- Cut back to the app, same conversation from Block C — both answer cards visible; scroll once so chart, narrative, both SQL panels, and citations are visible in one pass.
- Open the **Insights panel** ([`InsightPanel`](../frontend/components/app/InsightPanel.tsx)) → flip between chart view and data table view to make the "one click to the numbers" claim literal.
- End frame: pan out to landing page with deployed URL + repo handle overlaid.

**VO:**

> "So — **Clarity**: plain-English in, plain-English out, with the chart and the data table one click away.
>
> **Trust**: PII shielded on the server before storage, SQL validated, read-only execution, every answer shipped with the primary query, the verification query when we run one, and the columns we used.
>
> **Speed**: sub-second database execution, streamed progress, and a vector-indexed semantic layer that makes every question grounded.
>
> GINA is a **vertical slice** a non-technical user can actually run today, and every claim here is reproducible from the repo.
>
> We're team **Neurotic**. Thanks for watching."

---

## Pre-record checklist

- [ ] Backend running, frontend running, you can sign in on the clean account you'll record against.
- [ ] Wipe any prior conversations for that account so the sidebar is clean.
- [ ] Cache hygiene: either vary the wording of Q1/Q2 slightly from any prior run, **or** set `DISABLE_RESPONSE_CACHE=true` and `DISABLE_NARRATION_CACHE=true` on the backend before recording (per [`demo/DEMO_QUESTIONS.md`](DEMO_QUESTIONS.md)).
- [ ] **Secondary query trigger check:** the default `SECONDARY_QUERY_DELTA_THRESHOLD` is `0.05`. The weeks-9-to-12 drop in the demo dataset is ~10–15 %, well above threshold, so the "Breaking down drivers" step should fire reliably for Q1. If it doesn't, the question probably got routed as `conversational` — rephrase to keep *why* and a numeric reference (e.g. "Why did net revenue fall in weeks 9–12?").
- [ ] Diagrams 1–6 exported as PNG/MP4 at 16:9, named `D1.png` … `D6.png`, and pre-loaded on your editor's track.
- [ ] `neurotic_gina_demo.csv` staged on the desktop for a fast drag-and-drop. If you want to show multi-sheet Excel, stage a `.xlsx` with two small sheets too — only swap in if time allows.
- [ ] Terminal / logs closed; OS notifications silenced; dark-mode locked to avoid theme flicker.

## Live recording guardrails

- **Rate-limit 429 mid-record:** keep rolling — the `PipelineStep` + [`RateLimitErrorPanel`](../frontend/components/chat/RateLimitErrorPanel.tsx) UI is itself the resilience story. If the result doesn't land within ~15 s, cut to **Diagram 2** early and finish D1's VO over it.
- **Never ask GINA to print PII on camera.** The upload-time PII shield is the demonstration. Skip Q5 in [`demo/DEMO_QUESTIONS.md`](DEMO_QUESTIONS.md).
- **Honesty guardrail:** if you fluff a number, re-take. On-record figures: **24 / 24**, **35 / 36**, **~97%**, **~7.4 s avg**, **~213 ms DB**, **n = 336**, **384-dim embeddings**. Nothing else.
- **Do not claim** "all bundles green" — `saas-eval-basic` `q10` is a known open table-cell failure and the README calls it out.
- **Do not claim** client-side PII redaction. The PII shield is server-side (Groq LLM + regex fallback). The accurate line is already in the C2 VO.
- **Do not claim** "deterministic template fallback". The live SQL path is Groq (simple) or HF SQLCoder → Groq (complex). Templates are not in the live pipeline.

## If you need to cut to 4:30 instead of 5:00

Trim in this order:
1. Drop **C5 follow-up chip** (–5 s).
2. Shorten **C2** by skipping the Excel / multi-sheet mention — keep only the CSV path (–8 s).
3. Shorten **C4** by skipping the SQL expand on the second question (–8 s).
4. Shorten **E close** by cutting the Insights-panel flip (–8 s).

## If you need to stretch to 5:30

Add at 3:05 (before Block D): a 20 s detour showing **Diagram 7 (Cache & fallback decision tree)** and say "and here's how we decide what to skip on a repeat question — response cache, planner, SQL, narration cache — every stage has a short-circuit." Otherwise, keep as-is.
