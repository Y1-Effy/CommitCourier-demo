import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";

// The dual-write snippet is code, so it is never translated (kept as a module constant).
const DUAL_WRITE = `// Two separate steps — not one atomic unit:
await db.orders.insert(order);
await webhookProvider.send(event);`;

/**
 * 縦方向の簡易フロー図。ステップ配列を矢印で連結して描画する。
 * CJK の桁ずれを避けるため、箱組みではなく縦並び + 矢印で表現する。
 */
function Flow({ steps }: { steps: string[] }) {
  return <pre className="diagram">{steps.join("\n   ↓\n")}</pre>;
}

interface WhyCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;

  // 2. 二重書き込み問題
  dualEyebrow: string;
  dualTitle: string;
  dualSub: ReactNode;
  lostTitle: string;
  lostFlow: string[];
  lostResult: ReactNode;
  phantomTitle: string;
  phantomFlow: string[];
  phantomResult: ReactNode;
  dualKey: ReactNode;

  // 3. 業務影響
  impactEyebrow: string;
  impactTitle: string;
  impactList: string[];

  // 4. リカバリ
  recoveryEyebrow: string;
  recoveryTitle: string;
  recoverySub: ReactNode;
  recoveryList: string[];
  recoveryKey: ReactNode;

  // 5. 損失と運用コスト
  lossEyebrow: string;
  lossTitle: string;
  directTitle: string;
  directList: string[];
  indirectTitle: string;
  indirectList: string[];

  // 6. 既存 SaaS が解決していること
  saasEyebrow: string;
  saasTitle: string;
  saasSub: ReactNode;
  saasList: string[];

  // 7. 残る最後の穴
  gapEyebrow: string;
  gapTitle: string;
  gapSub: ReactNode;
  gapFlow: string[];
  gapPoints: ReactNode;
  gapKey: ReactNode;

  // 8. CommitCourier がふさぐ部分
  fixEyebrow: string;
  fixTitle: string;
  fixSub: ReactNode;
  fixFlow: string[];
  fixKey: ReactNode;
  deliveryTitle: string;
  deliveryFeatures: [string, string][];

  // 9. 2 つの利用パターン
  useEyebrow: string;
  useTitle: string;
  useSub: ReactNode;
  soloTitle: string;
  soloFlow: string[];
  soloDesc: ReactNode;
  forLabel: string;
  soloFor: string[];
  comboTitle: string;
  comboFlow: string[];
  comboDesc: ReactNode;
  comboFor: string[];
  useCallout: ReactNode;

  // 10. 解決しないこと
  scopeEyebrow: string;
  scopeTitle: string;
  scopeSub: ReactNode;
  scopeList: string[];

  // 11. 末尾 CTA
  ctaTitle: string;
  ctaSub: ReactNode;
  ctaDemo: string;
  ctaIntegrate: string;
  ctaPath: string[];
}

