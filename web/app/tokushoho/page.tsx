import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import "../legal.css";

/* 特定商取引法に基づく表記（decisions §5.16・phase-1-todo §2）。
   販売業者名義は屋号 SUDO CRAFT＋氏名。住所・電話は「請求があれば遅滞なく開示」
   方式（デジタル商品の通信販売・消費者庁ガイド準拠）。
   ⚠️ 氏名プレースホルダは開店前に必ず実名へ差し替える（phase-1-todo §2 名義統一）。 */

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description:
    "点図形（点描写）プリントの専門店 TENZU の特定商取引法に基づく表記です。販売業者・価格・お支払い方法・商品の引き渡し・返品についてご案内します。",
};

export default function TokushohoPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-main">
        <h1>特定商取引法に基づく表記</h1>
        <p className="legal-lede">
          点図形（点描写）プリントの専門店 TENZU（テンズ）における販売条件のご案内です。
        </p>

        <table className="legal-table">
          <tbody>
            <tr>
              <th>販売業者</th>
              <td>SUDO CRAFT（個人事業）</td>
            </tr>
            <tr>
              <th>販売責任者</th>
              <td>〔開店前に氏名を記載〕</td>
            </tr>
            <tr>
              <th>所在地・電話番号</th>
              <td>
                個人事業のため記載を省略しています。特定商取引法に基づく開示のご請求が
                あった場合は、遅滞なく開示いたします。ご請求は下記のお問い合わせ窓口から
                お願いします。
              </td>
            </tr>
            <tr>
              <th>お問い合わせ</th>
              <td>
                <a href="/contact">お問い合わせフォーム</a>（お返事はメールでお送りします）
              </td>
            </tr>
            <tr>
              <th>販売価格</th>
              <td>
                各商品ページに税込価格を表示しています（プリント各 ¥200／点描写メーカー
                各 ¥980・買い切り）。
              </td>
            </tr>
            <tr>
              <th>商品代金以外の必要料金</th>
              <td>
                ありません。サイトの閲覧・PDF のダウンロードにかかる通信費、およびご家庭での
                印刷にかかる費用はお客様のご負担となります。
              </td>
            </tr>
            <tr>
              <th>お支払い方法</th>
              <td>クレジットカード決済（Stripe）</td>
            </tr>
            <tr>
              <th>お支払い時期</th>
              <td>ご注文時にお支払いが確定します。</td>
            </tr>
            <tr>
              <th>商品の引き渡し時期</th>
              <td>
                決済完了後、ただちにお受け取りいただけます。プリント（PDF）は購入完了
                ページからダウンロードでき、購入内容を復元できるリンクをメールでも
                お送りします。点描写メーカーは決済完了後すぐに機能が有効になります。
              </td>
            </tr>
            <tr>
              <th>返品・キャンセル</th>
              <td>
                デジタル商品の性質上、決済完了後の返品・キャンセルはお受けできません。
                ファイルが開けない・内容が破損しているなどの不具合があった場合は、
                <a href="/contact">お問い合わせ</a>からご連絡ください。確認のうえ対応いたします。
              </td>
            </tr>
            <tr>
              <th>動作環境</th>
              <td>
                最新のウェブブラウザ（スマートフォン・PC）と、PDF の閲覧・印刷ができる
                環境が必要です。
              </td>
            </tr>
          </tbody>
        </table>

        <p className="legal-updated">制定日: 2026年8月1日</p>

        <div className="legal-foot-links">
          <a href="/privacy">プライバシーポリシー</a>
          <a href="/sudo-craft">運営者について</a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
