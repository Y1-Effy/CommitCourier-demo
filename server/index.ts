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
import compression from "compression";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { DeliveryHooks } from "commitcourier";
// The route table is pure data with no imports, so pulling it in here brings no React and no
// localized copy into the server's module graph. It is the single source of truth for which URLs
// exist: a page cannot be added to the app without the server learning to serve it.
import { ROUTES, NOT_FOUND_FILE, fileForPath } from "../web/routes";
import { config } from "./config";
import { buildRelay, store, pool } from "./courier";
import { receiverRouter } from "./receiver";
import { getMode, getRecent } from "./receiver";
import { createApiRouter } from "./routes";
import { bumpMetric, bumpHeartbeat } from "./metrics";
import { broadcast, clientCount } from "./sse";

const __dirname = dirname(fileURLToPath(import.meta.url));

// The eventType that marks an internal system heartbeat (as opposed to visitor/demo traffic). Used
// both to count it separately (demo_heartbeat) and to route its receiver-side outcome.
const HEARTBEAT_EVENT_TYPE = "system.heartbeat";

async function main() {
  // Fail fast if the schema isn't there yet (same check createRelay does, with a friendlier hint).
  const diag = await store.diagnose();
  if (!diag.ok) {
    console.error(
      `Missing tables: ${diag.missingTables.join(", ")}. Run \`npm run migrate\` first.`,
    );
    process.exit(1);
  }

  // Delivery-outcome hooks drive both the durable counters and the live UI feed. System-heartbeat
  // deliveries are counted in their OWN table (demo_heartbeat) so they never inflate the demo track
  // record, but they still broadcast to the live feed (the UI labels them distinctly).
  const hooks: DeliveryHooks = {
    onDelivered: (e) => {
      void (e.eventType === HEARTBEAT_EVENT_TYPE
        ? bumpHeartbeat("delivered")
        : bumpMetric("delivered"));
      broadcast({ type: "delivery", outcome: "delivered", event: e });
    },
    onRetry: (e) => {
      void (e.eventType === HEARTBEAT_EVENT_TYPE
        ? bumpHeartbeat("retried")
        : bumpMetric("retried"));
      broadcast({ type: "delivery", outcome: "retry", event: e });
    },
    onDead: (e) => {
      void (e.eventType === HEARTBEAT_EVENT_TYPE ? bumpHeartbeat("dead") : bumpMetric("dead"));
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
  // Behind a single reverse proxy in production (nginx on the VPS). Without this, `req.ip` is the proxy's IP, so
  // the write rate-limiter would key every visitor into one shared bucket (and express-rate-limit v7
  // logs an X-Forwarded-For validation error). One hop = trust the first proxy only.
  app.set("trust proxy", 1);

  // The receiver needs the RAW body for signature verification, so parse it as text BEFORE json.
  app.use("/receiver", express.text({ type: () => true, limit: "1mb" }), receiverRouter);

  // Everything else is JSON.
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", createApiRouter(relay));

  // Serve the built frontend in production (single deployable). Every route is prerendered to its
  // own file by scripts/prerender.mjs, so this maps URL -> file rather than falling back to one SPA
  // shell.
  const webDist = resolve(__dirname, "../web/dist");
  if (existsSync(webDist)) {
    const sendHtml = (res: express.Response, file: string, status = 200) =>
      res.status(status).sendFile(resolve(webDist, file), {
        // no-cache means "revalidate", not "don't store": the ETag still yields a 304 for unchanged
        // HTML, while a deploy takes effect immediately.
        cacheControl: false,
        headers: { "Cache-Control": "no-cache" },
      });
    const sendNotFound = (res: express.Response) => sendHtml(res, NOT_FOUND_FILE, 404);

    // Mounted HERE, below the /api router, and that placement is load-bearing: /api/events is an SSE
    // stream that only ever calls res.write(), never the res.flush() this middleware waits for.
    // Mounted globally it would buffer the live feed into silence, with no error anywhere. Requests
    // to /api are handled above and never reach this, which makes the mistake structurally
    // impossible. Same class of order-dependent trap as express.text() before express.json().
    app.use(compression());

    // Vite content-hashes these filenames, so a URL's bytes never change — cache them forever.
    app.use(
      "/assets",
      express.static(resolve(webDist, "assets"), { immutable: true, maxAge: "1y", index: false }),
    );

    // Fold the two ways of spelling a route onto its canonical URL, BEFORE the route table below.
    // Express routing is non-strict, so app.get("/why") would otherwise answer "/why/" with a 200
    // and leave the duplicate live.
    //   /why/       -> /why   (trailing slash)
    //   /why.html   -> /why   (the prerendered file; its canonical URL is extensionless)
    //   /index.html -> /
    // A 301 rather than a 404 because these are real, linkable spellings: consolidate them onto the
    // canonical URL instead of throwing the inbound link away.
    app.get("*", (req, res, next) => {
      const trimmed = req.path.replace(/\/+$/, "");
      if (trimmed !== "" && trimmed !== req.path && fileForPath(trimmed)) {
        return res.redirect(301, trimmed);
      }
      const named = ROUTES.find((r) => `/${r.file}` === req.path);
      if (named) return res.redirect(301, named.path);
      next();
    });

    for (const route of ROUTES) {
      app.get(route.path, (_req, res) => sendHtml(res, route.file));
    }

    // Any other *.html is a build artifact with no canonical URL of its own (404.html included).
    app.get(/\.html$/, (_req, res) => sendNotFound(res));

    // The remaining web/public assets: og.png, favicon.svg, robots.txt, sitemap.xml. index:false so
    // "/" is answered by the route table above (with its own Cache-Control), not by this mount.
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));

    app.get("*", (_req, res) => sendNotFound(res));
  }

  // Final error handler: async route rejections are routed here (see `wrap` in routes.ts) so a failed
  // DB query returns a 500 instead of hanging the request. Must be registered after all routes.
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[api] request failed:", err);
      if (res.headersSent) return;
      res.status(500).json({ error: "internal error" });
    },
  );

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

  // System heartbeat: a low-frequency self-delivery that keeps the demo visibly alive and proves the
  // dispatcher's long-running stability. Counted in demo_heartbeat (never demo_metrics); every Nth beat
  // is routed to the flaky path so retry -> DLQ is observable without any visitor action. Delivered to
  // this site's own receiver (the same fixed, allowlisted target as the interactive demo).
  const heartbeatTarget = `${config.publicBaseUrl}/receiver`;
  let heartbeatSeq = 0;
  const heartbeatTimer =
    config.heartbeatIntervalMs > 0
      ? setInterval(() => {
          heartbeatSeq += 1;
          const flaky =
            config.heartbeatFlakyEvery > 0 && heartbeatSeq % config.heartbeatFlakyEvery === 0;
          void relay
            .enqueueUnsafe({
              eventType: HEARTBEAT_EVENT_TYPE,
              payload: {
                heartbeat: true,
                scenario: flaky ? "flaky" : "ok",
                note: HEARTBEAT_EVENT_TYPE,
                at: new Date().toISOString(),
              },
              endpoint: { url: heartbeatTarget, secret: config.webhookSecret },
            })
            .catch((err) => console.warn("[heartbeat] enqueue failed", String(err)));
        }, config.heartbeatIntervalMs)
      : undefined;
  if (heartbeatTimer) {
    console.log(`[commitcourier-demo] system heartbeat every ${config.heartbeatIntervalMs}ms`);
  }

  // Graceful shutdown so an in-flight delivery isn't lost.
  const shutdown = async () => {
    console.log("\n[commitcourier-demo] shutting down...");
    clearInterval(snapshotTimer);
    clearInterval(pruneTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    // Stop the dispatcher FIRST while the HTTP server is still up: deliveries target this same process's
    // self-receiver, so closing the server first would make in-flight attempts hit ECONNREFUSED.
    await dispatcher.stop();
    server.close();
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
