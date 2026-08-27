/* =========================================================================
   商品詳細テンプレート（全 live SKU 共通・データ駆動）
   旧 /products/copy-lv2-4x4 のハードコード版を一般化。
   構成: パンくず → SKU ヘッド → レベルラダー → 中身 → 店主から →
         親へのひとこと → メーカー送客 → 改訂履歴 → 関連 SKU。
   optional フィールド（observeNote/ownerNote/parentNote）が無い SKU では
   該当セクションを出さない。見本図はタスク代表 Fig を流用（Vol 別 SVG は将来）。
   ========================================================================= */

import SiteHeader from "../SiteHeader";
import Link from "next/link";
import AddToCartButton from "../cart/AddToCartButton";
import TrackViewItem from "./TrackViewItem";
import SkuPrintPreview, { type SolidRenderProblem } from "./SkuPrintPreview";
import { toRenderProblems, type RenderProblem } from "./problems/render";
import { PURCHASE_FAQ } from "./purchase-faq";
import { makerByKey } from "./makers";
import { MAKER_FIG } from "./maker-figs";
import { FREE_MAKER, MAKER_PRICE, makerPriceLabel, isLaunchHidden, type MakerKey } from "./capabilities";
import { publishedSet } from "./problems/published";
import { coverageOf } from "./coverage";
import CoverageSection from "./CoverageSection";
import { catalogTaskBySlug, LEVELS } from "../catalog";
import { absoluteUrl } from "../site";
import {
  LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL,
  volHref, volTitle, type ProductTask, type Vol,
} from "./data";
import "./product.css";
import SiteFooterMini from "../components/SiteFooterMini";

