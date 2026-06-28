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
async function postSigned(body: string, opts: { tamper?: boolean } = {}): Promise<Response> {
  const id = `msg_${Math.random().toString(36).slice(2, 10)}`;
  const timestampSec = Math.floor(Date.now() / 1000);
  const headers = await sign({ id, timestampSec, body, secrets: [config.webhookSecret] });
  return fetch(`${base}/receiver`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(timestampSec),
      "webhook-signature": headers["webhook-signature"],
    },
    body: opts.tamper ? `${body} ` : body,
  });
}

describe("receiver", () => {
  it("accepts a valid signature and reports verified=true (mode ok)", async () => {
    const res = await postSigned(JSON.stringify({ orderId: "order_ok" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, verified: true });
    expect(getRecent()[0]?.verified).toBe(true);
  });

  it("still responds 200 but verified=false when the body is tampered", async () => {
    const res = await postSigned(JSON.stringify({ orderId: "order_bad" }), { tamper: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verified: false });
    expect(getRecent()[0]?.verified).toBe(false);
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
});
