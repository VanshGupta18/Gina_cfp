# Talk to Data — Backend Master Specification

> **Stack:** Node.js + Fastify · PostgreSQL + pgvector · S3 · Supabase Auth (JWT verification) · SSE
> **Deployment:** Linux server (backend + PostgreSQL + pgvector co-located)
> **Version:** Final · April 2026

---

## 1. Repository Structure

```
backend/
├── src/
│   ├── server.ts                  # Fastify entry point
│   ├── config/
│   │   └── env.ts                 # All env vars typed and validated
│   ├── plugins/
│   │   ├── auth.ts                # Supabase JWT verification plugin
│   │   ├── db.ts                  # PostgreSQL pool (pg) plugin
│   │   └── s3.ts                  # AWS S3 client plugin
│   ├── routes/
│   │   ├── datasets.ts            # Upload, list, get semantic state
│   │   ├── conversations.ts       # CRUD conversations
│   │   ├── messages.ts            # Get message history
│   │   └── query.ts               # Main pipeline SSE endpoint
│   ├── pipeline/
│   │   ├── planner.ts             # Merged Planner + Agent 1 (Groq Llama 4 Scout)
│   │   ├── sqlGenerator.ts        # Agent 2: EC2 → HF → Groq Maverick → templates
│   │   ├── sqlValidator.ts        # Syntax check before execution
│   │   ├── sqlTemplates.ts        # 5 deterministic fallback templates
│   │   ├── dbExecutor.ts          # Read-only PostgreSQL execution
│   │   ├── secondaryQuery.ts      # Delta detection + conditional GROUP BY
│   │   ├── narrator.ts            # Gemini Flash / Groq Maverick narration
│   │   ├── autoInsight.ts         # Trend / anomaly / concentration rules
│   │   └── orchestrator.ts        # Pipeline orchestration + SSE emission
│   ├── semantic/
│   │   ├── profiler.ts            # CSV column type detection, null rates, ranges
│   │   ├── enricher.ts            # LLM enrichment call → business meanings
│   │   ├── embedder.ts            # HuggingFace embeddings → pgvector
│   │   └── retriever.ts           # pgvector similarity search for Agent 1
│   ├── cache/
│   │   ├── responseCache.ts       # Semantic response cache (hash question + schema_id)
│   │   └── narrationCache.ts      # Narration output cache
│   ├── ratelimit/
│   │   ├── keyPool.ts             # Round-robin API key pool (Groq + Gemini)
│   │   └── queue.ts               # Rate-aware request queue (x-ratelimit-remaining)
│   ├── telemetry/
│   │   └── pipelineLogger.ts      # pipeline_runs table logging
│   ├── snapshots/
│   │   └── snapshotStore.ts       # Demo snapshot loader + matcher
│   └── utils/
│       ├── csvParser.ts           # PapaParse server-side
│       └── s3.ts                  # Upload / presigned URL helpers
├── snapshots/                     # Static JSON snapshots for 6 demo queries
│   ├── sunita_q1.json
│   ├── sunita_q2.json
│   ├── james_q1.json
│   ├── james_q2.json
│   ├── donations_q1.json
│   └── donations_q2.json
├── seeds/
│   ├── sunita_sme_expenses.csv
│   ├── james_charity_grants.csv
│   └── charity_donations.csv
├── semantic_yaml/                 # Pre-authored semantic states for demo datasets
│   ├── sunita_sme_expenses.yaml
│   ├── james_charity_grants.yaml
│   └── charity_donations.yaml
├── migrations/
│   └── 001_initial_schema.sql
└── package.json
```

---

## 2. Environment Variables

