/* =========================================================================
   /products-b — 商品一覧ハブ 旧案（比較用・noindex）
   2026-07-03 リスト一枚型を標準（/products）へ昇格した際の旧デザイン退避。
   構成: 一行リード → catalog.tsx の CatalogSection（3つの力・地図カード＋
   3群×タスク棚＋can-do 物差し＋全体マップ＋shelf band）。
   不要になったら本ディレクトリごと削除してよい。
   ========================================================================= */

import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { CatalogSection, SiteFooter } from "../catalog";
import "../products/product.css";

export const metadata: Metadata = {
  title: "商品一覧（旧案・比較用）",
  robots: { index: false, follow: false },
};

export default function ProductsHubOld() {
  return (
    <>
      <SiteHeader currentNav="商品" />
      <main>
        <div className="wrap">
          <header className="plp-hub-head">
            <h1 className="plp-hub-lead">
              3 つの力 × 各 3 タイプ × 5 レベル。今の手ごたえに合う一冊から。
            </h1>
          </header>
        </div>
        <CatalogSection />
      </main>
      <SiteFooter />
    </>
  );
}
