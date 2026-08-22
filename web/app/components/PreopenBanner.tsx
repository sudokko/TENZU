/* =========================================================================
   プレオープン告知帯
   - 開店（T=0 = 2026-08-30・launch/plan.md）までの間、全ページ最上部に出す。
   - 目的は「開けたまま検証を回す」ための誠実表示。サイトを閉じない代わりに、
     まだ買える状態でないことを訪問者へ明示する（Amplify の Basic 認証で封鎖
     すると webhook / SES / GA4 / Search Console の本番検証が全部止まるため）。
   - SEO 事故防止:
       * 告知文は title / description / OG / H1 に一切載せない（layout.tsx の
         SITE_TITLE・SITE_DESCRIPTION は無改変）。載せると開店後もしばらく
         検索結果に「準備中」が出続ける。
       * この帯は DOM 最上部に来るため、スニペットへ拾われないよう
         data-nosnippet を付ける（Google が本文抜粋から除外する）。
   - JS 不要のサーバーコンポーネント。表示制御は env のみ（site.ts の IS_PREOPEN）。
   ========================================================================= */

import { IS_PREOPEN } from "../site";
import "./preopen.css";

export default function PreopenBanner() {
  if (!IS_PREOPEN) return null;
  return (
    <div className="preopen" data-nosnippet>
      <div className="wrap">
        <span className="preopen-tag">PRE-OPEN</span>
        <p className="preopen-text">
          {/* 改行を挟むと JSX が半角スペースを1つ差し込む（和文の途中に空きが出る）。
              文の切れ目で行を分けないこと。 */}
          ただいま<strong>プレオープン中</strong>です。正式オープンは
          <span className="preopen-date">2026年8月30日</span>。決済まわりを動作確認中のため、ご購入は 8/30 からお願いします。
        </p>
      </div>
    </div>
  );
}
