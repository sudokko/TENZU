/* =========================================================================
   検品ツール（atelier）SKU 一覧 — dev 限定（本番は 404）
   data.ts の全 63 巻を陳列し、ジェネレータ対応／候補・公開状況へ導く。
   ========================================================================= */
import { notFound } from "next/navigation";
import { PRODUCT_TASKS, LEVEL_NAMES } from "../products/data";
import { generatorFor } from "../products/problems/gen";
import { PUBLISHED } from "../products/problems/published";
import "./atelier.css";

export const metadata = { title: "atelier — 問題検品（dev）", robots: { index: false } };

export default function AtelierIndex() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="atl-wrap">
      <header className="atl-head">
        <h1>atelier — 問題データ検品</h1>
        <p>dev 限定ツール。候補を生成 → 12 問選んで publish → 商品ページに載る。</p>
        <p><a href="/atelier/texts">詳細説明テキスト一覧（全巻の説明文を一括検品）→</a></p>
        <p><a href="/atelier/pins">ピン素材書き出し（公開済 SKU から Pinterest 用 PNG＋キャプション）→</a></p>
        <p><a href="/atelier/story">物語アーク模写・試作（3題材×7フレーム・見るだけプロト）→</a></p>
      </header>

      {PRODUCT_TASKS.map((task) => (
        <section key={task.slug} className="atl-task">
          <h2>{task.name} <span className="atl-slug">/{task.slug}</span></h2>
          <div className="atl-sku-grid">
            {task.vols.map((vol) => {
              const hasGen = Boolean(generatorFor(vol.sku));
              const isPub = Boolean(PUBLISHED[vol.sku]);
              return (
                <a key={vol.sku} className="atl-sku-card" href={`/atelier/${vol.sku}`}
                  data-pub={isPub ? "yes" : undefined}>
                  <span className="atl-sku-name">
                    Lv.{vol.lv} {LEVEL_NAMES[vol.lv - 1]} Vol.{vol.volNo} · {vol.grid}
                  </span>
                  <span className="atl-sku-sku">{vol.sku}</span>
                  <span className="atl-badges">
                    {isPub && <em className="atl-badge atl-badge--pub">公開済</em>}
                    {hasGen
                      ? <em className="atl-badge atl-badge--gen">自動生成</em>
                      : <em className="atl-badge">手設計</em>}
                    {vol.status === "scaffold" && <em className="atl-badge">scaffold</em>}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
