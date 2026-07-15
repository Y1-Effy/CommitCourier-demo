import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";
import type { ReactNode } from "react";

const QUICKSTART = `import { Pool } from "pg";
import { postgresStore } from "commitcourier/store/pg";
import { createRelay } from "commitcourier";

const store = postgresStore({ pool: new Pool() });
const relay = await createRelay({ store });

// Inside YOUR business transaction — commits or rolls back atomically:
await relay.enqueue(trx, {
  eventType: "order.created",
  payload: { orderId, amount },
  endpoint: { url: "https://customer.example.com/webhooks", secret },
});`;

// Symbol matrix for the comparison table (language-independent). The capability labels (first
// column) come from the copy dictionary, aligned by index.
const COMPARE_CELLS: [string, string, string][] = [
  ["✗", "✗", "✓"],
  ["✓", "✓", "✓"],
  ["✓", "partial", "✓"],
  ["✓", "—", "✓"],
  ["✗ (SaaS)", "✗ (Redis)", "✓"],
];

interface LandingCopy {
  heroTitle: ReactNode;
  heroLead: ReactNode;
  cta1: string;
  cta2: string;
  bugEyebrow: string;
  bugTitle: string;
  bugSub: string;
  bugList: ReactNode;
  fixEyebrow: string;
  fixTitle: string;
  fixSub: ReactNode;
  callout: string;
  learnMore: ReactNode;
  tryLink: ReactNode;
  quickstartEyebrow: string;
  compareHeading: string;
  capabilityHeader: string;
  compareLabels: [string, string, string, string, string];
  features: [string, string][];
  realHeading: string;
  realSub: ReactNode;
  realCta: string;
}

const en: LandingCopy = {
  heroTitle: (
    <>
      Webhooks that can't lie
      <br />
      about your data.
    </>
  ),
  heroLead: (
    <>
      CommitCourier writes the outbound webhook in the <b>same Postgres transaction</b> as your
      business change — so a webhook is sent <i>if and only if</i> the write committed. Then it
      delivers with signing, retries, a DLQ, a full ledger and SSRF protection.
    </>
  ),
  cta1: "▶ See it run live",
  cta2: "View integration code",
  bugEyebrow: "The bug",
  bugTitle: "Dual-write inconsistency",
  bugSub:
    "Updating state and sending a webhook are two actions. A crash or rollback between them breaks one of two ways:",
  bugList: (
    <ul className="muted">
      <li>
        <b style={{ color: "var(--red)" }}>Phantom webhook</b> — you enqueue first, then the
        transaction rolls back. The customer gets <code>order.created</code> for an order that never
        existed.
      </li>
      <li>
        <b style={{ color: "var(--red)" }}>Lost webhook</b> — you commit first, then the process
        dies before enqueuing. The order is final, the notification never fires.
      </li>
    </ul>
  ),
  fixEyebrow: "The fix",
  fixTitle: "Ride the transaction",
  fixSub: (
    <>
      The outbox row is written on <i>your</i> transaction handle. It commits with your data or
      vanishes with your rollback — dual-write inconsistency becomes impossible{" "}
      <i>by construction</i>. A background dispatcher then handles webhook-grade delivery.
    </>
  ),
  callout: "No Redis. No SaaS. No extra broker. Just the PostgreSQL you already run.",
  learnMore: (
    <>
      Want the full breakdown — failure modes, recovery cost, and how this sits next to an existing
      webhook service? <a href="/why">Why webhook delivery is hard →</a>
    </>
  ),
  tryLink: (
    <>
      New library, weighing the risk? See how it's built to be added small, tried without sending,
      and removed cleanly: <a href="/safe-adoption">Built for safe adoption →</a>
    </>
  ),
  quickstartEyebrow: "60-second integration",
  compareHeading: "How it compares",
  capabilityHeader: "Capability",
  compareLabels: [
    "Rides your DB transaction",
    "HTTP webhook delivery",
    "Signing · retries · DLQ · ledger",
    "SSRF protection",
    "No extra infra (just Postgres)",
  ],
  features: [
    ["Atomic enqueue", "Rides your DB transaction (fail-closed)."],
    ["Background delivery", "Polling dispatcher, fail-open, single-delivery across instances."],
    ["Standard Webhooks", "HMAC-SHA256 signing receivers verify with off-the-shelf tools."],
    [
      "Retries + DLQ",
      "Exponential backoff with jitter; exhausted rows land in a dead-letter queue.",
    ],
    ["Delivery ledger", "Every attempt recorded: status, latency, response snippet."],
    ["SSRF protection", "Private / loopback / cloud-metadata ranges blocked by default."],
  ],
  realHeading: "Everything on this page is real.",
  realSub: (
    <>
      Nothing here is mocked — the site itself is a CommitCourier consumer, installed from npm.
      Drive it yourself on the <a href="/demo">live demo</a>, or read its cumulative counters on the{" "}
      <a href="/stats">track record</a>.
    </>
  ),
  realCta: "Open the live demo",
};

