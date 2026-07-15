# CommitCourier — live demo & integration showcase

[![npm](https://img.shields.io/npm/v/commitcourier.svg)](https://www.npmjs.com/package/commitcourier)
![node](https://img.shields.io/badge/node-%3E%3D22.19-brightgreen)
![postgres](https://img.shields.io/badge/postgres-12%2B-336791)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
<!-- CI badge: replace the slug with this demo repo's GitHub path once it has a remote -->

[![CI](https://img.shields.io/github/actions/workflow/status/Y1-Effy/commitcourier-demo/ci.yml?label=CI)](https://github.com/Y1-Effy/commitcourier-demo/actions)

**日本語: [README.ja.md](./README.ja.md)**

A small, deployable site that **runs [CommitCourier](https://www.npmjs.com/package/commitcourier) for real** so people evaluating it can see the actual integration code and watch it work.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Y1-Effy/commitcourier-demo)

- **Landing** — the dual-write problem and how riding your DB transaction solves it.
- **Integrate** — the exact 5-step integration (the same code that powers this site).
- **Live demo** — enqueue inside a real transaction, watch delivery / retries / DLQ / replay stream in over SSE, flip a flaky receiver, see the SSRF guard block a metadata-IP target.
- **Playground** — `commitcourier/core` (dependency-free, Web-standard-only) running **in your browser**: sign/verify, SSRF eval, backoff, AES-GCM cipher, the state machine.
- **Track record** — durable operational counters from the live database.

> This is a _consumer_ of CommitCourier — it installs `commitcourier` straight from npm. The library itself is not vendored here.

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
cp .env.example .env          # the defaults match the Docker DB below — no edits needed
npm run db:up                 # start a local Postgres in Docker (waits until healthy)
npm run migrate               # create the CommitCourier + demo tables (once)
npm run dev                   # Vite on :5173 (proxies API to the server on :8787)
```

Open http://localhost:5173. The frontend proxies `/api` and `/receiver` to the Node app on `:8787`.

> Locally, use `PUBLIC_BASE_URL=http://127.0.0.1:8787` (not `localhost` — it resolves to IPv6 `::1` first, which the SSRF guard blocks). The receiver host is allowlisted automatically from `PUBLIC_BASE_URL`.

### Database via Docker

`docker-compose.yml` defines a local Postgres whose credentials match the `.env.example`
default `DATABASE_URL`, so no extra configuration is needed.

- `npm run db:up` — start it (blocks until healthy) · `npm run db:down` — stop it
- `npm run db:reset` — drop the volume, recreate, and re-migrate · `npm run db:logs` — tail logs

In **VSCode**, just press **F5** ("Debug server" / "Debug full stack"): a `preLaunchTask`
brings the DB up and runs `migrate` automatically before the server starts. Requires a
running Docker Desktop. Prefer a managed Postgres (Neon/Supabase) instead? Point
`DATABASE_URL` at it and skip the `db:*` scripts.

## Build & run for production

```bash
npm run build                 # bundles the frontend into web/dist
npm start                     # one process: API + dispatcher + serves web/dist on $PORT
```

## Deploy (long-running host)

CommitCourier's dispatcher is a long-lived loop, so deploy to a host that keeps a process alive — **Render / Railway / Fly.io** (not a serverless function platform; for those you'd switch to `relay.dispatchOnce` on a cron).

**One-click (Render):** `render.yaml` is a Blueprint that provisions the web service + a managed Postgres. Click the **Deploy to Render** button above (replace the repo slug with your fork). `PUBLIC_BASE_URL` is auto-derived from Render's `RENDER_EXTERNAL_URL`, so the only thing to set is `DEMO_WEBHOOK_SECRET`.

Manual (any host):

1. Provision a Postgres (Neon/Supabase free tier is plenty).
2. Set env vars: `DATABASE_URL`, `PUBLIC_BASE_URL` (your public https URL), `DEMO_WEBHOOK_SECRET`, `NODE_ENV=production`.
3. Build command: `npm install && npm run build`. Start command: `npm run migrate && npm start`.

> **Not on Render?** `RENDER_EXTERNAL_URL` is injected only on Render, so on a VPS or any other host you must set `PUBLIC_BASE_URL` yourself (e.g. `https://commitcourier-demo.xvps.jp`). If it's left unset, delivery falls back to `http://localhost:8787` and the live demo loop breaks — the dispatcher can't reach its own receiver through the SSRF guard.

> This demo's live origin, `https://commitcourier-demo.xvps.jp`, is hardcoded in three places: `ORIGIN` in `web/seo.ts` (which drives every canonical URL, `og:url` and the generated `sitemap.xml`), the `og:image`/`twitter:image` and home-route tags in `web/index.html`, and the `Sitemap:` line in `web/public/robots.txt`. It is not derived from `PUBLIC_BASE_URL` — that value never reaches the built HTML. If you fork and deploy elsewhere, replace the origin in those three files, plus `Y1-Effy/commitcourier-demo` in the badge/Deploy slugs above. Regenerate the social card after editing `web/public/og.svg` with `node scripts/make-og.mjs`.

In production `PUBLIC_BASE_URL` is a public host, so the SSRF guard passes it normally and no special allowlisting is needed.

## Environment variables

| Var                     | Purpose                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string (TLS auto-enabled for non-local hosts).                                                                                                                        |
| `PUBLIC_BASE_URL`       | This site's own URL; webhooks are delivered to `${PUBLIC_BASE_URL}/receiver`.                                                                                                               |
| `DEMO_WEBHOOK_SECRET`   | Standard Webhooks signing secret (`whsec_` + base64).                                                                                                                                       |
| `PORT`                  | Server port (default 8787).                                                                                                                                                                 |
| `HEARTBEAT_INTERVAL_MS` | System-heartbeat interval in ms (default 60000; `0` disables it).                                                                                                                           |
| `HEARTBEAT_FLAKY_EVERY` | Fault-injection: every Nth heartbeat fails on purpose (retry → DLQ). Default `0` (OFF) — on the unattended heartbeat an injected failure just looks broken; raise it only for a chaos demo. |

## License

MIT. CommitCourier itself: https://github.com/Y1-Effy/CommitCourier