const en: WhyCopy = {
  eyebrow: "The problem",
  heading: "Why webhook delivery is hard",
  intro: (
    <>
      The difficulty of webhook delivery is not just sending an HTTP request. You have to complete
      two things — <b>updating your business data</b> and <b>registering the webhook event</b> —
      without ever leaving them in disagreement. When those are two separate steps, a crash or
      rollback in between breaks the system. This page walks through that failure, what it costs,
      what existing services already solve, and the one seam they can leave open.
    </>
  ),

  dualEyebrow: "Dual write",
  dualTitle: "Two writes that can't be made atomic",
  dualSub: (
    <>
      A typical implementation does these in sequence. If they can't share one atomic transaction,
      there are two ways for it to break:
    </>
  ),
  lostTitle: "Pattern A — the lost webhook",
  lostFlow: [
    "Save the order to the DB (success)",
    "COMMIT the DB",
    "Process dies / network fails",
    "The webhook event is never registered",
  ],
  lostResult: (
    <ul className="muted">
      <li>The order exists.</li>
      <li>The delivery layer never learned the event existed.</li>
      <li>
        So it can't retry or redeliver —{" "}
        <b>a delivery layer can't resend an event it never received.</b>
      </li>
    </ul>
  ),
  phantomTitle: "Pattern B — the phantom webhook",
  phantomFlow: [
    "Register the webhook event with the provider (success)",
    "The business transaction fails",
    "The order data is rolled back",
  ],
  phantomResult: (
    <ul className="muted">
      <li>The order does not exist.</li>
      <li>An external system is told an order was created.</li>
      <li>The two systems now disagree about reality.</li>
    </ul>
  ),
  dualKey: (
    <>
      The same names are used on the <a href="#/">home page</a>: <b>lost webhook</b> (committed but
      never enqueued) and <b>phantom webhook</b> (enqueued but rolled back).
    </>
  ),

  impactEyebrow: "Business impact",
  impactTitle: "What actually happens to the business",
  impactList: [
    "An order is confirmed, but the warehouse is never notified, so it never ships.",
    "A payment fails, yet an external service receives a success notification.",
    "CRM, accounting, and inventory systems drift out of agreement.",
    "A contract or permission change is never reflected downstream.",
    "The same event is processed twice — double billing or double shipment.",
    "Nobody notices the failure until a customer reports it.",
  ],

  recoveryEyebrow: "Recovery",
  recoveryTitle: "Recovery needs people, not just a retry",
  recoverySub: (
    <>
      Once an inconsistency exists, a simple resend is rarely enough. A human has to reconstruct
      what really happened:
    </>
  ),
  recoveryList: [
    "Comb through application logs.",
    "Reconcile business rows in the DB against the delivery history.",
    "Identify which events were never sent.",
    "Check the state on the external system's side.",
    "Manually resend the missing webhooks.",
    "Verify nothing was sent twice.",
    "Reach out to customers or other teams.",
    "Issue refunds, re-ship, or repair data.",
    "Investigate the root cause and prevent a recurrence.",
  ],
  recoveryKey: (
    <>
      The real problem isn't that one webhook failed. It's that{" "}
      <b>after the incident, you no longer know which system holds the correct state.</b>
    </>
  ),

  lossEyebrow: "Cost",
  lossTitle: "The kinds of loss this can produce",
  directTitle: "Direct loss",
  directList: [
    "Double billing or refunds",
    "Missed or duplicated shipments",
    "Service that was never delivered",
    "Engineer-hours spent on manual recovery",
    "Data repair across external systems",
  ],
  indirectTitle: "Indirect loss",
  indirectList: [
    "Erosion of customer trust",
    "More support tickets to handle",
    "Engineers pulled into incident triage",
    "Gaps in audit trail and accountability",
    "Planned work slips while you firefight",
  ],

  saasEyebrow: "Credit where due",
  saasTitle: "What existing webhook services already solve",
  saasSub: (
    <>
      Modern webhook delivery services solve a great deal of the hard part — everything about
      delivering an event <i>after it has been received</i>. This is genuinely difficult work, and
      they do it well:
    </>
  ),
  saasList: [
    "HTTP delivery",
    "Retries",
    "Exponential backoff",
    "Signing",
    "Delivery history",
    "Dead-letter queue (DLQ)",
    "Endpoint management",
    "Monitoring",
    "Customer-facing dashboards",
    "Delivery-result visibility",
  ],

  gapEyebrow: "The last gap",
  gapTitle: "The seam that can still remain",
  gapSub: (
    <>
      A delivery service's retries only work for events the <i>service has received</i>. So a gap
      can remain when <b>committing the business transaction</b> and{" "}
      <b>registering the event with the webhook service</b> are two separate steps:
    </>
  ),
  gapFlow: [
    "COMMIT to the business DB",
    "The application stops",
    "Registering with the webhook service fails",
    "The delivery service never learned the event exists",
  ],
  gapPoints: (
    <ul className="muted">
      <li>A delivery service's retry only applies to events it received.</li>
      <li>An event it never received appears in neither the delivery history nor the DLQ.</li>
      <li>
        This is not a shortcoming of the webhook service — it is a seam left at the boundary between
        the application and the delivery layer.
      </li>
    </ul>
  ),
  gapKey: (
    <>
      This doesn't apply to every service or every setup. The inconsistency remains specifically{" "}
      <b>when event registration happens outside the business transaction</b>. We'll call this the{" "}
      <i>transactional gap</i> (or handoff gap).
    </>
  ),

  fixEyebrow: "The fix",
  fixTitle: "How CommitCourier closes the gap",
  fixSub: (
    <>
      CommitCourier writes the business data update and the webhook outbox row in the{" "}
      <b>same PostgreSQL transaction</b>:
    </>
  ),
  fixFlow: [
    "One PostgreSQL transaction",
    "Save business data + save webhook outbox row",
    "Commit together, or roll back together",
  ],
  fixKey: (
    <>
      This prevents the state where only one side succeeded — business data without an event, or an
      event without business data. CommitCourier doesn't claim to prevent every webhook failure; it{" "}
      <b>
        structurally prevents the inconsistency between the business transaction and event
        registration.
      </b>
    </>
  ),
  deliveryTitle: "And the delivery after that",
  deliveryFeatures: [
    ["Background delivery", "A polling dispatcher drains the outbox."],
    ["Signing", "HMAC-SHA256 (Standard Webhooks) receivers verify off the shelf."],
    ["Retries + backoff", "Exponential backoff with jitter."],
    ["DLQ + ledger", "Exhausted rows land in a DLQ; every attempt is recorded."],
    ["Replay", "Re-drive a delivery from its recorded history."],
    ["SSRF protection", "Private / loopback / cloud-metadata ranges blocked by default."],
  ],

  useEyebrow: "Two ways to use it",
  useTitle: "On its own, or alongside the platform you already run",
  useSub: (
    <>
      CommitCourier can be your webhook delivery layer — or secure the handoff to the one you
      already use.
    </>
  ),
  soloTitle: "Pattern 1 — CommitCourier on its own",
  soloFlow: ["Your business logic", "CommitCourier", "Webhook receiver"],
  soloDesc: (
    <>
      With just PostgreSQL, you get enqueue, delivery, retries, DLQ, and history end to end — no
      extra infrastructure.
    </>
  ),
  forLabel: "A good fit when you:",
  soloFor: [
    "Don't run a webhook SaaS today",
    "Want to manage delivery inside your own environment",
    "Already operate PostgreSQL",
    "Don't want to add another external service",
  ],
  comboTitle: "Pattern 2 — alongside an existing webhook service",
  comboFlow: [
    "Your business logic",
    "CommitCourier",
    "Existing webhook delivery service",
    "Webhook receiver",
  ],
  comboDesc: (
    <>
      Keep your webhook service as is, and use CommitCourier to close the handoff gap between the
      business transaction and the delivery layer.
    </>
  ),
  comboFor: [
    "Already run a webhook SaaS",
    "Want the SaaS to keep handling portals and advanced monitoring",
    "Don't want to restructure your setup",
    "Only need to prevent the DB-to-provider inconsistency",
  ],
  useCallout: <>Keep your webhook platform. Close the transactional gap.</>,

  scopeEyebrow: "Non-goals",
  scopeTitle: "What CommitCourier does not solve",
  scopeSub: (
    <>
      To stay honest about scope: CommitCourier owns the consistency between the business
      transaction and event registration, plus delivery, tracking, and retries after that. It does{" "}
      <b>not</b> remove every webhook-related failure. It does not directly solve:
    </>
  ),
  scopeList: [
    "Failures in the receiving system itself",
    "Bugs in the receiver's business logic",
    "Full exactly-once effects of side effects on the receiver",
    "Idempotency on the receiver (that's the receiver's job)",
    "PostgreSQL's own availability and backups",
    "Errors in the event content itself",
    "Bugs in your application's business logic",
    "Full recovery of failures that originated in an external service",
  ],

  ctaTitle: "Understand the problem, then watch it happen",
  ctaSub: (
    <>
      Everything on this site is real. See the failure and retry behavior in the live demo, then
      read the integration code.
    </>
  ),
  ctaDemo: "▶ See it run live",
  ctaIntegrate: "View integration code",
  ctaPath: [
    "Understand the problem",
    "Watch it run in the live demo",
    "Read the integration code",
    "GitHub / npm",
  ],
};

