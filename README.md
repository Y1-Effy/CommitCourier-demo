# CommitCourier — live demo & integration showcase

[![npm](https://img.shields.io/npm/v/commitcourier.svg)](https://www.npmjs.com/package/commitcourier)
![node](https://img.shields.io/badge/node-%3E%3D22.19-brightgreen)
![postgres](https://img.shields.io/badge/postgres-12%2B-336791)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Y1-Effy/commitcourier-demo/ci.yml?label=CI)](https://github.com/Y1-Effy/commitcourier-demo/actions)

**日本語: [README.ja.md](./README.ja.md)**

A small, deployable site that **runs [CommitCourier](https://www.npmjs.com/package/commitcourier) for real** so people evaluating it can see the actual integration code and watch it work.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Y1-Effy/commitcourier-demo)

Eight pages, each its own URL, each prerendered to static HTML at build time:

- **[Landing](https://commitcourier-demo.xvps.jp/)** — the dual-write problem and how riding your DB transaction solves it.
- **[Why webhooks](https://commitcourier-demo.xvps.jp/why)** — the failure modes in depth: lost and phantom webhooks, what they cost, and the gap webhook SaaS leaves open.
- **[Safe adoption](https://commitcourier-demo.xvps.jp/safe-adoption)** — trying a pre-release library without betting on it: observe mode, small footprint, clean removal, honest limits.
- **[Integrate](https://commitcourier-demo.xvps.jp/integrate)** — the exact 5-step integration (the same code that powers this site).
- **[Live demo](https://commitcourier-demo.xvps.jp/demo)** — enqueue inside a real transaction, watch delivery / retries / DLQ / replay stream in over SSE, flip a flaky receiver, see the SSRF guard block a metadata-IP target.
- **[Playground](https://commitcourier-demo.xvps.jp/playground)** — `commitcourier/core` (dependency-free, Web-standard-only) running **in your browser**: sign/verify, SSRF eval, backoff, AES-GCM cipher, the state machine.
- **[Track record](https://commitcourier-demo.xvps.jp/stats)** — durable operational counters from the live database.
- **[FAQ](https://commitcourier-demo.xvps.jp/faq)** — the guarantees and the explicit non-goals.

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
server/config.ts    ← env loading + TLS detection
server/migrate.ts   ← store.migrate() + the demo-only tables

web/routes.ts       ← the route table: the single source of truth for the URL set. Pure data with no
                      imports, so server/index.ts can import it without pulling in React
web/lib/router.tsx  ← the History router (no library) + its document-level click interceptor
web/seo.ts          ← per-route title/description/OG + ORIGIN (drives canonicals and the sitemap)
web/entry-server.tsx← the prerender entry (build time only; never loaded by `npm start`)
web/                ← Vite + React frontend, prerendered into web/dist and served by the Node app
scripts/prerender.mjs← renders every route to static HTML and generates sitemap.xml
```

The dispatcher delivers to **this site's own** receiver only — visitor input never chooses a delivery URL, so the public demo can't be turned into an SSRF/spam relay. Write endpoints are rate-limited and terminal rows are auto-pruned.

Routing is History-API based, and every page is prerendered to its own static HTML file at build time, so each URL is independently readable without executing JavaScript. The Node app maps each URL to its prerendered file, redirects the duplicate spellings (`/why/`, `/why.html`) onto the canonical one, and serves a real 404 for anything else.

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
npm run build                 # three phases, in order (see below)
npm start                     # one process: API + dispatcher + serves web/dist on $PORT
```

`npm run build` runs three scripts in sequence, and the order is an invariant:

1. `build:client` — the browser bundle into `web/dist` (this **empties** `web/dist` and copies `web/public/*` into it).
2. `build:ssr` — a prerender bundle into `web/dist-ssr`.
3. `prerender` — imports that bundle and **adds** to `web/dist`: one static HTML file per route, `404.html`, and `sitemap.xml`.

The build needs **devDependencies** (`vite`, `react-dom/server`); `npm start` does not. So don't set `NODE_ENV=production` before `npm install`, or npm omits them and the build fails — use `npm install --include=dev` if your host exports it for you.

## Deploy (long-running host)

CommitCourier's dispatcher is a long-lived loop, so deploy to a host that keeps a process alive — a **VPS**, or **Render / Railway / Fly.io** (not a serverless function platform; for those you'd switch to `relay.dispatchOnce` on a cron).

**This site runs on a VPS.** `.github/workflows/deploy.yml` deploys it on every push to `main`: it SSHes to the box and runs `/home/deploy/deploy-commitcourier.sh` (that script and the nginx/TLS config live on the server, not in this repo). It needs the `VPS_HOST`, `VPS_USER` and `VPS_SSH_KEY` secrets.

**One-click (Render):** `render.yaml` is a Blueprint that provisions the web service + a managed Postgres. Click the **Deploy to Render** button above (replace the repo slug with your fork). `PUBLIC_BASE_URL` is auto-derived from Render's `RENDER_EXTERNAL_URL`, so the only thing to set is `DEMO_WEBHOOK_SECRET`.

Manual (any host):

1. Provision a Postgres (Neon/Supabase free tier is plenty).
2. Set env vars: `DATABASE_URL`, `PUBLIC_BASE_URL` (your public https URL), `DEMO_WEBHOOK_SECRET`, `NODE_ENV=production`.
3. Build command: `npm install --include=dev && npm run build`. Start command: `npm run migrate && npm start`.

> **`NODE_ENV=production` and the build don't mix.** With it exported, `npm install` sets `omit=dev` and skips the devDependencies the build needs. Set it for the _start_ command, or keep `--include=dev` on the install as above.

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
| `NODE_ENV`              | Set to `production` for the start command — but not before `npm install`, or the build loses its devDependencies (see Deploy).                                                              |
| `HEARTBEAT_INTERVAL_MS` | System-heartbeat interval in ms (default 60000; `0` disables it).                                                                                                                           |
| `HEARTBEAT_FLAKY_EVERY` | Fault-injection: every Nth heartbeat fails on purpose (retry → DLQ). Default `0` (OFF) — on the unattended heartbeat an injected failure just looks broken; raise it only for a chaos demo. |

## License

MIT. CommitCourier itself: https://github.com/Y1-Effy/CommitCourier
