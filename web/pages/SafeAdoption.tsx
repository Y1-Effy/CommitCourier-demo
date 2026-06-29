import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { Flow, PartHeader, PageNav } from "../components/Explainer";
import { useCopy, type Locale } from "../i18n";
import { NPM, REPO, ISSUES, SECURITY, ACTIONS, TESTS, CONTRIBUTING } from "../lib/links";

// Observe mode のコードは翻訳しない module 定数（コメントは英語）。
const OBSERVE_CODE = `// Evaluate safely: run the real code path, record what WOULD be sent — send nothing.
const relay = await createRelay({
  store,
  mode: "observe", // enqueue still rides your transaction; rows land as "observed"
});
// No outbound HTTP. Switch to the default (active) mode once you're convinced.`;

// 設計思想ラベルは技術的な概念名なので日英共通（翻訳しない）。各ピルは、それを具体化している
// 下流セクションへのジャンプリンクになる（[label, 対応セクションの id]）。
const PRINCIPLES: [string, string][] = [
  ["Security by default", "sa-security"],
  ["Failure-aware design", "sa-failure"],
  ["Evidence over promises", "sa-evidence"],
  ["Clear responsibility boundaries", "sa-boundaries"],
  ["Open to feedback", "sa-feedback"],
];

/** Smooth-scroll to a section anchor (the principle pills act as jump links). */
function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface SafeAdoptionCopy {
  // ヒーロー
  eyebrow: string;
  title: string;
  tagline: string;
  lead: ReactNode;
  ctaPrimary: string;
  ctaDemo: string;
  navLabel: string;

  // パート見出し（ページ内ナビ）
  partEvaluate: string;
  partTrust: string;
  partLimits: string;

  // ヒーロー直下の3カード
  cards3: [string, string][];

  // §1 不安を認める
  s1Eyebrow: string;
  s1Title: string;
  s1Body: ReactNode;

  // §2 導入判断を可逆にする
  s2Eyebrow: string;
  s2Title: string;
  s2Sub: ReactNode;
  s2Flow: string[];
  s2Key: ReactNode;

  // §3 既存構成へ小さく追加
  s3Eyebrow: string;
  s3Title: string;
  s3Sub: ReactNode;
  s3List: string[];

  // §4 Observe mode
  s4Eyebrow: string;
  s4Title: string;
  s4Sub: ReactNode;
  s4Flow: string[];
  s4ConfirmTitle: string;
  s4Confirm: string[];
  s4Copy: ReactNode;

  // §5 合わなければ外せる
  s5Eyebrow: string;
  s5Title: string;
  s5Sub: ReactNode;
  s5AddTitle: string;
  s5AddList: string[];
  s5RemoveTitle: string;
  s5RemoveFlow: string[];
  s5Key: ReactNode;

  // §6 Security by default
  s6Eyebrow: string;
  s6Title: string;
  s6Sub: ReactNode;
  s6Cards: [string, string][];

  // §7 失敗時を設計する
  s7Eyebrow: string;
  s7Title: string;
  s7Sub: ReactNode;
  s7Cards: [string, string][];
  s7Copy: ReactNode;

  // §8 品質をどう確認しているか
  s8Eyebrow: string;
  s8Title: string;
  s8Sub: ReactNode;
  s8Items: string[];
  s8Note: ReactNode;

  // §9 現在地と限界
  s9Eyebrow: string;
  s9Title: string;
  s9Limits: string[];
  s9Then: ReactNode;

  // §10 保証しない範囲
  s10Eyebrow: string;
  s10Title: string;
  s10Sub: ReactNode;
  s10OwnsTitle: string;
  s10OwnsList: string[];
  s10YouTitle: string;
  s10YouList: string[];

  // §11 協力歓迎
  s11Eyebrow: string;
  s11Title: string;
  s11Body: ReactNode;
  s11Flow: string[];

  // §12 末尾 CTA
  ctaTitle: string;
  ctaSub: ReactNode;
  ctaPath: string[];

  // 共通のリンクラベル
  bWhy: string;
  bDemo: string;
  bSecurity: string;
  bTests: string;
  bActions: string;
  bIssue: string;
  bReportSec: string;
  bContributing: string;
}

