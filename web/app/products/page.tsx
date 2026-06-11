/* =========================================================================
   /products — 商品一覧ハブ
   catalog.tsx の CatalogSection（帯グラフ＋3群×タスク行＋レベルチップ）を
   正本としてレンダリング。チップは /products/{task}#lv{n} へ着地する。
   TOP（/）は coverage 圧縮版（CoverageSection）のままで、棚の全量はここが担う。
   ========================================================================= */

import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { CatalogSection, SiteFooter, TOTAL_KINDS, TOTAL_VOL } from "../catalog";
import "./product.css";

export const metadata: Metadata = {
  title: "商品一覧 — 10 種類 × 5 段階 · TENZU",
  description:
    `点描写プリントの品ぞろえ。${TOTAL_KINDS} 種類 × 5 段階・計 ${TOTAL_VOL} 巻。¥200 一律・サブスクなし。`,
};

export default function ProductsHub() {
  return (
    <>
      <SiteHeader currentNav="商品" />
      <main>
        <div className="wrap">
          <header className="plp-hub-head">
            <p className="plp-kicker">品ぞろえ</p>
            <h1 className="plp-h1">10 種類 × 5 段階、ぜんぶ。</h1>
            <p className="plp-desc">
              種類ごとの「レベルを選ぶ」から、巻の一覧に進めます。年齢はめやすです。
            </p>
          </header>
        </div>
        <CatalogSection />
      </main>
      <SiteFooter />
    </>
  );
}
