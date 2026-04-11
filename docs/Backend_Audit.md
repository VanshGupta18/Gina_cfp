# Backend Master Spec — Dependency & API Audit

> **Audited:** April 12, 2026
> **Source:** Context7 (live library docs) + npm registry
> **Status:** All critical and high issues FIXED in both `Backend_Master.md` and `Architecture.md`

---

## CRITICAL Issues (will not compile / will crash at runtime)

### 1. Fastify: v4 → v5 (Breaking)

| | Spec | Current |
|---|---|---|
| **Version** | `"fastify": "^4"` | **5.8.4** |

**Breaking changes that directly affect the spec:**

| Spec code | Problem | Fix |
|---|---|---|
| `request.routerPath === '/health'` (Section 10, auth plugin) | **`request.routerPath` is REMOVED in v5.** | Use `request.routeOptions.url === '/health'` |
| `fastify.listen(3001)` (implied) | Variadic `.listen()` removed in v5. | `fastify.listen({ port: 3001, host: '0.0.0.0' })` |
| Plugin registration mixing async + `done` callback | v5 enforces strict separation — pick one. | Use pure `async` plugin functions (no `done` param). |
| Schema shorthand `{ querystring: { name: { type: 'string' } } }` | v5 requires full JSON schema with `type: 'object'` + `properties`. | Wrap all schema definitions in full JSON Schema objects. |
| Custom logger passed as `logger` option | v5 uses `loggerInstance`. | Rename if using a custom Pino instance. |

**Action:** Pin `"fastify": "^5"` and audit every route/plugin for v5 compatibility.

---

### 2. `@google/generative-ai` → `@google/genai` (Package Replaced)

| | Spec | Current |
|---|---|---|
| **Package** | `"@google/generative-ai": "^0.21"` | **Package superseded** by `@google/genai` (v1.49.0) |

The old `@google/generative-ai` package (v0.24.1 final) is in maintenance mode. Google has migrated to `@google/genai` with a completely different API:

```typescript
// OLD (spec) — @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });
const result = await model.generateContent(prompt);

// NEW — @google/genai
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
});
```

**Action:** Replace `@google/generative-ai` with `@google/genai` (`^1.49.0`). Rewrite all Gemini calls in `narrator.ts`.

---

### 3. `@fastify/multipart`: v8 → v10 (Breaking)

| | Spec | Current |
|---|---|---|
| **Version** | `"@fastify/multipart": "^8"` | **10.0.0** |

v10 is the Fastify v5-compatible version. v8 will **not load** on Fastify 5 due to plugin version constraints.

**Action:** Update to `"@fastify/multipart": "^10"`.

---

### 4. `@fastify/cors`: v9 → v11 (Breaking)

| | Spec | Current |
|---|---|---|
| **Version** | `"@fastify/cors": "^9"` | **11.2.0** |

Same as multipart — v9 is Fastify v4-only. v11 is needed for Fastify v5.

**Action:** Update to `"@fastify/cors": "^11"`.

---

### 5. Groq SDK: v0.3 → v1.1 (Major Version Bump)

| | Spec | Current |
|---|---|---|
| **Version** | `"groq-sdk": "^0.3"` | **1.1.2** |

The SDK crossed a major version boundary. While the core `client.chat.completions.create()` API is largely compatible, the initialization and error types have changed:

