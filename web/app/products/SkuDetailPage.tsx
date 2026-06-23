/* =========================================================================
   商品詳細テンプレート（全 live SKU 共通・データ駆動）
   旧 /products/copy-lv2-4x4 のハードコード版を一般化。
   構成: パンくず → SKU ヘッド → レベルラダー → 中身 → 店主から →
         親へのひとこと → 改訂履歴 → 関連 SKU。
   optional フィールド（observeNote/ownerNote/parentNote）が無い SKU では
   該当セクションを出さない。見本図はタスク代表 Fig を流用（Vol 別 SVG は将来）。
   ========================================================================= */

import SiteHeader from "../SiteHeader";
import AddToCartButton from "../cart/AddToCartButton";
import SkuPrintPreview, { type RenderProblem } from "./SkuPrintPreview";
import { PURCHASE_FAQ } from "./purchase-faq";
import { publishedSet } from "./problems/published";
import { metricsLabel } from "./problems/schema";
import { catalogTaskBySlug, LEVELS } from "../catalog";
import {
  LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL,
  volHref, type ProductTask, type Vol,
} from "./data";
import "./product.css";

export default function SkuDetailPage({ task, vol }: { task: ProductTask; vol: Vol }) {
  const cat = catalogTaskBySlug(task.slug);
  const lvName = LEVEL_NAMES[vol.lv - 1];

  /* published 問題データ（入稿済 SKU のみ。未入稿はプレビュー側でサンプルにフォールバック） */
  const problemSet = publishedSet(vol.sku);

  /* 改訂: 鮮度シグナルは「最終改訂」1 行＋ JSON-LD dateModified で担保。
     履歴一覧は実改訂が 2 件以上ある巻だけ見せる（架空の初版行はでっち上げない） */
  const revisions = vol.revisions ?? [];
  const latest = revisions[0]
    ?? (problemSet ? { ver: "v1.0", date: problemSet.publishedAt, note: "初版" } : undefined);
  const renderProblems: RenderProblem[] | undefined = problemSet?.problems.map((p) => ({
    n: p.grid.n, edges: p.edges,
    ...(p.answer?.mode === "explicit" && { answerEdges: p.answer.edges }),
    ...(p.answer?.mode === "derived" && p.answer.transform.type === "mirror"
      && { mirrorAxis: p.answer.transform.axis }),
  }));

  /* ラダー: タスクの存在 Lv ごとに 1 段（グリッドは Lv 内の巻から集約・各巻へのリンク付き） */
  const ladder = LEVELS.map((name, i) => {
    const vols = task.vols.filter((x) => x.lv === i + 1);
    if (vols.length === 0) return null;
    const grids = [...new Set(vols.map((x) => x.grid))].join("・");
    return { lv: i + 1, name, grids, vols, note: cat?.task.notes[i] ?? "", current: vol.lv === i + 1 };
  }).filter(Boolean) as { lv: number; name: string; grids: string; vols: Vol[]; note: string; current: boolean }[];

  /* JSON-LD: Product ＋ 収録問題の ItemList（LLMO・templates.md §7.4 の物量提示） */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${task.name} ${lvName} Vol.${vol.volNo}（${vol.grid}）`,
    sku: vol.sku,
    description: vol.promise ?? vol.blurb,
    brand: { "@type": "Brand", name: "TENZU" },
    ...(latest && { dateModified: latest.date }),
    offers: {
      "@type": "Offer", price: String(PRICE), priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
    },
    ...(problemSet && {
      hasPart: {
        "@type": "ItemList",
        numberOfItems: problemSet.problems.length,
        itemListElement: problemSet.problems.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            name: `問${i + 1}`,
            description: metricsLabel(p.metrics, p.grid) + (p.aim ? `。${p.aim}` : ""),
          },
        })),
      },
    }),
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader currentNav="商品" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/products">商品</a><span className="sep">/</span>
          <a href={`/products/${task.slug}`}>{task.name}</a><span className="sep">/</span>
          <span className="cur">{lvName} Vol.{vol.volNo} — {vol.grid}</span>
        </nav>
      </div>

      <main>
        {/* ============ SKU HEAD（導入 → 左:紙面プレビュー／右:価格・CTA・spec） ============
            商品を見てからカートへ、の順序（2026-06-12 オーナー指示）。
            モバイルは 導入 → プレビュー → spec・価格・CTA の縦積み */}
        <div className="wrap">
          <section className="sku-head sku-head--split">
            <header className="sku-intro">
              <h1 className="sku-name">{task.name} {lvName} Vol.{vol.volNo}・{vol.grid}</h1>
              <p className="sku-promise sku-promise--oneline">{vol.promise ?? vol.blurb}</p>
            </header>

            <SkuPrintPreview sku={vol.sku} grid={vol.grid} problems={renderProblems}
              buySlot={
            <div className="sku-buy">
              <div className="spec-table">
                <div className="spec-row"><span className="spec-label">問題数</span><span className="spec-value mono">{QUESTIONS_PER_VOL} 問</span></div>
                <div className="spec-row"><span className="spec-label">グリッド</span><span className="spec-value mono">{vol.grid}</span></div>
                {vol.variant && (
                  <div className="spec-row"><span className="spec-label">この巻の特徴</span><span className="spec-value">{vol.variant}</span></div>
                )}
                <div className="spec-row"><span className="spec-label">対象目安</span><span className="spec-value">{vol.ageLabel}</span></div>
                {latest && (
                  <div className="spec-row"><span className="spec-label">最終改訂</span><span className="spec-value mono">{latest.ver} · {latest.date}</span></div>
                )}
              </div>

              <div className="price-row">
                <div className="price-yen">¥{PRICE}</div>
                <div className="price-meta">税込 · 全 {QUESTIONS_PER_VOL} 問 · PDF ダウンロード</div>
              </div>

              <AddToCartButton sku={vol.sku} />

              {/* 購入前の確認 FAQ（全 SKU 共通・カート CTA 直下） */}
              <div className="faq-list faq-list--buy">
                <div className="faq-head">購入前にご確認ください</div>
                {PURCHASE_FAQ.map((f) => (
                  <details className="faq-item" key={f.q}>
                    <summary className="faq-q">{f.q}</summary>
                    <div className="faq-a">
                      <p>{f.a}</p>
                      {f.link && <a className="faq-link" href={f.link.href}>{f.link.label}</a>}
                    </div>
                  </details>
                ))}
              </div>
            </div>
              } />
          </section>
        </div>

        {/* ============ LEVEL LADDER（位置づけ＋店主から） ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">このタスクのレベル</h2>
            <p className="lead">
              同じ「{task.name}」を全 {task.vols.length} 巻・{ladder.length} レベルで刻んでいます。各レベルは独立に始められます。
            </p>

            <div className="ladder">
              {ladder.map((row) => (
                <article className="lv" key={row.lv} data-state={row.current ? "current" : undefined}>
                  <span className="lv-num">{row.current ? `LV.${row.lv} · NOW` : `LV.${row.lv}`}</span>
                  <span className="lv-grid-label">{row.name}</span>
                  <span className="lv-desc">{row.note || row.grids}</span>
                  <span className="lv-links">
                    {row.vols.map((x) =>
                      x.sku === vol.sku ? (
                        <span className="lv-link is-current" key={x.sku}>
                          Vol.{x.volNo}・{x.grid}（この巻）
                        </span>
                      ) : x.status === "live" ? (
                        <a className="lv-link" key={x.sku} href={volHref(task, x)}>
                          Vol.{x.volNo}・{x.grid} →
                        </a>
                      ) : (
                        <span className="lv-link is-soon" key={x.sku}>
                          Vol.{x.volNo}・{x.grid}（準備中）
                        </span>
                      ))}
                  </span>
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* ============ REVISION HISTORY（実改訂が 2 件以上ある巻だけ） ============ */}
        {revisions.length >= 2 && (
          <section className="s">
            <div className="wrap">
              <h2 className="h2-product">改訂履歴</h2>
              <dl className="rev-list" style={{ maxWidth: 720 }}>
                {revisions.map((r) => (
                  <div className="rev-row" key={r.ver}>
                    <dt>{r.ver}</dt>
                    <dd className="rev-date">{r.date}</dd>
                    <dd className="rev-note">{r.note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
