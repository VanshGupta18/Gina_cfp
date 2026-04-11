# Talk to Data — Frontend Master Specification

> **For:** Antigravity (frontend team)
> **Stack:** Next.js 14 (App Router) · Tailwind CSS · Recharts · Supabase Auth · TypeScript
> **Deployment:** Vercel
> **Backend:** See `Backend_Master.md` for all API contracts, SSE events, and payload schemas
> **Version:** Final · April 2026

---

## 1. Repository Structure

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout: fonts, global styles, auth provider
│   ├── page.tsx                   # Landing page (unauthenticated)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts           # Supabase OAuth callback handler
│   └── app/                       # Protected: requires auth
│       ├── layout.tsx             # App shell: sidebar + main area
│       └── page.tsx               # Default redirect → first dataset or empty state
├── components/
│   ├── landing/
│   │   ├── Hero.tsx               # Tagline, sub-copy, CTA button
│   │   └── AuthModal.tsx          # Supabase Auth UI modal (OAuth buttons)
│   ├── sidebar/
│   │   ├── Sidebar.tsx            # Full sidebar: user, datasets grouped with nested convos
│   │   ├── DatasetSection.tsx     # Single dataset + its conversations list
│   │   ├── ConversationItem.tsx   # Individual conversation link
│   │   ├── DemoBadge.tsx          # "DEMO" badge component
│   │   └── NewConversationBtn.tsx # "+ New conversation" button per dataset
│   ├── upload/
│   │   ├── UploadZone.tsx         # Drag-drop + file picker
│   │   ├── PIISummaryBanner.tsx   # "We redacted N columns before processing"
│   │   └── UnderstandingCard.tsx  # Post-upload schema summary + "Something off?" link
│   ├── chat/
│   │   ├── ChatView.tsx           # Main chat area: messages + input
│   │   ├── MessageList.tsx        # Scrollable message history
│   │   ├── UserMessage.tsx        # User bubble
│   │   ├── AssistantMessage.tsx   # Assistant output card wrapper
│   │   ├── ThinkingPill.tsx       # Default "Thinking..." animated pill
│   │   ├── PipelineTrace.tsx      # Expanded reasoning trace (Gemini-style)
│   │   ├── PipelineStep.tsx       # Single step row: icon + label + status
│   │   ├── ChatInput.tsx          # Question input bar + send button
│   │   └── ReasoningToggle.tsx    # Global "Show reasoning ○ ●" toggle in chat header
│   ├── output/
│   │   ├── OutputCard.tsx         # Expandable output panel below assistant message
│   │   ├── KeyFigure.tsx          # Large prominent number/headline
│   │   ├── NarrativeText.tsx      # 2–3 sentence plain English explanation
│   │   ├── CitationChips.tsx      # "based on: amount, category, quarter"
│   │   ├── SQLExpand.tsx          # "See how this was calculated" accordion
│   │   ├── ConfidenceIndicator.tsx # 0–100 heuristic trust signal
│   │   ├── FollowUpSuggestions.tsx # 2–3 clickable pill suggestions
│   │   ├── PinButton.tsx          # Pin chart to right panel
│   │   └── SomethingOff.tsx       # Correction flow trigger
│   ├── charts/
│   │   ├── ChartPanel.tsx         # Chart dispatcher — selects chart type from chartType prop
│   │   ├── BarChart.tsx           # Recharts horizontal bar (Top-N / ranked)
│   │   ├── LineChart.tsx          # Recharts line (trend / time series)
│   │   ├── BigNumberCard.tsx      # Single large stat display
│   │   ├── GroupedBarChart.tsx    # Side-by-side comparison chart
│   │   ├── StackedBarChart.tsx    # Decomposition with % labels
│   │   └── DataTable.tsx          # Fallback formatted table
│   ├── pinned/
│   │   └── PinnedOutputPanel.tsx  # Right-side pinned chart panel (slides in)
│   ├── semantic/
│   │   └── CorrectionModal.tsx    # "Something off?" column correction dropdowns
│   └── shared/
│       ├── SnapshotBadge.tsx      # Amber "SNAPSHOT" badge when snapshot mode active
│       └── LoadingSkeleton.tsx    # Generic skeleton loaders
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client (createBrowserClient from @supabase/ssr)
│   │   └── server.ts              # Server-side Supabase client (createServerClient from @supabase/ssr)
│   ├── api/
│   │   ├── client.ts              # Typed fetch wrapper (attaches JWT to every request)
│   │   ├── datasets.ts            # Dataset API calls
│   │   ├── conversations.ts       # Conversation API calls
│   │   └── query.ts               # SSE query pipeline connection
│   ├── pii/
│   │   └── shield.ts              # Client-side PII detection + redaction (runs pre-upload)
│   └── hooks/
│       ├── useAuth.ts             # Auth state, user, logout
│       ├── useDatasets.ts         # Dataset list, active dataset
│       ├── useConversation.ts     # Messages for active conversation
│       ├── usePipeline.ts         # SSE connection, step events, result handling
│       └── useReasoningToggle.ts  # Global reasoning expand preference (sessionStorage)
├── types/
│   └── index.ts                   # All shared TypeScript interfaces
├── middleware.ts                  # Next.js middleware: protect /app/* routes
└── next.config.ts
```

---

## 2. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx                     # Supabase is transitioning to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — anon key still works
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com   # Backend Fastify server
```

