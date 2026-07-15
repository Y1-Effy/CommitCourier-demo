# CLAUDE.md

このリポジトリで作業するときの指針。詳細は各ファイルのヘッダーコメントが正。

## このプロジェクトは何か

npm ライブラリ **CommitCourier**（トランザクショナルなアウトバウンド Webhook 配信）の
宣伝・実演サイト。モックではなく、ライブラリを npm から入れて**実際に動かしている**消費者側アプリ。

- ライブラリ本体はここに vendor していない。`commitcourier@^0.4.0` を npm から install して使う
  （バージョンの正は `package.json`）。
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
                       + web/dist の配信（ルート表 → 事前レンダリング済み HTML、301 正規化、404、compression）
server/receiver.ts  ← 自前の Webhook 受信側。署名検証し、ok/fail/slow を切替えて retry/DLQ/timeout を誘発
server/routes.ts    ← デモ API（/api/*）。enqueue はトランザクション内、abuse guard 付き
server/sse.ts       ← Server-Sent-Events のクライアント集合と broadcast
server/metrics.ts   ← demo_metrics テーブルの永続カウンタ（prune を生き延びる実績値）
server/config.ts    ← 環境変数の読み込みと needsSsl 判定
server/migrate.ts   ← store.migrate() + デモ専用テーブル（demo_orders / demo_metrics / demo_heartbeat）

web/routes.ts       ← ルート表（URL 集合の単一の真実）。純データ・import ゼロ。
                       ★ server/index.ts がこれを import する = server → web の唯一の依存エッジ
web/seo.ts          ← ページ別 title/description/OG + ORIGIN。canonical と sitemap の元
web/seo/jsonld.tsx  ← 構造化データ。react-dom/server を使うので prerender 専用（client から import 禁止）
web/entry-server.tsx← 事前レンダリングのエントリ。ビルド時のみ（本番実行時には読まれない）
web/lib/router.tsx  ← 自前 History ルータ + document レベルのクリック傍受
web/lib/head.ts     ← クライアント遷移時の <head> 同期（applyHead）
web/                ← Vite + React フロント。ビルドで web/dist（ブラウザ用 + 各ルートの静的 HTML +
                       404.html + sitemap.xml）と web/dist-ssr（prerender 用、生成物）を出す

scripts/prerender.mjs   ← dist-ssr を import し各ルートを静的 HTML 化 + sitemap 生成（build の3段目）
scripts/check-no-cjk.mjs← lint:lang。server/ の CJK を検出
scripts/ensure-docker.mjs← db:up / db:reset の前段。Docker Desktop を自動起動
scripts/make-og.mjs     ← og.svg → og.png(1200x630) を生成。npm script 無し、手動実行
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
- `npm run build` — **3段構成**。順序が不変条件:
  1. `build:client`（`vite build`）— ブラウザ用バンドルを web/dist へ。**web/dist を空にして
     `web/public/*` をコピーする**。
  2. `build:ssr`（`vite build --ssr entry-server.tsx`）— 事前レンダリング用バンドルを web/dist-ssr へ。
     エントリは **root（= `web/`）相対**で書く。`web/entry-server.tsx` と書くと `web/web/...` を探す。
     CLI で渡しているのは、値なしの `--ssr` が `build.ssr` を `true` で上書きしてしまうため。
  3. `prerender`（`scripts/prerender.mjs`）— dist-ssr を import し、web/dist に各ルートの HTML +
     404.html + sitemap.xml を**追加**する。1 の前に走らせると出力が消える。
     ビルド時に devDependencies が要る（`react-dom/server`）。本番実行時には不要。
- `npm start` — 本番: 1プロセスで API + dispatcher + web/dist 配信。
- `npm run migrate` — DDL 適用。`store.migrate()` は冪等。
- `npm run db:up` / `db:down` / `db:reset` / `db:logs` — `docker-compose.yml` の Postgres を操作。
  `db:reset` は volume ごと破棄して再作成 + migrate。`.env.example` の既定 `DATABASE_URL` と一致。
  `db:up` / `db:reset` は前段で `scripts/ensure-docker.mjs` を実行し、Docker engine が未起動なら
  Docker Desktop を自動起動して準備完了まで待つ（Windows 前提の起動パス探索。他 OS は best-effort）。
- **`node scripts/make-og.mjs`** — npm script は無い。`web/public/og.svg` を編集したら手動で実行して
  `og.png`（1200x630）を再生成し、生成物ごとコミットする（`@resvg/resvg-js` は devDependency）。
- **VSCode の F5**（"Debug server" / "Debug full stack"）は `preLaunchTask: db-ready`
  （`.vscode/tasks.json`）で DB 起動 → migrate を自動実行してからサーバを起動する。Docker 必須。
  managed Postgres を使うなら `DATABASE_URL` を向けて `db:*` をスキップ。

## 品質チェック（lint / test / CI）

- `npm run check` で一括実行: `typecheck`（`tsc --noEmit`）→ `lint`（ESLint）→
  `lint:lang`（CJK 検出）→ `format:check`（Prettier）→ `test`（Vitest）。**コミット/PR 前に走らせる**。
- 個別: `npm run lint` / `lint:fix`、`npm run format`（整形書き込み）、`npm test` / `test:watch`。
- **ESLint** は flat config（`eslint.config.mjs`）。typescript-eslint + react-hooks + react-refresh。
  warning は許容（CI も warning では落とさない）。`_` 始まりの未使用引数は無視設定。
- **Prettier** は `printWidth: 100`。`.prettierignore` の対象外は `web/dist`・**`web/dist-ssr`**・
  `node_modules`・`package-lock.json` の4つ（`dist-ssr` が別行で要る理由は下の「重要な制約」を参照）。
- **lint:lang**（`scripts/check-no-cjk.mjs`）は **server/** のみ** CJK を検出して fail。コードは英語の
  ポリシーを機械強制する。**web/ は対象外**（i18n の日本語 UI コピーが正当に存在するため）。
  server 配下の .ts に日本語コメント等を書かないこと。
- **テストは Vitest**（既定は jsdom 環境）。**コロケーションではなく `test/` 配下にソース構成をミラー**
  して置く（`vitest.config.ts` の `include: ["test/**/*.{test,spec}.{ts,tsx}"]` で固定）。現在11ファイル:
  - `test/server/config.test.ts`・`sse.test.ts`・`receiver.test.ts` — DB 不要のサーバ単体。receiver は
    `express` を `listen(0)` + グローバル `fetch`、`commitcourier` の `sign` で署名生成。
  - `test/web/routes.test.ts` — ルート表の往復・末尾スラッシュ・非ルート判定。
  - `test/web/seo.test.ts` — title/description の長さと**ロケール内での一意性**（重複 title は
    事前レンダリング SEO の典型的失敗）。型が保証できない品質を見る。
  - `test/web/lib/router.test.tsx` — クリック傍受の全分岐（修飾キー・中クリック・`target=_blank`・
    別オリジン・`#anchor`・非ルート）。新規コードで最もリスクが高い。
  - `test/web/entry-server.test.tsx` — **先頭の `// @vitest-environment node` が必須**。
    `vitest.config.ts` が全体に `environment: "jsdom"` を設定しているため、これが無いと `window` が
    定義された状態で走り、**実ビルドが `window is not defined` で落ちるのにテストは通ってしまう**。
    node 環境を強制して初めて SSR リグレッション検出器になる。
  - `test/web/i18n/*.test.tsx`・`test/web/components/*.test.tsx`・`test/web/pages/*.test.tsx`
    （testing-library）。
    ソースからの相対 import になる（例: `../../server/config`、`../../../web/i18n`）。`tsconfig.json` の
    `include` に `test` を入れて型検査対象にしている。`vitest.config.ts` が `DATABASE_URL` のダミー値を
    注入し、`server/config.ts` の import 時 throw を回避。`setupFiles: ["./vitest.setup.ts"]` が
    `@testing-library/jest-dom/vitest` を読む（node 環境のファイルにも適用されるが無害）。
    `test/server/*` は英語、`test/web/*` の日本語アサーション（`配信済み` 等）は
    `lint:lang`（server/ のみ対象）の対象外で正当。
    **テストはソースに対して走る**（CI が `npm run check` を `npm run build` より先に実行するので、
    `web/dist/*` を読むテストはクリーンチェックアウトで落ちる）。
