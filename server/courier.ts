/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  This is the entire CommitCourier integration. Everything else in this repo is
 *  demo scaffolding (UI, SSE, abuse guards). To add transactional outbound
 *  webhooks to YOUR app, this is all you write:
 *
 *    1.  postgresStore({ pool })   — point it at the Postgres you already run
 *    2.  store.migrate()           — create the outbox tables (once, at deploy)
 *    3.  createRelay({ store })    — wire signing / retry / SSRF / DLQ
 *    4.  relay.enqueue(trx, ...)   — ride your business transaction (see routes.ts)
 *    5.  dispatcher.start()        — deliver in the background (see index.ts)
 *
 *  Installed straight from npm: `npm install commitcourier pg`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Pool, type PoolClient } from "pg";
import { postgresStore } from "commitcourier/store/pg";
import {
  createRelay,
  createConsoleLogger,
  type Relay,
  type DeliveryHooks,
} from "commitcourier";
import { config, needsSsl } from "./config";

// The dispatcher delivers to THIS site's own receiver. In production that's a public host (which
// passes SSRF anyway); for local dev it's `localhost` (loopback), which SSRF blocks by default — so
// we allowlist our own receiver host. Everything else (incl. the cloud-metadata IP) stays blocked.
const RECEIVER_HOST = new URL(config.publicBaseUrl).hostname;

// Use the PostgreSQL you already operate — no Redis, no extra broker, no SaaS.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: needsSsl(config.databaseUrl) ? { rejectUnauthorized: false } : undefined,
  max: 8,
});

export const store = postgresStore({ pool });

/**
 * Build the relay. `hooks` (delivery-outcome callbacks) are wired by the demo to drive the
 * live UI and the operational-metrics counters — they are optional for a real integration.
 */
export async function buildRelay(hooks?: DeliveryHooks): Promise<Relay<PoolClient>> {
  return createRelay<PoolClient>({
    store,
    // Without a logger, routine delivery failures/retries are silent. Always inject one.
    logger: createConsoleLogger(),
    hooks,
    // Tuned short for a live demo so retries/DLQ are observable in seconds, not hours.
    retry: { maxAttempts: 6, backoff: "exponential", baseMs: 1_000, capMs: 60_000, jitter: 0.2 },
    delivery: { timeoutMs: 5_000, bodySnippetBytes: 4_096 },
    // SSRF protection stays ON (the default). Only this site's own receiver host is allowlisted;
    // private/metadata targets (e.g. 169.254.169.254) are still blocked — see the SSRF demo.
    ssrf: { blockPrivateRanges: true, allowlist: [RECEIVER_HOST] },
    // Demo only: secrets are stored in plaintext and at-rest encryption is assumed to be the DB's
    // job. In production pass `cipher: createAesGcmCipher(key)` instead of acknowledging this.
    unsafeAllowPlaintextSecrets: true,
  });
}
