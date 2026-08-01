"use client";

/* 屋号ページ本体。SNS プロフィールからの流入 UTM（utm_*）を内部リンクへ引き継ぐ。
   ここで UTM が切れると SNS 流入が GA4 上「参照元なし」に落ちるため（phase-1-todo §2）。 */

import { useEffect, useState } from "react";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";

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
          <h2>店主のこと</h2>
          <p>
            IT 企業で新しい製品を企画してきた二児の父です。子どもと点描写に取り組んだ
            経験から、数多くの教材を研究して TENZU を一から設計しました。顔出しは
            していませんが、作っているものと設計の理由はすべてサイト上で公開しています。
          </p>
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
