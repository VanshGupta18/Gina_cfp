# Talk to Data — Backend Implementation Plan

> **Team:** 2 developers (Person A, Person B)
> **Source of truth:** `Backend_Master.md`
> **Approach:** Incremental phases. Each phase ends with a concrete verification gate. Nothing advances until the gate passes.

---

## Work Split Philosophy

- **Person A** owns the **data path**: database, upload pipeline, semantic layer, CSV processing
- **Person B** owns the **query path**: Fastify server, auth, LLM integrations, SSE pipeline
- Both paths converge in Phase 4 (orchestrator) where A + B pair

---

## Phase 0 — Project Scaffold + Database

**Goal:** Runnable Fastify server + PostgreSQL with full schema. Zero business logic.

| Task | Owner | Files |
|---|---|---|
| `npm init`, install all deps from Section 13 | A | `package.json` |
| TypeScript config (`tsconfig.json`, `tsx` for dev) | A | `tsconfig.json` |
| `src/config/env.ts` — Zod schema for all env vars, `.env.example` | B | `src/config/env.ts` |
| `src/server.ts` — Fastify entry, register CORS + multipart + SSE plugins, `/health` route | B | `src/server.ts` |
| `src/plugins/db.ts` — pg pool plugin, connection test on startup | A | `src/plugins/db.ts` |
| `migrations/001_initial_schema.sql` — full DDL from Section 3.1 (all 9 tables + pgvector + hnsw index + `readonly_agent` role) | A | `migrations/001_initial_schema.sql` |
| Run migration against Supabase PostgreSQL (`psql $DATABASE_URL -f migrations/001_initial_schema.sql`) | A | — |

### ✅ Phase 0 Verification
```bash
# 1. Server starts and responds to health check
curl http://localhost:3001/health
# Expected: { "status": "ok" }

# 2. All 9 tables exist
psql $DATABASE_URL -c "\dt"
# Expected: users, datasets, semantic_states, schema_embeddings,
#           conversations, messages, response_cache, narration_cache, pipeline_runs

# 3. pgvector extension loaded
psql $DATABASE_URL -c "SELECT extname FROM pg_extension WHERE extname = 'pgvector';"
# Expected: pgvector

# 4. hnsw index exists on schema_embeddings
psql $DATABASE_URL -c "\di" | grep hnsw
# Expected: one hnsw index on schema_embeddings

# 5. readonly_agent role exists
psql $DATABASE_URL -c "SELECT rolname FROM pg_roles WHERE rolname = 'readonly_agent';"

# 6. Env validation rejects missing vars
# Remove a required var → server should crash with Zod error (not a silent undefined)
```

---

## Phase 1 — Auth + CRUD Routes (no pipeline)

**Goal:** JWT-protected API. Users, datasets, conversations, messages — all CRUD works. No upload processing, no LLM calls.

| Task | Owner | Files |
|---|---|---|
| `src/plugins/auth.ts` — Supabase JWT verification preHandler (Section 10) | B | `src/plugins/auth.ts` |
| `src/routes/datasets.ts` — `GET /api/datasets` (list by user_id), `GET /api/datasets/:id/semantic` | A | `src/routes/datasets.ts` |
| `src/routes/conversations.ts` — `POST /api/datasets/:id/conversations` (create), `GET /api/datasets/:id/conversations` (list) | A | `src/routes/conversations.ts` |
| `src/routes/messages.ts` — `GET /api/conversations/:id/messages` | A | `src/routes/messages.ts` |
| `POST /api/users/sync` — upsert into `users` table from JWT claims | B | `src/routes/datasets.ts` (or `users.ts`) |
| Zod request validation schemas for all route bodies/params | B | inline per route |

### ✅ Phase 1 Verification
```bash
# 1. Unauthenticated requests to /api/* return 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/datasets
# Expected: 401

# 2. Valid JWT → 200 on GET /api/datasets
curl -H "Authorization: Bearer <valid_jwt>" http://localhost:3001/api/datasets
# Expected: 200, { datasets: [] }

# 3. Create a conversation
curl -X POST -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:3001/api/datasets/<demo_dataset_id>/conversations
# Expected: 200, { id: "...", datasetId: "...", ... }

# 4. Message history returns empty array for new conversation
curl -H "Authorization: Bearer <jwt>" \
  http://localhost:3001/api/conversations/<conv_id>/messages
# Expected: 200, { messages: [] }

# 5. Invalid JWT returns 401
curl -H "Authorization: Bearer garbage" http://localhost:3001/api/datasets
# Expected: 401

# 6. User sync creates row in users table
psql $DATABASE_URL -c "SELECT * FROM users;"
# Expected: one row with the test user's Supabase ID and email
```