const ja: WhyCopy = {
  eyebrow: "問題",
  heading: "なぜ Webhook 配信は難しいのか",
  intro: (
    <>
      Webhook 配信の難しさは、HTTP リクエストを送ることだけではありません。
      <b>業務データの更新</b>と <b>Webhook イベントの登録</b>を、矛盾なく完了させる必要があります。
      この 2
      つが別々の処理になっていると、その間でクラッシュやロールバックが起きた瞬間に破綻します。
      このページでは、その失敗の構造・損失・既存サービスがすでに解決している範囲、そして
      それでも残りうる「最後の穴」を順番に見ていきます。
    </>
  ),

  dualEyebrow: "二重書き込み",
  dualTitle: "原子的にできない 2 つの書き込み",
  dualSub: (
    <>
      通常の実装はこの 2 つを順番に実行します。1 つの原子的なトランザクションとして扱えない場合、
      次の 2 通りで壊れます:
    </>
  ),
  lostTitle: "パターンA — 消えた Webhook",
  lostFlow: [
    "注文を DB に保存（成功）",
    "DB を COMMIT",
    "プロセス停止 / ネットワーク障害",
    "Webhook イベントを登録できない",
  ],
  lostResult: (
    <ul className="muted">
      <li>注文は存在する。</li>
      <li>配信基盤はイベントの存在を知らない。</li>
      <li>
        そのためリトライも再送もできない —{" "}
        <b>配信基盤は、受け取っていないイベントを再送できません。</b>
      </li>
    </ul>
  ),
  phantomTitle: "パターンB — 幻の Webhook",
  phantomFlow: [
    "Webhook イベントを外部サービスへ登録（成功）",
    "業務トランザクションが失敗",
    "注文データは rollback",
  ],
  phantomResult: (
    <ul className="muted">
      <li>注文は存在しない。</li>
      <li>外部システムには注文が作成されたという通知が届く。</li>
      <li>システム間で状態が食い違う。</li>
    </ul>
  ),
  dualKey: (
    <>
      <a href="#/">トップページ</a>と同じ呼び方を使っています: <b>消えた Webhook</b>（commit したが
      enqueue されない）と <b>幻の Webhook</b>（enqueue したが rollback された）。
    </>
  ),

  impactEyebrow: "業務影響",
  impactTitle: "業務上、実際に何が起こるのか",
  impactList: [
    "注文は確定したのに、倉庫へ通知されず出荷されない。",
    "決済が失敗したのに、外部サービスには成功通知が届く。",
    "CRM・会計・在庫システムの状態が食い違う。",
    "契約や権限の変更が下流に反映されない。",
    "同じイベントが複数回処理され、二重請求や二重出荷につながる。",
    "顧客から問い合わせを受けるまで障害に気づけない。",
  ],

  recoveryEyebrow: "リカバリ",
  recoveryTitle: "復旧には再送だけでなく人手が要る",
  recoverySub: (
    <>
      いったん不整合が生じると、単純な再送だけでは足りません。何が本当に起きたのかを、人間が
      組み立て直す必要があります:
    </>
  ),
  recoveryList: [
    "アプリケーションログを調査する。",
    "DB の業務データと配信履歴を突合する。",
    "送信されなかったイベントを特定する。",
    "外部システム側の状態を確認する。",
    "手動で Webhook を再送する。",
    "二重送信されていないか確認する。",
    "顧客や関係部署へ問い合わせる。",
    "返金・再出荷・データ修正などの業務対応を行う。",
    "原因を調査し、再発を防止する。",
  ],
  recoveryKey: (
    <>
      本当の問題は、Webhook が 1 件失敗することではありません。
      <b>障害後に、どのシステムの状態が正しいのか分からなくなることです。</b>
    </>
  ),

  lossEyebrow: "コスト",
  lossTitle: "発生しうる損失の種類",
  directTitle: "直接的な損失",
  directList: [
    "二重請求や返金",
    "出荷漏れや二重出荷",
    "提供されなかったサービス",
    "手動復旧に費やす人件費",
    "外部システムとのデータ修正",
  ],
  indirectTitle: "間接的な損失",
  indirectList: [
    "顧客からの信用低下",
    "問い合わせ対応の増加",
    "開発者が障害調査に拘束される",
    "監査ログや説明責任の不足",
    "本来の開発作業の遅延",
  ],

  saasEyebrow: "正当な評価",
  saasTitle: "既存の Webhook サービスが解決していること",
  saasSub: (
    <>
      現代の Webhook 配信サービスは、難しい部分の多くを解決しています —{" "}
      <i>イベントを受け取った後の配信</i>に関するすべてです。これは本当に難しい仕事で、
      多くのサービスがしっかり実現しています:
    </>
  ),
  saasList: [
    "HTTP 配信",
    "再試行",
    "指数バックオフ",
    "署名",
    "配信履歴",
    "DLQ（dead-letter queue）",
    "エンドポイント管理",
    "監視",
    "顧客向け管理画面",
    "配信結果の可視化",
  ],

  gapEyebrow: "最後の穴",
  gapTitle: "それでも残りうる継ぎ目",
  gapSub: (
    <>
      配信サービスの再試行は、<i>サービスが受け取った</i>イベントに対してのみ機能します。 つまり{" "}
      <b>業務トランザクションの commit</b> と <b>Webhook 配信サービスへのイベント登録</b>{" "}
      が別々に実行されている場合、穴が残りえます:
    </>
  ),
  gapFlow: [
    "業務 DB へ COMMIT",
    "アプリケーション停止",
    "Webhook サービスへの登録失敗",
    "配信サービスはイベントの存在を知らない",
  ],
  gapPoints: (
    <ul className="muted">
      <li>配信サービスの再試行は、受け取ったイベントに対してのみ機能する。</li>
      <li>受け取られていないイベントは、配信履歴にも DLQ にも残らない。</li>
      <li>
        これは Webhook
        サービスの性能不足ではなく、アプリケーションと配信基盤の境界に残る問題である。
      </li>
    </ul>
  ),
  gapKey: (
    <>
      すべてのサービス・すべての構成にこの問題があるわけではありません。
      <b>イベント登録が業務トランザクションの外で行われている場合</b>に限り、この不整合が残ります。
      本ページではこれを <i>transactional gap</i>（または handoff gap）と呼びます。
    </>
  ),

  fixEyebrow: "解決策",
  fixTitle: "CommitCourier が穴をどうふさぐか",
  fixSub: (
    <>
      CommitCourier は、業務データの更新と Webhook の outbox 行登録を、
      <b>同じ PostgreSQL トランザクション</b>内で行います:
    </>
  ),
  fixFlow: [
    "1 つの PostgreSQL トランザクション",
    "業務データを保存 + Webhook outbox 行を保存",
    "同時に commit、または同時に rollback",
  ],
  fixKey: (
    <>
      これにより、片方だけが成功する状態 — 業務データだけ／イベントだけ — を防ぎます。 CommitCourier
      はすべての Webhook 障害を防ぐとは謳いません。
      <b>業務トランザクションとイベント登録の間に残る不整合を、構造的に防ぎます。</b>
    </>
  ),
  deliveryTitle: "その後の配信について",
  deliveryFeatures: [
    ["バックグラウンド配信", "ポーリング型 dispatcher が outbox を排出。"],
    ["署名", "HMAC-SHA256（Standard Webhooks）。受信側は既製ツールで検証。"],
    ["再試行 + バックオフ", "ジッタ付きの指数バックオフ。"],
    ["DLQ + 台帳", "使い切った行は DLQ へ。全試行を記録。"],
    ["replay", "記録された履歴から配信を再駆動。"],
    ["SSRF 防御", "プライベート / ループバック / メタデータ範囲を既定でブロック。"],
  ],

  useEyebrow: "2 つの使い方",
  useTitle: "単体でも、既存の配信基盤との併用でも",
  useSub: (
    <>
      CommitCourier は、それ自体を Webhook 配信基盤としても、既存の配信基盤へ安全に渡す前段としても
      使えます。
    </>
  ),
  soloTitle: "パターン1 — CommitCourier だけで完結",
  soloFlow: ["業務処理", "CommitCourier", "Webhook 受信先"],
  soloDesc: (
    <>
      PostgreSQL だけで、イベントの enqueue から配信・再試行・DLQ・履歴管理まで完結できます —
      追加インフラは不要です。
    </>
  ),
  forLabel: "向いている利用者:",
  soloFor: [
    "Webhook SaaS を導入していない",
    "自分の環境内で Webhook 配信を管理したい",
    "PostgreSQL をすでに利用している",
    "外部サービスを増やしたくない",
  ],
  comboTitle: "パターン2 — 既存の Webhook 配信サービスと併用",
  comboFlow: ["業務処理", "CommitCourier", "既存の Webhook 配信サービス", "Webhook 受信先"],
  comboDesc: (
    <>
      既存の Webhook サービスはそのまま利用し、業務トランザクションから配信基盤へ渡すまでの handoff
      gap を CommitCourier でふさげます。
    </>
  ),
  comboFor: [
    "すでに Webhook SaaS を導入している",
    "顧客向けポータルや高度な監視は SaaS に任せたい",
    "既存構成を大きく変更したくない",
    "DB と外部配信サービスの間の不整合だけを防ぎたい",
  ],
  useCallout: <>既存の Webhook 基盤はそのままに。transactional gap だけをふさぐ。</>,

  scopeEyebrow: "非対象",
  scopeTitle: "CommitCourier が解決しないこと",
  scopeSub: (
    <>
      スコープを誠実に保つために: CommitCourier は、業務トランザクションとイベント登録の整合性、
      および登録後の配信・追跡・再試行を担当します。Webhook に関する<b>すべて</b>の障害を
      なくすものではありません。次は直接は解決しません:
    </>
  ),
  scopeList: [
    "Webhook 受信側システム自体の障害",
    "受信側の業務ロジックのバグ",
    "受信側での副作用の完全な exactly-once 保証",
    "受信側の idempotency 実装（これは受信側の責務）",
    "PostgreSQL 自体の可用性やバックアップ",
    "イベント内容そのものの誤り",
    "アプリケーションの業務ロジックの不具合",
    "外部サービス側で発生した障害の完全な復旧",
  ],

  ctaTitle: "仕組みを理解したら、動く様子を確かめる",
  ctaSub: (
    <>
      このサイトの内容はすべて本物です。失敗と再試行の動作をライブデモで確認し、実際の組み込みコードを
      読んでみてください。
    </>
  ),
  ctaDemo: "▶ ライブで動かす",
  ctaIntegrate: "組み込みコードを見る",
  ctaPath: ["問題を理解する", "ライブデモで動作を確認する", "導入コードを見る", "GitHub / npm"],
};