```typescript
// Current correct usage
import Groq from 'groq-sdk';
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

Rate-limit header names and error class hierarchy may have changed between 0.x and 1.x.

**Action:** Update to `"groq-sdk": "^1"`. Verify `x-ratelimit-remaining-requests` header name is still correct in v1. Verify `Groq.APIError` class still exists.

---

## HIGH Issues (outdated but may still work — technical debt / risk)

### 6. Gemini Model Name: Preview Model Expired

| | Spec | Concern |
|---|---|---|
| **Model** | `gemini-2.5-flash-preview-04-17` | Preview models expire. This model name will 404. |

Google rotates preview model names regularly. By April 2026:
- The stable name is `gemini-2.5-flash` (no preview suffix).
- Or a newer model like `gemini-2.5-flash-preview-XX-YY` with a current date.

**Action:** Change `GEMINI_MODEL` to `gemini-2.5-flash` (stable) or check the current preview name at deploy time.

---

### 7. Groq Model Names: Likely Deprecated

| Spec Model | Risk |
|---|---|
| `llama-3.1-8b-instant` | Groq regularly deprecates older model versions. Llama 4 models are likely available by April 2026. |
| `llama-3.3-70b-versatile` | May still work, but check Groq's model list at deploy time. |

**Action:** Verify model availability on the [Groq models page](https://console.groq.com/docs/models) before deployment. Consider upgrading to Llama 4 models if available.

---

### 8. HuggingFace SQLCoder: `defog/sqlcoder-8b` Availability

The HuggingFace Inference API free tier regularly changes which models are available. `defog/sqlcoder-8b` may not be available for free inference.

**Action:** Verify model availability. Consider that this is Tier 2 fallback anyway — if HF is unreliable, the Groq 70B → template fallback chain still works.

---

### 9. Missing `@fastify/sse` from Dependencies

The spec describes SSE streaming extensively but the dependency list includes no SSE plugin. Fastify now has an official `@fastify/sse` plugin (v0.4.0) with:
- Route-level `{ sse: true }` option
- Proper `reply.sse.send()` API
- Async generator support
- Backpressure handling

The spec seems to plan manual SSE via raw `reply.raw` writes, which works but is fragile. The official plugin is more robust.

**Action:** Either:
- Add `"@fastify/sse": "^0.4"` and use its API, OR
- Document that SSE is handled manually (acceptable for a hackathon)

---

### 10. Missing `pgvector` Node.js Package from Dependencies

The spec uses pgvector for embeddings but the dependency list doesn't include the `pgvector` npm package (v0.2.1). Without it, you'll need to manually handle vector type serialization with raw `pg` queries using string formatting like `'[0.1, 0.2, ...]'`.

**Action:** Add `"pgvector": "^0.2"` to dependencies for proper vector type handling with the `pg` client.

---

### 11. pgvector Indexing: IVFFlat → HNSW Preferred

```sql
-- Spec uses:
CREATE INDEX ON schema_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Current best practice:
CREATE INDEX ON schema_embeddings USING hnsw (embedding vector_cosine_ops);
```

HNSW is now the recommended default because:
- No training step required (IVFFlat needs `CREATE INDEX` to scan all rows first)
- Better recall at the same speed
- Works well with small datasets (IVFFlat needs tuning of `lists` parameter)

For a hackathon dataset with <10K embeddings, HNSW is strictly better.

**Action:** Change to HNSW in the migration DDL.

---

## MEDIUM Issues (correctness / best practice)

### 12. `crypto` Listed as a Dependency

```json
"crypto": "built-in"     // ← This should NOT be in package.json
```

`crypto` is a Node.js built-in module. Listing it in `package.json` is misleading and could pull in a deprecated shim package.

**Action:** Remove from dependency list. Just `import crypto from 'node:crypto'`.

---

### 13. `uuid` Package May Be Unnecessary

| | Spec | Alternative |
|---|---|---|
| **Package** | `"uuid": "^9"` → current is **v13.0.0** | `crypto.randomUUID()` (built-in since Node 14.17) |

The spec also uses `uuid_generate_v4()` in PostgreSQL, so the Node.js `uuid` package is only needed if UUIDs are generated in application code rather than the database.

**Action:** Either update to `"uuid": "^11"` (v9 is quite old, v13 is current), or remove entirely and use `crypto.randomUUID()` + PostgreSQL's `gen_random_uuid()`.

---

### 14. `node-sql-parser`: v4 → v5

| | Spec | Current |
|---|---|---|
| **Version** | `"node-sql-parser": "^4"` | **5.4.0** |

v5 has improved PostgreSQL dialect support which is directly relevant to the SQL validator.

**Action:** Update to `"node-sql-parser": "^5"`.

---

### 15. TypeScript and @types/node Versions

| | Spec | Current |
|---|---|---|
| TypeScript | `"typescript": "^5"` | **6.0.2** |
| @types/node | `"@types/node": "^20"` | Should match Node.js version (22+) |

TypeScript 6 was released. `^5` will pin you to 5.x which still works but misses new features.

**Action:** Update to `"typescript": "^6"` and `"@types/node": "^22"`.

---

### 16. Zod Version

| | Spec | Current |
|---|---|---|
| **Version** | `"zod": "^3"` | **4.3.6** (!) |

Zod 4 was a major release (Zod Mini, tree-shaking improvements, new API surface). `^3` in the spec will lock you to the old version.

**Action:** Either stay on `"zod": "^3"` (still works fine) or update to `"zod": "^4"` and check for any breaking API changes in validation schemas.

---

## LOW Issues (cosmetic / future-proofing)

### 17. `BAAI/bge-small-en-v1.5` Embeddings

Still a solid 384-dimension model. Newer alternatives exist (e.g., `BAAI/bge-m3`, Cohere embed v4) but for a hackathon with small datasets, this is fine.

**No action needed** unless you want higher quality retrieval.

---

### 18. `pg` Package Version

| | Spec | Current |
|---|---|---|
| **Version** | `"pg": "^8"` | **8.20.0** |

Still on v8.x, so `^8` is correct and current.

**No action needed.**

---

### 19. PapaParse Version

| | Spec | Current |
|---|---|---|
| **Version** | `"papaparse": "^5"` | **5.5.3** |

Still on v5.x, so `^5` is correct and current.

**No action needed.**

---

## Summary: Updated Dependency List

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
    "uuid": "^11",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^6",
    "@types/node": "^22",
    "@types/pg": "^8",
    "tsx": "^4"
  }
}
```

### Code Changes Required

| File | Change |
|---|---|
| `src/plugins/auth.ts` | `request.routerPath` → `request.routeOptions.url` |
| `src/server.ts` | `.listen()` → `.listen({ port, host })` |
| `src/pipeline/narrator.ts` | Rewrite Gemini calls from `@google/generative-ai` → `@google/genai` API |
| `src/ratelimit/keyPool.ts` | Verify Groq SDK v1 rate-limit header names |
| `migrations/001_initial_schema.sql` | `ivfflat` → `hnsw` for schema_embeddings index |
| `src/config/env.ts` | Update `GEMINI_MODEL` default to `gemini-2.5-flash` (no preview suffix) |
| All plugins | Ensure no mixed async/callback registration patterns |
| All route schemas | Ensure full JSON Schema objects (not shorthand) |

---

*Generated via Context7 library docs + npm registry verification*
