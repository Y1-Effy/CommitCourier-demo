import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { sign } from "commitcourier";
import { receiverRouter, setMode, getRecent } from "../../server/receiver";
import { config } from "../../server/config";

// Stand up the real receiver router over HTTP, mounted exactly like server/index.ts
// (raw text body BEFORE any JSON parsing, so the signature is checked over real bytes).
let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use("/receiver", express.text({ type: () => true, limit: "1mb" }), receiverRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  setMode("ok");
});

/** POST a signed webhook to the receiver. `tamper` mutates the body after signing so it fails. */
async function postSigned(
  body: string,
  opts: { tamper?: boolean; idempotencyKey?: string } = {},
): Promise<Response> {
  const id = `msg_${Math.random().toString(36).slice(2, 10)}`;
  const timestampSec = Math.floor(Date.now() / 1000);
  const headers = await sign({ id, timestampSec, body, secrets: [config.webhookSecret] });
  const reqHeaders: Record<string, string> = {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": String(timestampSec),
    "webhook-signature": headers["webhook-signature"],
  };
  if (opts.idempotencyKey) reqHeaders["idempotency-key"] = opts.idempotencyKey;
  return fetch(`${base}/receiver`, {
    method: "POST",
    headers: reqHeaders,
    body: opts.tamper ? `${body} ` : body,
  });
}

describe("receiver", () => {
  it("accepts a valid signature and reports verified=true (mode ok)", async () => {
    const res = await postSigned(JSON.stringify({ orderId: "order_ok" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, verified: true, duplicate: false });
    expect(getRecent()[0]?.verified).toBe(true);
  });

  it("dedups a repeated idempotency-key (receiver-side idempotency)", async () => {
    const key = `idem_${Math.random().toString(36).slice(2, 8)}`;
    const first = await postSigned(JSON.stringify({ orderId: "order_idem" }), {
      idempotencyKey: key,
    });
    const second = await postSigned(JSON.stringify({ orderId: "order_idem" }), {
      idempotencyKey: key,
    });
    expect(await first.json()).toMatchObject({ duplicate: false });
    expect(await second.json()).toMatchObject({ duplicate: true });
  });

  it("rejects with 401 and verified=false when the body is tampered (signature gate)", async () => {
    const res = await postSigned(JSON.stringify({ orderId: "order_bad" }), { tamper: true });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ received: false, verified: false });
    expect(getRecent()[0]?.verified).toBe(false);
    expect(getRecent()[0]?.responded).toBe(401);
  });

  it("does not dedup-register a rejected (unverified) delivery", async () => {
    const key = `idem_${Math.random().toString(36).slice(2, 8)}`;
    // A tampered delivery is rejected and must NOT mark the key as seen...
    await postSigned(JSON.stringify({ orderId: "order_reject" }), {
      tamper: true,
      idempotencyKey: key,
    });
    // ...so a later valid delivery with the same key is treated as first-seen, not a duplicate.
    const ok = await postSigned(JSON.stringify({ orderId: "order_reject" }), {
      idempotencyKey: key,
    });
    expect(await ok.json()).toMatchObject({ duplicate: false });
  });

  it("returns 500 in fail mode (forces retries → DLQ)", async () => {
    setMode("fail");
    const res = await postSigned(JSON.stringify({ orderId: "order_fail" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ received: false });
  });

  it("derives eventType from orderId, then note, then a default", async () => {
    await postSigned(JSON.stringify({ orderId: "order_x" }));
    expect(getRecent()[0]?.eventType).toBe("order_x");

    await postSigned(JSON.stringify({ note: "ssrf.demo" }));
    expect(getRecent()[0]?.eventType).toBe("ssrf.demo");

    await postSigned(JSON.stringify({ amount: 1 }));
    expect(getRecent()[0]?.eventType).toBe("webhook");
  });

  it("caps the recent buffer at 30 entries", async () => {
    for (let i = 0; i < 31; i++) {
      await postSigned(JSON.stringify({ orderId: `order_${i}` }));
    }
    expect(getRecent().length).toBe(30);
  });

  it("routes a system heartbeat by its own scenario, ignoring the global receiver mode", async () => {
    // Even with the visitor-facing receiver forced to fail, an "ok" heartbeat still succeeds...
    setMode("fail");
    const ok = await postSigned(
      JSON.stringify({ heartbeat: true, scenario: "ok", note: "system.heartbeat" }),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ received: true, heartbeat: true });
    expect(getRecent()[0]?.heartbeat).toBe(true);
    expect(getRecent()[0]?.eventType).toBe("system.heartbeat");

    // ...and a "flaky" heartbeat still fails (to drive retry → DLQ) even while the mode is "ok".
    setMode("ok");
    const flaky = await postSigned(
      JSON.stringify({ heartbeat: true, scenario: "flaky", note: "system.heartbeat" }),
    );
    expect(flaky.status).toBe(500);
    expect(await flaky.json()).toMatchObject({ received: false, heartbeat: true });
    expect(getRecent()[0]?.heartbeat).toBe(true);
  });
});
