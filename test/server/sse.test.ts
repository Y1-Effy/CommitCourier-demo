import { describe, it, expect } from "vitest";
import type { Response } from "express";
import { addClient, removeClient, broadcast, clientCount } from "../../server/sse";

/** A minimal stand-in for an Express Response that records what was written. */
function fakeRes(): Response & { writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    write(frame: string) {
      writes.push(frame);
      return true;
    },
  } as unknown as Response & { writes: string[] };
}

/** Same stand-in, but whose write() throws (simulates a dead/closed connection). */
function throwingRes(): Response {
  return {
    write() {
      throw new Error("socket closed");
    },
  } as unknown as Response;
}

describe("sse", () => {
  it("addClient / removeClient adjust the connected count", () => {
    const base = clientCount();
    const res = fakeRes();

    addClient(res);
    expect(clientCount()).toBe(base + 1);

    removeClient(res);
    expect(clientCount()).toBe(base);
  });

  it("broadcast writes a well-formed SSE frame to each client", () => {
    const res = fakeRes();
    addClient(res);

    const event = { type: "delivery", outcome: "delivered" };
    broadcast(event);

    expect(res.writes).toContain(`data: ${JSON.stringify(event)}\n\n`);
    removeClient(res);
  });

  it("drops a client whose write throws", () => {
    const base = clientCount();
    const bad = throwingRes();
    addClient(bad);
    expect(clientCount()).toBe(base + 1);

    broadcast({ type: "snapshot" });

    expect(clientCount()).toBe(base);
  });
});