const en: SafeAdoptionCopy = {
  eyebrow: "Safe adoption",
  title: "Built for Safe Adoption",
  tagline: "Drop it in. Try it without sending. Back out cleanly if it isn't for you.",
  lead: (
    <>
      CommitCourier is designed to be added to an existing application in a small way, to let you
      confirm its behavior <b>before any real delivery starts</b>, and to be removed — without
      dragging your business schema with it — if it turns out not to fit. You don't have to trust it
      up front; you have to be able to evaluate it safely.
    </>
  ),
  ctaPrimary: "Start in Observe mode",
  ctaDemo: "See the live demo",
  navLabel: "On this page:",

  partEvaluate: "Evaluate it safely",
  partTrust: "Why it holds up",
  partLimits: "Honest about the limits",

  cards3: [
    [
      "Drops in",
      "Add it to the Node.js / TypeScript app and PostgreSQL you already run — as a small, contained change.",
    ],
    [
      "Try without sending",
      "Observe mode confirms production-equivalent behavior without making any outbound HTTP call.",
    ],
    [
      "Backs out cleanly",
      "The dedicated tables, dispatcher and enqueue calls are easy to remove to return to your original setup.",
    ],
  ],

  s1Eyebrow: "We get the hesitation",
  s1Title: "Adding a new library to a path that matters",
  s1Body: (
    <>
      Webhooks are an important path between your core systems and outside services. Being cautious
      about dropping an unproven library straight into that path is the right instinct.
      CommitCourier's goal isn't to win your full trust on day one — it's to keep the adoption
      decision small, safe, and reversible.
    </>
  ),

  s2Eyebrow: "Reversible by design",
  s2Title: "Try small. Observe first. Enable when ready.",
  s2Sub: (
    <>
      Adopting the library shouldn't be a one-way migration you can't undo. Each step is small and
      the previous one is still recoverable.
    </>
  ),
  s2Flow: [
    "Add it in a small, contained change",
    "Observe — confirm behavior without sending",
    "Enable active delivery once you're convinced",
    "If it isn't a fit, remove just the dedicated parts",
  ],
  s2Key: (
    <>
      The point: don't turn library adoption into a large migration you can't walk back. Add small,
      confirm, then enable when you're convinced.
    </>
  ),

  s3Eyebrow: "Small footprint",
  s3Title: "Added to your stack, not a rewrite of it",
  s3Sub: (
    <>
      You don't build a new delivery platform from scratch; you add CommitCourier to the application
      and PostgreSQL you already run. It works alongside the code that emits webhooks rather than
      replacing your whole event architecture.
    </>
  ),
  s3List: [
    "Added as an npm package",
    "Uses your existing PostgreSQL",
    "No extra infrastructure required — no Redis or Kafka",
    "enqueue is added inside your existing business transaction",
    "No need to migrate the whole app to a new eventing model",
    "Change is contained to dedicated tables + a dispatcher",
  ],

  s4Eyebrow: "Observe mode",
  s4Title: "Don't trust it first. Observe it first.",
  s4Sub: (
    <>
      Observe mode runs the same code path as real processing but makes no outbound HTTP call —
      events are recorded with the <span className="kbd">observed</span> status instead of being
      sent. It's a staged-rollout step for verifying a production-equivalent path safely, not a toy
      dry-run.
    </>
  ),
  s4Flow: [
    "Production-equivalent business logic",
    "enqueue in the same transaction",
    'Event recorded as "observed"',
    "No outbound HTTP is sent",
  ],
  s4ConfirmTitle: "What you can confirm before sending anything:",
  s4Confirm: [
    "Events are generated at the moments you expect",
    "A rolled-back business transaction leaves no event behind",
    "Payloads are correct",
    "The event volume matches expectations",
    "The right destination is selected",
    "No unexpected events occur before going live",
  ],
  s4Copy: <>You don't have to trust it first. You can observe it first — with nothing sent.</>,

  s5Eyebrow: "Designed to leave cleanly",
  s5Title: "Easy to adopt. Designed to leave cleanly.",
  s5Sub: (
    <>
      Reversibility is a first-class scenario, not an afterthought. The change you make at adoption
      is also the change you undo — so it's clear where to back out.
    </>
  ),
  s5AddTitle: "What adoption adds",
  s5AddList: [
    "CommitCourier's own tables",
    "enqueue calls",
    "the dispatcher",
    "configuration",
    "the npm package",
  ],
  s5RemoveTitle: "Removing it",
  s5RemoveFlow: [
    "Stop the dispatcher",
    "Remove the enqueue calls",
    "Drop CommitCourier's tables",
    "Remove the config and package",
  ],
  s5Key: (
    <>
      CommitCourier's data lives in dedicated tables — your business tables aren't reshaped into a
      CommitCourier-specific format, and the app isn't deeply coupled to a new eventing model. Among
      libraries of this kind it's unusual to treat removal as a supported scenario; compared with
      typical Transactional Outbox libraries, the footprint is straightforward to back out.
    </>
  ),

  s6Eyebrow: "Security by default",
  s6Title: "Safe defaults, explicit escape hatches",
  s6Sub: (
    <>
      Rather than claiming it's "secure," CommitCourier makes the safe setting the default and
      requires an explicit decision to loosen it. These are the representative measures — not a
      promise of perfect security.
    </>
  ),
  s6Cards: [
    [
      "Standard Webhooks signatures",
      "HMAC-SHA256 over id.timestamp.body, with the timestamp signed. Verification accepts multiple secrets so a receiver works across a key rotation.",
    ],
    [
      "SSRF guard on by default",
      "Private, loopback, link-local and cloud-metadata targets are blocked — validated against the DNS-resolved IP, which is pinned at connect time (DNS-rebinding aware).",
    ],
    [
      "Secrets encrypted at rest",
      "A built-in AES-256-GCM cipher, or your own adapter for KMS / Vault. Without a cipher, startup prints an explicit plaintext warning.",
    ],
    [
      "Bounded by default",
      "HTTP timeout, payload-size limit, retry / backoff caps and a replay safety cap — all set to safe defaults.",
    ],
    [
      "Careful with secrets & history",
      "Signing secrets are not written into the delivery ledger, and stored response bodies are length-limited.",
    ],
    [
      "Explicit escape hatches",
      "Unsafe-but-valid settings require an explicit acknowledgement — they are never applied silently.",
    ],
  ],

  s7Eyebrow: "Failure-aware design",
  s7Title: "Reliability is defined by failure behavior",
  s7Sub: (
    <>
      Reliability isn't the number of features that work on the happy path — it's what happens when
      something fails. Failures are treated as a normal operational flow: recorded, retried,
      recoverable.
    </>
  ),
  s7Cards: [
    [
      "enqueue is fail-closed",
      "It rides your business transaction. If the outbox row can't be written, your transaction fails too — you never emit a webhook for a change that didn't commit.",
    ],
    [
      "dispatch is fail-open",
      "An async delivery failure never flows back into your business path. It is recorded, not thrown at your request.",
    ],
    [
      "retry → DLQ",
      "Retryable failures back off and retry; a final failure lands in the dead-letter queue rather than vanishing.",
    ],
    [
      "Recovers after a crash",
      "in-flight rows are reclaimed via a visibility timeout, so a worker crash mid-delivery doesn't strand events.",
    ],
    [
      "replay & cancel",
      "Inspect the full delivery ledger, replay the DLQ, or cancel a pending row.",
    ],
    [
      "at-least-once, stated honestly",
      "Delivery is at-least-once — not exactly-once. Every event carries an idempotency-key so the receiver can dedup.",
    ],
  ],
  s7Copy: (
    <>
      Reliability is decided by behavior on failure, not on success. Failures aren't exceptions here
      — they're an ordinary flow you can record, retry and recover from.
    </>
  ),

  s8Eyebrow: "Evidence over promises",
  s8Title: "What we continuously verify",
  s8Sub: (
    <>
      Rather than asserting "it's well tested," the project publishes what it checks. These run
      continuously in public CI — beyond a coverage number, they exercise failures, concurrency, and
      the post-publish package surface.
    </>
  ),
  s8Items: [
    "Unit tests",
    "PostgreSQL integration tests (12 / 16 / 17)",
    "Fault-path tests",
    "Concurrency tests",
    "Performance tests",
    "Package export validation",
    "ESM / CJS validation",
    "Public API compatibility checks",
    "Dependency audit",
    "Mutation testing",
  ],
  s8Note: (
    <>
      The aim isn't a test count or a coverage figure — it's showing how many kinds of failure and
      boundary conditions are exercised. You can read the CI runs, the test suite and the security
      policy yourself.
    </>
  ),

  s9Eyebrow: "Where it stands",
  s9Title: "Current status and limits — stated plainly",
  s9Limits: [
    "Pre-release (0.x) — the API may still change before 1.0",
    "Not a mature project with large-scale production adoption yet",
    "No third-party security audit yet",
    "Not a service with an SLA or commercial support",
    "External adopters and case studies are still being built up",
  ],
  s9Then: (
    <>
      That's exactly why there's Observe mode, a removable footprint, safe defaults, and a published
      test and security model. The aim is to make up for the track record it doesn't yet have with
      design, verification, and transparency — trust through evidence now, and through evidence and
      adoption over time.
    </>
  ),

  s10Eyebrow: "Clear boundaries",
  s10Title: "What CommitCourier does and doesn't cover",
  s10Sub: (
    <>
      CommitCourier does not make every webhook failure disappear. Being clear about the boundary of
      responsibility is part of being safe.
    </>
  ),
  s10OwnsTitle: "What it owns",
  s10OwnsList: [
    "Consistency between your business transaction and the webhook event record",
    "Delivery, tracking, retries and recovery after the event is recorded",
  ],
  s10YouTitle: "What you still own",
  s10YouList: [
    "Your receiver's own availability and business-logic bugs",
    "Exactly-once effects / idempotency on the receiving side",
    "PostgreSQL availability, backups and recovery",
    "Correctness of the event data and your application logic",
    "Your key management and access control",
    "Full recovery from outages on the external service",
  ],

  s11Eyebrow: "Open to feedback",
  s11Title: "Help shape CommitCourier",
  s11Body: (
    <>
      CommitCourier is pre-release. Real adoption feedback, design reviews, security findings, and
      contributions to docs or adapters are all welcome. A point you got stuck on, a missing
      feature, an unclear explanation, or a small question — any of it can be shared on GitHub. For
      security issues, please use the private channel in SECURITY.md rather than a public issue.
    </>
  ),
  s11Flow: [
    "Open the issue in public",
    "Write down the reasoning",
    "Work the fix",
    "Add tests",
    "Close it with the outcome recorded",
  ],

  ctaTitle: "Start by evaluating it — safely",
  ctaSub: (
    <>
      Don't take it on trust. Add it small, observe it without sending, and enable it once you're
      convinced — then back out the dedicated parts if it isn't a fit.
    </>
  ),
  ctaPath: [
    "Learn the webhook problem",
    "Review CommitCourier's design",
    "Watch the live demo",
    "Try it in Observe mode (nothing sent)",
    "Read the integration code",
    "GitHub / npm",
  ],

  bWhy: "Why webhooks",
  bDemo: "Live demo",
  bSecurity: "Security policy ↗",
  bTests: "Tests ↗",
  bActions: "CI runs ↗",
  bIssue: "Open an issue ↗",
  bReportSec: "Report a security issue ↗",
  bContributing: "Contributing guide ↗",
};