---

## 3. Authentication

Uses Supabase Auth with OAuth (Google). No password forms, no custom auth UI beyond Supabase's hosted component.

> **⚠️ Package change:** `@supabase/auth-helpers-nextjs` is **deprecated**. All Supabase client creation now uses `@supabase/ssr` — `createBrowserClient` for client components, `createServerClient` for server components / route handlers / middleware.

### Flow
1. User lands on `/` (landing page)
2. Clicks "Get started" → `AuthModal` opens with Supabase `Auth` component (OAuth buttons)
3. OAuth redirect → Supabase → back to `/auth/callback`
4. `/auth/callback/route.ts` exchanges code for session, redirects to `/app`
5. `middleware.ts` blocks all `/app/*` routes unless valid Supabase session present

### JWT Handling
```typescript
// lib/api/client.ts
// Attach Supabase JWT to every backend API call
// NOTE: getSession() is safe here because this runs in the BROWSER.
// Never use getSession() in server code (middleware, route handlers) — use getUser() instead.
async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      ...options.headers
    }
  });
}
```

### Middleware
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not use getSession() in server code — it reads from
  // cookies without JWT validation and can be spoofed.
  // getUser() sends a request to Supabase Auth to revalidate the token.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = { matcher: ['/app/:path*'] };
```

---

## 4. Screen-by-Screen Specification

### 4.1 Landing Page (`/`)

**Layout:** Full-screen hero. Centered content. Clean, NatWest-appropriate.

**Content:**
- Logo / wordmark: "Talk to Data"
- Tagline: "Ask your data anything. Get plain English answers instantly."
- Sub-copy: 2 lines max. "Upload a CSV. Ask a question. No SQL, no dashboards, no guesswork."
- Primary CTA button: "Get started" → opens `AuthModal`
- Optional secondary link: "See a demo" → scrolls to or opens demo modal (optional, low priority)

**No navigation bar.** No footer required.

---

### 4.2 App Shell (`/app/layout.tsx`)

**Layout:** Fixed sidebar (left) + scrollable main area (right).

```
┌──────────────────┬───────────────────────────────────────────────┐
│  SIDEBAR         │  MAIN AREA                                    │
│  (260px fixed)   │  (fills remaining width)                      │
│                  │                                               │
│  [User avatar]   │  [Chat view or empty state]                   │
│  [Upload btn]    │                                               │
│  ─────────────   │                                               │
│  DEMO            │                                               │
│  ▼ Sunita SME    │                                               │
│    · Conv 1      │                                               │
│    · Conv 2      │                                               │
│    + New         │                                               │
│  ▼ James Grants  │                                               │
│  ▼ Donations     │                                               │
│  ─────────────   │                                               │
│  MY DATASETS     │                                               │
│  ▼ my_data.csv   │                                               │
│    · Conv 1      │                                               │
│    + New         │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

---

### 4.3 Sidebar (`components/sidebar/Sidebar.tsx`)

**Sections:**

