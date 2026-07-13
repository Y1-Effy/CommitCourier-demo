import { useEffect, useRef, useState } from "react";

/** The eventType the server tags internal system-heartbeat deliveries with (see server/index.ts). */
export const HEARTBEAT_EVENT_TYPE = "system.heartbeat";

export interface OutboxItem {
  id: string;
  eventType: string;
  status: "pending" | "in_flight" | "delivered" | "dead" | "cancelled" | "observed";
  attempts: number;
  targetUrl: string | null;
  lastError: string | null;
  availableAt: string;
  createdAt: string;
  seq: string;
}

export interface Attempt {
  id: string;
  attemptNo: number;
  responseStatus: number | null;
  responseBodySnippet: string | null;
  durationMs: number;
  error: string | null;
  attemptedAt: string;
}

export interface Stats {
  counts: Record<string, number>;
  oldestPendingAt: string | null;
}

export interface OpMetrics {
  enqueued: number;
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
}

/** Durable counters for the internal system heartbeat (kept separate from the demo track record). */
export interface HeartbeatMetrics {
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
}

export interface MetricsResponse {
  metrics: OpMetrics;
  stats: Stats;
  heartbeat: HeartbeatMetrics;
}

export async function api<T = unknown>(
  path: string,
  opts?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts?.method ?? (opts?.body ? "POST" : "GET"),
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export interface SnapshotEvent {
  type: "snapshot";
  stats: Stats;
  outbox: OutboxItem[];
  receiver: { mode: string; recent: ReceivedRecord[] };
}
export interface DeliveryEvent {
  type: "delivery";
  outcome: "delivered" | "retry" | "dead";
  event: {
    id: string;
    eventType: string;
    attempt: number;
    status: number | null;
    error: string | null;
  };
}
export interface ReceivedRecord {
  webhookId: string;
  eventType: string;
  verified: boolean;
  mode: string;
  responded: number;
  duplicate?: boolean;
  /** True for the internal system heartbeat (drives a distinct label in the UI). */
  heartbeat?: boolean;
  at: string;
}

type StreamEvent = SnapshotEvent | DeliveryEvent | { type: "hello" };

/** Subscribe to the server's Server-Sent-Events stream. */
export function useEventStream(onEvent: (e: StreamEvent) => void): void {
  const cb = useRef(onEvent);
  cb.current = onEvent;
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (m) => {
      try {
        cb.current(JSON.parse(m.data) as StreamEvent);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);
}

/** A live snapshot of the system, kept fresh by the SSE stream. */
export function useLiveSnapshot(): {
  snapshot: SnapshotEvent | null;
  feed: DeliveryEvent[];
} {
  const [snapshot, setSnapshot] = useState<SnapshotEvent | null>(null);
  const [feed, setFeed] = useState<DeliveryEvent[]>([]);
  useEventStream((e) => {
    if (e.type === "snapshot") setSnapshot(e);
    else if (e.type === "delivery") setFeed((f) => [e, ...f].slice(0, 40));
  });
  return { snapshot, feed };
}