```env
# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/talktodata

# Supabase (JWT verification only — auth is managed by Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=talktodata-uploads
AWS_REGION=eu-west-2

# EC2 SQLCoder endpoint
SQLCODER_EC2_URL=http://<ec2-ip>:8080/generate
SQLCODER_EC2_TIMEOUT_MS=3000

# HuggingFace (SQLCoder fallback + embeddings)
HF_API_KEY_1=hf_xxx
HF_API_KEY_2=hf_xxx
SQLCODER_HF_MODEL=defog/sqlcoder-8b
EMBEDDING_HF_MODEL=BAAI/bge-small-en-v1.5

# Groq (round-robin pool)
GROQ_API_KEY_1=gsk_xxx
GROQ_API_KEY_2=gsk_xxx
GROQ_API_KEY_3=gsk_xxx
GROQ_MODEL_PLANNER=llama-4-scout-17b-16e-instruct
GROQ_MODEL_NARRATOR=llama-4-maverick-17b-128e-instruct
GROQ_MODEL_SQL_FALLBACK=llama-4-maverick-17b-128e-instruct

# Gemini (demo narrator — primary for demo, reserved)
GEMINI_API_KEY_1=xxx
GEMINI_API_KEY_2=xxx
GEMINI_MODEL=gemini-2.5-flash

# Pipeline config
USE_GEMINI_NARRATOR=false          # Set true on demo day
SNAPSHOT_MODE=false                # Ctrl+Shift+D sets this via API
SQL_FALLBACK_TIMEOUT_MS=3000
SECONDARY_QUERY_DELTA_THRESHOLD=0.05

# Server
PORT=3001
NODE_ENV=production
```

---

## 3. Database Schema