1. **Header:** User avatar (Supabase profile picture or initials fallback) + email + logout icon
2. **"Upload new dataset" button** — prominent, always visible below header
3. **DEMO section** — always shown after auth. Badge "DEMO" on section header. Three pre-loaded datasets listed:
   - Sunita's SME Expenses
   - James' Charity Grants
   - Charity Donations
4. **MY DATASETS section** — user-uploaded datasets. Empty state: "No datasets yet".
5. Each dataset is collapsible. Expanded by default for active dataset. Shows:
   - Conversations listed by title (truncated to 40 chars)
   - "+ New conversation" button at bottom of list

**Active states:** selected conversation has highlighted background. Active dataset section auto-expands.

**Demo badge:** Small pill `DEMO` in amber/orange on demo dataset entries in sidebar and in the chat header when a demo dataset is active.

---

### 4.4 Upload Flow

Triggered by "Upload new dataset" button → opens modal or inline panel (modal preferred for simplicity).

**Step 1 — File selection:**
- Drag-drop zone with dashed border + upload icon
- "or click to browse" text
- Accepted: `.csv` only. Max 50MB enforced client-side before PII shield runs.

**Step 2 — PII Shield runs (client-side, immediate):**
- Shield logic in `lib/pii/shield.ts` runs synchronously on the file before any network call
- If PII detected: amber banner appears above drop zone: "We detected and redacted 2 sensitive columns (email, donor_id) before processing. Your original file is unchanged."
- Banner is non-blocking — user can see it and proceed
- Shield runs two passes:
  - Pass 1: column header heuristics (name, email, phone, dob, ssn, nino, address, postcode, account, sort_code, salary, gender)
  - Pass 2: regex on first 50 rows per column (email, UK phone, UK postcode, UUID, UK sort code `##-##-##`, NI number `[A-Z]{2}[0-9]{6}[A-Z]`)

**Step 3 — Upload + understanding card:**
- File POSTed to `POST /api/datasets/upload` (redacted CSV)
- Loading state: skeleton card where Understanding Card will appear
- On success: `UnderstandingCard` renders:
  - Icon (document/sparkle)
  - Plain English sentence: "Looks like a grant spending tracker with 60 records across Q1–Q3 2024. We read amount as your disbursement figure..."
  - **"Something off?"** link (underlined, subtle) → opens `CorrectionModal`
- Dataset appears in sidebar under MY DATASETS
- First conversation auto-created, chat input focused
- Modal closes

---

### 4.5 Chat View (`components/chat/ChatView.tsx`)

**Layout within main area:**
```
┌─────────────────────────────────────────┬────────────────┐
│  CHAT AREA                              │  PINNED PANEL  │
│                                         │  (hidden until │
│  [Dataset name + DEMO badge if demo]    │   pinned)      │
│  [Show reasoning ○ ●]  (top right)      │                │
│  ─────────────────────────────────────  │                │
│  [Message history scrollable]           │  [Latest       │
│                                         │   pinned       │
│                                         │   chart        │
│                                         │   here]        │
│  ─────────────────────────────────────  │                │
│  [Question input bar + send button]     │                │
└─────────────────────────────────────────┴────────────────┘
```

**Pinned panel:** Hidden by default (0 width). Slides in (smooth) when user clicks pin icon on any output card. Width: 360px. Shows latest pinned chart + key figure. "Unpin" button at top right. Replacing pin → new chart replaces previous.

**Reasoning toggle:** `Show reasoning ○ ●` in top-right of chat area. Off by default. When on, all subsequent pipeline traces auto-expand. Preference stored in `sessionStorage` — persists through page refreshes but not across sessions.

---

### 4.6 Message Rendering

#### User message
Simple right-aligned bubble. Text only.

#### Assistant message — Thinking state

**Default (reasoning toggle OFF):**
```
[⬤ Thinking...]
```
Small animated pill. Pulsing dot. Appears immediately after user sends. Replaced by output card when `result` SSE event arrives.

**Expanded (reasoning toggle ON or user clicked expand):**
```
▼ Thinking...  [collapse]
──────────────────────────
✓  Understood your question — identifying relevant columns
✓  Identified: amount, category, sustainability_flag
⬤  Generating SQL query...
   Executing against your data...
   Writing your answer...
```

