# GINA Diagram Prompt Pack (Eraser)

This file gives high-detail, copy-paste prompts to generate presentation-ready diagrams for GINA.

Use this as the source of truth for labels and flow names.

## Global style guardrails (apply to every diagram)

- Target audience: judges and non-technical stakeholders first, technical reviewers second.
- One-slide max per diagram, 16:9 layout, readable at 6 to 8 feet.
- Keep labels short and concrete, avoid internal codenames.
- Use the same product naming across all slides: GINA.
- Visual hierarchy: user value first, controls second, implementation detail third.
- Show trust controls as first-class elements, not footnotes.
- Keep arrows directional and left-to-right unless timeline requires top-to-bottom.

Color semantics to keep consistent:
- User-facing value: teal/green.
- Compute and pipeline: indigo/blue.
- Datastores: slate/gray.
- Safety and governance controls: amber.
- Failover/fallback paths: orange.

## Canonical facts to anchor in diagrams

- Frontend: Next.js App Router with chat UI, upload flow, output cards.
- Backend: Fastify API with POST /api/query streamed via SSE events step/result/error.
- Data layer: PostgreSQL (Supabase) with pgvector and app tables.
- File storage: AWS S3 for uploaded redacted files.
- Query pipeline stages: planner -> sql_generation -> sql_validator -> db_execution (readonly_agent) -> narration -> payload.
- Output payload includes narrative, chartType/chartData, citationChips, sql, secondarySql, followUpSuggestions, confidenceScore, totalTimeMs.
- Safety controls include PII scan/redaction on upload, SQL SELECT-only validation, table whitelist, readonly role, row cap 100, SQL disclosure, citation chips.
- Caches: response_cache (question + dataset), narration_cache (result shape + intent), TTL 24h.
- Telemetry: pipeline_runs with latency_total_ms and stage-level timings (planner/sql/db/narrator).
- Eval harness: manifest validation + runner producing result.json and result-summary.md. Advanced bundle recorded 24/24 pass.

Observed performance snapshot for speed diagram:
- Average total latency: 7387.61 ms
- p95 total latency: 20709.25 ms
- Stage averages: planner 2808.40 ms, sql 2644.21 ms, db 213.36 ms, narrator 2058.10 ms
- Sample size: n=336 pipeline runs (7-day sample)

-----

## Prompt 1: 30-second "What is GINA" slide

Paste this into Eraser:

Create a single-slide product explainer diagram for GINA with exactly one horizontal flow and four icon blocks.

Title: What is GINA in 30 seconds
Subtitle: Ask in plain English, get grounded answers with full transparency.

Layout requirements:
1) Left: User icon with label "User asks in English"
2) Arrow to block "GINA Query Engine"
3) Arrow to four output icons in one row:
   - Chart
   - Narrative
   - SQL shown
   - Citations
4) Footer callout bar: "Grounded in your data, not model guesses"

Microcopy requirements under each output icon:
- Chart: "Visual summary"
- Narrative: "Plain-language explanation"
- SQL shown: "Exact query disclosed"
- Citations: "Columns used to answer"

Design constraints:
- Keep text minimal, high contrast, clean whitespace.
- Emphasize trust and auditability.
- Make it presentation-grade for a hackathon demo.

-----

## Prompt 2: System architecture map

Paste this into Eraser:

Create a system architecture diagram for GINA with six major boxes and bidirectional arrows where applicable.

Title: GINA system architecture

Boxes and required labels:
1) Frontend (Next.js)
   - Upload modal
   - Chat UI
   - Output card (SQL + citations)
2) Backend API (Fastify + SSE)
   - POST /api/query
   - event: step, result, error
   - Orchestrator
3) PostgreSQL / Supabase
   - datasets
   - semantic_states
   - messages
   - response_cache
   - narration_cache
   - pipeline_runs
4) S3
   - Redacted upload storage
5) LLM providers
   - Planner and narration models
   - SQL generation models
6) Auth boundary
   - Supabase JWT

Arrow semantics:
- Frontend <-> Backend: HTTPS + JWT, SSE stream back to UI
- Backend <-> PostgreSQL: read/write metadata, read-only query execution path
- Backend <-> S3: upload/download redacted files
- Backend <-> LLM providers: planner, SQL generation, narration
- Frontend -> Auth boundary -> Backend: authenticated requests

Add a highlighted trust strip on the bottom:
"PII redaction + SQL validation + read-only execution + row limits + SQL disclosure"

-----

## Prompt 3: Single-query swimlane pipeline

Paste this into Eraser:

Create a left-to-right swimlane diagram showing one user query lifecycle in GINA.

Title: Single query pipeline (streamed)
Swimlanes:
- Frontend
- Orchestrator
- SQL and Validation
- Database
- Narration and Output

Required stage order and labels:
1) User submits question (Frontend)
2) planner (Orchestrator)
3) sql_generation (SQL lane)
4) sql_validator (SQL lane)
5) db_execution (Database lane, readonly_agent role)
6) narrator and chart selector (Narration lane)
7) response payload assembly (Narration lane)
8) SSE result to UI (Frontend)

Annotate streamed step events over the timeline:
- step: planner running/complete
- step: sql_generation running/complete
- step: db_execution running/complete
- step: narration running/complete
- result event emitted