### 3.1 Full DDL

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (mirrors Supabase Auth — do not manage passwords here)
CREATE TABLE users (
  id UUID PRIMARY KEY,              -- Supabase Auth user ID (sub from JWT)
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datasets
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- Display name (original filename)
  s3_key TEXT,                      -- S3 object key for redacted CSV (null for demo datasets)
  row_count INTEGER,
  column_count INTEGER,
  is_demo BOOLEAN DEFAULT FALSE,
  demo_slug TEXT,                   -- 'sunita' | 'james' | 'donations' — for YAML lookup
  data_table_name TEXT NOT NULL,    -- e.g. 'dataset_<uuid>' — the dynamic table in PostgreSQL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Semantic states (one per dataset)
CREATE TABLE semantic_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  schema_json JSONB NOT NULL,       -- Full column profiles + metric dictionary (see Section 5)
  understanding_card TEXT,          -- Pre-generated plain English summary sentence
  is_user_corrected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema embeddings (for pgvector Agent 1 retrieval)
CREATE TABLE schema_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  embedding_text TEXT NOT NULL,     -- The text that was embedded
  embedding vector(384),            -- BAAI/bge-small-en-v1.5 dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON schema_embeddings USING hnsw (embedding vector_cosine_ops);

-- Conversations (multiple per dataset per user)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,                       -- Auto-set from first question (truncated to 60 chars)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,            -- User question or assistant narrative text
  output_payload JSONB,             -- Assistant only: full output (see Section 6.2)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Response cache (semantic deduplication)
CREATE TABLE response_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT NOT NULL UNIQUE,   -- SHA256(question_normalised + dataset_id)
  output_payload JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Narration cache
CREATE TABLE narration_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT NOT NULL UNIQUE,   -- SHA256(result_shape_fingerprint + intent)
  narration TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Pipeline run telemetry
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  intent TEXT,                      -- 'conversational' | 'simple_query' | 'complex_query' | 'follow_up_cache'
  latency_total_ms INTEGER,
  latency_planner_ms INTEGER,
  latency_sql_ms INTEGER,
  latency_db_ms INTEGER,
  latency_narrator_ms INTEGER,
  sql_path TEXT,                    -- 'ec2' | 'huggingface' | 'groq_maverick' | 'template'
  sql_valid BOOLEAN,
  rows_returned INTEGER,
  cache_hit TEXT,                   -- 'response_cache' | 'narration_cache' | 'none'
  fallback_triggered BOOLEAN DEFAULT FALSE,
  fallback_step TEXT,
  fallback_target TEXT,
  secondary_query_fired BOOLEAN DEFAULT FALSE,
  secondary_dimension TEXT,
  confidence_score INTEGER,
  snapshot_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Dynamic Dataset Tables

When a CSV is uploaded and processed, a dedicated table is created for that dataset:

```sql
-- Created dynamically during upload processing
-- Table name: dataset_{uuid_no_hyphens}
-- Example: dataset_4f3a2b1c9d8e7f6a5b4c3d2e1f0a9b8c

CREATE TABLE dataset_<id> (
  _row_id SERIAL PRIMARY KEY,
  -- Columns are derived from CSV headers with detected types
  -- e.g.: category TEXT, amount NUMERIC, date DATE, region TEXT, sustainability_flag TEXT
);

-- Read-only role (used by Agent 2 at query time)
CREATE ROLE readonly_agent;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_agent;
```

**Column type inference rules:**
| Detected pattern | PostgreSQL type |
|---|---|
| >80% parseable as ISO date / UK date | `DATE` |
| >80% parseable as numeric (strip £, $, commas) | `NUMERIC` |
| 2 unique values (Y/N, yes/no, true/false) | `TEXT` (with note in semantic state) |
| UUID pattern | `TEXT` |
| All else | `TEXT` |

---

## 4. API Routes

All routes except `/health` require `Authorization: Bearer <supabase_jwt>` header. JWT verified via Supabase service role key on every request. User ID extracted from JWT `sub` claim.

### 4.1 Route Table

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/users/sync` | JWT | Upsert user record from JWT claims on first login |
| `GET` | `/api/datasets` | JWT | List all datasets for authenticated user |
| `POST` | `/api/datasets/upload` | JWT | Upload redacted CSV → S3 → profile → embed → return dataset |
| `GET` | `/api/datasets/:datasetId/semantic` | JWT | Get semantic state for dataset |
| `PATCH` | `/api/datasets/:datasetId/semantic` | JWT | Apply user correction to semantic state |
| `GET` | `/api/datasets/:datasetId/conversations` | JWT | List conversations for a dataset |
| `POST` | `/api/datasets/:datasetId/conversations` | JWT | Create new conversation |
| `GET` | `/api/conversations/:conversationId/messages` | JWT | Get message history |
| `POST` | `/api/query` | JWT | **Main pipeline endpoint — returns SSE stream** |
| `POST` | `/api/snapshot/toggle` | JWT | Toggle snapshot mode (Ctrl+Shift+D) |

### 4.2 Request / Response Shapes

#### `POST /api/datasets/upload`
```typescript
// Request: multipart/form-data
// Field: file (CSV, max 50MB)

// Response 200
{
  dataset: {
    id: string,
    name: string,
    rowCount: number,
    columnCount: number,
    isDemo: false,
    createdAt: string
  },
  semanticState: SemanticState,         // See Section 5.2
  understandingCard: string,            // "Looks like a grant spending tracker..."
  piiSummary: {                         // What the client-side shield already handled
    redactedColumns: string[],          // For display only — server confirms receipt
    totalRedactions: number
  }
}
```

#### `POST /api/query` — SSE Stream
```typescript
// Request body
{
  conversationId: string,
  datasetId: string,
  question: string,
  sessionContext: {
    recentExchanges: Array<{ question: string, answer: string }>,  // Last 3
    lastResultSet: ResultRow[] | null                               // Most recent rows
  }
}

// Response: text/event-stream
// Events emitted in sequence:

event: step
data: { step: "planner", status: "complete", detail: "Understood your question — identifying relevant columns", intent: "simple_query", relevantColumns: ["amount","category","quarter"] }

event: step
data: { step: "sql_generation", status: "running", detail: "Generating SQL query", sqlPath: "ec2" }

event: step
data: { step: "sql_generation", status: "complete", detail: "Generating SQL query", sqlPath: "ec2", sql: "SELECT ..." }

event: step
data: { step: "sql_fallback", status: "warning", detail: "Using backup query method", originalPath: "ec2", fallbackPath: "template" }
// Only emitted when fallback fires

event: step
data: { step: "db_execution", status: "running", detail: "Executing against your data" }

event: step
data: { step: "db_execution", status: "complete", detail: "Executing against your data", rowsReturned: 12 }

event: step
data: { step: "secondary_query", status: "running", detail: "Digging deeper into what drove the change" }
// Only emitted when secondary query fires

event: step
data: { step: "narration", status: "running", detail: "Writing your answer" }

event: result
data: {
  messageId: string,
  narrative: string,
  chartType: "bar" | "line" | "big_number" | "grouped_bar" | "stacked_bar" | "table",
  chartData: ChartData,
  keyFigure: string,                    // e.g. "£142,400"
  citationChips: string[],              // e.g. ["amount", "category", "quarter"]
  sql: string,
  secondarySql: string | null,
  rowCount: number,
  confidenceScore: number,
  followUpSuggestions: string[],
  autoInsights: string[],
  cacheHit: boolean,
  snapshotUsed: boolean
}

event: error
data: { message: string, recoverable: boolean }
// Only on unrecoverable failure
```

#### `GET /api/conversations/:id/messages`
```typescript
// Response 200
{
  messages: Array<{
    id: string,
    role: "user" | "assistant",
    content: string,
    outputPayload: OutputPayload | null,   // null for user messages
    createdAt: string
  }>
}
```

#### `PATCH /api/datasets/:datasetId/semantic`
```typescript
// Request body
{
  corrections: Array<{
    columnName: string,
    newSemanticType: "amount" | "date" | "category" | "identifier" | "flag" | "text",
    newBusinessLabel: string,
    newDescription: string
  }>
}
// Backend reruns enrichment with corrections, updates semantic_states, re-embeds
```

---

## 5. Semantic Layer

### 5.1 Semantic State JSON Schema

```typescript
interface SemanticState {
  datasetId: string,
  tableName: string,                  // e.g. 'dataset_4f3a2b1c...'
  columns: ColumnProfile[],
  understandingCard: string
}

interface ColumnProfile {
  columnName: string,                 // Raw CSV header
  businessLabel: string,             // "Net Disbursement", "Programme Area"
  semanticType: "amount" | "date" | "category" | "identifier" | "flag" | "text",
  currency: "GBP" | "USD" | "EUR" | null,
  description: string,               // One sentence: what this column represents
  sampleValues: string[],            // 3–5 representative values
  nullPct: number,                   // 0–100
  uniqueCount: number,
  valueRange: { min: string, max: string } | null   // For numeric and date columns
}
```

### 5.2 Demo Dataset YAML Format

```yaml
# semantic_yaml/sunita_sme_expenses.yaml
datasetId: demo_sunita
tableName: dataset_demo_sunita
understandingCard: "Looks like an SME energy expense tracker with 80 records across Q1 2024. We read amount as your net spend in GBP, category as expense type, and sustainability_flag as your green spend indicator."
columns:
  - columnName: date
    businessLabel: Transaction Date
    semanticType: date
    currency: null
    description: The date the expense was recorded
    sampleValues: ["2024-01-05", "2024-02-12", "2024-03-20"]
    nullPct: 0
    uniqueCount: 67
    valueRange: { min: "2024-01-01", max: "2024-03-31" }
  - columnName: amount
    businessLabel: Net Spend (GBP)
    semanticType: amount
    currency: GBP
    description: Net expense amount in GBP. 30% of raw values have £ prefix — already normalised.
    sampleValues: ["1200.00", "340.50", "875.00"]
    nullPct: 0
    uniqueCount: 78
    valueRange: { min: "50.00", max: "8400.00" }
  # ... etc
```

### 5.3 Profiler Logic (for arbitrary CSV uploads)

```
1. Parse CSV with PapaParse (stream, max 50MB)
2. For each column:
   a. Sample up to 200 rows
   b. Strip whitespace, normalise casing
   c. Detect type: try date parse → try numeric parse → check unique ratio → text
   d. Compute null_pct, unique_count, min/max
   e. Take 5 representative sample values (non-null, varied)
3. Call Groq Llama 4 Scout with column names + samples → infer business labels and descriptions
4. Build SemanticState JSON
5. Generate embedding text per column: "{businessLabel}: {description}. Sample values: {sampleValues}"
6. POST each embedding text to HuggingFace BAAI/bge-small-en-v1.5
7. Store vectors in schema_embeddings table
8. Generate understanding card (one sentence summary)
```

---

## 6. Pipeline Orchestration

### 6.1 Merged Planner + Agent 1 (Groq Llama 4 Scout 17B)

Single structured JSON call. Returns both intent classification and relevant schema selection.

**Prompt structure:**
```
System: You are a data query planner. Given a user question and dataset schema, 
return a JSON object with intent classification and relevant columns.

Schema:
{columnProfiles as compact JSON — name, businessLabel, semanticType, description for each column}

Recent session context:
{last 3 exchanges as Q/A pairs}

Last result set available: {yes/no, shape summary}

User question: "{question}"

Return JSON only:
{
  "intent": "conversational" | "simple_query" | "complex_query" | "follow_up_cache",
  "relevantColumns": ["col1", "col2"],   // empty for conversational
  "relevantTables": ["table_name"],
  "answerFromCache": false,              // true only if follow_up_cache intent
  "cacheAnswer": null                    // populated only if answerFromCache true
}
```

**For `follow_up_cache` intent:** If `answerFromCache: true`, skip to Step 8 (narration) with the cached result set. No SQL fired.

**For `conversational` intent:** Return a direct plain-text response. No SQL fired.

### 6.2 Agent 2 — SQL Generation

Three-tier with timeout-based escalation:

```
Tier 1: EC2 SQLCoder-8B
  - POST {SQLCODER_EC2_URL}/generate
  - Timeout: 3000ms
  - On timeout | invalid SQL → Tier 2

Tier 2: HuggingFace SQLCoder-8B API
  - POST https://api-inference.huggingface.co/models/{SQLCODER_HF_MODEL}
  - Timeout: 8000ms (HF can be slow on cold start)
  - On timeout | invalid SQL → Tier 3

Tier 3: Groq Llama 4 Maverick 17B
  - SQL generation prompt (not NL→SQL specialist, but capable enough)
  - Timeout: 5000ms
  - On failure → Tier 4 (templates)

Tier 4: Deterministic templates (zero latency)
```

**SQLCoder prompt:**
```
### Task
Generate a PostgreSQL SELECT query to answer the question.

### Database Schema
Table: {tableName}
Columns:
{columnName} ({postgresType}) -- {businessLabel}: {description}
...

### Metric Definitions
{relevant metric dictionary entries}

### Constraints
- SELECT only. No INSERT, UPDATE, DELETE, DROP, CREATE, or DDL.
- Use exact column names from the schema above.
- Use parameterised-style literals (no $1 $2 — inline safe values only).
- Limit result rows to 100 maximum.
- Handle NULL values with COALESCE where appropriate.

### Question
{question}

### SQL
```

### 6.3 SQL Validator

Before execution, validate generated SQL:
1. Parse with `node-sql-parser` — reject if parse fails
2. Assert statement type is `SELECT` — reject any DDL or DML
3. Assert table references only contain the active dataset table name
4. If rejected → escalate to next SQL generation tier

### 6.4 Deterministic SQL Templates (Tier 4 Fallback)

Five templates. Selection by keyword scan on the question:

| Template | Keywords | SQL shape |
|---|---|---|
| **Top-N** | top, most, highest, largest, best, biggest | `SELECT {category}, SUM({amount}) as total FROM {table} GROUP BY {category} ORDER BY total DESC LIMIT 5` |
| **Sum/Total** | total, sum, how much, overall, all | `SELECT SUM({amount}) as total FROM {table}` |
| **Comparison** | compare, vs, versus, difference, between | `SELECT {category}, SUM({amount}) as total FROM {table} GROUP BY {category}` |
| **Trend** | over time, month, monthly, weekly, trend, changed | `SELECT DATE_TRUNC('month', {date}) as period, SUM({amount}) as total FROM {table} GROUP BY period ORDER BY period` |
| **Count** | how many, count, number of | `SELECT COUNT(*) as count FROM {table}` |

Column binding uses semantic type tags: `{amount}` = first column with `semanticType: 'amount'`, `{category}` = first column with `semanticType: 'category'`, `{date}` = first column with `semanticType: 'date'`.

### 6.5 Secondary Query Logic

Fires only when **both** conditions are true:
```typescript
const deltaThreshold = parseFloat(process.env.SECONDARY_QUERY_DELTA_THRESHOLD); // 0.05
const intentKeywords = ['why', 'what caused', 'what drove', 'what changed', 'what contributed', 'reason'];

const deltaExceeds = primaryResult.numericDelta > deltaThreshold;
const hasExplainIntent = intentKeywords.some(kw => question.toLowerCase().includes(kw));

if (deltaExceeds && hasExplainIntent) {
  // Fire GROUP BY query on most relevant category dimension
  // Most relevant = category column with highest cardinality from semantic state
}
```

### 6.6 Narrator

Single call. Primary: Gemini 2.5 Flash (when `USE_GEMINI_NARRATOR=true`). Default: Groq Llama 4 Maverick.

When secondary query fired, both result sets are batched into one narrator call (narrator batching — reduces API usage by 1 call per complex query).

**Gemini SDK note:** Uses `@google/genai` (v1.x) with the new `GoogleGenAI` client:
```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_1 });
const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL,  // 'gemini-2.5-flash'
  contents: narratorPrompt,
});
```

```
System: You are a plain English data analyst. Explain the query result clearly and concisely.
Identify the main driver if decomposition data is present.
Never invent numbers — use only the data provided.
Keep explanations to 2–3 sentences.