---

## Phase 2 — Upload Pipeline + Demo Seed Data

**Goal:** Full CSV upload flow works end-to-end. Demo datasets seeded with YAML semantic states.

### Phase 2A — S3 + CSV parsing + dynamic table creation (Person A)

| Task | Owner | Files |
|---|---|---|
| `src/plugins/s3.ts` — S3 client plugin | A | `src/plugins/s3.ts` |
| `src/utils/s3.ts` — upload helper (put object with key `uploads/{userId}/{datasetId}/{filename}`) | A | `src/utils/s3.ts` |
| `src/utils/csvParser.ts` — PapaParse wrapper, streaming parse, return headers + rows | A | `src/utils/csvParser.ts` |
| `src/semantic/profiler.ts` — type detection (DATE/NUMERIC/TEXT rules from Section 3.2), null rates, ranges, samples | A | `src/semantic/profiler.ts` |
| Dynamic table creation logic: generate `dataset_{uuid}` table with inferred column types, bulk INSERT with `COPY` | A | `src/routes/datasets.ts` |
| `POST /api/datasets/upload` route — multipart receive → parse → profile → S3 upload → create dynamic table → insert `datasets` row | A | `src/routes/datasets.ts` |

### Phase 2B — LLM enrichment + embeddings (Person B)

| Task | Owner | Files |
|---|---|---|
| `src/ratelimit/keyPool.ts` — round-robin key pool for Groq + Gemini (Section 7.1) | B | `src/ratelimit/keyPool.ts` |
| `src/ratelimit/queue.ts` — rate-aware queue reading `x-ratelimit-remaining` header (Section 7.2) | B | `src/ratelimit/queue.ts` |
| `src/semantic/enricher.ts` — call Groq Scout with column names + samples → business labels + descriptions (Section 5.3 step 3) | B | `src/semantic/enricher.ts` |
| `src/semantic/embedder.ts` — call HuggingFace `bge-small-en-v1.5` → store 384-dim vectors in `schema_embeddings` (Section 5.3 steps 5–7) | B | `src/semantic/embedder.ts` |
| `src/semantic/retriever.ts` — pgvector cosine similarity search (input: question text → output: ranked columns) | B | `src/semantic/retriever.ts` |

### Phase 2C — Wire upload route + seed demos (both)

| Task | Owner | Files |
|---|---|---|
| Integrate enricher + embedder into upload route (after profiler, before response) | A + B | `src/routes/datasets.ts` |
| Understanding card generation (LLM call or template) | B | `src/semantic/enricher.ts` |
| `PATCH /api/datasets/:id/semantic` — correction flow: update `semantic_states`, re-embed (Section 4.2) | A | `src/routes/datasets.ts` |
| Seed script: load 3 demo CSVs + YAML semantic states → insert `datasets` (is_demo=true) + `semantic_states` + dynamic tables + embeddings | A | `seeds/` script |
| Copy YAML files into `semantic_yaml/` | A | `semantic_yaml/*.yaml` |

### ✅ Phase 2 Verification
```bash
# 1. Upload a test CSV
curl -X POST -H "Authorization: Bearer <jwt>" \
  -F "file=@test.csv" \
  http://localhost:3001/api/datasets/upload
# Expected: 200 with { dataset, semanticState, understandingCard, piiSummary }

# 2. Dynamic table exists with correct columns and types
psql $DATABASE_URL -c "\d dataset_<returned_uuid>"
# Expected: _row_id SERIAL PK + columns matching CSV headers with inferred types

# 3. Data rows inserted
psql $DATABASE_URL -c "SELECT COUNT(*) FROM dataset_<uuid>;"
# Expected: matches CSV row count

# 4. File exists in S3
aws s3 ls s3://talktodata-uploads/uploads/<userId>/<datasetId>/
# Expected: file listed

# 5. Semantic state stored
psql $DATABASE_URL -c "SELECT understanding_card FROM semantic_states WHERE dataset_id = '<id>';"
# Expected: non-null sentence

# 6. Embeddings stored with correct dimensions
psql $DATABASE_URL -c "SELECT column_name, vector_dims(embedding) FROM schema_embeddings WHERE dataset_id = '<id>';"
# Expected: one row per column, all 384 dimensions

# 7. Retriever returns ranked columns for a natural language query
# (call retriever.ts function manually or via test script)
# Input: "What was my total spending?"
# Expected: amount column ranked highest

# 8. Demo datasets seeded
psql $DATABASE_URL -c "SELECT name, is_demo, demo_slug FROM datasets WHERE is_demo = true;"
# Expected: 3 rows (sunita, james, donations)

# 9. Demo dynamic tables queryable
psql $DATABASE_URL -c "SELECT COUNT(*) FROM dataset_demo_sunita;"
# Expected: 80 rows (per YAML spec)

# 10. Semantic correction works
curl -X PATCH -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"corrections": [{"columnName":"amount","newSemanticType":"amount","newBusinessLabel":"Total Spend","newDescription":"Updated"}]}' \
  http://localhost:3001/api/datasets/<id>/semantic
# Expected: 200, updated semantic state returned, is_user_corrected = true
```

