import { useEffect, useState } from "react";
import { api, type Stats as QueueStats } from "../lib/api";

interface OpMetrics {
  enqueued: number;
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
  successRate: number;
}

function Metric({ num, lbl, cls }: { num: string; lbl: string; cls?: string }) {
  return (
    <div className="card metric">
      <div className={`num ${cls ?? ""}`}>{num}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );
}

function uptime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function Stats() {
  const [data, setData] = useState<{ metrics: OpMetrics; stats: QueueStats } | null>(null);
  useEffect(() => {
    const load = () =>
      api<{ metrics: OpMetrics; stats: QueueStats }>("/metrics").then(setData).catch(() => undefined);
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="container">Loading…</div>;
  const { metrics: m, stats } = data;
  const counts = stats.counts ?? {};

  return (
    <div className="container">
      <div className="eyebrow">Operational track record</div>
      <h2 className="section" style={{ fontSize: 30 }}>
        This isn't a mock — it's running.
      </h2>
      <p className="sub">
        These counters come straight from the live PostgreSQL database backing this site. Every
        delivery on the <a href="#/demo">demo</a> is a real, signed HTTP webhook recorded here.
      </p>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Metric num={m.delivered.toLocaleString()} lbl="Webhooks delivered" cls="green" />
        <Metric num={`${(m.successRate * 100).toFixed(1)}%`} lbl="Delivery success rate" />
        <Metric num={uptime(m.startedAt)} lbl="Running for" />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 28 }}>
        <Metric num={m.enqueued.toLocaleString()} lbl="Events enqueued" />
        <Metric num={m.retried.toLocaleString()} lbl="Retries" cls="amber" />
        <Metric num={m.dead.toLocaleString()} lbl="Dead-lettered" cls={m.dead > 0 ? "red" : undefined} />
      </div>

      <div className="card">
        <div className="eyebrow">Current queue</div>
        <h2 className="section" style={{ marginTop: 0 }}>
          Outbox by status (now)
        </h2>
        <div className="grid cols-3">
          {(["pending", "in_flight", "delivered", "dead", "cancelled", "observed"] as const).map((s) => (
            <div key={s} className="row" style={{ justifyContent: "space-between" }}>
              <span className={`pill ${s}`}>{s.replace("_", " ")}</span>
              <span className="mono">{counts[s] ?? 0}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          Cumulative counters survive retention pruning; the queue snapshot reflects only rows
          currently retained in the database.
        </p>
      </div>
    </div>
  );
}