Dataset context: {understandingCard}
User question: {question}
Primary result: {primaryRows as compact JSON}
Secondary result (driver decomposition): {secondaryRows | null}
AutoInsights detected: {autoInsights[]}

Respond in plain English only. No markdown, no bullet points, no headers.
```

### 6.7 AutoInsight Rules (fire on result set before narration)

```typescript
function detectAutoInsights(rows: ResultRow[], semanticState: SemanticState): string[] {
  const insights = [];

  // Concentration: top item > 50% of total
  if (topItemPct > 0.5) insights.push(`${topItem} = ${pct}% of total`);

  // Trend: consistent direction across ≥3 periods
  if (isConsistentTrend(rows)) insights.push(`${direction} trend: ${startVal} → ${endVal}`);

  // Anomaly: any value > 2 standard deviations from mean
  if (hasAnomaly) insights.push(`${column}: ${anomalyValue} is significantly above/below average`);

  // Contradiction: awarded vs spent mismatch (for grant datasets)
  if (hasAmountPairMismatch) insights.push(`${col1} and ${col2} diverge by ${pct}%`);

  return insights;
}
```

### 6.8 Confidence Score

```typescript
function computeConfidence(rows, sqlPath, semanticState): number {
  let score = 100;
  if (rows.length === 0) score -= 40;
  if (rows.length < 5) score -= 10;
  if (sqlPath === 'template') score -= 20;
  if (sqlPath === 'groq_maverick') score -= 10;
  const avgNullPct = avg(relevantColumns.map(c => c.nullPct));
  if (avgNullPct > 20) score -= 15;
  if (avgNullPct > 50) score -= 15;
  return Math.max(0, Math.min(100, score));
}
```

---

## 7. Rate Limit Infrastructure

### 7.1 Round-Robin Key Pool

```typescript
// src/ratelimit/keyPool.ts
class KeyPool {
  private keys: string[];
  private index = 0;