export default function SkuDetailPage({ task, vol }: { task: ProductTask; vol: Vol }) {
  const cat = catalogTaskBySlug(task.slug);
  const lvName = LEVEL_NAMES[vol.lv - 1];

  /* published 問題データ（入稿済 SKU のみ。未入稿はプレビュー側でサンプルにフォールバック） */
  const problemSet = publishedSet(vol.sku);

  /* 収録問題の内訳（本文テキスト・JSON-LD の共通ソース）。
     数値は published から導出＝atelier で差し替えれば本文も JSON-LD も自動追随する。
     未入稿の巻は undefined＝内訳セクションも hasPart も出さない。 */
  const cov = problemSet ? coverageOf(problemSet) : undefined;

  /* 問題数は「実際に入稿されている数」を正とし、未入稿だけ定数にフォールバック */
  const qCount = problemSet?.problems.length ?? QUESTIONS_PER_VOL;

  /* 改訂: 鮮度シグナルは「最終改訂」1 行＋ JSON-LD dateModified で担保。
     履歴一覧は実改訂が 2 件以上ある巻だけ見せる（架空の初版行はでっち上げない） */
  const revisions = vol.revisions ?? [];
  const latest = revisions[0]
    ?? (problemSet ? { ver: "v1.0", date: problemSet.publishedAt, note: "初版" } : undefined);
  const isSolid = task.slug === "solid";
  /* Problem → 紙面描画データの写像は problems/render.ts（SSOT・サンクスページと共用）。
     かさね系 3 ペイン式・変換の指示子（decisions §3.87）もそこで付く */
  const renderProblems: RenderProblem[] | undefined = isSolid || !problemSet
    ? undefined : toRenderProblems(problemSet);
  const solidProblems: SolidRenderProblem[] | undefined = isSolid
    ? problemSet?.problems
        .filter((p) => p.grid.type === "solid")
        .map((p) => {
          const g = p.grid as { type: "solid"; cols: number; rows: number };
          return { cols: g.cols, rows: g.rows, edges: p.solidEdges ?? [] };
        })
    : undefined;

  /* ラダー: タスクの存在 Lv ごとに 1 段（グリッドは Lv 内の巻から集約・各巻へのリンク付き） */
  const ladder = LEVELS.map((name, i) => {
    const vols = task.vols.filter((x) => x.lv === i + 1);
    if (vols.length === 0) return null;
    const grids = [...new Set(vols.map((x) => x.grid))].join("・");
    return { lv: i + 1, name, grids, vols, note: cat?.task.notes[i] ?? "", current: vol.lv === i + 1 };
  }).filter(Boolean) as { lv: number; name: string; grids: string; vols: Vol[]; note: string; current: boolean }[];

  /* メーカー送客（送客導線(A)＝開店ゲート G6）: 商品タスクとメーカーは同一識別子。
     LAUNCH_HIDDEN（拡大・縮小）は導線に出さない（decisions §3.53・§4.6）。 */
  const maker = isLaunchHidden(task.slug) ? undefined : makerByKey(task.slug as MakerKey);
  const MakerFig = maker ? MAKER_FIG[maker.key] : undefined;

  /* JSON-LD: Product ＋ 収録問題の ItemList（LLMO・templates.md §7.4 の物量提示）
     本文セクションと同じ coverage を使う＝両者が食い違わない。description も
     「巻の1文＋実測の集計文」にして、本文に書いてある事実を構造化側でも裏づける。 */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${task.name} ${lvName} Vol.${vol.volNo}（${vol.grid}）`,
    sku: vol.sku,
    image: [absoluteUrl(`/products/${vol.sku}/opengraph-image`)],
    description: cov ? `${vol.blurb} ${cov.summary}` : vol.blurb,
    brand: { "@type": "Brand", name: "TENZU" },
    ...(latest && { dateModified: latest.date }),
    offers: {
      "@type": "Offer", price: String(PRICE), priceCurrency: "JPY",
      url: absoluteUrl(`/products/${vol.sku}`),
      availability: "https://schema.org/InStock",
    },
    ...(cov && {
      hasPart: {
        "@type": "ItemList",
        numberOfItems: cov.count,
        itemListElement: cov.rows.map((r) => ({
          "@type": "ListItem",
          position: r.no,
          item: {
            "@type": "CreativeWork",
            name: `問${r.no}`,
            description: [
              r.metrics,
              r.transform,
              r.aim,
              /* D は値だけでなく内訳（実計算）も出す＝行単位で検証可能な一次データ */
              r.d !== undefined && `難易度D ${r.d}${r.dParts ? `（＝${r.dParts}）` : ""}`,
            ].filter(Boolean).join("。"),
          },
        })),
      },
    }),
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackViewItem id={vol.sku} name={volTitle(task, vol)} price={PRICE} />
      <SiteHeader currentNav="プリントを探す" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <Link href="/products">商品</Link><span className="sep">/</span>
          <Link href={`/products/${task.slug}`}>{task.name}</Link><span className="sep">/</span>
          <span className="cur">{lvName} Vol.{vol.volNo} — {vol.grid}</span>
        </nav>
      </div>

      <main>
        {/* ============ SKU HEAD（導入 → 左:紙面プレビュー／右:価格・CTA・spec） ============
            商品を見てからカートへ、の順序（2026-06-12 オーナー指示）。
            モバイルは 導入 → プレビュー → spec・価格・CTA の縦積み
            #preview＝レベル選びガイド「問題の中身を見る」の着地アンカー */}
        <div className="wrap">
          <section className="sku-head sku-head--split" id="preview">
            <header className="sku-intro">
              <h1 className="sku-name">{task.name} {lvName} Vol.{vol.volNo}・{vol.grid}</h1>
              <p className="sku-blurb sku-blurb--oneline">{vol.blurb}</p>
            </header>

            <SkuPrintPreview sku={vol.sku} grid={vol.grid} problems={renderProblems}
              solidProblems={solidProblems}
              meate={vol.meate}
              buySlot={
            <div className="sku-buy">
              <div className="spec-table">
                <div className="spec-row"><span className="spec-label">問題数</span><span className="spec-value mono">{qCount} 問</span></div>
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
                <div className="price-meta">税込 · 全 {qCount} 問 · PDF ダウンロード</div>
              </div>

              <AddToCartButton sku={vol.sku} name={volTitle(task, vol)} price={PRICE} />

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

        {/* ============ COVERAGE（収録N問の内訳） ============
            12問の中身を本文テキストでも出す。SVG しか無かった状態を解消し、
            JSON-LD（上の hasPart）と同じ事実が本文にもある状態にする。
            未入稿の巻（cov 無し）では出さない。 */}
        {cov && <CoverageSection cov={cov} />}

        {/* ============ MAKER CROSS-SELL（送客導線(A)＝開店ゲート G6） ============
            この巻と同じ種類を自作できるメーカーへの橋（クロスセル・decisions §4.6）。
            「メーカー＝オリジナルの1枚／商品PDF＝レベル順の本練習」の使い分けを崩さない。 */}
        {maker && MakerFig && (
          <section className="s">
            <div className="wrap">
              <h2 className="h2-product">この種類を、自分でも作れます</h2>
              <p className="lead">
                {maker.name}は、この巻と同じ「{task.name}」の問題を自分で作って、PDF で印刷できるツールです。
                メーカーで作れるのはオリジナルの 1 枚。商品 PDF は、レベル順に続ける本練習——子に合わせて使い分けられます。
              </p>
              <a className="xsell-card" href={maker.href}>
                <span className="xsell-fig" aria-hidden="true"><MakerFig /></span>
                <span className="xsell-body">
                  <span className="xsell-head">
                    <span className="xsell-name">{maker.name}</span>
                    <span className={`xsell-badge${maker.key === FREE_MAKER ? " is-free" : ""}`}>
                      {makerPriceLabel(maker.key)}
                    </span>
                  </span>
                  <span className="xsell-desc">{maker.desc}</span>
                  <span className="xsell-go">
                    {maker.key === FREE_MAKER ? "無料で作ってみる →" : "触って試す →"}
                  </span>
                </span>
              </a>
              <p className="xsell-note">
                {maker.key === FREE_MAKER
                  ? `模写メーカーは 4×4 までずっと無料（PDF 書き出しも無料）。5×5〜8×8 の解放が ¥${MAKER_PRICE} の買い切りです。`
                  : `触って試すのは無料。PDF 書き出しは ¥${MAKER_PRICE} の買い切りです（月額なし・無期限）。`}
                <a className="xsell-all" href="/makers">メーカーをぜんぶ見る →</a>
              </p>
            </div>
          </section>
        )}

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

      <SiteFooterMini />
    </>
  );
}