---

## Phase 3 — Query Pipeline (individual steps)

**Goal:** Each pipeline step works in isolation. Not yet wired together.

### Phase 3A — Planner + SQL generation (Person B)

| Task | Owner | Files |
|---|---|---|
| `src/pipeline/planner.ts` — Groq Scout call with prompt from Section 6.1. Returns `{ intent, relevantColumns, relevantTables, answerFromCache }` | B | `src/pipeline/planner.ts` |
| `src/pipeline/sqlTemplates.ts` — 5 deterministic templates with keyword matching + semantic type binding (Section 6.4) | B | `src/pipeline/sqlTemplates.ts` |
| `src/pipeline/sqlValidator.ts` — node-sql-parser AST check: SELECT-only, table whitelist (Section 6.3) | B | `src/pipeline/sqlValidator.ts` |
| `src/pipeline/sqlGenerator.ts` — 4-tier fallback: EC2 → HF → Groq Maverick → templates. Timeout-based escalation (Section 6.2) | B | `src/pipeline/sqlGenerator.ts` |

### Phase 3B — DB execution + secondary query + auto-insights (Person A)

| Task | Owner | Files |
|---|---|---|
| `src/pipeline/dbExecutor.ts` — execute SQL via `readonly_agent` role, max 100 rows, error handling (Section 6, Step 4) | A | `src/pipeline/dbExecutor.ts` |
| `src/pipeline/secondaryQuery.ts` — delta threshold check + intent keywords + GROUP BY on highest-cardinality category column (Section 6.5) | A | `src/pipeline/secondaryQuery.ts` |
| `src/pipeline/autoInsight.ts` — 4 rules: concentration, trend, anomaly, contradiction (Section 6.7) | A | `src/pipeline/autoInsight.ts` |
| `src/pipeline/narrator.ts` — Groq Maverick narrator (default) + Gemini Flash (demo). Prompt from Section 6.6. Narrator batching for secondary results | A | `src/pipeline/narrator.ts` |
| Confidence score function (Section 6.8) | A | `src/pipeline/autoInsight.ts` or `orchestrator.ts` |
| Chart type selection function (Section 9) | A | `src/pipeline/orchestrator.ts` |

### ✅ Phase 3 Verification
```bash
# Test each step in isolation using a test script or REPL:

# 1. Planner returns valid JSON for a known question
# Input: "What were my top expenses?" + sunita semantic state
# Expected: { intent: "simple_query", relevantColumns: ["amount","category"], ... }

# 2. SQL templates generate valid SQL
# Input: "What was my total spending?" + sunita semantic state
# Expected: SELECT SUM(amount) as total FROM dataset_demo_sunita

# 3. SQL validator accepts valid SELECT
echo "SELECT amount FROM dataset_demo_sunita" | node -e "/* test sqlValidator */"
# Expected: { valid: true }

# 4. SQL validator rejects DROP TABLE
echo "DROP TABLE users" | node -e "/* test sqlValidator */"
# Expected: { valid: false, reason: "Not a SELECT statement" }

# 5. SQL validator rejects wrong table reference
echo "SELECT * FROM users" | node -e "/* test sqlValidator with table=dataset_demo_sunita */"
# Expected: { valid: false, reason: "Table not in whitelist" }

# 6. DB executor runs read-only SQL against demo data
# Input: SELECT category, SUM(amount) as total FROM dataset_demo_sunita GROUP BY category ORDER BY total DESC LIMIT 3
# Expected: 3 rows with category + total columns

# 7. DB executor rejects when using main role (should use readonly_agent)
# Attempt: INSERT INTO dataset_demo_sunita ...
# Expected: permission denied for role readonly_agent

# 8. AutoInsight detects concentration
# Input: rows where top item is 60% of total
# Expected: insight string like "Solar Equipment = 60% of total"

# 9. Narrator returns 2–3 sentence plain English
# Input: result rows + question + semantic state
# Expected: non-empty string, no markdown, no bullet points

# 10. Chart type selection returns correct type
# Input: single row, single numeric column → "big_number"
# Input: rows with date column → "line"
# Input: rows with category + numeric → "bar"
```

