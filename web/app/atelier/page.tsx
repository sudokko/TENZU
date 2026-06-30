/* =========================================================================
   検品ツール（atelier）SKU 一覧＋Vol 管理 — dev 限定（本番は 404）
   data.ts の全巻を陳列し、ジェネレータ対応／候補・公開状況へ導く。
   Vol の追加・メタ編集・削除/非表示は VolManager（/api/atelier/vol）で行う。
   ========================================================================= */
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { PRODUCT_TASKS, LEVEL_NAMES, LEVEL_AGES } from "../products/data";
import { generatorFor } from "../products/problems/gen";
import { PUBLISHED } from "../products/problems/published";
import { readCatalogExtra } from "../api/atelier/io";
import VolManager, { type MTask } from "./VolManager";
import "./atelier.css";

export const metadata = { title: "atelier — 問題検品（dev）", robots: { index: false } };

export default async function AtelierIndex() {
  if (process.env.NODE_ENV === "production") notFound();

  const extra = await readCatalogExtra();
  const extraSkus = new Set(extra.vols.map((v) => v.sku));
  const hidden = (extra.patches ?? []).filter((p) => p.hidden).map((p) => p.sku);

  const tasks: MTask[] = PRODUCT_TASKS.map((task) => ({
    slug: task.slug,
    name: task.name,
    vols: task.vols.map((vol) => ({
      sku: vol.sku, lv: vol.lv, volNo: vol.volNo, grid: vol.grid, variant: vol.variant,
      blurb: vol.blurb, ageLabel: vol.ageLabel, status: vol.status,
      hasGen: Boolean(generatorFor(vol.sku)),
      isPub: Boolean(PUBLISHED[vol.sku]),
      isExtra: extraSkus.has(vol.sku),
    })),
  }));

  // 設問タイプ × レベル 一覧（当初設計のレベル・内容(grid)・Vol 数）。PRODUCT_TASKS から導出。
  const GROUP_LABELS = ["A. 見て写す", "B. かたちを動かす", "C. 重ねる・分ける"];
  const ovCell = (vols: { grid: string }[]) => {
    if (vols.length === 0) return "—";
    const grids = [...new Set(vols.map((v) => v.grid))];
    return `${vols.length}巻 · ${grids.join(" / ")}`;
  };
  const overview = PRODUCT_TASKS.map((task) => ({
    name: task.name,
    groupIdx: task.groupIdx,
    auto: Boolean(generatorFor(task.vols[0]?.sku ?? "")),
    total: task.vols.length,
    byLv: [1, 2, 3, 4, 5].map((lv) => ovCell(task.vols.filter((v) => v.lv === lv))),
  }));

  return (
    <main className="atl-wrap">
      <header className="atl-head">
        <h1>atelier — 問題データ検品</h1>
        <p>dev 限定ツール。候補を生成 → 12 問選んで publish → 商品ページに載る。</p>
        <p><a href="/atelier/texts">詳細説明テキスト一覧（全巻の説明文を一括検品）→</a></p>
        <p><a href="/atelier/pins">ピン素材書き出し（公開済 SKU から Pinterest 用 PNG＋キャプション）→</a></p>
        <p><a href="/atelier/story">物語アーク模写・試作（3題材×7フレーム・見るだけプロト）→</a></p>
      </header>

      <section className="atl-ov">
        <h2 className="atl-ov-title">設問タイプ × レベル 一覧（当初設計）</h2>
        <p className="atl-ov-note">各タイプの Lv 構成・内容（盤面 grid）・Vol 数。data.ts から自動導出。</p>
        <div className="atl-ov-scroll">
          <table className="atl-ovt">
            <thead>
              <tr>
                <th>タイプ</th>
                {[0, 1, 2, 3, 4].map((i) => (
                  <th key={i} className="atl-ovt-lvh">
                    <span className="atl-ovt-lvh-lv">Lv.{i + 1}</span>
                    <span className="atl-ovt-lvh-name">{LEVEL_NAMES[i]}</span>
                    <span className="atl-ovt-lvh-age">{LEVEL_AGES[i]}</span>
                  </th>
                ))}
                <th>計</th><th>生成</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((gi) => (
                <Fragment key={gi}>
                  <tr className="atl-ovt-grp"><th colSpan={8}>{GROUP_LABELS[gi]}</th></tr>
                  {overview.filter((o) => o.groupIdx === gi).map((o) => (
                    <tr key={o.name}>
                      <td className="atl-ovt-name">{o.name}</td>
                      {o.byLv.map((c, i) => (
                        <td key={i} className={c === "—" ? "atl-ovt-empty" : undefined}>{c}</td>
                      ))}
                      <td className="atl-ovt-total">{o.total}</td>
                      <td>{o.auto ? <em className="atl-badge atl-badge--gen">自動</em> : <em className="atl-badge">手設計</em>}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <VolManager tasks={tasks} hidden={hidden} />
    </main>
  );
}