const copy: Record<Locale, WhyCopy> = { en, ja };

export function WhyWebhooks() {
  const t = useCopy(copy);
  return (
    <div className="container">
      {/* 1. 導入 */}
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 32 }}>
        {t.heading}
      </h2>
      <p className="sub">{t.intro}</p>

      {/* 2. 二重書き込み問題 */}
      <div style={{ height: 28 }} />
      <div className="eyebrow">{t.dualEyebrow}</div>
      <h2 className="section">{t.dualTitle}</h2>
      <p className="sub">{t.dualSub}</p>
      <CodeBlock code={DUAL_WRITE} />
      <div style={{ height: 16 }} />
      <div className="grid cols-2">
        <div className="card">
          <b style={{ color: "var(--red)" }}>{t.lostTitle}</b>
          <Flow steps={t.lostFlow} />
          <div style={{ marginTop: 10 }}>{t.lostResult}</div>
        </div>
        <div className="card">
          <b style={{ color: "var(--red)" }}>{t.phantomTitle}</b>
          <Flow steps={t.phantomFlow} />
          <div style={{ marginTop: 10 }}>{t.phantomResult}</div>
        </div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.dualKey}
      </div>

      {/* 3. 業務影響 */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.impactEyebrow}</div>
      <h2 className="section">{t.impactTitle}</h2>
      <div className="card">
        <ul className="muted" style={{ margin: 0 }}>
          {t.impactList.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* 4. 障害後リカバリ */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.recoveryEyebrow}</div>
      <h2 className="section">{t.recoveryTitle}</h2>
      <p className="sub">{t.recoverySub}</p>
      <div className="card">
        <ul className="muted" style={{ margin: 0 }}>
          {t.recoveryList.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.recoveryKey}
      </div>

      {/* 5. 損失と運用コスト */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.lossEyebrow}</div>
      <h2 className="section">{t.lossTitle}</h2>
      <div className="grid cols-2">
        <div className="card">
          <b>{t.directTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.directList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b>{t.indirectTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.indirectList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. 既存 SaaS が解決していること */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.saasEyebrow}</div>
      <h2 className="section">{t.saasTitle}</h2>
      <p className="sub">{t.saasSub}</p>
      <div className="card">
        <div className="row" style={{ gap: 8 }}>
          {t.saasList.map((item) => (
            <span key={item} className="pill delivered">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* 7. 残る最後の穴 */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.gapEyebrow}</div>
      <h2 className="section">{t.gapTitle}</h2>
      <p className="sub">{t.gapSub}</p>
      <div className="card">
        <Flow steps={t.gapFlow} />
        <div style={{ marginTop: 10 }}>{t.gapPoints}</div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.gapKey}
      </div>

      {/* 8. CommitCourier がふさぐ部分 */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.fixEyebrow}</div>
      <h2 className="section">{t.fixTitle}</h2>
      <p className="sub">{t.fixSub}</p>
      <div className="card">
        <Flow steps={t.fixFlow} />
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.fixKey}
      </div>
      <div style={{ height: 20 }} />
      <b className="muted">{t.deliveryTitle}</b>
      <div style={{ height: 10 }} />
      <div className="grid cols-3">
        {t.deliveryFeatures.map(([title, desc]) => (
          <div className="card" key={title}>
            <b>{title}</b>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* 9. 2 つの利用パターン */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.useEyebrow}</div>
      <h2 className="section">{t.useTitle}</h2>
      <p className="sub">{t.useSub}</p>
      <div className="grid cols-2">
        <div className="card">
          <b>{t.soloTitle}</b>
          <Flow steps={t.soloFlow} />
          <p className="muted" style={{ margin: "10px 0 0" }}>
            {t.soloDesc}
          </p>
          <div className="muted" style={{ marginTop: 8, fontWeight: 600 }}>
            {t.forLabel}
          </div>
          <ul className="muted" style={{ margin: "4px 0 0" }}>
            {t.soloFor.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b>{t.comboTitle}</b>
          <Flow steps={t.comboFlow} />
          <p className="muted" style={{ margin: "10px 0 0" }}>
            {t.comboDesc}
          </p>
          <div className="muted" style={{ marginTop: 8, fontWeight: 600 }}>
            {t.forLabel}
          </div>
          <ul className="muted" style={{ margin: "4px 0 0" }}>
            {t.comboFor.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.useCallout}
      </div>

      {/* 10. 解決しないこと */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.scopeEyebrow}</div>
      <h2 className="section">{t.scopeTitle}</h2>
      <p className="sub">{t.scopeSub}</p>
      <div className="card">
        <ul className="muted" style={{ margin: 0 }}>
          {t.scopeList.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* 11. 末尾 CTA */}
      <div style={{ height: 40 }} />
      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="section">{t.ctaTitle}</h2>
        <p className="sub">{t.ctaSub}</p>
        <div className="cta">
          <a className="btn primary" href="#/demo">
            {t.ctaDemo}
          </a>
          <a className="btn" href="#/integrate">
            {t.ctaIntegrate}
          </a>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <Flow steps={t.ctaPath} />
        </div>
        <div className="cta" style={{ marginTop: 14 }}>
          <a
            className="btn ghost"
            href="https://github.com/Y1-Effy/CommitCourier"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          <a
            className="btn ghost"
            href="https://www.npmjs.com/package/commitcourier"
            target="_blank"
            rel="noopener noreferrer"
          >
            npm ↗
          </a>
        </div>
      </div>
    </div>
  );
}
