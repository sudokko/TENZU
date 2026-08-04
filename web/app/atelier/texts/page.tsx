/* =========================================================================
   検品ツール（atelier）詳細説明テキスト一覧 — dev 限定（本番は 404 ）
   data.ts の全 50 巻について、商品詳細ページに載る説明テキスト
   （blurb / meate / revisions）を一画面で照合する。
   未記入フィールドを可視化し、記入率を集計する。
   ========================================================================= */
import { notFound } from "next/navigation";
import { PRODUCT_TASKS, LEVEL_NAMES, volTitle, type Vol } from "../../products/data";
import "../atelier.css";

export const metadata = { title: "atelier — 詳細説明一覧（dev）", robots: { index: false } };

/* 検品対象フィールド（key・見出し・商品詳細での出方）
   observeNote/ownerNote/parentNote はセクション廃止により対象外（2026-06-12） */
const FIELDS = [
  { key: "blurb", label: "blurb（一覧の1文）", note: "タスク一覧・カードに表示。全巻必須" },
  { key: "meate", label: "meate（この巻のめあて）", note: "live 詳細ページのプレビュー下。この巻で鍛えたい力を40字程度" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

function fieldValue(vol: Vol, key: FieldKey): string | undefined {
  return vol[key];
}

export default function AtelierTexts() {
  if (process.env.NODE_ENV === "production") notFound();

  const allVols = PRODUCT_TASKS.flatMap((t) => t.vols.map((vol) => ({ task: t, vol })));
  const liveVols = allVols.filter((x) => x.vol.status === "live");

  /* live 巻の詳細フィールド記入数（blurb は全巻埋まっている前提で live 分母） */
  const fill = FIELDS.map((f) => ({
    ...f,
    filled: liveVols.filter((x) => Boolean(fieldValue(x.vol, f.key))).length,
  }));

  return (
    <main className="atl-wrap">
      <header className="atl-head">
        <nav className="atl-crumb"><a href="/atelier">← atelier</a></nav>
        <h1>詳細説明テキスト一覧</h1>
        <p>
          商品詳細ページに載る説明テキストの検品用。全 {allVols.length} 巻（live {liveVols.length} 巻）。
          編集は <code>web/app/products/data.ts</code> で。
        </p>
      </header>

      {/* ---- 記入率サマリ（live 巻のみ集計） ---- */}
      <section className="atl-txt-summary">
        {fill.map((f) => (
          <div key={f.key} className="atl-txt-stat"
            data-full={f.filled === liveVols.length ? "yes" : undefined}>
            <span className="atl-txt-stat-label">{f.label}</span>
            <span className="atl-txt-stat-count">{f.filled} / {liveVols.length}</span>
            <span className="atl-txt-stat-note">{f.note}</span>
          </div>
        ))}
      </section>

      {PRODUCT_TASKS.map((task) => (
        <section key={task.slug} className="atl-task">
          <h2>{task.name} <span className="atl-slug">/{task.slug}</span></h2>

          {task.vols.map((vol) => (
            <article key={vol.sku} className="atl-txt-card" data-status={vol.status}>
              <header className="atl-txt-head">
                <span className="atl-txt-title">{volTitle(task, vol)}</span>
                <span className="atl-sku-sku">{vol.sku}</span>
                <span className="atl-badges">
                  <em className="atl-badge">{LEVEL_NAMES[vol.lv - 1]}</em>
                  <em className="atl-badge">{vol.ageLabel}</em>
                  {vol.variant && <em className="atl-badge">{vol.variant}</em>}
                  {vol.status === "scaffold"
                    ? <em className="atl-badge">scaffold（詳細ページなし）</em>
                    : <em className="atl-badge atl-badge--gen">live</em>}
                </span>
                <span className="atl-txt-links">
                  {vol.status === "live" && (
                    <a href={`/products/${vol.sku}`} target="_blank" rel="noreferrer">詳細ページ ↗</a>
                  )}
                  <a href={`/atelier/${vol.sku}`}>問題検品 →</a>
                </span>
              </header>

              <dl className="atl-txt-fields">
                {FIELDS.map((f) => {
                  const value = fieldValue(vol, f.key);
                  /* scaffold は詳細ページが無いので blurb 以外の未記入は咎めない */
                  const expected = f.key === "blurb" || vol.status === "live";
                  return (
                    <div key={f.key} className="atl-txt-field"
                      data-missing={!value && expected ? "yes" : undefined}>
                      <dt>{f.label}</dt>
                      <dd>{value ?? (expected ? "未記入" : "—")}</dd>
                    </div>
                  );
                })}
                <div className="atl-txt-field">
                  <dt>改訂履歴</dt>
                  <dd>
                    {vol.revisions?.length
                      ? vol.revisions.map((r) => `${r.ver}（${r.date}）${r.note}`).join(" ／ ")
                      : "—（実改訂が発生したら追記。2 件以上で履歴セクション表示）"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
