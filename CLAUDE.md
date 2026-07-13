# CLAUDE.md

このリポジトリで作業するときの指針。詳細は各ファイルのヘッダーコメントが正。

## このプロジェクトは何か

npm ライブラリ **CommitCourier**（トランザクショナルなアウトバウンド Webhook 配信）の
宣伝・実演サイト。モックではなく、ライブラリを npm から入れて**実際に動かしている**消費者側アプリ。

- ライブラリ本体はここに vendor していない。`commitcourier@^0.3.0` を npm から install して使う。
- `server/courier.ts` が「統合のすべて」。それ以外（UI / SSE / metrics / abuse guard）はデモ用の足場。
- ライブラリ本体のリポジトリは https://github.com/Y1-Effy/CommitCourier （別物）。

## 言語ポリシー

- **コード・識別子・コミットメッセージは英語**。
- **チャット・プラン・報告・この種のドキュメント本文は日本語**。
- 既存ソースのコメントは英語で書かれている。コメントを足す/直すときも英語で揃える。

## Git

- **コミット等の git 操作で Claude の署名を入れない**。コミットメッセージや PR 本文に
  `Co-Authored-By: Claude ...` や `Generated with Claude Code` といった行を付けないこと。
- コミットメッセージは英語（言語ポリシー参照）。
- Claude 関連のローカルファイル（`.claude/` など）はコミットしない（`.gitignore` 済み）。

## アーキテクチャ（1プロセス構成）

本番では Node 1 プロセスがすべてを担う（自分のバックエンドに組み込んだ姿を再現）。

```
server/courier.ts   ← CommitCourier 統合の全体: postgresStore → buildRelay。pool/store もここで生成
server/index.ts     ← エントリ。dispatcher 起動 + Express + 自己 receiver + SSE snapshot + prune + graceful shutdown
server/receiver.ts  ← 自前の Webhook 受信側。署名検証し、ok/fail/slow を切替えて retry/DLQ/timeout を誘発
server/routes.ts    ← デモ API（/api/*）。enqueue はトランザクション内、abuse guard 付き
server/sse.ts       ← Server-Sent-Events のクライアント集合と broadcast
server/metrics.ts   ← demo_metrics テーブルの永続カウンタ（prune を生き延びる実績値）
server/config.ts    ← 環境変数の読み込みと needsSsl 判定
server/migrate.ts   ← store.migrate() + デモ専用テーブル（demo_orders / demo_metrics / demo_heartbeat）
web/                ← Vite + React フロント。本番は web/dist にビルドし Node が静的配信
```

データの流れ: `/api/enqueue` がトランザクション内で `relay.enqueue` →（COMMIT 時のみ）
dispatcher が背景配信 → `server/receiver.ts` が HTTP で受けて署名検証 → `DeliveryHooks` が
metrics 更新 & SSE broadcast → フロントが live 更新。

## 開発フロー

```bash
npm install
cp .env.example .env          # 既定値は docker-compose の DB と一致（編集不要）
npm run db:up                 # ローカル Postgres を Docker で起動（healthy 待ち）
npm run migrate               # スキーマ作成（初回のみ）
npm run dev                   # Vite :5173（/api と /receiver を :8787 にプロキシ）
```

- `npm run dev` — server（tsx watch）と web（vite）を concurrently で同時起動。
- `npm run build` — フロントを web/dist へバンドル。
- `npm start` — 本番: 1プロセスで API + dispatcher + web/dist 配信。
- `npm run migrate` — DDL 適用。`store.migrate()` は冪等。
- `npm run db:up` / `db:down` / `db:reset` / `db:logs` — `docker-compose.yml` の Postgres を操作。
  `db:reset` は volume ごと破棄して再作成 + migrate。`.env.example` の既定 `DATABASE_URL` と一致。
- **VSCode の F5**（"Debug server" / "Debug full stack"）は `preLaunchTask: db-ready`
  （`.vscode/tasks.json`）で DB 起動 → migrate を自動実行してからサーバを起動する。Docker 必須。
  managed Postgres を使うなら `DATABASE_URL` を向けて `db:*` をスキップ。

## 品質チェック（lint / test / CI）

- `npm run check` で一括実行: `typecheck`（`tsc --noEmit`）→ `lint`（ESLint）→
  `lint:lang`（CJK 検出）→ `format:check`（Prettier）→ `test`（Vitest）。**コミット/PR 前に走らせる**。