---

## Phase 4 — Pipeline Orchestration + SSE

**Goal:** All steps wired into the orchestrator. SSE streams step events to client. Full query works end-to-end.

| Task | Owner | Files |
|---|---|---|
| `src/pipeline/orchestrator.ts` — full pipeline sequence: planner → SQL gen → validate → execute → secondary → autoInsight → narrator → assemble output (Section 6 full flow) | A + B (pair) | `src/pipeline/orchestrator.ts` |
| SSE emission: emit `step` events at each pipeline stage transition using `@fastify/sse` | B | `src/pipeline/orchestrator.ts` |
| `src/routes/query.ts` — `POST /api/query` route, parse body, call orchestrator, stream response | B | `src/routes/query.ts` |
| Output assembly: `selectChartType()`, `computeConfidence()`, build `OutputPayload`, generate `followUpSuggestions` (3 pills via LLM or template) | A | `src/pipeline/orchestrator.ts` |
| Persist user message + assistant message (with `output_payload` JSONB) to `messages` table | A | `src/pipeline/orchestrator.ts` |
| Auto-set conversation title from first question (truncated 60 chars) | A | `src/pipeline/orchestrator.ts` |
| Handle all intent branches: `conversational` → direct reply, `follow_up_cache` → skip SQL, `simple/complex` → full pipeline | B | `src/pipeline/orchestrator.ts` |

### ✅ Phase 4 Verification
```bash
# 1. Full SSE stream works with curl
curl -N -X POST -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"<id>","datasetId":"<demo_sunita_id>","question":"What was my total spending?","sessionContext":{"recentExchanges":[],"lastResultSet":null}}' \
  http://localhost:3001/api/query
# Expected: SSE events in sequence:
#   event: step (planner running)
#   event: step (planner complete)
#   event: step (sql_generation running)
#   event: step (sql_generation complete)
#   event: step (db_execution running)
#   event: step (db_execution complete)
#   event: step (narration running)
#   event: result { narrative, chartType, keyFigure, ... }

# 2. Output payload contains all required fields
# Check result event has: narrative, chartType, chartData, keyFigure,
# citationChips, sql, rowCount, confidenceScore, followUpSuggestions, autoInsights

# 3. Message persisted to database
psql $DATABASE_URL -c "SELECT role, content, output_payload IS NOT NULL as has_output FROM messages WHERE conversation_id = '<id>';"
# Expected: 2 rows — user (has_output=false), assistant (has_output=true)

# 4. Conversation title auto-set
psql $DATABASE_URL -c "SELECT title FROM conversations WHERE id = '<id>';"
# Expected: truncated version of the first question

# 5. Fallback fires when EC2 is unreachable
# Set SQLCODER_EC2_URL to an invalid host, send query
# Expected: step event with sql_fallback warning, query still succeeds via HF or Groq or template

# 6. Conversational intent skips SQL
# Question: "Hello, what can you do?"
# Expected: result event with narrative, no sql_generation or db_execution steps

# 7. Error event on truly broken input
# Send malformed JSON
# Expected: event: error { message, recoverable: false }

# 8. Secondary query fires on "why" questions with sufficient delta
# Question: "Why did spending change so much?" (on a dataset with >5% delta)
# Expected: secondary_query step event appears in stream

# 9. Pipeline telemetry logged
psql $DATABASE_URL -c "SELECT intent, sql_path, latency_total_ms, rows_returned FROM pipeline_runs ORDER BY created_at DESC LIMIT 1;"
# Expected: row with all fields populated
```

---

## Phase 5 — Caching + Telemetry

**Goal:** Response cache and narration cache prevent redundant LLM calls. Full telemetry for every pipeline run.

