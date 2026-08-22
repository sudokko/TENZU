import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import "../legal.css";

/* プライバシーポリシー（phase-1-todo §1「外部送信の記載」・analytics.md §6）。
   電気通信事業法の外部送信規律に対応: 送信先（Google LLC）・利用目的（アクセス解析）・
   オプトアウト手段を明記する。クッキーバナーは現状不要の判断（日本法・GA4 のみ）。 */

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "プライバシーポリシー",
  description:
    "点図形（点描写）プリントの専門店 TENZU のプライバシーポリシーです。取得する情報・利用目的・外部送信（アクセス解析・決済）・Cookie の扱いについてご案内します。",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-main">
        <h1>プライバシーポリシー</h1>
        <p className="legal-lede">
          点図形（点描写）プリントの専門店 TENZU（運営: SUDO CRAFT・以下「当店」）は、
          お客様の個人情報を次のとおり取り扱います。
        </p>

        <section className="legal-sec">
          <h2>1. 取得する情報</h2>
          <ul>
            <li>ご購入時にご入力いただくメールアドレス（決済は Stripe 社の画面で行われます）</li>
            <li>お問い合わせフォームにご記入いただいた内容（お名前・メールアドレスなど・任意）</li>
            <li>購入状態を保持するための Cookie（ログイン不要で購入済み商品をご利用いただくため）</li>
            <li>サイトの利用状況（閲覧ページ・操作イベントなどのアクセス情報）</li>
          </ul>
        </section>

        <section className="legal-sec">
          <h2>2. 利用目的</h2>
          <ul>
            <li>商品（PDF・メーカー機能）のお引き渡しと、購入内容を復元するリンクの送付</li>
            <li>お問い合わせへの対応</li>
            <li>サイトの品質改善・不正利用の防止</li>
          </ul>
          <p>上記の目的以外に利用することはありません。広告配信のための利用は行いません。</p>
        </section>

        <section className="legal-sec">
          <h2>3. 外部送信について</h2>
          <p>
            当店のサイトでは、次の外部事業者に情報が送信されます（電気通信事業法の
            外部送信規律に基づくご案内です）。
          </p>
          <table className="legal-table">
            <tbody>
              <tr>
                <th>Google アナリティクス /<br />Google タグマネージャー</th>
                <td>
                  送信先: Google LLC ／ 目的: アクセス解析（サイト改善のため）。
                  Cookie 等により閲覧情報が送信されます。無効化は
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google アナリティクス オプトアウト アドオン
                  </a>
                  、またはブラウザの Cookie 設定から行えます。
                </td>
              </tr>
              <tr>
                <th>Stripe</th>
                <td>
                  送信先: Stripe, Inc. ／ 目的: クレジットカード決済の処理。
                  カード番号は Stripe 社が直接取り扱い、当店のサーバーには保存されません。
                </td>
              </tr>
              <tr>
                <th>Amazon Web Services</th>
                <td>
                  送信先: Amazon Web Services, Inc. ／ 目的: サイトの配信・メール送信・
                  データ保管（当店のシステム基盤として利用しています）。
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="legal-sec">
          <h2>4. Cookie について</h2>
          <p>
            当店は、購入済み商品をログインなしでご利用いただくための署名付き Cookie と、
            アクセス解析のための Cookie を使用します。ブラウザの設定で Cookie を無効に
            できますが、購入済み商品の表示など一部の機能が使えなくなる場合があります。
          </p>
        </section>

        <section className="legal-sec">
          <h2>5. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供することは
            ありません。
          </p>
        </section>

        <section className="legal-sec">
          <h2>6. 開示・訂正・削除のご請求</h2>
          <p>
            ご自身の個人情報の開示・訂正・削除をご希望の場合は、
            <a href="/contact">お問い合わせフォーム</a>からご連絡ください。
            ご本人であることを確認のうえ、遅滞なく対応いたします。
          </p>
        </section>

        <section className="legal-sec">
          <h2>7. 改定</h2>
          <p>
            本ポリシーを改定する場合は、本ページでお知らせします。
          </p>
        </section>

        <p className="legal-updated">制定日: 2026年8月1日</p>

        <div className="legal-foot-links">
          <a href="/tokushoho">特定商取引法に基づく表記</a>
          <a href="/sudo-craft">運営者について</a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
