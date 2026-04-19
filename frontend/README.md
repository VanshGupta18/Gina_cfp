# GINA — Frontend

Next.js (App Router) client for **GINA**: chat, dataset upload, dataset overview, and SSE streaming from `POST /api/query`.

## Repo context

- **Root README** ([`../README.md`](../README.md)) — product overview, stack, local setup for backend + frontend.
- **Eval & accuracy** ([`../eval/README.md`](../eval/README.md)) — manifest-based HTTP evals; recorded **24/24** pass summary for `saas-eval-advanced`: [`../eval/bundles/saas-eval-advanced/results/result-summary.md`](../eval/bundles/saas-eval-advanced/results/result-summary.md).

## Local development

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL → backend (e.g. http://localhost:3001)
# NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build && npm start
```

## Stack notes

This app uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for font optimization. For Next.js features and deployment, see [Next.js documentation](https://nextjs.org/docs).
