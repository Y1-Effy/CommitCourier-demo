/**
 * One-shot schema setup. Run once at deploy time: `npm run migrate`.
 *
 * `store.migrate()` is CommitCourier's own idempotent DDL (the webhook_outbox /
 * webhook_delivery_attempts / webhook_endpoints tables). The two demo tables below are NOT part
 * of CommitCourier — they exist only so this showcase has a "business write" to ride and a place
 * to keep durable operational counters.
 */
import { store, pool } from "./courier";

async function main() {
  console.log("Applying CommitCourier schema (store.migrate)...");
  await store.migrate();

  console.log("Applying demo-only tables...");
  // The "business" side of the dual-write demo: an order row that COMMITs/ROLLBACKs with the webhook.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_orders (
      id text PRIMARY KEY,
      amount integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  // Durable operational counters (survive prune) for the "operational track record" page.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_metrics (
      id integer PRIMARY KEY DEFAULT 1,
      enqueued bigint NOT NULL DEFAULT 0,
      delivered bigint NOT NULL DEFAULT 0,
      retried bigint NOT NULL DEFAULT 0,
      dead bigint NOT NULL DEFAULT 0,
      started_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT demo_metrics_singleton CHECK (id = 1)
    )
  `);
  await pool.query(`INSERT INTO demo_metrics (id) VALUES (1) ON CONFLICT DO NOTHING`);

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
