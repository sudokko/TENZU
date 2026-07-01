/* =========================================================================
   サイト絶対URLの基点（SSOT）
   - metadataBase / OpenGraph / canonical / sitemap / robots は「ビルド時」に解決される
     ため req origin を使えない。ドメインをコードにハードコードせず env 一本に集約する。
   - 本番は env `SITE_URL=https://tenzu.jp`（web/.env.production.example）。
     未設定時（ローカル build）は localhost にフォールバック。
   - ホスト差し替え時はこの env を差し替えるだけで OK（記事本体・コードは無変更）。
   ========================================================================= */

export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "TENZU";

/** 相対パスを SITE_URL 基点の絶対URLに変換する。 */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
