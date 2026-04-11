# Frontend Master — Dependency & API Audit

> **Generated:** Auto-audit against latest package registries + official documentation
> **Date:** June 2025
> **Status:** All critical and high issues FIXED in `Frontend_Master.md`

---

## Version Gap Summary

| Package | Spec Version | Latest Stable | Gap | Severity | Decision |
|---|---|---|---|---|---|
| `next` | `14` | `16.2.3` | 2 major | HIGH | **Stay on 14** — stable, no async API migration |
| `react` | `^18` | `19.2.5` | 1 major | HIGH | **Stay on ^18** — avoids React 19 migration |
| `react-dom` | `^18` | `19.2.5` | 1 major | HIGH | **Stay on ^18** — matches React |
| `@supabase/auth-helpers-nextjs` | `^0.10` | `0.15.0` | — | **CRITICAL** | **REMOVED** — package deprecated, replaced by `@supabase/ssr` |
| `@supabase/ssr` | *(not in spec)* | `0.10.2` | — | **CRITICAL** | **ADDED** `^0.5` — replaces auth-helpers |
| `tailwindcss` | `^3` | `4.2.2` | 1 major | HIGH | **Stay on ^3** — v4 is CSS-first paradigm shift |
| `recharts` | `^2` | `3.8.1` | 1 major | HIGH | **Stay on ^2** — v3 requires React 19 |
| `uuid` | `^9` | `13.0.0` | 4 major | MEDIUM | **REMOVED** — use `crypto.randomUUID()` (built-in) |
| `tailwind-merge` | `^2` | `3.5.0` | 1 major | LOW | **Stay on ^2** — v3 is for Tailwind v4 |
| `clsx` | `^2` | `2.1.1` | patch | NONE | OK |
| `papaparse` | `^5` | `5.5.3` | minor | NONE | OK |
| `@supabase/supabase-js` | `^2` | `2.49.4` | minor | NONE | OK |
| `typescript` | `^5` | `5.8.3` | minor | NONE | OK |

---

## Critical Issues Found & Fixed

### 1. `@supabase/auth-helpers-nextjs` is DEPRECATED ⛔
- **Problem:** Package replaced by `@supabase/ssr`. No further updates. All imports (`createMiddlewareClient`, `createClientComponentClient`, `createServerComponentClient`, `createRouteHandlerClient`) are obsolete.
- **Fix:** Replaced with `@supabase/ssr` `^0.5` using `createBrowserClient` (client) and `createServerClient` (server/middleware).

### 2. `createMiddlewareClient` in middleware.ts ⛔
- **Problem:** Uses deprecated import from `@supabase/auth-helpers-nextjs`. Pattern is broken with current Supabase.
- **Fix:** Rewrote middleware to use `createServerClient` from `@supabase/ssr` with `getAll`/`setAll` cookie pattern.

### 3. `supabase.auth.getSession()` used in server code ⛔
- **Problem:** Supabase docs explicitly warn: "Never trust `getSession()` inside server code such as middleware. It isn't guaranteed to revalidate the Auth token." It reads from cookies without JWT signature validation, so tokens can be spoofed.
- **Fix:** Middleware updated to use `supabase.auth.getUser()` which validates the JWT against Supabase Auth servers. Added security warning in spec.

---

## High Issues Found & Addressed

### 4. Next.js 14 → 16.2.3 (2 major versions behind)
- **Decision:** Stay on Next.js 14 for hackathon stability.
- **Rationale:** Next.js 15 made `cookies()`, `headers()`, `params`, `searchParams` async — significant migration. Next.js 16 is bleeding edge. 14 is stable and well-documented.

### 5. Tailwind CSS ^3 → 4.2.2
- **Decision:** Stay on Tailwind v3.
- **Rationale:** v4 is a complete paradigm shift: CSS-first config (`@import "tailwindcss"` instead of `tailwind.config.js`), renamed utilities (`shadow-sm`→`shadow-xs`, `rounded-sm`→`rounded-xs`, `outline-none`→`outline-hidden`, `ring`→`ring-3`), removed `@tailwind` directives. Too risky for hackathon.

### 6. React ^18 → 19.2.5
- **Decision:** Stay on React 18.
- **Rationale:** Recharts 3 peer-depends on React 19. Staying on Recharts 2 keeps React 18 viable.

### 7. Recharts ^2 → 3.8.1
- **Decision:** Stay on Recharts 2.
- **Rationale:** v3 has breaking changes in custom component composition and requires React 19.

---

## Medium Issues Found & Fixed

### 8. `uuid` ^9 removed
- **Problem:** uuid is at v13 (4 major versions ahead). Package is unnecessary — `crypto.randomUUID()` is built into all modern browsers and Node.js 19+.
- **Fix:** Removed from dependencies. Added note to use `crypto.randomUUID()`.

### 9. Environment variable naming
- **Problem:** Supabase is transitioning from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The anon key still works but the new naming is recommended.
- **Fix:** Added transition note in env vars section.

---

## No Action Needed

| Package | Reason |
|---|---|
| `clsx ^2` | Current: 2.1.1. Patch-level only. |
| `papaparse ^5` | Current: 5.5.3. Minor only. |
| `@supabase/supabase-js ^2` | Current: 2.49.4. Minor only. |
| `typescript ^5` | Current: 5.8.3. Minor only. |
| `tailwind-merge ^2` | v3 is for Tailwind v4. Staying on v3 means ^2 is correct. |
