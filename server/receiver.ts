/**
 * A self-hosted webhook RECEIVER — the other end of the pipe. CommitCourier delivers signed
 * webhooks here over real HTTP. We verify the Standard Webhooks signature with the same primitive
 * a real receiver would use (`verifySignature` from commitcourier/core) and respond according to a
 * switchable scenario so the demo can trigger retries / DLQ / timeouts on demand.
 */
import { Router, type Request, type Response } from "express";
import { verifySignature } from "commitcourier";
import { config } from "./config";

export type ReceiverMode = "ok" | "fail" | "slow";

let currentMode: ReceiverMode = "ok";

export function setMode(mode: ReceiverMode): void {
  currentMode = mode;
}
export function getMode(): ReceiverMode {
  return currentMode;
}

export interface ReceivedRecord {
  webhookId: string;
  eventType: string;
  verified: boolean;
  mode: ReceiverMode;
  responded: number;
  /** True when this delivery's idempotency-key was already processed (receiver-side dedup). */
  duplicate: boolean;
  /** True for the internal system heartbeat (drives a distinct label in the UI). */
  heartbeat: boolean;
  at: string;
}

const recent: ReceivedRecord[] = [];
export function getRecent(): ReceivedRecord[] {
  return recent;
}

// Receiver-side idempotency: at-least-once delivery means the same event can arrive more than once
// (redelivery, or two enqueues sharing an idempotency-key). A real receiver dedups on a stable key
// so the effect applies once. We track seen idempotency-key headers in memory for the demo.
const seenKeys = new Set<string>();

export const receiverRouter = Router();

// Body is parsed as raw text here (NOT JSON): the signature is computed over the exact bytes
// received, so it must be verified before any JSON.parse.
receiverRouter.post("/", async (req: Request, res: Response) => {
  const raw = typeof req.body === "string" ? req.body : "";
  const header = (name: string) => String(req.headers[name] ?? "");

  let verified = false;
  try {
    verified = await verifySignature({
      id: header("webhook-id"),
      timestamp: header("webhook-timestamp"),
      payload: raw,
      header: header("webhook-signature"),
      secrets: [config.webhookSecret],
    });
  } catch {
    verified = false;
  }

  // The body is the enqueued payload (the event type lives in the signature id, not the body).
  let eventType = "webhook";
  let parsed: { orderId?: string; note?: string; heartbeat?: boolean; scenario?: string } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
    eventType = parsed.orderId ?? parsed.note ?? "webhook";
  } catch {
    /* ignore */
  }

  const record = (responded: number, duplicate: boolean, heartbeat = false) => {
    recent.unshift({
      webhookId: header("webhook-id"),
      eventType,
      verified,
      mode: currentMode,
      responded,
      duplicate,
      heartbeat,
      at: new Date().toISOString(),
    });
    if (recent.length > 30) recent.length = 30;
  };

  // Signature is the first gate a real receiver applies, ahead of any scenario behaviour: reject a
  // bad/absent signature with 401 so the relay treats it as a failed delivery (retry -> DLQ) and a
  // misconfigured secret / mid-rotation mismatch surfaces, instead of being silently marked delivered.
  // A rejected delivery is NOT recorded as processed (don't add it to seenKeys).
  if (!verified) {
    record(401, false);
    res.status(401).json({ received: false, verified: false });
    return;
  }

  // System heartbeat: its outcome is driven by the beat's OWN scenario, not the global receiver mode,
  // so the automated liveness probe can demonstrate retry -> DLQ without hijacking what a visitor sees
  // when they flip the flaky-endpoint switch. Heartbeats carry no idempotency-key (no dedup needed).
  if (parsed.heartbeat === true) {
    const flaky = parsed.scenario === "flaky";
    record(flaky ? 500 : 200, false, true);
    if (flaky) {
      res.status(500).json({ received: false, heartbeat: true, simulatedFailure: true });
      return;
    }
    res.status(200).json({ received: true, heartbeat: true });
    return;
  }

  // Receiver-side idempotency: if this event's idempotency-key was already seen, the effect was
  // already applied — acknowledge but skip re-processing. (Bounded for the long-running demo.)
  const idempotencyKey = header("idempotency-key");
  const duplicate = idempotencyKey !== "" && seenKeys.has(idempotencyKey);
  if (idempotencyKey !== "" && !duplicate) {
    if (seenKeys.size > 5_000) seenKeys.clear();
    seenKeys.add(idempotencyKey);
  }

  const mode = currentMode;
  record(mode === "fail" ? 500 : 200, duplicate);

  // "slow" exceeds the relay's delivery.timeoutMs (5s) so the attempt times out and retries.
  if (mode === "slow") {
    // The relay aborts the connection at its timeout, so guard the late write: responding on an
    // already-closed socket would emit a stream error, and clear the timer if the client hangs up.
    const timer = setTimeout(() => {
      if (res.writableEnded || req.destroyed) return;
      res.status(200).json({ received: true, slow: true });
    }, 8_000);
    req.on("close", () => clearTimeout(timer));
    return;
  }
  if (mode === "fail") {
    res.status(500).json({ received: false, simulatedFailure: true });
    return;
  }
  res.status(200).json({ received: true, verified, duplicate });
});
