"use client";

/* 屋号ページ本体。SNS プロフィールからの流入 UTM（utm_*）を内部リンクへ引き継ぐ。
   ここで UTM が切れると SNS 流入が GA4 上「参照元なし」に落ちるため（phase-1-todo §2）。 */

import { useEffect, useState } from "react";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import SnsLinks from "../components/SnsLinks";

/** 現在 URL の utm_* パラメータだけを取り出したクエリ文字列（無ければ空） */
function useUtmQuery(): string {
  const [q, setQ] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keep = new URLSearchParams();
    for (const [k, v] of params) if (k.startsWith("utm_")) keep.set(k, v);
    setQ(keep.toString());
  }, []);
  return q;
}

const withUtm = (href: string, utm: string) =>
  utm ? `${href}${href.includes("?") ? "&" : "?"}${utm}` : href;

export default function SudoCraftApp() {
  const utm = useUtmQuery();

  return (
    <>
      <SiteHeader />
      <main className="legal-main">
        <h1>SUDO CRAFT</h1>
        <p className="legal-lede">
          個人事業の屋号です（2026年7月開業）。「見て、考えて、書く」学びの土台を
          家庭で無理なく育てる紙の教材を、ひとりで企画・設計・実装しています。
        </p>

        <section className="legal-sec">
          <h2>つくっているもの</h2>
          <div className="sc-cards">
            <a className="sc-card" href={withUtm("/", utm)}>
              <div className="sc-card-name">TENZU（てんず）</div>
              <p>
                点図形（点描写）プリントの専門店。模写から対称・回転・立体まで、
                レベル別の PDF プリントと、親が自分で問題を作れる点描写メーカーを
                そろえています。
              </p>
            </a>
          </div>
          <div className="sc-sub-links">
            <a href={withUtm("/products", utm)}>プリントを見る</a>
            <a href={withUtm("/maker", utm)}>自分でつくる（点描写メーカー）</a>
            <a href={withUtm("/articles", utm)}>読みもの</a>
          </div>
        </section>

        <section className="legal-sec">
          <h2>事業の概要</h2>
          <p>
            インターネットを利用したデジタルコンテンツの企画、制作、販売並びに
            マーケティング支援業務に従事しています。お客様の要望に応じた個別の製品の
            開発も積極的に対応しますので、お気軽にご相談ください。
          </p>
        </section>

        <section className="legal-sec">
          <h2>店主のこと</h2>
          <p>
            技術と事業の両面から教育ツールを設計する二児の父です。WEB系企業での開発経験を経て、
            CRM/SaaS 事業で 12 年間・120 社以上の顧客に向き合い、ユーザーニーズとビジネスの両立を学びました。
            その経験から「子どもの学びの本質」と「家庭で続く仕組み」の両立を大事にしながら、
            点描写の教材を一から研究・設計しました。作っているものと設計の理由は
            すべてサイト上に公開しています。
          </p>
        </section>

        <section className="legal-sec">
          <h2>発信しているところ</h2>
          <p>
            お店（TENZU）と屋号（SUDO CRAFT）の両方で発信しています。
            設計の理由や作っている途中のことは、屋号名義のほうに書いています。
          </p>
          <SnsLinks variant="rows" showNamingNote={false} />
        </section>

        <section className="legal-sec">
          <h2>お仕事のご相談</h2>
          <p>
            教材・プリントの制作、学習系 Web ツールの開発などのご相談は、
            <a href="/contact">お問い合わせフォーム</a>からお願いします。
            内容を拝見して、メールでお返事します。
          </p>
        </section>

        <div className="legal-foot-links">
          <a href="/tokushoho">特定商取引法に基づく表記</a>
          <a href="/privacy">プライバシーポリシー</a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