  next(): string {
    const key = this.keys[this.index];
    this.index = (this.index + 1) % this.keys.length;
    return key;
  }
}

export const groqPool = new KeyPool([
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
]);

export const geminiPool = new KeyPool([
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2
]);
```

### 7.2 Rate-Aware Queue (Groq)

On every Groq response, read the `x-ratelimit-remaining-requests` header. If `remaining < 3`, queue the next request with a short delay until the window resets (`x-ratelimit-reset-requests` header gives the reset time).

This prevents hard 429 errors during burst usage by judges.

---

## 8. Demo Snapshot System

### 8.1 Snapshot JSON Shape

```typescript
// snapshots/sunita_q1.json
{
  matchQuestion: "What were my top 3 green energy spending categories this quarter?",
  datasetSlug: "sunita",
  outputPayload: {
    narrative: "Your top 3 green energy spending categories this quarter were Solar Equipment (£14,200, 52% of green spend), Wind Power (£7,800, 29%), and Energy Audits (£5,200, 19%). Solar Equipment alone accounts for more than half of all sustainability expenditure.",
    chartType: "bar",
    chartData: { ... },
    keyFigure: "£27,200",
    citationChips: ["amount", "category", "sustainability_flag"],
    sql: "SELECT category, SUM(amount) as total FROM dataset_demo_sunita WHERE sustainability_flag IN ('Y','yes','Yes') GROUP BY category ORDER BY total DESC LIMIT 3",
    secondarySql: null,
    rowCount: 3,
    confidenceScore: 95,
    followUpSuggestions: [
      "How has my sustainability spending changed month over month?",
      "What's the total green spend vs non-green spend?",
      "Which vendor had the highest solar equipment cost?"
    ],
    autoInsights: ["Solar Equipment = 52% of green spend"],
    cacheHit: false,
    snapshotUsed: true
  }
}
```

### 8.2 Snapshot Matching

On every query, if `SNAPSHOT_MODE=true` (set via toggle API):
1. Normalise question (lowercase, trim, strip punctuation)
2. Compare against all snapshot `matchQuestion` values (normalised same way)
3. If match found AND `datasetSlug` matches active dataset → return snapshot payload directly, skip pipeline
4. If no match → run live pipeline (snapshot mode doesn't block non-scripted queries)

---

## 9. Output Payload Schema (stored in messages.output_payload)

```typescript
interface OutputPayload {
  narrative: string,
  chartType: "bar" | "line" | "big_number" | "grouped_bar" | "stacked_bar" | "table",
  chartData: {
    labels: string[],
    datasets: Array<{
      label: string,
      data: number[]
    }>
  } | { value: number, label: string },    // big_number shape
  keyFigure: string,                        // "£142,400" | "94%" | "12"
  citationChips: string[],                  // ["amount", "category", "quarter"]
  sql: string,
  secondarySql: string | null,
  rowCount: number,
  confidenceScore: number,                  // 0–100
  followUpSuggestions: string[],            // 2–3 suggested next questions
  autoInsights: string[],                   // Detected patterns
  cacheHit: boolean,
  snapshotUsed: boolean
}
```

### Chart Type Selection Logic

```typescript
function selectChartType(rows, intent, resultShape): ChartType {
  if (rows.length === 1 && Object.keys(rows[0]).length === 1) return "big_number";
  if (intent === "trend" || hasDateColumn(rows)) return "line";
  if (intent === "comparison" && rows.length === 2) return "grouped_bar";
  if (hasPercentageColumn(rows) || intent === "decomposition") return "stacked_bar";
  if (rows.length > 1 && hasCategoryAndNumeric(rows)) return "bar";
  return "table";
}
```

---

## 10. Auth Middleware (Fastify Plugin)

```typescript
// src/plugins/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function authPlugin(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.url === '/health') return;

    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.status(401).send({ error: 'Missing token' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return reply.status(401).send({ error: 'Invalid token' });

    request.userId = user.id;
    request.userEmail = user.email;
  });
}
```

---

## 11. CSV Upload Processing Flow

```
1. Receive multipart/form-data (redacted CSV from client-side PII shield)
2. Validate: file must be CSV, max 50MB
3. Parse with PapaParse (stream)
4. Run profiler: type detection, null rates, ranges, sample values
5. Generate dataset UUID
6. Upload redacted CSV to S3: key = uploads/{userId}/{datasetId}/{filename}
7. Create dynamic table: CREATE TABLE dataset_{id} (...columns with detected types...)
8. INSERT all rows into dynamic table (bulk insert with pg COPY for speed)
9. Run LLM enrichment (Groq Llama 4 Scout) → business labels and descriptions
10. Generate embeddings (HuggingFace) → store in schema_embeddings
11. Generate understanding card (single sentence)
12. INSERT into datasets, semantic_states tables
13. Return dataset record + semantic state + PII summary confirmation
```

---

## 12. Security

- All SQL executed via parameterised queries through the `readonly_agent` PostgreSQL role
- Dynamic DDL (CREATE TABLE for uploads) executed via the main `talktodata` role, not `readonly_agent`
- Table names use UUID slugs — no user-controlled strings in table names
- Column names are whitelisted from the profiler output before being injected into prompts
- Agent 2 prompt explicitly instructs SELECT-only; SQL validator enforces this via AST check
- File upload: MIME type validated server-side (not just extension), max 50MB enforced
- Supabase JWT verified on every authenticated request — no session cookies
- S3 objects are private; no public bucket ACL
- No raw PII ever reaches the backend — client-side shield handles redaction before upload

---

## 13. Dependency List

```json
{
  "dependencies": {
    "fastify": "^5",
    "@fastify/multipart": "^10",
    "@fastify/cors": "^11",
    "@fastify/sse": "^0.4",
    "pg": "^8",
    "pgvector": "^0.2",
    "@supabase/supabase-js": "^2",
    "@aws-sdk/client-s3": "^3",
    "papaparse": "^5",
    "node-sql-parser": "^5",
    "groq-sdk": "^1",
    "@google/genai": "^1",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/pg": "^8",
    "tsx": "^4"
  }
}
```

---

*Talk to Data — Backend Master · NatWest Code for Purpose Hackathon*