- **CI**: `.github/workflows/ci.yml` が push/PR で `npm run check` と `npm run build` を実行
  （Node 22.19、`npm ci`）。`.github/workflows/` にはもう1つ **`deploy.yml`**（本番デプロイ）がある
  → 「デプロイ」節を参照。

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
- **`compression()` は必ず `/api` ルータより後にマウントする**（`server/index.ts`）。`/api/events` は
  SSE で `res.write()` しか呼ばず、compression が待つ `res.flush()` を呼ばない。グローバルに挿すと
  **ライブフィードがエラーも出さずに沈黙する**。`/api` を先に登録しておけば構造的に到達しない。
  上の `express.text()` → `express.json()` と同じクラスの、順序依存の地雷。
- **`web/dist-ssr` は3つの ignore に書く必要がある**（`.gitignore` / `.prettierignore` /
  `eslint.config.mjs`）。gitignore 意味論では `web/dist` は `web/dist-ssr` に前方一致**しない**ため、
  書き忘れると `npm run check` が生成物を lint / format しようとして落ちる。
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

- **`web/routes.ts` がルートの単一の真実**。純データ・英語のみ・import ゼロなので、`server/index.ts`
  からも安全に import できる（React も ja コピーも server の依存グラフに入らない）。**ここに行を足すと、
  en/ja のナビラベルと en/ja の SEO エントリが揃うまで `tsc` が落ちる。**
