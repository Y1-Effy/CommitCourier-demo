/**
 * 外部リンクの一元管理。GitHub / npm / SECURITY 等の URL をページやコンポーネントへ
 * 重複してハードコードせず、ここから import して再利用する。
 *
 * 掲載しているのは実在を確認済みの宛先のみ（リンク切れを作らない）。
 * Discussions タブは有効化が確認できなかったため、ここには含めていない。
 */

/** ライブラリ本体の GitHub リポジトリ。 */
export const REPO = "https://github.com/Y1-Effy/CommitCourier";

/**
 * Postel — ほぼ同一の主張（トランザクショナル outbox・Redis 不要・Standard Webhooks）を持つ
 * 埋め込み型ライブラリ。CommitCourier 本体の README も名指しで言及しており、
 * 比較表と FAQ の両方から参照するのでここに置く。競合だが実在の宛先。
 */
export const POSTEL = "https://postel.sh";

/** npm 上の commitcourier パッケージ。 */
export const NPM = "https://www.npmjs.com/package/commitcourier";

/** バグ報告・機能要望などの公開 Issue。 */
export const ISSUES = `${REPO}/issues`;

/**
 * セキュリティ脆弱性の非公開報告窓口（GitHub Security Advisories）。
 * SECURITY.md が公開 Issue ではなくこちらへ誘導している。
 */
export const SECURITY = `${REPO}/security/advisories`;

/** CI（GitHub Actions）の実行履歴。継続的な検証内容を確認できる。 */
export const ACTIONS = `${REPO}/actions`;

/** テストスイートのディレクトリ。 */
export const TESTS = `${REPO}/tree/main/test`;

/** コントリビューションガイド。 */
export const CONTRIBUTING = `${REPO}/blob/main/CONTRIBUTING.md`;

/** ライセンス（MIT）。 */
export const LICENSE = `${REPO}/blob/main/LICENSE`;