const ja: SafeAdoptionCopy = {
  eyebrow: "安心して試す",
  title: "安心して試すための設計",
  tagline: "すぐ入る。送らず試せる。合わなければ、すぐ戻せる。",
  lead: (
    <>
      CommitCourier は、既存アプリケーションへ<b>小さく追加</b>し、
      <b>実際の送信を始める前に</b>動作を確認でき、合わなければ業務スキーマを巻き込まずに撤去できる
      よう設計されています。最初から全面的に信頼する必要はありません。必要なのは、安全に評価できる
      ことです。
    </>
  ),
  ctaPrimary: "Observe mode で試す",
  ctaDemo: "ライブデモを見る",
  navLabel: "このページの流れ:",

  partEvaluate: "小さく安全に試す",
  partTrust: "なぜ信頼できるか",
  partLimits: "正直な範囲",

  cards3: [
    [
      "すぐ入る",
      "すでに動かしている Node.js / TypeScript アプリと PostgreSQL へ、小さく限定した変更として追加できます。",
    ],
    ["送らず試せる", "Observe mode で、外部への HTTP 送信をせずに本番相当の動作を確認できます。"],
    [
      "すぐ戻せる",
      "専用テーブル・dispatcher・enqueue など固有の部分を外して、元の構成へ戻しやすい設計です。",
    ],
  ],

  s1Eyebrow: "ためらいは当然です",
  s1Title: "重要な経路へ新しいライブラリを足すということ",
  s1Body: (
    <>
      Webhook は、業務システムと外部サービスをつなぐ重要な経路です。実績の少ない新しいライブラリを、
      その経路へいきなり追加することに慎重になるのは当然です。CommitCourier は、最初から全面的に
      信頼してもらうことではなく、導入判断を小さく・安全に・後戻りできる形で進められることを重視
      しています。
    </>
  ),

  s2Eyebrow: "導入判断を可逆にする",
  s2Title: "まず試す。確認してから送る。違ったら戻す。",
  s2Sub: (
    <>
      ライブラリの導入を、後戻りできない大きな移行にしない。各ステップは小さく、ひとつ前へ戻せます。
    </>
  ),
  s2Flow: [
    "小さく限定した変更で追加する",
    "Observe — 送信せずに挙動を確認する",
    "納得できたら配信を有効化する",
    "合わなければ専用部分だけ外す",
  ],
  s2Key: (
    <>
      要点は、導入を巻き戻せない大きな移行にしないこと。まず小さく追加し、動作を確認し、納得してから
      有効化できます。
    </>
  ),

  s3Eyebrow: "変更範囲は小さく",
  s3Title: "作り替えではなく、既存スタックへの追加",
  s3Sub: (
    <>
      新しい配信基盤を一から構築するのではなく、すでに動かしているアプリケーションと PostgreSQL へ
      小さく追加します。アプリ全体のイベント方式を置き換えるのではなく、Webhook を発行する処理へ
      段階的に組み込めます。
    </>
  ),
  s3List: [
    "npm パッケージとして追加できる",
    "既存の PostgreSQL を利用する",
    "Redis / Kafka などの追加インフラを必須としない",
    "既存の業務トランザクションへ enqueue を追加する",
    "アプリ全体を新しいイベント方式へ移行する必要はない",
    "変更を専用テーブル + dispatcher の追加に閉じ込めやすい",
  ],

  s4Eyebrow: "Observe mode",
  s4Title: "最初から信頼しなくていい。まず観察できる。",
  s4Sub: (
    <>
      Observe mode は、実際の処理と同じコード経路を通しながら外部への HTTP 送信は行わず、イベントを{" "}
      <span className="kbd">observed</span>{" "}
      として記録します。本番相当の経路を安全に検証するための段階導入機能であり、単なる dry-run では
      ありません。
    </>
  ),
  s4Flow: [
    "本番相当の業務処理",
    "同じトランザクションで enqueue",
    'イベントを "observed" として記録',
    "外部への HTTP 送信は行わない",
  ],
  s4ConfirmTitle: "何も送らずに確認できること:",
  s4Confirm: [
    "想定したタイミングでイベントが生成されるか",
    "業務トランザクションが rollback したときにイベントも残らないか",
    "payload が正しいか",
    "イベント件数が想定どおりか",
    "送信先の選択が正しいか",
    "本稼働前に想定外のイベントが発生していないか",
  ],
  s4Copy: <>最初から信頼する必要はありません。まず、送信せずに確認できます。</>,

  s5Eyebrow: "きれいに外せる設計",
  s5Title: "入れやすい。そして、きれいに外せるよう設計。",
  s5Sub: (
    <>
      撤去しやすさは後付けではなく、正式な利用シナリオです。導入時に加えた変更が、そのまま撤去する
      変更になるので、どこを戻せばよいかが分かりやすくなっています。
    </>
  ),
  s5AddTitle: "導入で追加されるもの",
  s5AddList: [
    "CommitCourier 専用テーブル",
    "enqueue 呼び出し",
    "dispatcher",
    "設定",
    "npm パッケージ",
  ],
  s5RemoveTitle: "撤去するとき",
  s5RemoveFlow: [
    "dispatcher を停止",
    "enqueue 呼び出しを削除",
    "CommitCourier 専用テーブルを削除",
    "設定とパッケージを削除",
  ],
  s5Key: (
    <>
      CommitCourier のデータは専用テーブルに分離されます。業務テーブルを CommitCourier 固有の形式へ
      変更せず、アプリ全体を新しいイベント方式へ深く結合しません。同種のライブラリでは珍しく、撤去
      まで利用シナリオとして設計しています。代表的な Transactional Outbox ライブラリと比べても、
      撤去しやすい構成です。
    </>
  ),

  s6Eyebrow: "安全をデフォルトに",
  s6Title: "安全なデフォルトと、明示的な抜け道",
  s6Sub: (
    <>
      「安全です」と主張するのではなく、安全側の設定を標準にし、緩和するときには明示的な判断を必要に
      します。以下は代表的な対策であり、完全な安全の保証ではありません。
    </>
  ),
  s6Cards: [
    [
      "Standard Webhooks 署名",
      "id.timestamp.body に対する HMAC-SHA256（timestamp も署名対象）。検証は複数シークレットを受け付け、鍵ローテーション期間をまたいでも動きます。",
    ],
    [
      "SSRF ガードを既定で ON",
      "private・loopback・link-local・クラウドメタデータ宛をブロック。URL だけでなく DNS 解決後の IP を検査し、接続時にその IP をピン留め（DNS rebinding 対応）。",
    ],
    [
      "シークレットを保存時暗号化",
      "組み込みの AES-256-GCM cipher、または KMS / Vault 用の独自 adapter。cipher 未設定時は起動時に明示的な平文警告を出します。",
    ],
    [
      "既定で上限を設ける",
      "HTTP タイムアウト・payload サイズ上限・retry / backoff 上限・replay の安全上限 — いずれも安全側の既定値。",
    ],
    [
      "秘密と履歴の扱いに注意",
      "署名シークレットを配信履歴へ保存せず、保存するレスポンス本文も長さを制限します。",
    ],
    [
      "抜け道は明示的に",
      "危険だが有効な設定変更には明示的な承認が必要で、黙って適用されることはありません。",
    ],
  ],

  s7Eyebrow: "失敗を前提に設計",
  s7Title: "信頼性は、失敗時の挙動で決まる",
  s7Sub: (
    <>
      信頼性は、正常時に動く機能の数ではなく、失敗したときに何が起きるかで決まります。障害を例外と
      して扱わず、記録・再試行・復旧できる通常の運用フローとして設計しています。
    </>
  ),
  s7Cards: [
    [
      "enqueue は fail-closed",
      "業務トランザクションに相乗りします。outbox 行を書けないなら業務トランザクションも失敗 — コミットされていない変更の Webhook を発行しません。",
    ],
    [
      "dispatch は fail-open",
      "非同期配信の失敗を業務処理へ逆流させません。失敗は記録され、リクエストに対して投げ返されません。",
    ],
    [
      "retry → DLQ",
      "再試行可能な失敗は backoff して retry。最終的な失敗は消えずに DLQ（dead-letter queue）へ残ります。",
    ],
    [
      "クラッシュ後も復旧",
      "in-flight 行は visibility timeout で回収されるため、配信中の worker が落ちてもイベントが取り残されません。",
    ],
    ["replay と cancel", "配信台帳を確認し、DLQ を replay し、保留中の行を cancel できます。"],
    [
      "at-least-once を正直に",
      "配信は at-least-once であり exactly-once ではありません。各イベントは idempotency-key を持ち、受信側で重複排除できます。",
    ],
  ],
  s7Copy: (
    <>
      信頼性は、正常に動いたときではなく、失敗したときの挙動で決まります。ここでは障害は例外ではなく、
      記録・再試行・復旧できる通常のフローです。
    </>
  ),

  s8Eyebrow: "約束より、根拠を",
  s8Title: "継続的に検証していること",
  s8Sub: (
    <>
      「十分にテストしています」と主張するのではなく、何を検証しているかを公開します。これらは公開
      CI で継続的に走り、カバレッジの数字だけでなく、障害・競合・公開後のパッケージ利用経路まで検証
      します。
    </>
  ),
  s8Items: [
    "ユニットテスト",
    "PostgreSQL 統合テスト (12 / 16 / 17)",
    "障害経路テスト",
    "並行性テスト",
    "性能テスト",
    "パッケージ export 検証",
    "ESM / CJS 検証",
    "公開 API 互換チェック",
    "依存監査 (dependency audit)",
    "ミューテーションテスト",
  ],
  s8Note: (
    <>
      狙いはテスト数やカバレッジの数字ではなく、何種類の失敗や境界条件を検証しているかを見せることです。
      CI の実行、テストスイート、セキュリティ方針は自分で確認できます。
    </>
  ),

  s9Eyebrow: "現在地",
  s9Title: "現状と限界を、正直に",
  s9Limits: [
    "pre-release（0.x）— 1.0 までに API が変わる可能性があります",
    "大規模な本番導入実績を持つ成熟プロジェクトではありません",
    "第三者によるセキュリティ監査はまだ受けていません",
    "SLA や商用サポートを提供するサービスではありません",
    "外部の利用者や導入事例はこれから増やしていく段階です",
  ],
  s9Then: (
    <>
      だからこそ、Observe mode・撤去可能な構成・安全なデフォルト・公開されたテストとセキュリティ
      モデルを用意しています。現在不足している実績による信頼を、設計・検証内容・透明性で補うことを
      目指しています — いまは「根拠による信頼」、将来は「根拠と実績による信頼」へ。
    </>
  ),

  s10Eyebrow: "責任の境界",
  s10Title: "CommitCourier が担当する範囲と、しない範囲",
  s10Sub: (
    <>
      CommitCourier は Webhook
      に関するすべての障害をなくすものではありません。守れる範囲を広く見せる
      のではなく、責任の境界を明確にすることも安全性の一部だと考えています。
    </>
  ),
  s10OwnsTitle: "担当する範囲",
  s10OwnsList: [
    "業務トランザクションと Webhook イベント登録の整合性",
    "登録後の配信・追跡・再試行・復旧",
  ],
  s10YouTitle: "利用者側で必要なこと",
  s10YouList: [
    "受信側システム自体の可用性と業務ロジックのバグ",
    "受信側での exactly-once な副作用 / idempotency 実装",
    "PostgreSQL 自体の可用性・バックアップ・復旧",
    "イベント内容そのものの正しさとアプリの業務ロジック",
    "利用者側の鍵管理とアクセス制御",
    "外部サービス側で発生した障害の完全な復旧",
  ],

  s11Eyebrow: "フィードバック歓迎",
  s11Title: "CommitCourier を一緒に育てる",
  s11Body: (
    <>
      CommitCourier は現在 pre-release
      です。実際の導入フィードバック、設計レビュー、セキュリティ上の
      指摘、ドキュメントやアダプターへの貢献を歓迎しています。導入時に迷った点、足りない機能、分かり
      にくい説明、小さな疑問も GitHub から共有できます。セキュリティ上の問題は、公開 Issue ではなく
      SECURITY.md に記載の非公開窓口へお願いします。
    </>
  ),
  s11Flow: [
    "課題を公開する",
    "判断理由を書く",
    "対応する",
    "テストを追加する",
    "結果を残して閉じる",
  ],

  ctaTitle: "まずは、安全に評価することから",
  ctaSub: (
    <>
      最初から信頼しなくて大丈夫です。小さく入れて、送らず確認し、納得してから有効化できます。違うと
      感じたら、専用部分だけを外して元の構成へ戻せます。
    </>
  ),
  ctaPath: [
    "Webhook の問題を知る",
    "CommitCourier の設計を確認する",
    "ライブデモを見る",
    "Observe mode で送らず試す（何も送らない）",
    "導入コードを見る",
    "GitHub / npm",
  ],

  bWhy: "Webhook の課題",
  bDemo: "ライブデモ",
  bSecurity: "セキュリティ方針 ↗",
  bTests: "テスト ↗",
  bActions: "CI 実行 ↗",
  bIssue: "Issue を開く ↗",
  bReportSec: "脆弱性を報告 ↗",
  bContributing: "コントリビューションガイド ↗",
};

