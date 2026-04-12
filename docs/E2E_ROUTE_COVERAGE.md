# Frontend coverage — `GINA E2E.yaml` routes

Maps each backend route from [GINA E2E.yaml](../GINA%20E2E.yaml) (§ Endpoint coverage) to the **frontend code path** that calls it. Negative-only routes are noted.

| # | Method | Path | Frontend consumer |
|---|--------|------|---------------------|
| 1 | GET | `/health` | [`getHealth`](../frontend/lib/api/debug.ts) → Integration panel ([`IntegrationDebugPanel`](../frontend/components/debug/IntegrationDebugPanel.tsx)) |
| 2 | POST | `/api/users/sync` | [`syncUserProfile`](../frontend/lib/api/users.ts) via [`useAuth`](../frontend/lib/hooks/useAuth.ts) after session is available |
| 3 | GET | `/api/datasets` | [`listDatasets`](../frontend/lib/api/datasets.ts) → [`useDatasets`](../frontend/lib/hooks/useDatasets.tsx) |
| 4 | POST | `/api/datasets/upload` | [`uploadDataset`](../frontend/lib/api/datasets.ts) → [`UploadModal`](../frontend/components/upload/UploadModal.tsx) (after client-side PII shield when applicable) |
| 5 | GET | `/api/datasets/:id/semantic` | [`getSemanticState`](../frontend/lib/api/datasets.ts) → dataset/semantic consumers (e.g. correction flow) |
| 6 | PATCH | `/api/datasets/:id/semantic` | [`patchSemanticState`](../frontend/lib/api/datasets.ts) → [`CorrectionModal`](../frontend/components/upload/CorrectionModal.tsx) |
| 7 | GET | `/api/datasets/:id/conversations` | [`listConversations`](../frontend/lib/api/conversations.ts) → [`useConversation`](../frontend/lib/hooks/useConversation.tsx) |
| 8 | POST | `/api/datasets/:id/conversations` | [`createConversation`](../frontend/lib/api/conversations.ts) → conversation bootstrap in app flow |
| 9 | GET | `/api/conversations/:id/messages` | [`listMessages`](../frontend/lib/api/messages.ts) → chat/history load |
| 10 | POST | `/api/query` (SSE) | [`streamQuery`](../frontend/lib/api/query.ts) → [`usePipeline`](../frontend/lib/hooks/usePipeline.ts) → chat submit |
| 11 | POST | `/api/snapshot/toggle` | [`postSnapshotToggle`](../frontend/lib/api/debug.ts) → Integration panel |
| 12 | Error cases | various | Exercised indirectly when the UI receives 4xx/5xx; [`messageFromApiErrorPayload`](../frontend/lib/api/errors.ts) normalizes JSON errors for REST and pre-stream query failures |

**Not a Gina backend route:** Supabase `POST /auth/v1/token` (bootstrap in Postman) is satisfied by the app’s normal Supabase auth flow, not a custom frontend module.

**Verification:** With backend running and `NEXT_PUBLIC_API_BASE_URL` set, sign in → datasets load → open chat → query streams → Integration panel can hit health + snapshot toggle. Run `npm run build` in `frontend/` for compile-time checks.
