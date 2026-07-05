import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";

const CRON = `// Serverless / no long-lived process? Skip the dispatcher loop and
// drain a batch from a scheduled function (cron, Lambda, Cloud Run job):
await relay.dispatchOnce({ max: 50 });`;

const ACCEL = `import { Client } from "pg";
import { createPgAccelerator } from "commitcourier/accelerator/pg";

// Wake the dispatcher the instant an enqueue commits, via Postgres LISTEN/NOTIFY:
const accelerator = createPgAccelerator({
  pool,                                        // fires a transactional NOTIFY on COMMIT
  listen: async () => { const c = new Client(cfg); await c.connect(); return c; },
});
const relay = await createRelay({ store, accelerator });
// Best-effort: a missed NOTIFY only delays delivery — the poller still reclaims the row.`;

const ENDPOINTS = `// Register endpoints once, then target them by id instead of inlining { url, secret }:
const { id } = await relay.endpoints.register({
  url: "https://customer.example.com/webhooks",
  secret,
});
await relay.enqueue(trx, { eventType, payload, endpoint: { endpointId: id } });

// Rotate the signing key with zero downtime — deliveries are dual-signed with both keys:
await relay.endpoints.rotateSecret(id, newSecret);
await relay.endpoints.finalizeRotation(id); // once receivers have migrated to newSecret`;

const SINK = `import { Svix } from "svix";
import { svixSink } from "commitcourier/forward/svix";

// Experimental: keep the transactional outbox, but hand delivery off to your SaaS
// instead of CommitCourier sending the HTTP request itself.
const relay = await createRelay({
  store,
  delivery: { transport: "sink" },
  sink: svixSink({ svix: new Svix(process.env.SVIX_TOKEN), appId }),
});
// enqueue still rides your business TX; the dispatcher forwards each event to Svix,
// and your idempotencyKey maps onto Svix's dedup key.`;

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
      q: "Isn't a ~1s polling loop too slow?",
      a: (
        <>
          By default a dispatcher wakes on a ~1s poll. When you need lower latency, wire the
          optional <code>commitcourier/accelerator/pg</code> accelerator: a transactional{" "}
          <code>pg_notify</code> on COMMIT wakes a listening dispatcher at once via Postgres
          LISTEN/NOTIFY, so delivery starts without waiting for the next poll. It's best-effort — a
          missed wake only falls back to polling, never drops the row.
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ACCEL} />
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
      q: "Do I have to inline the URL and secret on every enqueue?",
      a: (
        <>
          No — inline <code>endpoint: &#123; url, secret &#125;</code> is the quick path, but you
          can register endpoints once and target them by id. The registry also gives you
          zero-downtime <b>key rotation</b>: <code>rotateSecret</code> dual-signs with the old and
          new keys until every receiver has migrated, then <code>finalizeRotation</code> drops the
          old one.
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ENDPOINTS} />
          </div>
        </>
      ),
    },
    {
      q: "I already use Svix / a webhook SaaS — can CommitCourier feed it instead of sending HTTP itself?",
      a: (
        <>
          Yes. Set <code>delivery.transport: "sink"</code> and pass a <code>Sink</code> — the
          official <code>svixSink</code> sample, or your own — and CommitCourier keeps the
          transactional outbox, retries, DLQ and ledger while handing each event off to your SaaS
          instead of delivering the HTTP request itself. Signing and SSRF are delegated to the SaaS,
          and your <code>idempotency-key</code> maps onto its dedup key. This is how you "keep your
          platform, close the transactional gap."{" "}
          <b>Experimental — this API may change in a minor release.</b>
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={SINK} />
          </div>
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
      <li>
        Ultra-low-latency fan-out — the LISTEN/NOTIFY accelerator trims the poll delay, but this
        isn't a sub-millisecond streaming bus.
      </li>
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
      q: "約1秒のポーリングは遅くないですか？",
      a: (
        <>
          既定では dispatcher
          は約1秒のポーリングで起きます。より低いレイテンシが要るときは、オプションの{" "}
          <code>commitcourier/accelerator/pg</code> アクセラレータを繋ぎます。COMMIT
          時のトランザクショナルな <code>pg_notify</code> が Postgres の LISTEN/NOTIFY
          経由で待機中の dispatcher を即座に起こすので、
          次のポーリングを待たずに配信が始まります。best-effort で、wake
          を取りこぼしてもポーリングに フォールバックするだけで、行は失われません。
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ACCEL} />
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
      q: "enqueue のたびに URL とシークレットを直書きする必要がありますか？",
      a: (
        <>
          いいえ。インラインの <code>endpoint: &#123; url, secret &#125;</code>{" "}
          は手軽な方法ですが、エンドポイントを一度登録して id で指定することもできます。レジストリは
          無停止の<b>鍵ローテーション</b>も提供します: <code>rotateSecret</code>{" "}
          が新旧の鍵で二重署名し、すべての受信側が移行したら <code>finalizeRotation</code>{" "}
          で旧鍵を破棄します。
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ENDPOINTS} />
          </div>
        </>
      ),
    },
    {
      q: "すでに Svix / Webhook SaaS を使っています。CommitCourier で自前 HTTP 送信の代わりに SaaS へ渡せますか？",
      a: (
        <>
          はい。<code>delivery.transport: "sink"</code> にして <code>Sink</code>（公式サンプルの{" "}
          <code>svixSink</code>、または自作）を渡すと、CommitCourier は
          トランザクショナルなアウトボックス・リトライ・DLQ・台帳を保ったまま、HTTP
          を自前で送る代わりに 各イベントを SaaS へハンドオフします。署名と SSRF は SaaS
          側へ委譲され、
          <code>idempotency-key</code> は SaaS の dedup キーへ対応します。これが「既存基盤を捨てずに
          transactional gap だけを塞ぐ」具体的な手段です。
          <b>実験的機能 — この API は minor リリースで変わる可能性があります。</b>
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={SINK} />
          </div>
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
      <li>
        超低レイテンシのファンアウト — LISTEN/NOTIFY
        アクセラレータでポーリング遅延は縮められますが、サブミリ秒のストリーミング基盤ではありません。
      </li>
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
