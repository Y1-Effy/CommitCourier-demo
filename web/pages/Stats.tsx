import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, type MetricsResponse } from "../lib/api";
import { useCopy, useStatusLabel, type Locale, type Status } from "../i18n";

interface StatsCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  delivered: string;
  runningFor: string;
  enqueued: string;
  retries: string;
  deadLettered: string;
  queueEyebrow: string;
  queueTitle: string;
  disclaimer: string;
  loading: string;
  hbEyebrow: string;
  hbTitle: string;
  hbIntro: ReactNode;
  hbDelivered: string;
  hbRunningFor: string;
  hbFootnote: (retried: number, dead: number) => string;
}

const en: StatsCopy = {
  eyebrow: "Operational track record",
  heading: "This isn't a mock — it's running.",
  intro: (
    <>
      Every number here is real, recorded in the live PostgreSQL database behind this site — and
      it's all visitor-driven. On the <a href="#/demo">demo</a> you send deliveries, and you also
      deliberately fail some (routing to a 500 endpoint, or the blocked SSRF target) to watch
      retries and the dead-letter queue in action — so the retries and dead-letter counts below are
      those demonstrations, not outages.
    </>
  ),
  delivered: "Webhooks delivered",
  runningFor: "Running for",
  enqueued: "Events enqueued",
  retries: "Retries",
  deadLettered: "Dead-lettered",
  queueEyebrow: "Current queue",
  queueTitle: "Outbox by status (now)",
  disclaimer:
    "Cumulative counters survive retention pruning; the queue snapshot reflects only rows currently retained in the database.",
  loading: "Loading…",
  hbEyebrow: "System heartbeat",
  hbTitle: "Internal liveness probe",
  hbIntro: (
    <>
      An automated webhook this site delivers to <b>itself</b> on a timer — live proof the
      dispatcher keeps running around the clock. Counted separately below; it is <b>not</b> customer
      or demo traffic and never touches the numbers above.
    </>
  ),
  hbDelivered: "Heartbeats delivered",
  hbRunningFor: "Delivering continuously for",
  hbFootnote: (retried, dead) =>
    retried + dead > 0
      ? `${retried.toLocaleString()} retries · ${dead.toLocaleString()} dead-lettered — beats failed on purpose (fault injection) to exercise retry → DLQ.`
      : "Every beat delivered on the first try — the dispatcher hasn't missed one.",
};

const ja: StatsCopy = {
  eyebrow: "稼働実績",
  heading: "これはモックではありません — 実際に動いています。",
  intro: (
    <>
      ここの数字はすべて、このサイトを支える稼働中の PostgreSQL データベースに記録された実データで、
      すべて訪問者の操作によるものです。<a href="#/demo">デモ</a>
      では配信を送るほか、あえて失敗させる （500 を返すエンドポイントや、ブロックされる SSRF
      先へ送る）ことで retry や dead-letter queue の 動きを確認できます —
      つまり下のリトライ数・dead-letter 数はその実演の結果であり、障害ではありません。
    </>
  ),
  delivered: "配信した Webhook 数",
  runningFor: "稼働時間",
  enqueued: "enqueue したイベント数",
  retries: "リトライ数",
  deadLettered: "dead-letter 数",
  queueEyebrow: "現在のキュー",
  queueTitle: "状態別の outbox (現在)",
  disclaimer:
    "累積カウンタは保持期間の prune を生き延びます。キューのスナップショットは、現在データベースに残っている行のみを反映します。",
  loading: "読み込み中…",
  hbEyebrow: "システムハートビート",
  hbTitle: "内部ヘルスチェック(ハートビート)",
  hbIntro: (
    <>
      このサイトが一定間隔で<b>自分自身</b>に配信している自動 Webhook です — dispatcher が四六時中
      動き続けている証拠。ここでは<b>別建て</b>
      で数えており、顧客やデモの通信ではなく、上のカウンタには 一切影響しません。
    </>
  ),
  hbDelivered: "配信したハートビート数",
  hbRunningFor: "連続配信している時間",
  hbFootnote: (retried, dead) =>
    retried + dead > 0
      ? `リトライ ${retried.toLocaleString()} 回 · dead-letter ${dead.toLocaleString()} 件 — 意図的に失敗させ（フォールト注入）retry → DLQ を実演した分です。`
      : "すべてのビートが一発で配信されています — dispatcher は一度も取りこぼしていません。",
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
  const [data, setData] = useState<MetricsResponse | null>(null);
  useEffect(() => {
    const load = () =>
      api<MetricsResponse>("/metrics")
        .then(setData)
        .catch(() => undefined);
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return <div className="container">{t.loading}</div>;
  const { metrics: m, stats, heartbeat: hb } = data;
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
        <Metric num={m.enqueued.toLocaleString()} lbl={t.enqueued} />
        <Metric num={uptime(m.startedAt)} lbl={t.runningFor} />
      </div>

      <div className="grid cols-2" style={{ marginBottom: 28 }}>
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

      <div className="card" style={{ marginTop: 18 }}>
        <div className="eyebrow">{t.hbEyebrow}</div>
        <h2 className="section" style={{ marginTop: 0 }}>
          {t.hbTitle}
        </h2>
        <p className="sub">{t.hbIntro}</p>
        <div className="grid cols-2">
          <Metric num={hb.delivered.toLocaleString()} lbl={t.hbDelivered} cls="green" />
          <Metric num={uptime(hb.startedAt)} lbl={t.hbRunningFor} />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          {t.hbFootnote(hb.retried, hb.dead)}
        </p>
      </div>
    </div>
  );
}