const ja: LandingCopy = {
  heroTitle: (
    <>
      データについて嘘をつけない
      <br />
      Webhook。
    </>
  ),
  heroLead: (
    <>
      CommitCourier はアウトバウンド Webhook を、業務データの変更と
      <b>同じ Postgres トランザクション</b>
      で書き込みます。つまり Webhook が送られるのは<i>書き込みがコミットされた場合に限られます</i>。
      その後、署名・リトライ・DLQ・完全な台帳・SSRF 保護つきで配信します。
    </>
  ),
  cta1: "▶ ライブで動かす",
  cta2: "組み込みコードを見る",
  bugEyebrow: "問題",
  bugTitle: "二重書き込みの不整合",
  bugSub:
    "状態の更新と Webhook 送信は別々の操作です。その間でクラッシュやロールバックが起きると、次の2通りで壊れます:",
  bugList: (
    <ul className="muted">
      <li>
        <b style={{ color: "var(--red)" }}>幻の Webhook</b> — 先に enqueue
        した後にトランザクションが ロールバックする。存在しないはずの注文に対して顧客が{" "}
        <code>order.created</code> を受け取る。
      </li>
      <li>
        <b style={{ color: "var(--red)" }}>消えた Webhook</b> — 先にコミットした後、enqueue する前に
        プロセスが落ちる。注文は確定しているのに通知は一度も飛ばない。
      </li>
    </ul>
  ),
  fixEyebrow: "解決策",
  fixTitle: "トランザクションに相乗りする",
  fixSub: (
    <>
      outbox 行は<i>あなたの</i>
      トランザクションハンドル上に書き込まれます。データと一緒にコミットされ、
      ロールバックと一緒に消える — 二重書き込みの不整合は<i>構造的に</i>起こり得なくなります。
      その後はバックグラウンドの dispatcher が Webhook 品質の配信を担います。
    </>
  ),
  callout: "Redis なし。SaaS なし。追加のブローカーなし。すでに動かしている PostgreSQL だけ。",
  learnMore: (
    <>
      失敗パターン・復旧コスト・既存 Webhook サービスとの関係まで詳しく:{" "}
      <a href="/why">なぜ Webhook 配信は難しいのか →</a>
    </>
  ),
  tryLink: (
    <>
      新しいライブラリで導入を迷っていますか？
      小さく入れて・送らず試して・きれいに外せる設計について:{" "}
      <a href="/safe-adoption">安心して試すための設計 →</a>
    </>
  ),
  quickstartEyebrow: "60秒で組み込み",
  compareHeading: "他の方式との比較",
  capabilityHeader: "機能",
  compareLabels: [
    "DB トランザクションに相乗り",
    "HTTP Webhook 配信",
    "署名・リトライ・DLQ・台帳",
    "SSRF 保護",
    "追加インフラ不要 (Postgres だけ)",
  ],
  features: [
    ["アトミックな enqueue", "DB トランザクションに相乗り (fail-closed)。"],
    [
      "バックグラウンド配信",
      "ポーリング型 dispatcher、fail-open、複数インスタンス間でも単一配信。",
    ],
    ["Standard Webhooks", "HMAC-SHA256 署名。受信側は既製ツールで検証できます。"],
    ["リトライ + DLQ", "ジッタ付き指数バックオフ。試行を使い切った行は dead-letter queue へ。"],
    ["配信台帳", "全試行を記録: ステータス・レイテンシ・レスポンス断片。"],
    ["SSRF 保護", "プライベート / ループバック / クラウドメタデータの範囲を既定でブロック。"],
  ],
  realHeading: "このページの内容はすべて本物です。",
  realSub: (
    <>
      ここにモックはありません — このサイト自体が、npm で入れた CommitCourier の利用側アプリです。
      <a href="/demo">ライブデモ</a>で自分で動かすか、<a href="/stats">稼働実績</a>
      で累積カウンタを確認できます。
    </>
  ),
  realCta: "ライブデモを開く",
};