| Task | Owner | Files |
|---|---|---|
| `src/cache/responseCache.ts` — check/write `response_cache` table. Key = `SHA256(normalised_question + dataset_id)`. 24hr TTL. Increment `hit_count` on hit. | B | `src/cache/responseCache.ts` |
| `src/cache/narrationCache.ts` — check/write `narration_cache` table. Key = `SHA256(result_shape_fingerprint + intent)`. 24hr TTL. | B | `src/cache/narrationCache.ts` |
| Wire caches into orchestrator: check response cache before planner, check narration cache before narrator | B | `src/pipeline/orchestrator.ts` |
| `src/telemetry/pipelineLogger.ts` — write `pipeline_runs` row after every query (all latency fields, sql_path, cache_hit, fallback info, confidence) | A | `src/telemetry/pipelineLogger.ts` |
| Wire telemetry into orchestrator: capture timestamps at each step, log at end | A | `src/pipeline/orchestrator.ts` |
| SSE `cache_hit` step event when response cache hit (instant response, animated trace) | B | `src/pipeline/orchestrator.ts` |

### ✅ Phase 5 Verification
```bash
# 1. First query → cache MISS, full pipeline runs
curl -N -X POST ... -d '{"question":"What was my total spending?",...}'
# Expected: result event with cacheHit: false

# 2. Same question again → cache HIT, instant response
curl -N -X POST ... -d '{"question":"What was my total spending?",...}'
# Expected: result event with cacheHit: true, near-instant (no LLM latency)

# 3. Cache row exists in DB
psql $DATABASE_URL -c "SELECT cache_key, hit_count, expires_at FROM response_cache;"
# Expected: 1 row, hit_count = 1, expires_at = now + 24h

# 4. Narration cache works (same result shape, different phrasing)
# Send "Show me total spend" (different words, same SQL result)
# If narration cache hit: "narration_cache" in pipeline_runs.cache_hit

# 5. Pipeline telemetry row exists
psql $DATABASE_URL -c "SELECT intent, sql_path, latency_total_ms, cache_hit, fallback_triggered FROM pipeline_runs ORDER BY created_at DESC LIMIT 3;"
# Expected: rows with all fields populated, cache_hit = 'response_cache' for repeat query

# 6. Expired cache is not served
# Manually set expires_at to past:
psql $DATABASE_URL -c "UPDATE response_cache SET expires_at = NOW() - INTERVAL '1 hour';"
# Re-run query → should go through full pipeline again (cache miss)
```

---

## Phase 6 — Demo Snapshot System

**Goal:** Snapshot mode works for all 6 scripted demo queries. Toggle via API.

| Task | Owner | Files |
|---|---|---|
| `src/snapshots/snapshotStore.ts` — load all 6 JSON files from `snapshots/`, normalised question match, dataset slug check (Section 8) | B | `src/snapshots/snapshotStore.ts` |
| Author 6 snapshot JSON files (2 per demo dataset) with full `OutputPayload` + realistic step trace data | A | `snapshots/*.json` |
| `POST /api/snapshot/toggle` route — flip `SNAPSHOT_MODE` in memory (not env), return current state | B | `src/routes/query.ts` or standalone |
| Wire into orchestrator: if `SNAPSHOT_MODE=true` → check snapshot match before pipeline → return snapshot with simulated 200ms-per-step delay | B | `src/pipeline/orchestrator.ts` |

### ✅ Phase 6 Verification
```bash
# 1. Toggle snapshot mode ON
curl -X POST -H "Authorization: Bearer <jwt>" http://localhost:3001/api/snapshot/toggle
# Expected: { snapshotMode: true }

# 2. Send a scripted question → instant snapshot response
curl -N -X POST ... -d '{"question":"What were my top 3 green energy spending categories this quarter?","datasetId":"<sunita_id>",...}'
# Expected: result event with snapshotUsed: true, narrative matches snapshot JSON exactly

# 3. Step events still stream (simulated trace)
# Expected: SSE step events appear with ~200ms gaps (not instant-all-at-once)

# 4. Non-scripted question → falls through to live pipeline
curl -N -X POST ... -d '{"question":"What was the average spending in February?","datasetId":"<sunita_id>",...}'
# Expected: snapshotUsed: false, full pipeline runs

# 5. Toggle snapshot mode OFF
curl -X POST -H "Authorization: Bearer <jwt>" http://localhost:3001/api/snapshot/toggle
# Expected: { snapshotMode: false }

# 6. All 6 snapshots load without error on server startup
# Check server logs for: "Loaded 6 demo snapshots"

# 7. No pipeline_runs telemetry row for snapshot queries
# (snapshots bypass the pipeline — no telemetry row should be written, or snapshot_used=true)
psql $DATABASE_URL -c "SELECT snapshot_used FROM pipeline_runs ORDER BY created_at DESC LIMIT 1;"
# Expected: true for snapshot query
```