const copy: Record<Locale, SafeAdoptionCopy> = { en, ja };

/** 外部リンク用ボタン（新規タブ・rel 付き）。 */
function ExtBtn({ href, label }: { href: string; label: string }) {
  return (
    <a className="btn ghost" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

/**
 * 「安心して試すための設計 / Built for Safe Adoption」ページ。
 * 機能の誇張ではなく、設計判断・検証内容・現在地・保証しない範囲を正直に示し、
 * 「小さく入れて・送らず確認し・合わなければ戻せる」評価導線を伝える。
 */
export function SafeAdoption() {
  const t = useCopy(copy);
  const parts = [
    { id: "sa-evaluate", label: t.partEvaluate },
    { id: "sa-trust", label: t.partTrust },
    { id: "sa-limits", label: t.partLimits },
  ];
  return (
    <div className="container">
      {/* ヒーロー */}
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 32 }}>
        {t.title}
      </h2>
      <p className="sub" style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
        {t.tagline}
      </p>
      <p className="sub">{t.lead}</p>
      <div className="cta" style={{ justifyContent: "flex-start", marginTop: 6 }}>
        <a className="btn primary" href="#/integrate">
          {t.ctaPrimary}
        </a>
        <a className="btn" href="#/demo">
          {t.ctaDemo}
        </a>
      </div>
      <PageNav navLabel={t.navLabel} parts={parts} />

      {/* ヒーロー直下の3カード */}
      <div style={{ height: 22 }} />
      <div className="grid cols-3">
        {t.cards3.map(([title, desc]) => (
          <div className="card" key={title}>
            <b>{title}</b>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* 設計思想の5点 — 各ピルは対応する下流セクションへのジャンプリンク */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 8 }}>
          {PRINCIPLES.map(([label, target]) => (
            <button
              key={label}
              className="pill delivered"
              onClick={() => jumpTo(target)}
              title={`${label} →`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Part 1 — 小さく安全に試す ===== */}
      <PartHeader id="sa-evaluate" n={1} label={t.partEvaluate} />

      {/* §1 不安を認める */}
      <div className="eyebrow">{t.s1Eyebrow}</div>
      <h2 className="section">{t.s1Title}</h2>
      <p className="sub">{t.s1Body}</p>

      {/* §2 導入判断を可逆にする */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.s2Eyebrow}</div>
      <h2 className="section">{t.s2Title}</h2>
      <p className="sub">{t.s2Sub}</p>
      <div className="card highlight">
        <Flow steps={t.s2Flow} />
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.s2Key}
      </div>

      {/* §3 既存構成へ小さく追加 */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.s3Eyebrow}</div>
      <h2 className="section">{t.s3Title}</h2>
      <p className="sub">{t.s3Sub}</p>
      <div className="card">
        <ul className="muted" style={{ margin: 0 }}>
          {t.s3List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* §4 Observe mode */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.s4Eyebrow}</div>
      <h2 className="section">{t.s4Title}</h2>
      <p className="sub">{t.s4Sub}</p>
      <div className="grid cols-2">
        <div className="card">
          <Flow steps={t.s4Flow} />
        </div>
        <div className="card">
          <CodeBlock code={OBSERVE_CODE} />
        </div>
      </div>
      <div style={{ height: 14 }} />
      <div className="card">
        <b className="muted">{t.s4ConfirmTitle}</b>
        <ul className="muted" style={{ margin: "8px 0 0" }}>
          {t.s4Confirm.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.s4Copy}
      </div>

      {/* §5 合わなければ外せる */}
      <div style={{ height: 36 }} />
      <div className="eyebrow">{t.s5Eyebrow}</div>
      <h2 className="section">{t.s5Title}</h2>
      <p className="sub">{t.s5Sub}</p>
      <div className="grid cols-2">
        <div className="card">
          <b>{t.s5AddTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.s5AddList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b>{t.s5RemoveTitle}</b>
          <Flow steps={t.s5RemoveFlow} />
        </div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.s5Key}
      </div>

      {/* ===== Part 2 — なぜ信頼できるか ===== */}
      <PartHeader id="sa-trust" n={2} label={t.partTrust} />

      {/* §6 Security by default */}
      <div id="sa-security" className="eyebrow">
        {t.s6Eyebrow}
      </div>
      <h2 className="section">{t.s6Title}</h2>
      <p className="sub">{t.s6Sub}</p>
      <div className="grid cols-3">
        {t.s6Cards.map(([title, desc]) => (
          <div className="card" key={title}>
            <b>{title}</b>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
      <div className="cta" style={{ justifyContent: "flex-start", marginTop: 14 }}>
        <ExtBtn href={SECURITY} label={t.bSecurity} />
      </div>

      {/* §7 失敗時を設計する */}
      <div style={{ height: 36 }} />
      <div id="sa-failure" className="eyebrow">
        {t.s7Eyebrow}
      </div>
      <h2 className="section">{t.s7Title}</h2>
      <p className="sub">{t.s7Sub}</p>
      <div className="grid cols-3">
        {t.s7Cards.map(([title, desc]) => (
          <div className="card" key={title}>
            <b>{title}</b>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.s7Copy}
      </div>
      <div className="cta" style={{ justifyContent: "flex-start", marginTop: 14 }}>
        <a className="btn ghost" href="#/demo">
          {t.bDemo} →
        </a>
      </div>

      {/* §8 品質をどう確認しているか */}
      <div style={{ height: 36 }} />
      <div id="sa-evidence" className="eyebrow">
        {t.s8Eyebrow}
      </div>
      <h2 className="section">{t.s8Title}</h2>
      <p className="sub">{t.s8Sub}</p>
      <div className="card">
        <ul style={{ margin: 0, listStyle: "none", padding: 0 }}>
          {t.s8Items.map((item) => (
            <li key={item} className="muted" style={{ padding: "3px 0" }}>
              <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span> {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {t.s8Note}
      </p>
      <div className="cta" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <ExtBtn href={ACTIONS} label={t.bActions} />
        <ExtBtn href={TESTS} label={t.bTests} />
        <ExtBtn href={SECURITY} label={t.bSecurity} />
      </div>

      {/* ===== Part 3 — 正直な範囲 ===== */}
      <PartHeader id="sa-limits" n={3} label={t.partLimits} />

      {/* §9 現在地と限界 */}
      <div className="eyebrow">{t.s9Eyebrow}</div>
      <h2 className="section">{t.s9Title}</h2>
      <div className="callout">
        <ul className="muted" style={{ margin: 0 }}>
          {t.s9Limits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="muted" style={{ margin: "12px 0 0" }}>
          {t.s9Then}
        </p>
      </div>

      {/* §10 保証しない範囲 */}
      <div style={{ height: 36 }} />
      <div id="sa-boundaries" className="eyebrow">
        {t.s10Eyebrow}
      </div>
      <h2 className="section">{t.s10Title}</h2>
      <p className="sub">{t.s10Sub}</p>
      <div className="grid cols-2">
        <div className="card">
          <b style={{ color: "var(--green)" }}>{t.s10OwnsTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.s10OwnsList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b style={{ color: "var(--amber)" }}>{t.s10YouTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.s10YouList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* §11 協力歓迎 */}
      <div style={{ height: 36 }} />
      <div id="sa-feedback" className="card" style={{ scrollMarginTop: 80 }}>
        <div className="eyebrow">{t.s11Eyebrow}</div>
        <h2 className="section" style={{ marginTop: 0 }}>
          {t.s11Title}
        </h2>
        <p className="sub">{t.s11Body}</p>
        <div className="grid cols-2" style={{ alignItems: "center" }}>
          <Flow steps={t.s11Flow} />
          <div className="cta" style={{ justifyContent: "flex-start" }}>
            <ExtBtn href={ISSUES} label={t.bIssue} />
            <ExtBtn href={CONTRIBUTING} label={t.bContributing} />
            <ExtBtn href={SECURITY} label={t.bReportSec} />
          </div>
        </div>
      </div>

      {/* §12 末尾 CTA */}
      <div style={{ height: 40 }} />
      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="section">{t.ctaTitle}</h2>
        <p className="sub">{t.ctaSub}</p>
        <div className="cta">
          <a className="btn primary" href="#/integrate">
            {t.ctaPrimary}
          </a>
          <a className="btn" href="#/demo">
            {t.ctaDemo}
          </a>
          <a className="btn ghost" href="#/why">
            {t.bWhy}
          </a>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <Flow steps={t.ctaPath} />
        </div>
        <div className="cta" style={{ marginTop: 14 }}>
          <ExtBtn href={SECURITY} label={t.bSecurity} />
          <ExtBtn href={TESTS} label={t.bTests} />
          <ExtBtn href={REPO} label="GitHub ↗" />
          <ExtBtn href={NPM} label="npm ↗" />
        </div>
      </div>
    </div>
  );
}