- ルーティングは **History API ベース**（`web/lib/router.tsx`、ライブラリ無し）。`RouterProvider` の
  `initialPath` は必須 prop で、これが事前レンダリング時の初期ルート注入を兼ねる（レンダリング中に
  ブラウザグローバルへ触らないことの保証）。内部遷移は **document レベルのクリック傍受**で捌くので、
  コピー中は素の `<a href="/why">` を書けばよい（`#/why` はもう使わない）。
- ページ: Landing / WhyWebhooks / SafeAdoption / Integrate / LiveDemo / Playground / Stats / Faq。
  **各ページは実 URL を持ち、ビルド時に静的 HTML へ事前レンダリングされる**（`web/entry-server.tsx`）。
  ページ別の title/description/OG/canonical は `web/seo.ts`、JSON-LD は `web/seo/jsonld.tsx`。
- **`vite preview` で配信を検証しないこと。`npm start`（Express）だけが本物。** preview は
  `htmlFallbackMiddleware` が `pathname + ".html"` を先に試すので `/why` は `why.html` を**正しく**
  返す — そこは動く。動かないのはその周りで、実測すると:
  `/why/` は `.html` が無いので SPA フォールバックに落ち、**200 で home のページが出る**（本番は 301）。
  `/why.html`・`/index.html` も 200 のまま重複 URL として残る（本番は 301）。`/nope` は 200 + home
  = soft 404（本番は 404 + 404.html）。`/api` と SSE は無い。assets は `no-cache`（本番は 1年 immutable）。
  つまり preview で正常に見えても、301・404・キャッシュ方針・API は一切検証できていない。
- 見出しは**ルートごとに `<h1>` ちょうど1つ**（`h1.page-title`。Landing のみ hero の h1）。
  カード/パネルの見出しはページ直下の兄弟セクションなので `h2` のまま（h3 にすると h1→h3 の飛び越しになる）。
- ライブ更新は SSE（`web/lib/api.ts` の `useLiveSnapshot` / `useEventStream`）。
- **Playground は `commitcourier/core` をブラウザに直 import** して実行（依存ゼロ・Web標準のみ）。
  sign/verify, evaluateIp, backoffMs, AES-GCM cipher, 状態機械を client-side で動かす。
- `CodeBlock.tsx` は自前の最小ハイライタ（依存無し）。
- スタイルは `web/styles.css` の CSS 変数 + クラス（`pill`/`card`/`btn`/`grid` 等）。UI を足すときは既存クラスを流用。

## 国際化（i18n）— 英語/日本語

外部ライブラリは使わず、`web/i18n/index.tsx` の自前 Context 実装。

> **事前レンダリングは英語のみ**で、クライアントは `hydrateRoot` ではなく **`createRoot`** を使う。
> ロケールはクライアント検出なので、hydrate すると ja 訪問者では毎回 hydration mismatch が起き、
> React はどのみちサーバのマークアップを捨てる。**代償として ja 訪問者には一瞬の英語フラッシュが出る**が、
> これは `/ja/*` の URL 木を持たないことの意図的な割り切り。`hydrateRoot` に「修正」しないこと。
> `document.title` はもう `LocaleProvider` の所有ではない（ルート×ロケールの関数なので
> `web/lib/head.ts` の `applyHead` が持つ）。

- 入れ子は **`LocaleProvider` → `RouterProvider` → `App`**（`web/main.tsx`・`web/entry-server.tsx` とも
  同順）。`App` が `useRouteId()` と `useLocale()` の両方を読んで `applyHead` に渡すので、この順序は
  load-bearing。
