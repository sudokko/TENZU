/* 軽量フッター（フル版 SiteFooter を出さないページ用）。
   これまで 10 ページに同じ markup がコピーされていたので 1 か所へ集約した
   （SNS 導線を全ページへ出すにあたり、10 箇所へ同じ変更を撒くのを避けるため）。
   variant: "mini" = 通常ページ／"article" = 記事ページ（余白の詰め方が違う）。 */

import SnsLinks from "./SnsLinks";

export default function SiteFooterMini({ variant = "mini" }: { variant?: "mini" | "article" }) {
  return (
    <footer className={`site footer-${variant}`}>
      <div className="wrap">
        <SnsLinks heading="フォローする" className="sns-foot" />
        <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
      </div>
    </footer>
  );
}