Steps render live as SSE `step` events arrive. Each step:
- Pending: dimmed text, no icon
- Running: spinner icon (⬤ animated)
- Complete: checkmark (✓) + green text
- Warning/fallback: warning icon (⚠) + amber text + detail message

**Per-message expand:** Even when reasoning toggle is OFF globally, each assistant message has a small chevron `⌄` that expands/collapses the trace for that specific message after the fact.

#### Assistant message — Output Card

Renders after `result` SSE event. Replaces the thinking state inline.

```
┌─────────────────────────────────────────────┐
│  £142,400                                   │  ← KeyFigure (large)
│  total disbursed in Q1 2024                 │
│                                             │
│  Solar Equipment was your top category...   │  ← Narrative (2–3 sentences)
│                                             │
│  [▼ See chart]          [📌 Pin]           │  ← Expand toggle + Pin button
│                                             │
│  ┌─────────────────────────┐               │
│  │  [CHART renders here]   │               │  ← Collapses by default
│  └─────────────────────────┘               │
│                                             │
│  based on: amount · category · quarter      │  ← CitationChips
│  [▶ See how this was calculated]            │  ← SQL expand accordion
│  Confidence: ████████░░  82%               │  ← ConfidenceIndicator
│  ─────────────────────────────────────────  │
│  Try asking:                                │
│  [Which area drove the change?]             │  ← FollowUpSuggestions (pills)
│  [How does Q1 compare to Q2?]              │
│                                             │
│  Something off? ↗                          │  ← SomethingOff link
└─────────────────────────────────────────────┘
```

**Chart is collapsed by default.** User clicks "See chart" to expand. Once expanded, pin button appears. Collapsing the chart hides it again (chart data retained in state).

---

### 4.7 Chart Type Reference

| `chartType` from backend | Component | Recharts component | Notes |
|---|---|---|---|
| `big_number` | `BigNumberCard` | None (plain render) | Large number + label. No Recharts. |
| `bar` | `BarChart` | `BarChart` horizontal | Category on Y-axis, value on X-axis. |
| `line` | `LineChart` | `LineChart` | X-axis = period labels. |
| `grouped_bar` | `GroupedBarChart` | `BarChart` grouped | Side-by-side, two datasets. |
| `stacked_bar` | `StackedBarChart` | `BarChart` stacked | % labels on segments. |
| `table` | `DataTable` | None | Tailwind-styled table. Max 10 rows shown, expand for more. |

All charts: no axes labels shown by default (too noisy for small card). Tooltips on hover. NatWest-appropriate colour palette (deep teal/navy primary, amber accent).

---

### 4.8 Pipeline Trace — Full Step Reference

| SSE `step` value | Plain English label | Icon state |
|---|---|---|
| `planner` running | "Understanding your question..." | spinner |
| `planner` complete | "Understood your question — identifying relevant columns" | ✓ |
| `sql_generation` running | "Generating SQL query" | spinner |
| `sql_generation` complete | "Generating SQL query" | ✓ |
| `sql_fallback` warning | "Using backup query method" | ⚠ |
| `db_execution` running | "Executing against your data" | spinner |
| `db_execution` complete | "Executed — {N} records found" | ✓ |
| `secondary_query` running | "Digging deeper into what drove the change" | spinner |
| `secondary_query` complete | "Found the main contributing factor" | ✓ |
| `narration` running | "Writing your answer" | spinner |
| `cache_hit` | "Found this in recent results — answering instantly" | ✓ (instant) |

---

### 4.9 Something Off? — Correction Flow

Triggered by "Something off?" link on output card or understanding card.

Opens `CorrectionModal` (overlay, not full modal — slides up from bottom or appears inline):

```
┌────────────────────────────────────────┐
│  Tell us what we got wrong             │
│                                        │
│  amount         [Amount ▼] → [type ▼]  │
│  category       [Category ▼] → [type ▼]│
│  quarter        [Quarter ▼] → [type ▼] │
│                                        │
│  [Cancel]  [Update understanding]      │
└────────────────────────────────────────┘
```

Each row: column name + business label dropdown (pre-filled from current semantic state) + semantic type dropdown.

