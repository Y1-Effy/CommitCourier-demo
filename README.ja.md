# CommitCourier — ライブデモ & 統合ショーケース

[![npm](https://img.shields.io/npm/v/commitcourier.svg)](https://www.npmjs.com/package/commitcourier)
![node](https://img.shields.io/badge/node-%3E%3D22.19-brightgreen)
![postgres](https://img.shields.io/badge/postgres-12%2B-336791)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
<!-- CI badge: replace the slug with this demo repo's GitHub path once it has a remote -->

[![CI](https://img.shields.io/github/actions/workflow/status/Y1-Effy/commitcourier-demo/ci.yml?label=CI)](https://github.com/Y1-Effy/commitcourier-demo/actions)

**English: [README.md](./README.md)**

[CommitCourier](https://www.npmjs.com/package/commitcourier) を**実際に動かしている**小さなデプロイ可能サイトです。検討中の人が、本物の統合コードを見て、動作をその場で確認できます。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Y1-Effy/commitcourier-demo)

- **Landing** — dual-write 問題と、DB トランザクションに相乗りして解決する仕組み。
- **Integrate** — 統合のちょうど 5 ステップ（このサイトを動かしているコードそのもの）。
- **Live demo** — 実トランザクション内で enqueue し、配信 / retry / DLQ / replay が SSE でストリーム流入する様子を観察。flaky な receiver を切り替え、SSRF ガードが metadata-IP 宛をブロックするのを確認。
- **Playground** — `commitcourier/core`（依存ゼロ・Web 標準のみ）を**ブラウザ内**で実行: sign/verify、SSRF 評価、backoff、AES-GCM cipher、状態機械。
- **Track record** — ライブ DB の永続的な実績カウンタ。

> これは CommitCourier の_消費者_側です — `commitcourier` を npm からそのまま install しています。ライブラリ本体はここに vendor していません。

## アーキテクチャ

統合された Node 1 プロセス（自分のバックエンドに CommitCourier を組み込んだ姿を再現）:

```
server/courier.ts   ← 統合のすべて: postgresStore → createRelay
server/index.ts     ← Express + プロセス内 dispatcher + 静的フロント配信 + graceful shutdown
server/receiver.ts  ← 自前の Webhook receiver（署名検証・200/500/timeout を切替可能）
server/routes.ts    ← デモ API（+ abuse guard: write rate-limit、固定の配信先）
server/sse.ts       ← Server-Sent-Events のライブフィード
server/metrics.ts   ← 永続的な実績カウンタ
web/                ← Vite + React フロント（web/dist にビルドし Node アプリが配信）
```

dispatcher は**このサイト自身の** receiver にのみ配信します — 訪問者の入力で配信 URL を選ばせないため、公開デモを SSRF/スパムの踏み台に変えられません。write エンドポイントは rate-limit 済みで、terminal 行は自動 prune されます。

## 必要要件

- **Node.js ≥ 22.19**（CommitCourier の下限）。
- **PostgreSQL 12+** — managed インスタンス（[Neon](https://neon.tech)・Supabase・Railway）でもローカルでも可。

## ローカルで動かす

```bash
npm install
cp .env.example .env          # 既定値は下記 Docker DB と一致 — 編集不要
npm run db:up                 # ローカル Postgres を Docker で起動（healthy まで待機）
npm run migrate               # CommitCourier + デモ用テーブルを作成（初回のみ）
npm run dev                   # Vite を :5173 で起動（API を :8787 のサーバへプロキシ）
```

http://localhost:5173 を開きます。フロントは `/api` と `/receiver` を `:8787` の Node アプリへプロキシします。

> ローカルでは `PUBLIC_BASE_URL=http://127.0.0.1:8787` を使ってください（`localhost` は先に IPv6 `::1` に解決され、SSRF ガードに弾かれます）。receiver host は `PUBLIC_BASE_URL` から自動で allowlist されます。

### Docker での Database

`docker-compose.yml` がローカル Postgres を定義しており、その認証情報は `.env.example` の既定 `DATABASE_URL` と一致します。追加設定は不要です。

- `npm run db:up` — 起動（healthy までブロック）· `npm run db:down` — 停止
- `npm run db:reset` — volume を破棄して再作成し再 migrate · `npm run db:logs` — ログを tail

**VSCode** なら **F5**（"Debug server" / "Debug full stack"）を押すだけ: `preLaunchTask` がサーバ起動前に DB を立ち上げ `migrate` を自動実行します。Docker Desktop が起動している必要があります。managed Postgres（Neon/Supabase）を使うなら `DATABASE_URL` をそこへ向け、`db:*` スクリプトはスキップしてください。

## 本番向けにビルド & 起動

```bash
npm run build                 # フロントを web/dist にバンドル
npm start                     # 1 プロセス: API + dispatcher + web/dist を $PORT で配信
```

## デプロイ（長寿命ホスト）

CommitCourier の dispatcher は長寿命ループなので、プロセスを生かし続けるホストへデプロイします — **Render / Railway / Fly.io**（サーバレス関数プラットフォームは不可。その場合は `relay.dispatchOnce` を cron で回す方式に切替えます）。

**ワンクリック（Render）:** `render.yaml` は web サービス + managed Postgres をプロビジョニングする Blueprint です。上の **Deploy to Render** ボタンをクリック（repo slug は自分の fork に置換）。`PUBLIC_BASE_URL` は Render の `RENDER_EXTERNAL_URL` から自動導出されるので、設定が必要なのは `DEMO_WEBHOOK_SECRET` だけです。

手動（任意のホスト）:

1. Postgres をプロビジョニング（Neon/Supabase の無料枠で十分）。
2. 環境変数を設定: `DATABASE_URL`・`PUBLIC_BASE_URL`（公開 https URL）・`DEMO_WEBHOOK_SECRET`・`NODE_ENV=production`。
3. Build コマンド: `npm install && npm run build`。Start コマンド: `npm run migrate && npm start`。

> **Render 以外の場合:** `RENDER_EXTERNAL_URL` は Render 専用なので、VPS など他ホストでは `PUBLIC_BASE_URL`（例: `https://commitcourier-demo.xvps.jp`）を自分で設定する必要があります。未設定だと配信先が `http://localhost:8787` にフォールバックし、dispatcher が自分の receiver に SSRF ガード越しで到達できず、ライブデモのループが壊れます。

> このデモの本番 origin `https://commitcourier-demo.xvps.jp` は3箇所にハードコードしています: `web/seo.ts` の `ORIGIN`（全ページの canonical・`og:url`・生成される `sitemap.xml` の元）、`web/index.html` の `og:image`/`twitter:image` とホームのタグ、`web/public/robots.txt` の `Sitemap:` 行。`PUBLIC_BASE_URL` からは生成されません（その値はビルド後の HTML には届かない）。フォークして別ホストにデプロイする場合はこの3ファイルの origin を、および上のバッジ/Deploy slug の `Y1-Effy/commitcourier-demo` を自分のものに置換してください。`web/public/og.svg` を編集したら `node scripts/make-og.mjs` でソーシャルカードを再生成します。

本番では `PUBLIC_BASE_URL` が公開ホストなので、SSRF ガードを通常通り通過し、特別な allowlist は不要です。

## 環境変数

| Var                     | 用途                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL 接続文字列（非ローカルホストは TLS 自動 ON）。                                                                                                            |
| `PUBLIC_BASE_URL`       | 自サイトの URL。Webhook は `${PUBLIC_BASE_URL}/receiver` に配信。                                                                                                    |
| `DEMO_WEBHOOK_SECRET`   | Standard Webhooks 署名鍵（`whsec_` + base64）。                                                                                                                      |
| `PORT`                  | サーバポート（既定 8787）。                                                                                                                                          |
| `HEARTBEAT_INTERVAL_MS` | system heartbeat の間隔 (ms、既定 60000。`0` で無効化)。                                                                                                             |
| `HEARTBEAT_FLAKY_EVERY` | フォールト注入: N 回に1回のビートを意図的に失敗（retry → DLQ）。既定 `0`（OFF）— 無人の heartbeat では注入失敗が「壊れている」と見えるため。chaos デモ時のみ有効化。 |

## ライセンス

MIT。CommitCourier 本体: https://github.com/Y1-Effy/CommitCourier
