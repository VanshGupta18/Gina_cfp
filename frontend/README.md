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

## Deploying on Vercel (auth)

OAuth uses `window.location.origin` for the callback URL. You must allow that URL in **Supabase → Authentication → URL Configuration**:

- Add **Redirect URLs** for each environment, e.g. `https://<project>.vercel.app/auth/callback`, preview URLs (`https://*.vercel.app/auth/callback` if your Supabase plan supports wildcards), and any custom domain.
- Set **Site URL** to your primary public URL (production or preview leader), not `http://localhost:3000`, or Supabase may fall back there when a redirect is not allowlisted.

Set `NEXT_PUBLIC_API_BASE_URL` on Vercel to your deployed API origin and ensure backend **CORS** allows the Vercel origin (see `backend` CORS config).

## Stack notes

This app uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for font optimization. For Next.js features and deployment, see [Next.js documentation](https://nextjs.org/docs).
