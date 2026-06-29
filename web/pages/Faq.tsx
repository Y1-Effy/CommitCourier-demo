import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";

const CRON = `// Serverless / no long-lived process? Skip the dispatcher loop and
// drain a batch from a scheduled function (cron, Lambda, Cloud Run job):
await relay.dispatchOnce({ max: 50 });`;

interface QA {
  q: string;
  a: ReactNode;
}

interface FaqCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  items: QA[];
  avoidTitle: string;
  avoidList: ReactNode;
}

const en: FaqCopy = {
  eyebrow: "FAQ",
  heading: "Questions a careful engineer asks",
  intro: (
    <>
      Honest answers about the guarantees — and the explicit non-goals. CommitCourier is
      deliberately scoped; knowing the edges is part of trusting it.
    </>
  ),
  items: [
    {
      q: "Is delivery exactly-once?",
      a: (
        <>
          No — it's <b>at-least-once</b>. A crash after a successful HTTP send but before the status
          commit causes one redelivery once the visibility-timeout reclaim fires. The dual-write
          guarantee (no phantom / lost webhooks) is exact; the <i>network delivery</i> is
          at-least-once, like every honest webhook system.
        </>
      ),
    },
    {
      q: "Then how do I get exactly-once effects?",
      a: (
        <>
          Dedup on the receiver. Every delivery carries a stable <code>webhook-id</code> (and your
          optional <code>idempotency-key</code>); record it and ignore repeats. The{" "}
          <a href="#/demo">live demo</a> shows the self-receiver doing exactly this.
        </>
      ),
    },
    {
      q: "Are events ordered?",
      a: (
        <>
          Not by default — deliveries are independent. Per-endpoint FIFO is opt-in via{" "}
          <code>createDispatcher(&#123; ordering: "per-endpoint" &#125;)</code>. If you need strict
          global ordering across an endpoint, design for it explicitly.
        </>
      ),
    },
    {
      q: "I run serverless — no long-lived process. Can I still use it?",
      a: (
        <>
          Yes. The background dispatcher is one option; on serverless, drive delivery from a
          scheduled function instead:
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={CRON} />
          </div>
        </>
      ),
    },
    {
      q: "Does it scale? Can I run multiple dispatchers?",
      a: (
        <>
          Run as many as you like — <code>FOR UPDATE SKIP LOCKED</code> stops two dispatchers
          claiming the same row. It targets small-to-medium volume on the Postgres you already
          operate, not billions/sec. No Redis, no broker, no SaaS.
        </>
      ),
    },
    {
      q: "How are signing secrets protected at rest?",
      a: (
        <>
          That's your precondition: DB disk encryption, column encryption, or a{" "}
          <code>cipher: createAesGcmCipher(key)</code>. Without one, <code>createRelay</code> warns
          at startup and you acknowledge with <code>unsafeAllowPlaintextSecrets: true</code> (this
          demo does, for visibility — don't in production).
        </>
      ),
    },
  ],
  avoidTitle: "When NOT to reach for it",
  avoidList: (
    <ul className="muted">
      <li>Ultra-low-latency fan-out where a ~1s polling delay is unacceptable.</li>
      <li>Hyperscale fan-out (millions/sec) — use a dedicated streaming/queue platform.</li>
      <li>Stacks with no PostgreSQL transaction to ride (the guarantee needs your business TX).</li>
    </ul>
  ),
};

const ja: FaqCopy = {
  eyebrow: "FAQ",
  heading: "慎重なエンジニアが訊くこと",
  intro: (
    <>
      保証内容と、明示された non-goal への率直な回答。CommitCourier はあえてスコープを絞っています。
      その境界を知ることが、信頼して使う第一歩です。
    </>
  ),
  items: [
    {
      q: "配信は exactly-once ですか？",
      a: (
        <>
          いいえ、<b>at-least-once</b> です。HTTP 送信成功後・ステータス確定前にクラッシュすると、
          可視性タイムアウトの再取得が走った時点で1回だけ再配信されます。二重書き込み防止（幻の/消えた
          Webhook が無い）は厳密ですが、<i>ネットワーク配信</i>は、誠実な Webhook システムと同様に
          at-least-once です。
        </>
      ),
    },
    {
      q: "では exactly-once の「効果」はどう得る？",
      a: (
        <>
          受信側で重複排除します。各配信は安定した <code>webhook-id</code>（と任意の{" "}
          <code>idempotency-key</code>）を持つので、それを記録して再送を無視します。
          <a href="#/demo">ライブデモ</a>では自前 receiver がまさにこれを行います。
        </>
      ),
    },
    {
      q: "イベントは順序保証されますか？",
      a: (
        <>
          既定では保証しません（各配信は独立）。エンドポイント単位の FIFO は{" "}
          <code>createDispatcher(&#123; ordering: "per-endpoint" &#125;)</code>{" "}
          でオプトイン。厳密な全順序が要るなら明示的に設計してください。
        </>
      ),
    },
    {
      q: "サーバレスで常駐プロセスがありません。使えますか？",
      a: (
        <>
          使えます。常駐 dispatcher は一手段で、サーバレスではスケジュール実行から配信を駆動します:
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={CRON} />
          </div>
        </>
      ),
    },
    {
      q: "スケールしますか？ dispatcher を複数動かせますか？",
      a: (
        <>
          いくつでも動かせます — <code>FOR UPDATE SKIP LOCKED</code> が同一行の二重取得を防ぎます。
          想定は、すでに運用している Postgres
          上の中小規模ボリュームで、毎秒数十億ではありません。Redis もブローカーも SaaS も不要。
        </>
      ),
    },
    {
      q: "署名シークレットの at-rest 保護は？",
      a: (
        <>
          それは利用側の前提条件です: DB のディスク暗号化、カラム暗号化、または{" "}
          <code>cipher: createAesGcmCipher(key)</code>。無い場合 <code>createRelay</code>{" "}
          は起動時に警告し、<code>unsafeAllowPlaintextSecrets: true</code>{" "}
          で承認します（このデモは可視化のため承認済み。本番では避ける）。
        </>
      ),
    },
  ],
  avoidTitle: "使わない方がいい場面",
  avoidList: (
    <ul className="muted">
      <li>約1秒のポーリング遅延が許容できない超低レイテンシのファンアウト。</li>
      <li>毎秒数百万規模の超大量ファンアウト — 専用のストリーミング/キュー基盤を使う。</li>
      <li>相乗りする PostgreSQL トランザクションが無いスタック（保証には業務 TX が必要）。</li>
    </ul>
  ),
};

const copy: Record<Locale, FaqCopy> = { en, ja };

export function Faq() {
  const t = useCopy(copy);
  return (
    <div className="container">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 32 }}>
        {t.heading}
      </h2>
      <p className="sub">{t.intro}</p>

      <div className="grid" style={{ gap: 14, marginTop: 8 }}>
        {t.items.map((item) => (
          <div className="card" key={item.q}>
            <h2 className="section" style={{ margin: "0 0 8px", fontSize: 18 }}>
              {item.q}
            </h2>
            <div className="muted">{item.a}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />
      <div className="card">
        <div className="eyebrow">{t.avoidTitle}</div>
        {t.avoidList}
      </div>
    </div>
  );
}
