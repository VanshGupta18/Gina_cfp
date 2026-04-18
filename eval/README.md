# GINA evaluation bundles and analytics

This folder defines **how** to package ground-truth questions + data for accuracy runs, and points to **operational** SQL for latency and cache metrics.

## What’s in the repo

| Path | Purpose |
|------|--------|
| [`schema/manifest.v1.schema.json`](schema/manifest.v1.schema.json) | JSON Schema for `manifest.json` (v1) |
| [`bundles/micro/`](bundles/micro/) | Minimal example bundle (template — fill in real table names and gold values) |
| [`scripts/validate-manifest.mjs`](scripts/validate-manifest.mjs) | Validates manifest structure (no extra npm deps) |
| [`context-for-llm/GINA_EVAL_CONTEXT.md`](context-for-llm/GINA_EVAL_CONTEXT.md) | **Paste into ChatGPT, Cursor, Claude, etc.** when generating bundles |
| [`sql/pipeline_runs_analytics.sql`](sql/pipeline_runs_analytics.sql) | Example queries on existing `pipeline_runs` telemetry |

## Validate a manifest

From repo root:

```bash
node eval/scripts/validate-manifest.mjs eval/bundles/micro/manifest.json
# or from repo root:
npm run eval:validate-manifest -- eval/bundles/micro/manifest.json
```

## Run an eval bundle (HTTP runner)

[`scripts/run-manifest.mjs`](scripts/run-manifest.mjs) calls the real API: sync user → upload the bundle’s CSV (or reuse a dataset) → `GET /semantic` for the dynamic table name → create a conversation → for each case `POST /api/query` (SSE) with empty session context. It scores:

- **Intent** (optional) and **relevant_columns** (optional) from the last `step` event with `step: planner` / `status: complete` (skipped if the response came from cache with no planner step).
- **Scalar / table** expectations against the last `result` payload (`resultTable`, `chartData` for big numbers).
- **`--check-sql`**: optional token Jaccard between substituted `gold_sql` and the response `sql` (heuristic only; LLM SQL rarely matches verbatim).

**Relaxed defaults (signal on results, not labels):**

| Env | Default | Meaning |
|-----|---------|--------|
| `EVAL_CHECK_INTENT` | unset | Do **not** fail SQL cases on `simple_query` vs `complex_query` mismatch; report `checks.intent.skipped`. Conversational cases still require intent. Set to `1` to enforce. |
| `EVAL_CHECK_RELEVANT_COLUMNS` | unset | Do **not** fail on column lists. Set to `1` to require every manifest column to appear in the planner’s list (**subset** match; extra planner columns OK). |
| `EVAL_DEFAULT_SCALAR_ABS_TOL` | `0.02` | Used when a numeric `scalar` expectation omits `abs_tol` / `rel_tol`. |
| `EVAL_DEFAULT_TABLE_ABS_TOL` | `0.02` | Numeric cell comparison for `table` results. Override per case with `expect.result.table_abs_tol` in the manifest. |

The JSON report includes `evalConfig` and informational `skipped` fields so you still see planner intent and columns when checks are relaxed.

### Reruns always hit `response_cache`

The API caches answers by **dataset id + question text** (see `response_cache` in Postgres). Re-running the same eval against the same dataset repeats cached results and **skips the full planner/SQL path**, which breaks eval scoring (no `planner` step).

**Options:**

1. **Dev backend:** set **`DISABLE_RESPONSE_CACHE=true`** in [`backend/.env`](../../backend/.env) and restart the API. Identical questions will run the pipeline every time.
2. **One-off:** in SQL (e.g. Supabase SQL editor), run `DELETE FROM response_cache;` (or wait for **24h** TTL).
3. **New dataset:** upload the CSV again so you get a new `dataset_id` and empty cache keys.

```bash
# Requires a running backend and a dev JWT (same idea as backend E2E scripts).
set TEST_JWT=eyJ...
set BASE_URL=http://127.0.0.1:3001
node eval/scripts/run-manifest.mjs eval/bundles/micro/manifest.json
# npm run eval:run-manifest -- eval/bundles/micro/manifest.json
```

Use **`EVAL_DATASET_ID`** or **`--dataset-id=`** to skip upload when the fixture is already loaded. The value must be the **dataset row UUID** (as in the app URL or upload response), not the Postgres table name. If you only have a table like `dataset_b1f3f4…`, the runner now accepts that string and converts it to the UUID the API expects.

Exit code **0** if every case passes, **1** otherwise. Full JSON report is printed to stdout.

## What the engineering team may add later

- In-process runner (no HTTP) for faster CI.
- Stronger SQL equivalence (AST / EXPLAIN) and **`follow_up_cache`** cases with non-empty `sessionContext`.

## What you need to provide

1. **A dedicated dataset per fixture** (or one combined sheet) uploaded into a **dev** GINA workspace — note the **`dataset_id`**, dynamic **`dataset_*` table name**, and a **`conversation_id`** for API calls.
2. **Supabase JWT** (or whatever auth the API expects) for `Authorization: Bearer …` when the runner calls `POST /api/query`.
3. **Filled `manifest.json`**: replace placeholders (e.g. `gold_sql` table name, scalar expected values after you know row counts).

## Tools you can use to generate bundles

Use anything that can emit **CSV + JSON** and follow the manifest schema:

| Tool | How to use it |
|------|----------------|
| **ChatGPT / Claude / Gemini** | Paste [`context-for-llm/GINA_EVAL_CONTEXT.md`](context-for-llm/GINA_EVAL_CONTEXT.md) + your domain brief; ask for CSV + manifest JSON. |
| **Cursor / Copilot** | Same context file in the repo; generate files under `eval/bundles/<name>/`. |
| **Python / Node scripts** | Use `faker`, `pandas`, or static fixtures to write CSVs; emit `manifest.json` from code. |
| **Spreadsheet** | Export CSV; hand-write or script the manifest. |

Always run **`node eval/scripts/validate-manifest.mjs`** before committing a bundle.

## Operational analytics (no eval bundle required)

The app already writes **`pipeline_runs`** per query. Use [`sql/pipeline_runs_analytics.sql`](sql/pipeline_runs_analytics.sql) for avg/p95 latency, intent mix, and cache-hit counts.
