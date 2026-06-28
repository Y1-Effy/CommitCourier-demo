import { pool } from "./courier";

type Counter = "enqueued" | "delivered" | "retried" | "dead";

/** Atomically bump a durable operational counter (best-effort; never throws into the caller). */
export async function bumpMetric(field: Counter, n = 1): Promise<void> {
  try {
    await pool.query(`UPDATE demo_metrics SET ${field} = ${field} + $1 WHERE id = 1`, [n]);
  } catch (err) {
    console.warn("[metrics] bump failed", field, String(err));
  }
}

export interface OpMetrics {
  enqueued: number;
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
  successRate: number;
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
  const delivered = Number(r.delivered);
  const dead = Number(r.dead);
  const terminal = delivered + dead;
  return {
    enqueued: Number(r.enqueued),
    delivered,
    retried: Number(r.retried),
    dead,
    startedAt: new Date(r.started_at).toISOString(),
    successRate: terminal === 0 ? 1 : delivered / terminal,
  };
}