- `LocaleProvider` が現在ロケールを保持。初期値は
  localStorage(`cc-locale`) → 無ければ `navigator.language`（`ja` なら日本語）。事前レンダリング時は
  `initialLocale="en"` で固定（`detectInitial` にも `typeof window === "undefined"` ガードあり）。切替で
  localStorage 保存と `<html lang>` を更新（`document.title` は上記のとおり `applyHead` の担当で、
  ここでは触らない）。トグルは `web/components/LocaleToggle.tsx`。
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
- 新しいページを足したら（4箇所。**1 を足すと 2・3 が揃うまで `tsc` が落ちる**ので取りこぼしは起きない）:
  1. `web/routes.ts` の `ROUTES` に行追加（id / path / file）
  2. `web/App.tsx` の `navCopy` に en/ja のラベル追加 + レンダー分岐（`{route === "..." && <Page />}`）
  3. `web/seo.ts` の `en` と `ja` 両方に title/description
  4. ページ側で辞書 `copy` を定義し `useCopy` で参照

## 環境変数

正は `server/config.ts`。**未設定で throw するのは `DATABASE_URL` だけ**（他は既定値で起動する）。

| Var                     | 用途                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL 接続文字列（非ローカルは TLS 自動 ON）。**必須**                   |
| `PUBLIC_BASE_URL`       | 自サイトの URL。`${PUBLIC_BASE_URL}/receiver` に配信。下記フォールバックあり  |
| `RENDER_EXTERNAL_URL`   | Render が注入。`PUBLIC_BASE_URL` 未設定時のフォールバック                     |
| `DEMO_WEBHOOK_SECRET`   | Standard Webhooks 署名鍵（`whsec_` + base64）。既定値がハードコードされている |
| `PORT`                  | サーバポート（既定 8787）                                                     |
| `NODE_ENV`              | `config.isProd` になるが**現状どこからも読まれていない**（下記）              |
| `HEARTBEAT_INTERVAL_MS` | system heartbeat の間隔 ms（既定 60000。`0` で無効）                          |
| `HEARTBEAT_FLAKY_EVERY` | N 回に1回 flaky（retry→DLQ 誘発）。**既定 0（OFF）**。chaos デモ時のみ ON     |

- `publicBaseUrl` の解決は `PUBLIC_BASE_URL` → `RENDER_EXTERNAL_URL` → **`http://localhost:8787`**。
  この最後の既定値が曲者で、`localhost` は `::1` に解決され SSRF ガードに弾かれる（上の「制約」参照）。
  Render 以外のホストでは `PUBLIC_BASE_URL` を明示しないと配信ループが壊れる。
- **`NODE_ENV` はこのアプリの挙動を変えない。** `config.isProd` は定義されているが参照ゼロで、
  静的配信の分岐は `NODE_ENV` ではなく `existsSync(webDist)`。ただし **npm の挙動は変える** —
  `NODE_ENV=production` だと `npm install` が devDependencies を省くので、ビルド前に設定してはいけない
  （「デプロイ」節参照）。

## デプロイ

dispatcher は長寿命ループなのでプロセスを生かし続けるホストが要る。サーバレスなら
`relay.dispatchOnce` を cron で回す方式に切替える。
ビルド: `npm install && npm run build` / 起動: `npm run migrate && npm start`。

**実際の本番は VPS**（`https://commitcourier-demo.xvps.jp`。origin の正は `web/seo.ts` の `ORIGIN`）。

- `.github/workflows/deploy.yml` が **`main` への push で自動デプロイ**する。VPS に SSH して
  `/home/deploy/deploy-commitcourier.sh` を実行するだけで、**このスクリプトはリポジトリ外**
  （＝ 本番で何が走るかはここからは読めない・レビューできない）。secrets: `VPS_HOST` / `VPS_USER` /
  `VPS_SSH_KEY`。main に push する = 本番に出る、という点に注意。
- nginx / TLS も VPS 側にあり**リポジトリ外**。compression・キャッシュ・404 の最終的な見え方は
  デプロイ後に本番で実測するしかない（現状 nginx は HTTP/1.1、`gzip_types` 既定のため JS/CSS を
  圧縮しない → Express 側の `compression()` で担保している）。
- `render.yaml`（Render Blueprint、`healthCheckPath: /api/stats`）も置いてあるが、こちらは
  実運用していない副経路。
- **`NODE_ENV=production` を `npm install` の前に設定しないこと。** npm が `omit=dev` になり
  devDependencies（vite・react-dom 等）が入らず、ビルドが落ちる。実測: `NODE_ENV=production
npm config get omit` → `dev`。回避は `npm install --include=dev`。**CI は `npm ci` かつ
  `NODE_ENV` 未設定なので、この不整合は構造的に CI からは見えない。**
