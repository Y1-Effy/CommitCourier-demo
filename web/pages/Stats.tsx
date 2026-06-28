import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, type Stats as QueueStats } from "../lib/api";
import { useCopy, useStatusLabel, type Locale, type Status } from "../i18n";

interface OpMetrics {
  enqueued: number;
  delivered: number;
  retried: number;
  dead: number;
  startedAt: string;
  successRate: number;
}

interface StatsCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  delivered: string;
  successRate: string;
  runningFor: string;
  enqueued: string;
  retries: string;
  deadLettered: string;
  queueEyebrow: string;
  queueTitle: string;
  disclaimer: string;
  loading: string;
}

const en: StatsCopy = {
  eyebrow: "Operational track record",
  heading: "This isn't a mock — it's running.",
  intro: (
    <>
      These counters come straight from the live PostgreSQL database backing this site. Every
      delivery on the <a href="#/demo">demo</a> is a real, signed HTTP webhook recorded here.
    </>
  ),
  delivered: "Webhooks delivered",
  successRate: "Delivery success rate",
  runningFor: "Running for",
  enqueued: "Events enqueued",
  retries: "Retries",
  deadLettered: "Dead-lettered",
  queueEyebrow: "Current queue",
  queueTitle: "Outbox by status (now)",
  disclaimer:
    "Cumulative counters survive retention pruning; the queue snapshot reflects only rows currently retained in the database.",
  loading: "Loading…",
};

const ja: StatsCopy = {
  eyebrow: "稼働実績",
  heading: "これはモックではありません — 実際に動いています。",
  intro: (
    <>
      これらのカウンタは、このサイトを支える稼働中の PostgreSQL データベースから直接取得しています。
      <a href="#/demo">デモ</a>での配信はすべて、ここに記録された本物の署名付き HTTP Webhook です。
    </>
  ),
  delivered: "配信した Webhook 数",
  successRate: "配信成功率",
  runningFor: "稼働時間",
  enqueued: "enqueue したイベント数",
  retries: "リトライ数",
  deadLettered: "dead-letter 数",
  queueEyebrow: "現在のキュー",
  queueTitle: "状態別の outbox (現在)",
  disclaimer:
    "累積カウンタは保持期間の prune を生き延びます。キューのスナップショットは、現在データベースに残っている行のみを反映します。",
  loading: "読み込み中…",
};

const copy: Record<Locale, StatsCopy> = { en, ja };

const STATUSES: Status[] = ["pending", "in_flight", "delivered", "dead", "cancelled", "observed"];

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
  const t = useCopy(copy);
  const statusLabel = useStatusLabel();
  const [data, setData] = useState<{ metrics: OpMetrics; stats: QueueStats } | null>(null);
  useEffect(() => {
    const load = () =>
      api<{ metrics: OpMetrics; stats: QueueStats }>("/metrics")
        .then(setData)
        .catch(() => undefined);
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return <div className="container">{t.loading}</div>;
  const { metrics: m, stats } = data;
  const counts = stats.counts ?? {};

  return (
    <div className="container">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 30 }}>
        {t.heading}
      </h2>
      <p className="sub">{t.intro}</p>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Metric num={m.delivered.toLocaleString()} lbl={t.delivered} cls="green" />
        <Metric num={`${(m.successRate * 100).toFixed(1)}%`} lbl={t.successRate} />
        <Metric num={uptime(m.startedAt)} lbl={t.runningFor} />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 28 }}>
        <Metric num={m.enqueued.toLocaleString()} lbl={t.enqueued} />
        <Metric num={m.retried.toLocaleString()} lbl={t.retries} cls="amber" />
        <Metric
          num={m.dead.toLocaleString()}
          lbl={t.deadLettered}
          cls={m.dead > 0 ? "red" : undefined}
        />
      </div>

      <div className="card">
        <div className="eyebrow">{t.queueEyebrow}</div>
        <h2 className="section" style={{ marginTop: 0 }}>
          {t.queueTitle}
        </h2>
        <div className="grid cols-3">
          {STATUSES.map((s) => (
            <div key={s} className="row" style={{ justifyContent: "space-between" }}>
              <span className={`pill ${s}`}>{statusLabel(s)}</span>
              <span className="mono">{counts[s] ?? 0}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          {t.disclaimer}
        </p>
      </div>
    </div>
  );
}
