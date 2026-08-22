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

/* プレビュー（Amplify のブランチ URL）とローカルを判定する。本番ドメインをコードに
   書かない原則を保つため、SITE_URL のホストだけで見分ける。SITE_URL が壊れている
   ときは検索避け側に倒す（誤って公開されるより安全）。 */
export const IS_PREVIEW = (() => {
  try {
    const host = new URL(SITE_URL).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".amplifyapp.com");
  } catch {
    return true;
  }
})();

/** 相対パスを SITE_URL 基点の絶対URLに変換する。 */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* プレオープン告知帯（components/PreopenBanner.tsx）の出し分け。
   既定は「出す」側。開店（T=0 = 2026-08-30）当日に Amplify コンソールで
   PREOPEN=0 を設定 → main を再デプロイすると消える（env はビルド時に
   .env.production へ焼き出す設計のため、env 変更だけでは反映されない）。
   未設定＝出す、にしてあるのは IS_PREVIEW と同じ思想＝事故側に倒さないため
   （「開店したのに帯が残る」より「まだ準備中なのに帯が無い」ほうが害が大きい）。 */
export const IS_PREOPEN = (process.env.PREOPEN ?? "1") !== "0";