- 個別: `npm run lint` / `lint:fix`、`npm run format`（整形書き込み）、`npm test` / `test:watch`。
- **ESLint** は flat config（`eslint.config.mjs`）。typescript-eslint + react-hooks + react-refresh。
  warning は許容（CI も warning では落とさない）。`_` 始まりの未使用引数は無視設定。
- **Prettier** は `printWidth: 100`。`web/dist`・`package-lock.json` は対象外（`.prettierignore`）。
- **lint:lang**（`scripts/check-no-cjk.mjs`）は **server/** のみ** CJK を検出して fail。コードは英語の
  ポリシーを機械強制する。**web/ は対象外**（i18n の日本語 UI コピーが正当に存在するため）。
  server 配下の .ts に日本語コメント等を書かないこと。
- **テストは Vitest**（jsdom 環境）。**コロケーションではなく `test/` 配下にソース構成をミラー**して置く
  （`vitest.config.ts` の `include: ["test/**/*.{test,spec}.{ts,tsx}"]` で固定）。例:
  `test/server/config.test.ts`・`test/server/sse.test.ts`・`test/server/receiver.test.ts`（DB 不要の
  サーバ単体。receiver は `express` を `listen(0)` + グローバル `fetch`、`commitcourier` の `sign` で
  署名生成）、`test/web/i18n/*.test.tsx`・`test/web/components/*.test.tsx`（testing-library）。
  ソースからの相対 import になる（例: `../../server/config`、`../../../web/i18n`）。`tsconfig.json` の
  `include` に `test` を入れて型検査対象にしている。`vitest.config.ts` が `DATABASE_URL` のダミー値を
  注入し、`server/config.ts` の import 時 throw を回避。`test/server/*` は英語、`test/web/*` の日本語
  アサーション（`配信済み` 等）は `lint:lang`（server/ のみ対象）の対象外で正当。
- **CI**: `.github/workflows/ci.yml` が push/PR で `npm run check` と `npm run build` を実行（Node 22.19）。

## 重要な制約・落とし穴

- **Node ≥ 22.19** 必須（CommitCourier の下限）。**PostgreSQL 12+** 必須。
- **ローカルでは `PUBLIC_BASE_URL=http://127.0.0.1:8787`**。`localhost` は IPv6 `::1` に解決され
  SSRF ガードに弾かれる。receiver host は `PUBLIC_BASE_URL` から自動で allowlist される
  （`server/courier.ts` の `RECEIVER_HOST`）。
- **配信先は固定**（`config.publicBaseUrl}/receiver`）。訪問者の入力で配信 URL を選ばせない＝
  公開デモを SSRF/スパム踏み台にしない設計。新しい enqueue 経路を足すときもこの不変条件を守る。
- **書き込み系 API は rate-limit 済み**（`writeLimiter`: 60s / 40 回）。新しい write エンドポイントにも付ける。
- **SSRF ガードは ON のまま**（`ssrf.blockPrivateRanges: true`）。allowlist は自分の receiver host のみ。
  metadata IP `169.254.169.254` 等はブロックされる前提（SSRF デモがこれに依存）。
- **`unsafeAllowPlaintextSecrets: true` はデモ専用**。本番統合のサンプルとして見せるなら
  `cipher: createAesGcmCipher(key)` を使う形に直す。
- **receiver は raw body 必須**。署名は受信バイト列に対して計算するので、`/receiver` だけ
  `express.text()` を `express.json()` より**前**に適用している（`server/index.ts`）。順序を崩さない。
- **retry/delivery のチューニングはデモ向けに短い**（`baseMs: 1s`, `maxAttempts: 6`, `timeoutMs: 5s`）。
  retry/DLQ を秒単位で観測できるようにする意図。本番値とは別物。
- **`receiver.ts` の mode/recent と `sse.ts` の clients はプロセス内メモリ**（モジュールスコープ）。
  複数プロセス/再起動で共有・永続しない。デモなので意図通り。永続が要るのは demo_metrics のみ。
