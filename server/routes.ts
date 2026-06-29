import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { PoolClient } from "pg";
import type { Relay, Status } from "commitcourier";
import { pool } from "./courier";
import { config } from "./config";
import { bumpMetric, readMetrics } from "./metrics";
import { getMode, setMode, getRecent, type ReceiverMode } from "./receiver";
import { addClient, removeClient } from "./sse";

const TARGET = `${config.publicBaseUrl}/receiver`;
const SSRF_TARGET = "http://169.254.169.254/latest/meta-data/"; // cloud metadata IP — blocked by SSRF

const EVENT_TYPES = ["order.created", "user.signup", "invoice.paid", "shipment.dispatched"];
function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)] as T;
}
function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Throttle the write endpoints so a public demo can't be turned into a spam/abuse engine. */
const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApiRouter(relay: Relay<PoolClient>): Router {
  const r = Router();

  // ── Enqueue inside a real business transaction (the core CommitCourier value) ──────────────
  // `commit:false` rolls the transaction back: the order AND the webhook vanish together. That is
  // the dual-write guarantee — you can never emit a webhook for a write that didn't commit.
  r.post("/enqueue", writeLimiter, async (req: Request, res: Response) => {
    const commit = req.body?.commit !== false;
    const orderId = `order_${shortId()}`;
    const amount = Math.floor(Math.random() * 50_000) + 100;
    const eventType = pick(EVENT_TYPES);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO demo_orders (id, amount) VALUES ($1, $2)", [orderId, amount]);

      // Rides the SAME transaction handle (fail-closed):
      const { id } = await relay.enqueue(client, {
        eventType,
        payload: { orderId, amount, at: new Date().toISOString() },
        endpoint: { url: TARGET, secret: config.webhookSecret },
        idempotencyKey: orderId,
      });

      if (commit) {
        await client.query("COMMIT");
        await bumpMetric("enqueued");
      } else {
        await client.query("ROLLBACK"); // the outbox row rolls back too
      }
      res.json({ ok: true, committed: commit, id, eventType, orderId, amount });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: String(err) });
    } finally {
      client.release();
    }
  });

  // ── SSRF demo: enqueue a delivery aimed at the cloud-metadata IP. The dispatcher blocks it at
  //    delivery time and records the block in the ledger. (Fixed, safe target — not user input.) ──
  r.post("/enqueue-ssrf", writeLimiter, async (_req, res) => {
    try {
      const { id } = await relay.enqueueUnsafe({
        eventType: "ssrf.demo",
        payload: { note: "attempt to reach cloud metadata" },
        endpoint: { url: SSRF_TARGET, secret: config.webhookSecret },
      });
      res.json({ ok: true, id, target: SSRF_TARGET });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Idempotency demo: enqueue the SAME idempotency-key twice → two real at-least-once deliveries.
  //    The receiver dedups on the key so the effect lands once (see server/receiver.ts). This shows
  //    the honest model: CommitCourier is at-least-once + carries an idempotency-key; the RECEIVER
  //    is responsible for exactly-once effects. ──────────────────────────────────────────────────
  r.post("/enqueue-idempotent", writeLimiter, async (_req, res) => {
    const orderId = `order_${shortId()}`;
    const amount = Math.floor(Math.random() * 50_000) + 100;
    const key = `idem_${shortId()}`;
    const enqueueOnce = (client: PoolClient) =>
      relay.enqueue(client, {
        eventType: "order.created",
        payload: { orderId, amount, at: new Date().toISOString() },
        endpoint: { url: TARGET, secret: config.webhookSecret },
        idempotencyKey: key,
      });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO demo_orders (id, amount) VALUES ($1, $2)", [orderId, amount]);
      // Two rows sharing one idempotency-key: both deliver, the receiver applies the effect once.
      const first = await enqueueOnce(client);
      const second = await enqueueOnce(client);
      await client.query("COMMIT");
      await bumpMetric("enqueued", 2);
      res.json({ ok: true, key, orderId, ids: [first.id, second.id] });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: String(err) });
    } finally {
      client.release();
    }
  });

  // ── Read-only inspection (secret-free) ─────────────────────────────────────────────────────
  r.get("/outbox", async (req, res) => {
    const status = req.query.status as Status | undefined;
    const page = await relay.list({ status, limit: 30 });
    res.json(page);
  });

  r.get("/attempts/:id", async (req, res) => {
    const attempts = await relay.attempts({ outboxId: req.params.id ?? "" });
    res.json(attempts);
  });

  r.get("/stats", async (_req, res) => {
    res.json(await relay.stats());
  });

  r.get("/metrics", async (_req, res) => {
    const [metrics, stats] = await Promise.all([readMetrics(), relay.stats()]);
    res.json({ metrics, stats });
  });

  // ── Operations: replay the DLQ, cancel a pending row ───────────────────────────────────────
  r.post("/replay", writeLimiter, async (req, res) => {
    const { outboxId } = req.body ?? {};
    const result = outboxId
      ? await relay.replay({ outboxId })
      : await relay.replay({ filter: { status: "dead", limit: 50 } });
    res.json(result);
  });

  r.post("/cancel/:id", writeLimiter, async (req, res) => {
    res.json(await relay.cancel(req.params.id ?? ""));
  });

  // ── Receiver control (simulate a flaky customer endpoint) ──────────────────────────────────
  r.post("/receiver/mode", (req, res) => {
    const mode = req.body?.mode as ReceiverMode;
    if (mode !== "ok" && mode !== "fail" && mode !== "slow") {
      return res.status(400).json({ error: "mode must be ok | fail | slow" });
    }
    setMode(mode);
    res.json({ mode });
  });

  r.get("/receiver/state", (_req, res) => {
    res.json({ mode: getMode(), recent: getRecent() });
  });

  // ── Live updates over Server-Sent Events ───────────────────────────────────────────────────
  r.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: "hello" })}\n\n`);
    addClient(res);
    req.on("close", () => removeClient(res));
  });

  return r;
}
