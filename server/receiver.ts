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
  at: string;
}

const recent: ReceivedRecord[] = [];
export function getRecent(): ReceivedRecord[] {
  return recent;
}

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
  try {
    const p = JSON.parse(raw) as { orderId?: string; note?: string };
    eventType = p.orderId ?? p.note ?? "webhook";
  } catch {
    /* ignore */
  }

  const mode = currentMode;
  const responded = mode === "fail" ? 500 : 200;

  recent.unshift({
    webhookId: header("webhook-id"),
    eventType,
    verified,
    mode,
    responded,
    at: new Date().toISOString(),
  });
  if (recent.length > 30) recent.length = 30;

  // "slow" exceeds the relay's delivery.timeoutMs (5s) so the attempt times out and retries.
  if (mode === "slow") {
    setTimeout(() => res.status(200).json({ received: true, slow: true }), 8_000);
    return;
  }
  if (mode === "fail") {
    res.status(500).json({ received: false, simulatedFailure: true });
    return;
  }
  res.status(200).json({ received: true, verified });
});
