# CommitCourier — live demo & integration showcase

A small, deployable site that **runs [CommitCourier](https://www.npmjs.com/package/commitcourier) for real** so people evaluating it can see the actual integration code and watch it work.

- **Landing** — the dual-write problem and how riding your DB transaction solves it.
- **Integrate** — the exact 5-step integration (the same code that powers this site).
- **Live demo** — enqueue inside a real transaction, watch delivery / retries / DLQ / replay stream in over SSE, flip a flaky receiver, see the SSRF guard block a metadata-IP target.
- **Playground** — `commitcourier/core` (dependency-free, Web-standard-only) running **in your browser**: sign/verify, SSRF eval, backoff, AES-GCM cipher, the state machine.
- **Track record** — durable operational counters from the live database.

> This is a *consumer* of CommitCourier — it installs `commitcourier` straight from npm. The library itself is not vendored here.

## Architecture

One integrated Node process (mirrors how you'd embed CommitCourier in your own backend):

```
server/courier.ts   ← the entire integration: postgresStore → createRelay
server/index.ts     ← Express + in-process dispatcher + static frontend + graceful shutdown
server/receiver.ts  ← self-hosted webhook receiver (verifies signatures; switchable 200/500/timeout)
server/routes.ts    ← demo API (+ abuse guards: write rate-limit, fixed delivery target)
server/sse.ts       ← Server-Sent-Events live feed
server/metrics.ts   ← durable operational counters
web/                ← Vite + React frontend (built into web/dist, served by the Node app)
```

The dispatcher delivers to **this site's own** receiver only — visitor input never chooses a delivery URL, so the public demo can't be turned into an SSRF/spam relay. Write endpoints are rate-limited and terminal rows are auto-pruned.

## Requirements

- **Node.js ≥ 22.19** (CommitCourier's floor).
- **PostgreSQL 12+** — any managed instance ([Neon](https://neon.tech), Supabase, Railway) or local.

## Run locally

```bash
npm install
cp .env.example .env          # then set DATABASE_URL
npm run migrate               # create the CommitCourier + demo tables (once)
npm run dev                   # Vite on :5173 (proxies API to the server on :8787)
```

Open http://localhost:5173. The frontend proxies `/api` and `/receiver` to the Node app on `:8787`.

> Locally, use `PUBLIC_BASE_URL=http://127.0.0.1:8787` (not `localhost` — it resolves to IPv6 `::1` first, which the SSRF guard blocks). The receiver host is allowlisted automatically from `PUBLIC_BASE_URL`.

Need a throwaway database? `docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=commitcourier_demo -p 5432:5432 postgres:16` and use `DATABASE_URL=postgres://postgres:postgres@localhost:5432/commitcourier_demo`.

## Build & run for production

```bash
npm run build                 # bundles the frontend into web/dist
npm start                     # one process: API + dispatcher + serves web/dist on $PORT
```

## Deploy (long-running host)

CommitCourier's dispatcher is a long-lived loop, so deploy to a host that keeps a process alive — **Render / Railway / Fly.io** (not a serverless function platform; for those you'd switch to `relay.dispatchOnce` on a cron).

1. Provision a Postgres (Neon/Supabase free tier is plenty).
2. Set env vars: `DATABASE_URL`, `PUBLIC_BASE_URL` (your public https URL), `DEMO_WEBHOOK_SECRET`, `NODE_ENV=production`.
3. Build command: `npm install && npm run build`. Start command: `npm run migrate && npm start`.

In production `PUBLIC_BASE_URL` is a public host, so the SSRF guard passes it normally and no special allowlisting is needed.

## Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (TLS auto-enabled for non-local hosts). |
| `PUBLIC_BASE_URL` | This site's own URL; webhooks are delivered to `${PUBLIC_BASE_URL}/receiver`. |
| `DEMO_WEBHOOK_SECRET` | Standard Webhooks signing secret (`whsec_` + base64). |
| `PORT` | Server port (default 8787). |

## License

MIT. CommitCourier itself: https://github.com/Y1-Effy/CommitCourier