---

## Phase 7 — Integration Test + Hardening

**Goal:** Full end-to-end flow works. All edge cases handled. Ready for frontend integration.

| Task | Owner | Files |
|---|---|---|
| End-to-end test: upload CSV → create conversation → ask 3 questions → verify messages + output payloads | A + B | test script |
| Edge case: 0 rows returned → verify empty state narrative + follow-up suggestions | A | `src/pipeline/orchestrator.ts` |
| Edge case: all SQL tiers fail → verify template always catches | B | test |
| Edge case: large CSV (50MB boundary) → verify upload completes | A | test |
| Edge case: concurrent requests → verify no race conditions on cache writes | B | test |
| CORS configuration: allow Vercel domain + localhost for dev | B | `src/server.ts` |
| Rate limit queue stress test: 30+ rapid queries → verify no 429s leak through | B | test |
| Security check: attempt SQL injection via question text → verify SQL validator blocks | A | test |
| Security check: attempt access to another user's dataset → verify 404/403 | A | route-level ownership checks |
| Verify all 11 API routes from Section 4.1 respond correctly | A + B | test |

### ✅ Phase 7 Verification
```bash
# 1. Full end-to-end with fresh user
# Upload → auto-creates dataset + semantic state + embeddings
# Create conversation → returns conversation ID
# Ask question → SSE stream returns full output
# Check messages → both user + assistant messages stored
# Ask follow-up → session context used, planner sees history

# 2. Demo flow: login → see 3 demo datasets → ask scripted question → see output
# Toggle snapshot mode → instant responses for scripted questions
# Toggle off → live pipeline

# 3. All 6 scripted demo questions return reasonable answers
#    (both in live mode and snapshot mode)

# 4. Error handling: invalid dataset ID → 404
curl -H "Authorization: Bearer <jwt>" http://localhost:3001/api/datasets/nonexistent/semantic
# Expected: 404

# 5. Telemetry complete for 10+ queries
psql $DATABASE_URL -c "SELECT COUNT(*), AVG(latency_total_ms), COUNT(CASE WHEN fallback_triggered THEN 1 END) as fallbacks FROM pipeline_runs;"
# Expected: count=10+, avg latency populated, fallback count reasonable

# 6. Server runs stable for 30+ minutes under light load without memory leaks or crashes
```

---

## Phase Summary

| Phase | Delivers | Depends on |
|---|---|---|
| **0** | Running server + full DB schema | — |
| **1** | JWT auth + all CRUD routes | Phase 0 |
| **2** | CSV upload + S3 + profiler + LLM enrichment + embeddings + demo seeds | Phase 1 |
| **3** | All pipeline steps working in isolation | Phase 2 |
| **4** | Full pipeline orchestrator + SSE streaming | Phase 3 |
| **5** | Response + narration caching + telemetry | Phase 4 |
| **6** | Demo snapshot system | Phase 4 |
| **7** | Integration tests + hardening + edge cases | Phase 5 + 6 |

### Parallelism Map

```
Phase 0:  A ████████ scaffold + DB
          B ████████ server + env config
          ─────────── Gate 0 ───────────

Phase 1:  A ████████ CRUD routes (datasets, convos, messages)
          B ████████ auth plugin + user sync + Zod schemas
          ─────────── Gate 1 ───────────

Phase 2:  A ████████████████ S3 + CSV parse + profiler + dynamic table + upload route
          B ████████████████ key pool + rate queue + enricher + embedder + retriever
               └─── 2C: both wire upload + seed demos ───┘
          ─────────── Gate 2 ───────────

Phase 3:  A ████████████ DB executor + secondary query + autoInsight + narrator + confidence
          B ████████████ planner + templates + validator + sqlGenerator (4-tier)
          ─────────── Gate 3 ───────────

Phase 4:  A+B ████████████████ PAIR: orchestrator + SSE + output assembly + message persistence
          ─────────── Gate 4 ───────────

Phase 5:  A ████████ telemetry logger
          B ████████ response cache + narration cache + wire into orchestrator
          ─────────── Gate 5 ───────────

Phase 6:  A ████████ author 6 snapshot JSONs
          B ████████ snapshot store + toggle route + wire into orchestrator
          ─────────── Gate 6 ───────────

Phase 7:  A+B ████████ integration tests + edge cases + hardening
          ─────────── Gate 7 (SHIP IT) ───
```

---

*Talk to Data — Backend Implementation Plan · NatWest Code for Purpose Hackathon*