- 保持: terminal 行は 1 時間で `relay.prune`。永続実績は demo_metrics に別途カウント。
- **system heartbeat**（`server/index.ts` の `HEARTBEAT_EVENT_TYPE="system.heartbeat"`）は
  `server/index.ts` のタイマーが低頻度で自 receiver に `enqueueUnsafe` する内部生存確認。
  **demo_metrics には混ぜず `demo_heartbeat` に別計上**（DeliveryHooks が `eventType` で分岐）。
  flaky 分岐は receiver 側で **payload の `scenario` により決定**し、グローバル mode に非依存
  （訪問者の flaky 切替と衝突させない）。**flaky は既定 OFF（`HEARTBEAT_FLAKY_EVERY=0`）**：無人の
  heartbeat では注入失敗と実障害を区別できず「壊れている」と誤読されるため、公開デモは happy-path に
  徹する（retry→DLQ は原因が明白な対話デモで見せる）。`HEARTBEAT_INTERVAL_MS=0` で完全停止。
  UI は Landing の live インジケータ / Stats の専用セクション / LiveDemo のバッジ + hide トグルで明示区別。

## フロント構成

- ルーティングは hash ベース（`web/App.tsx` の `useHashRoute`、ライブラリ無し）。
- ページ: Landing / Integrate / LiveDemo / Playground / Stats。
- ライブ更新は SSE（`web/lib/api.ts` の `useLiveSnapshot` / `useEventStream`）。
- **Playground は `commitcourier/core` をブラウザに直 import** して実行（依存ゼロ・Web標準のみ）。
  sign/verify, evaluateIp, backoffMs, AES-GCM cipher, 状態機械を client-side で動かす。
- `CodeBlock.tsx` は自前の最小ハイライタ（依存無し）。
- スタイルは `web/styles.css` の CSS 変数 + クラス（`pill`/`card`/`btn`/`grid` 等）。UI を足すときは既存クラスを流用。

## 国際化（i18n）— 英語/日本語

外部ライブラリは使わず、`web/i18n/index.tsx` の自前 Context 実装。

- `LocaleProvider`（`web/main.tsx` で `<App/>` を包む）が現在ロケールを保持。初期値は
  localStorage(`cc-locale`) → 無ければ `navigator.language`（`ja` なら日本語）。切替で
  localStorage 保存・`<html lang>`・`document.title` を更新。トグルは `web/components/LocaleToggle.tsx`。
- **各ページに辞書をコロケーション**するのが基本パターン:
  ```tsx
  const en = {
    title: "...",
    lead: (
      <>
        ...<b>rich</b>...
      </>
    ),
    fn: (n) => `...${n}`,
  };
  const copy: Record<Locale, typeof en> = { en, ja: {/* 同形 */} };
  const t = useCopy(copy); // t.title / t.lead / t.fn(n)
  ```
  - 値は **文字列・JSX ノード・関数**のいずれも可。リッチテキスト（`<b>`/`<a>`/`<code>`/`<span class="kbd">`）は
    JSX フラグメントのまま書き、分割しない。動的補間は関数にする。
  - `Record<Locale, typeof en>` 型注釈により **日英のキー／シグネチャ不一致は `tsc` で検出**される
    （翻訳漏れ防止）。文言を足すときは必ず en/ja 両方に。
- **コードスニペット（`CodeBlock` に渡す `code`）は翻訳しない**。module 定数 / 各 Panel の `code` プロップは
  英語のまま。技術用語（Standard Webhooks, SSRF, DLQ, COMMIT/ROLLBACK, 関数名）も日本語文中で英語維持。
- ステータスラベルは複数ページで使うため `web/i18n` の `useStatusLabel()` に集約
  （旧 `status.replace("_"," ")` の置換）。
- 新しいページを足したら: 辞書 `copy` を定義し `useCopy` で参照、`web/App.tsx` の `navCopy` にラベル追加。

## 環境変数

| Var                     | 用途                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL 接続文字列（非ローカルは TLS 自動 ON）                         |
| `PUBLIC_BASE_URL`       | 自サイトの URL。`${PUBLIC_BASE_URL}/receiver` に配信                      |
| `DEMO_WEBHOOK_SECRET`   | Standard Webhooks 署名鍵（`whsec_` + base64）                             |
| `PORT`                  | サーバポート（既定 8787）                                                 |
| `NODE_ENV`              | `production` で `config.isProd`                                           |
| `HEARTBEAT_INTERVAL_MS` | system heartbeat の間隔 ms（既定 60000。`0` で無効）                      |
| `HEARTBEAT_FLAKY_EVERY` | N 回に1回 flaky（retry→DLQ 誘発）。**既定 0（OFF）**。chaos デモ時のみ ON |

## デプロイ

dispatcher は長寿命ループなのでプロセスを生かし続けるホスト（Render / Railway / Fly.io）。
サーバレスなら `relay.dispatchOnce` を cron で回す方式に切替える。
ビルド: `npm install && npm run build` / 起動: `npm run migrate && npm start`。
