/**
 * The integrated Node app: ONE process that
 *   - runs the CommitCourier background dispatcher (delivers webhooks),
 *   - hosts a self-receiver to accept those webhooks,
 *   - exposes the demo API + Server-Sent-Events,
 *   - serves the built React frontend (in production).
 *
 * This mirrors how you'd embed CommitCourier in your own backend.
 */
import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { DeliveryHooks } from "commitcourier";
import { config } from "./config";
import { buildRelay, store, pool } from "./courier";
import { receiverRouter } from "./receiver";
import { getMode, getRecent } from "./receiver";
import { createApiRouter } from "./routes";
import { bumpMetric } from "./metrics";
import { broadcast, clientCount } from "./sse";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Fail fast if the schema isn't there yet (same check createRelay does, with a friendlier hint).
  const diag = await store.diagnose();
  if (!diag.ok) {
    console.error(
      `Missing tables: ${diag.missingTables.join(", ")}. Run \`npm run migrate\` first.`,
    );
    process.exit(1);
  }

  // Delivery-outcome hooks drive both the durable counters and the live UI feed.
  const hooks: DeliveryHooks = {
    onDelivered: (e) => {
      void bumpMetric("delivered");
      broadcast({ type: "delivery", outcome: "delivered", event: e });
    },
    onRetry: (e) => {
      void bumpMetric("retried");
      broadcast({ type: "delivery", outcome: "retry", event: e });
    },
    onDead: (e) => {
      void bumpMetric("dead");
      broadcast({ type: "delivery", outcome: "dead", event: e });
    },
  };

  const relay = await buildRelay(hooks);

  // Start delivering. Running in-process is fine; running several copies is safe too.
  const dispatcher = relay.createDispatcher({ concurrency: 4, pollIntervalMs: 1_000 });
  await dispatcher.start();
  console.log("[commitcourier] dispatcher started");

  const app = express();
  app.disable("x-powered-by");

  // The receiver needs the RAW body for signature verification, so parse it as text BEFORE json.
  app.use("/receiver", express.text({ type: () => true, limit: "1mb" }), receiverRouter);

  // Everything else is JSON.
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", createApiRouter(relay));

  // Serve the built frontend in production (single deployable).
  const webDist = resolve(__dirname, "../web/dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get("*", (_req, res) => res.sendFile(resolve(webDist, "index.html")));
  }

  const server = app.listen(config.port, () => {
    console.log(`[commitcourier-demo] listening on http://localhost:${config.port}`);
    console.log(`[commitcourier-demo] delivering webhooks to ${config.publicBaseUrl}/receiver`);
  });

  // Push a live snapshot to connected clients (~1.5s) so tables/metrics update in real time.
  const snapshotTimer = setInterval(() => {
    if (clientCount() === 0) return;
    void (async () => {
      try {
        const [stats, outbox] = await Promise.all([relay.stats(), relay.list({ limit: 25 })]);
        broadcast({
          type: "snapshot",
          stats,
          outbox: outbox.items,
          receiver: { mode: getMode(), recent: getRecent().slice(0, 8) },
        });
      } catch {
        /* fail-open: a snapshot miss is harmless */
      }
    })();
  }, 1_500);

  // Retention: keep the demo DB small and tidy (terminal rows older than 1h).
  const pruneTimer = setInterval(
    () => {
      void relay.prune({ olderThan: new Date(Date.now() - 60 * 60 * 1000) }).catch(() => undefined);
    },
    10 * 60 * 1000,
  );

  // Graceful shutdown so an in-flight delivery isn't lost.
  const shutdown = async () => {
    console.log("\n[commitcourier-demo] shutting down...");
    clearInterval(snapshotTimer);
    clearInterval(pruneTimer);
    server.close();
    await dispatcher.stop();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