const copy: Record<Locale, LandingCopy> = { en, ja };

function Compare({ t }: { t: LandingCopy }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>{t.capabilityHeader}</th>
          <th>SaaS (Svix)</th>
          <th>Queue (BullMQ)</th>
          <th style={{ color: "var(--accent)" }}>CommitCourier</th>
        </tr>
      </thead>
      <tbody>
        {COMPARE_CELLS.map((cells, i) => (
          <tr key={t.compareLabels[i]}>
            <td style={{ fontFamily: "var(--sans)" }}>{t.compareLabels[i]}</td>
            <td>{cells[0]}</td>
            <td>{cells[1]}</td>
            <td style={{ color: "var(--green)" }}>{cells[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Landing() {
  const t = useCopy(copy);
  return (
    <>
      <div className="hero">
        <h1>{t.heroTitle}</h1>
        <p className="lead">{t.heroLead}</p>
        {/* Intrinsic sizes so the browser reserves each box before the SVG arrives from shields.io.
            No loading="lazy" here: these sit right under the h1, above the fold, so deferring them
            would only delay what a visitor sees first. See Footer for the sizing caveat. */}
        <div className="badges">
          <img
            src="https://img.shields.io/npm/v/commitcourier.svg"
            width={80}
            height={20}
            decoding="async"
            alt="npm"
          />
          <img
            src="https://img.shields.io/badge/node-%3E%3D22.19-brightgreen"
            width={96}
            height={20}
            decoding="async"
            alt="node"
          />
          <img
            src="https://img.shields.io/badge/license-MIT-blue"
            width={78}
            height={20}
            decoding="async"
            alt="license"
          />
          <img
            src="https://img.shields.io/badge/postgres-12%2B-336791"
            width={90}
            height={20}
            decoding="async"
            alt="postgres"
          />
        </div>
        <div className="cta">
          <a className="btn primary" href="/demo">
            {t.cta1}
          </a>
          <a className="btn" href="/integrate">
            {t.cta2}
          </a>
        </div>
      </div>

      <div className="container">
        <div className="grid cols-2">
          <div className="card">
            <div className="eyebrow">{t.bugEyebrow}</div>
            <h2 className="section">{t.bugTitle}</h2>
            <p className="sub">{t.bugSub}</p>
            {t.bugList}
          </div>
          <div className="card">
            <div className="eyebrow">{t.fixEyebrow}</div>
            <h2 className="section">{t.fixTitle}</h2>
            <p className="sub">{t.fixSub}</p>
            <div className="callout">{t.callout}</div>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          {t.learnMore}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          {t.tryLink}
        </p>

        <div style={{ height: 28 }} />
        <div className="eyebrow">{t.quickstartEyebrow}</div>
        <CodeBlock code={QUICKSTART} />

        <div style={{ height: 36 }} />
        <h2 className="section">{t.compareHeading}</h2>
        <div className="card">
          <Compare t={t} />
        </div>

        <div style={{ height: 36 }} />
        <div className="grid cols-3">
          {t.features.map(([title, desc]) => (
            <div className="card" key={title}>
              <b>{title}</b>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ height: 40 }} />
        <div className="card" style={{ textAlign: "center" }}>
          <h2 className="section">{t.realHeading}</h2>
          <p className="sub">{t.realSub}</p>
          <div className="cta">
            <a className="btn primary" href="/demo">
              {t.realCta}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
