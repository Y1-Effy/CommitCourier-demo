import { pool } from "./courier";

type Counter = "enqueued" | "delivered" | "retried" | "dead";
type HeartbeatCounter = "delivered" | "retried" | "dead";

/** Atomically bump a durable operational counter (best-effort; never throws into the caller). */
export async function bumpMetric(field: Counter, n = 1): Promise<void> {
  try {
    await pool.query(`UPDATE demo_metrics SET ${field} = ${field} + $1 WHERE id = 1`, [n]);
  } catch (err) {
    console.warn("[metrics] bump failed", field, String(err));
  }
}

/**
 * Bump a durable SYSTEM-HEARTBEAT counter. Kept in its own table so internal liveness traffic is
 * never counted as demo/visitor activity (see server/migrate.ts and the hooks in server/index.ts).
 */
export async function bumpHeartbeat(field: HeartbeatCounter, n = 1): Promise<void> {
  try {
    await pool.query(`UPDATE demo_heartbeat SET ${field} = ${field} + $1 WHERE id = 1`, [n]);
  } catch (err) {
    console.warn("[metrics] heartbeat bump failed", field, String(err));
  }
}

export interface OpMetrics {
  enqueued: number;
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
}

/** Read the durable counters for the "operational track record" page. */
export async function readMetrics(): Promise<OpMetrics> {
  const { rows } = await pool.query<{
    enqueued: string;
    delivered: string;
    retried: string;
    dead: string;
    started_at: Date;
  }>(`SELECT enqueued, delivered, retried, dead, started_at FROM demo_metrics WHERE id = 1`);
  const r = rows[0] ?? {
    enqueued: "0",
    delivered: "0",
    retried: "0",
    dead: "0",
    started_at: new Date(),
  };
  return {
    enqueued: Number(r.enqueued),
    delivered: Number(r.delivered),
    retried: Number(r.retried),
    dead: Number(r.dead),
    startedAt: new Date(r.started_at).toISOString(),
  };
}

export interface HeartbeatMetrics {
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
}

/** Read the durable system-heartbeat counters for the "internal liveness probe" panel. */
export async function readHeartbeat(): Promise<HeartbeatMetrics> {
  const { rows } = await pool.query<{
    delivered: string;
    retried: string;
    dead: string;
    started_at: Date;
  }>(`SELECT delivered, retried, dead, started_at FROM demo_heartbeat WHERE id = 1`);
  const r = rows[0] ?? { delivered: "0", retried: "0", dead: "0", started_at: new Date() };
  return {
    delivered: Number(r.delivered),
    retried: Number(r.retried),
    dead: Number(r.dead),
    startedAt: new Date(r.started_at).toISOString(),
  };
}
