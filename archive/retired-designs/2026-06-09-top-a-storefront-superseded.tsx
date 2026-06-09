/* =========================================================================
   【撤回設計・証跡】TOP A案ストアフロント（旧 web/app/page.tsx）
   2026-06-09 に top-rich（Brilliant 寄せ 1.5）を `/` 正本へ昇格したため退避。
   差し替え先: web/app/page.tsx（旧 /top-rich の内容）。
   ※本ファイルは証跡スナップショット。import パスは当時のまま（ビルド対象外）。
   ========================================================================= */
import SiteHeader from "./SiteHeader";
import { CatalogSection, ArticlesSection, SiteFooter } from "./catalog";

/* =========================================================================
   TOP — Pattern A v5（正本）。カタログ／記事／フッターは catalog.tsx を共有。
   方針: 実際の設問サンプルを 9 種類すべて図で（みほん→うつす）。3 群構成（§13.7）。
   レベル表示は A 基調＝チップ直接リンク＋詳細アコーディオン（decisions §3.44）。
   ※リンク先 URL は未配線（href="#" scaffold）。
   変遷: 旧 rev.5 LP → archive/retired-designs/2026-06-07-lp-rev5-storefront-superseded.tsx
   比較版: /top-rich（Brilliant 寄せ 1.5）
   ========================================================================= */

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ===================== HERO ===================== */}
        <section className="hero">
          <div className="wrap">
            <h1>点描写プリントの、専門店です。</h1>
            <p className="hero-lead">
              点描写は、図形を読み解く目を育てる練習。見て写すことから始めて、回す・重ねる・立体に起こすところまで。紙と鉛筆の数分が、これからの学びの土台になります。
            </p>
          </div>
        </section>

        {/* ===================== 9 種類カタログ ===================== */}
        <CatalogSection />

        {/* ===================== §2 もっと知る ===================== */}
        <ArticlesSection />
      </main>

      {/* ===================== FOOTER ===================== */}
      <SiteFooter />
    </>
  );
}