Payload callout box must include:
- narrative
- chartType + chartData
- citationChips
- sql
- secondarySql (optional)
- confidenceScore
- followUpSuggestions
- totalTimeMs

Show optional side paths:
- response cache hit path (short-circuit)
- narration cache hit path (skip fresh narration)

-----

## Prompt 4: Trust and safety controls

Paste this into Eraser:

Create a trust-and-safety control map for GINA with defense-in-depth layers.

Title: Trust and safety by design

Structure as five layers from ingest to answer:
Layer 1: Ingestion controls
- File type and size checks
- PII scanning and redaction
- Redacted data persisted

Layer 2: Query generation controls
- Planner grounding
- SQL generator constrained to SELECT semantics

Layer 3: SQL enforcement controls
- SQL parser validation
- Single-statement rule
- Table whitelist
- Block non-SELECT and system table access

Layer 4: Execution controls
- Execute with readonly_agent role
- Server-enforced LIMIT 100 cap

Layer 5: User transparency controls
- Show SQL
- Show citation chips
- Explain how answer was formed

Include a side badge: "No silent black-box answers"

Add explicit threat-to-control mapping mini table:
- Prompted destructive SQL -> SELECT-only validator + readonly role
- Data overexposure -> table whitelist + row cap
- Hallucinated rationale -> SQL disclosure + citations
- Sensitive upload risk -> PII redaction workflow

-----

## Prompt 5: Speed and latency story

Paste this into Eraser:

Create a dual-panel speed diagram that explains perceived and measured latency in GINA.

Title: Speed story: streamed progress plus stage timings

Left panel: stage timing bar chart
- Planner: 2808.40 ms
- SQL generation: 2644.21 ms
- DB execution: 213.36 ms
- Narrator: 2058.10 ms
- Average total: 7387.61 ms
- p95 total: 20709.25 ms
- n=336

Right panel: SSE timeline (user-perceived progress)
- t0: question submitted
- t1: planner running
- t2: sql_generation running
- t3: db_execution running
- t4: narration running
- t5: result delivered

Callouts:
- "DB is not the bottleneck"
- "Streaming steps reduce uncertainty while waiting"
- "Cache paths can skip expensive stages"

Add a small footnote box:
"Metrics from pipeline_runs telemetry over a 7-day sample"

-----

## Prompt 6: Evaluation harness

Paste this into Eraser:

Create a concise evaluation workflow diagram for GINA that shows reproducible quality checks.

Title: Evaluation harness and quality gating

Flow boxes in order:
1) manifest.json (bundle spec)
2) validate-manifest script
3) run-manifest runner
4) real API execution over SSE
5) scoring (intent/columns optional, scalar/table checks)
6) outputs: result.json and result-summary.md

Add a prominent outcome badge on the right:
"saas-eval-advanced: 24/24 passed"

Add an optional branch for cache hygiene:
- clear_eval_caches.sql or disable cache env flags for clean reruns

Include note:
"Scores are computed against grounded API outputs, not synthetic mocks"

-----

## Optional prompt 7: Cache and fallback decision tree

Paste this into Eraser:

Create a decision-tree diagram for query handling order in GINA.

Title: Cache and fallback paths

Decision sequence:
1) response_cache hit?
   - yes -> return cached payload
   - no -> continue
2) run planner
3) generate SQL
4) SQL valid?
   - no -> conversational grounding fallback
   - yes -> execute DB query
5) narration_cache hit?
   - yes -> reuse narration
   - no -> generate narration
6) assemble payload and store caches

Include fallback annotation on SQL generation:
- preferred path by intent
- provider fallback when needed

Include TTL callout:
- response_cache: 24h
- narration_cache: 24h

-----

## Optional prompt 8: Data model mini-map

Paste this into Eraser:

Create a lightweight ER-style map for the core GINA runtime entities.

Title: Runtime data model (mini map)

Entities and key relationships:
- users 1..* datasets
- datasets 1..1 semantic_states
- datasets 1..* conversations
- conversations 1..* messages
- response_cache (keyed by question+dataset hash)
- narration_cache (keyed by result-shape+intent hash)
- pipeline_runs linked to conversation/message telemetry

Add notes on special fields:
- datasets.data_table_name for dynamic dataset table
- semantic_states.schema_json as semantic context
- messages.output_payload stores assistant output artifact

Keep this mini-map light, not a full schema dump.

-----

## Optional prompt 9: Frontend UX map

Paste this into Eraser:

Create a frontend UX flow diagram from upload to answer consumption in GINA.

Title: Frontend user journey

Main journey:
1) Upload modal
2) PII summary and understanding card
3) Open conversation chat
4) Streaming thinking steps
5) Output card with narrative + chart
6) Expand SQL and view citations
7) Follow-up suggestions and insights panel
8) Dataset overview page

Include component labels in small text:
- UploadModal
- ChatView
- ThinkingPill
- OutputCard
- SQLExpand
- CitationChips

Mark state transitions:
- processing
- streaming
- completed
- retry/rate-limit path

-----

## One-slide checklist (to prevent overbuilding)

Use this checklist for every slide before final export:

1. Is there exactly one takeaway sentence on the slide?
2. Are box labels short and product-language, not code-language?
3. Is trust/transparency visible without narration?
4. Is text readable at presentation distance?
5. Is there a single focal path highlighted?
6. If metrics are shown, are they sourced and timestamped?
7. Could a non-technical judge explain the slide in 20 seconds?