On submit: `PATCH /api/datasets/:id/semantic` → backend reruns enrichment → new understanding card shown. No page reload. Correction persists for this session and beyond (stored in semantic_states table).

---

### 4.10 Demo Snapshot Mode

Backend-side toggle. Frontend UI:
- When snapshot mode active (set by backend `SNAPSHOT_MODE=true` env or toggle API):
  - Amber badge `SNAPSHOT MODE` appears in the chat header
  - All pipeline trace steps still animate (from snapshot step data) — seamless
  - Responses are instant but appear to stream (artificial delay per step: 200ms each for realism)
- Keyboard shortcut `Ctrl+Shift+D` calls `POST /api/snapshot/toggle` → toggles mode
  - Shows toast: "Snapshot mode enabled" or "Snapshot mode disabled"

---

## 5. SSE Connection (`lib/api/query.ts` + `hooks/usePipeline.ts`)

```typescript
// lib/api/query.ts
export function createQueryStream(payload: QueryPayload, token: string) {
  return new EventSource(`${API_BASE}/api/query`, {
    // EventSource doesn't support POST — use fetch with ReadableStream
  });
}

// Use fetch + ReadableStream for POST-based SSE:
export async function* streamQuery(payload: QueryPayload, token: string) {
  const response = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload)
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield JSON.parse(line.slice(6));
      }
    }
  }
}
```

```typescript
// hooks/usePipeline.ts
export function usePipeline() {
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [result, setResult] = useState<OutputPayload | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  async function runQuery(payload: QueryPayload) {
    setIsStreaming(true);
    setSteps([]);
    setResult(null);

    const { data: { session } } = await supabase.auth.getSession();
    
    for await (const event of streamQuery(payload, session!.access_token)) {
      if (event.type === 'step') {
        setSteps(prev => updateStep(prev, event));
      } else if (event.type === 'result') {
        setResult(event);
        setIsStreaming(false);
      } else if (event.type === 'error') {
        setIsStreaming(false);
        // Show error state
      }
    }
  }

  return { steps, result, isStreaming, runQuery };
}
```

---

## 6. PII Shield (`lib/pii/shield.ts`)

Runs entirely client-side before any network call. Never sends raw data to backend.

```typescript
interface PIIShieldResult {
  redactedFile: File,
  redactedColumns: string[],
  totalRedactions: number
}

const HEADER_PATTERNS = [
  'name', 'email', 'phone', 'mobile', 'tel', 'dob', 'birth',
  'ssn', 'nino', 'nin', 'national_insurance', 'address', 'postcode',
  'account', 'sort_code', 'sortcode', 'salary', 'gender', 'passport'
];

const VALUE_REGEXES: Record<string, RegExp> = {
  REDACTED_EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  REDACTED_PHONE: /^(\+44|0044|0)?[\s-]?7\d{3}[\s-]?\d{6}$|^\+?[\d\s\-().]{10,}$/,
  REDACTED_POSTCODE: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
  REDACTED_ID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  REDACTED_SORT_CODE: /^\d{2}-\d{2}-\d{2}$/,
  REDACTED_NI: /^[A-Z]{2}\d{6}[A-Z]$/i,
  REDACTED_ACCOUNT: /^\d{8}$/
};
```

Redaction output map (stored in `messages.output_payload` for `piiSummary`):
| Detected type | Placeholder |
|---|---|
| Email | `[REDACTED_EMAIL]` |
| Name (header only) | `[REDACTED_NAME]` |
| Phone | `[REDACTED_PHONE]` |
| Postcode | `[REDACTED_POSTCODE]` |
| UUID | `[REDACTED_ID]` |
| Sort code | `[REDACTED_SORT_CODE]` |
| NI number | `[REDACTED_NI]` |
| Account number | `[REDACTED_ACCOUNT]` |

---

## 7. TypeScript Types Reference

```typescript
// types/index.ts

export interface Dataset {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  isDemo: boolean;
  demoSlug?: string;
  createdAt: string;
}

export interface SemanticState {
  datasetId: string;
  tableName: string;
  columns: ColumnProfile[];
  understandingCard: string;
}

export interface ColumnProfile {
  columnName: string;
  businessLabel: string;
  semanticType: 'amount' | 'date' | 'category' | 'identifier' | 'flag' | 'text';
  currency: 'GBP' | 'USD' | 'EUR' | null;
  description: string;
  sampleValues: string[];
  nullPct: number;
  uniqueCount: number;
  valueRange: { min: string; max: string } | null;
}

export interface Conversation {
  id: string;
  datasetId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  outputPayload: OutputPayload | null;
  createdAt: string;
}

export interface OutputPayload {
  narrative: string;
  chartType: 'bar' | 'line' | 'big_number' | 'grouped_bar' | 'stacked_bar' | 'table';
  chartData: ChartData | BigNumberData;
  keyFigure: string;
  citationChips: string[];
  sql: string;
  secondarySql: string | null;
  rowCount: number;
  confidenceScore: number;
  followUpSuggestions: string[];
  autoInsights: string[];
  cacheHit: boolean;
  snapshotUsed: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
}

export interface BigNumberData {
  value: number;
  label: string;
}

export interface PipelineStep {
  step: string;
  status: 'pending' | 'running' | 'complete' | 'warning';
  detail: string;
  sqlPath?: string;
  intent?: string;
  relevantColumns?: string[];
  rowsReturned?: number;
}

export interface QueryPayload {
  conversationId: string;
  datasetId: string;
  question: string;
  sessionContext: {
    recentExchanges: Array<{ question: string; answer: string }>;
    lastResultSet: Record<string, unknown>[] | null;
  };
}
```

---

## 8. State Management Notes

No Redux or Zustand required. Use React context sparingly:

- **`AuthContext`** — wraps app shell. Provides `user`, `session`, `signOut`. Populated from `useAuth` hook.
- **`DatasetContext`** — active dataset ID + semantic state. Updated on sidebar dataset click.
- **`ConversationContext`** — active conversation ID + messages. Updated on sidebar conversation click or new conversation created.

All server state managed via direct API calls + local `useState`. No global cache library needed at this scale.

---

## 9. Key UX Micro-Interactions

| Interaction | Behaviour |
|---|---|
| User sends message | Input disabled immediately. ThinkingPill appears. Input re-enables on `result` event. |
| Follow-up suggestion clicked | Pill populates the input bar (does not auto-submit). User hits enter or send. |
| Pinning a chart | Chart panel slides in from right (CSS transition, 200ms). Pin icon changes to filled. |
| Unpinning | Panel slides out. |
| Replacing pinned chart | New chart replaces old with crossfade. |
| "Something off?" | Slides up from bottom of output card inline (not full modal). |
| Understanding card correction submitted | Card text updates in place (no reload). Spinner for 1–2s while backend reruns. |
| Snapshot mode activated | Amber badge fades in at top of chat. Toast: "Snapshot mode active". |
| Empty conversation state | Centered message: "Ask a question about [dataset name]" with 2–3 sample question pills. |
| 0 rows returned | Output card shows: "No records matched this filter. Try broadening your question." + follow-up suggestions. |

---

## 10. Dependency List

```json
{
  "dependencies": {
    "next": "14",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "tailwindcss": "^3",
    "recharts": "^2",
    "papaparse": "^5",
    "@types/papaparse": "^5",
    "clsx": "^2",
    "tailwind-merge": "^2"
  }
}
```

**Removed:**
- `@supabase/auth-helpers-nextjs` — **deprecated**, replaced by `@supabase/ssr`
- `uuid` — use `crypto.randomUUID()` (built into all modern browsers and Node.js 19+)

---

## 11. Vercel Deployment Notes

- Set all `NEXT_PUBLIC_*` env vars in Vercel project settings
- Backend API URL must be HTTPS (Vercel enforces HTTPS on all outgoing fetch)
- SSE works on Vercel via streaming — ensure Fastify CORS allows the Vercel domain
- `middleware.ts` runs on Vercel Edge — keep it lightweight (no heavy imports). Uses `@supabase/ssr` `createServerClient` with `getUser()` for JWT-validated auth checks
- No `output: 'export'` — server-side features (auth callback route handler) require Node runtime

---

*Talk to Data — Frontend Master · NatWest Code for Purpose Hackathon*
