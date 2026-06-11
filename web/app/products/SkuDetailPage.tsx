/* =========================================================================
   商品詳細テンプレート（全 live SKU 共通・データ駆動）
   旧 /products/copy-lv2-4x4 のハードコード版を一般化。
   構成: パンくず → SKU ヘッド → レベルラダー → 中身 → 店主から →
         親へのひとこと → 改訂履歴 → 関連 SKU。
   optional フィールド（observeNote/ownerNote/parentNote）が無い SKU では
   該当セクションを出さない。見本図はタスク代表 Fig を流用（Vol 別 SVG は将来）。
   ========================================================================= */

import SiteHeader from "../SiteHeader";
import SkuPrintPreview from "./SkuPrintPreview";
import { catalogTaskBySlug, LEVELS } from "../catalog";
import {
  PRODUCT_TASKS, LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL,
  volTitle, volHref, type ProductTask, type Vol,
} from "./data";
import "./product.css";

const GROUP_LETTER = ["A", "B", "C"];

function taskIcon(slug: string) {
  return slug === "motif" ? "/assets/icons/task-copy.svg" : `/assets/icons/task-${slug}.svg`;
}

/* 関連 SKU 3 枚: ①同タスクの近い Lv の live 巻（最大 2）②同群他タスクの live 巻（1）
   不足分はタスク一覧ページへのリンクで埋める */
function relatedOf(task: ProductTask, vol: Vol) {
  const sameTask = task.vols
    .filter((x) => x.sku !== vol.sku && x.status === "live")
    .sort((a, b) => Math.abs(a.lv - vol.lv) - Math.abs(b.lv - vol.lv) || a.lv - b.lv || a.volNo - b.volNo)
    .slice(0, 2)
    .map((x) => ({ task, vol: x }));

  const sibling = PRODUCT_TASKS
    .filter((t) => t.groupIdx === task.groupIdx && t.slug !== task.slug)
    .flatMap((t) => t.vols.filter((x) => x.status === "live").map((x) => ({ task: t, vol: x })))
    .sort((a, b) => Math.abs(a.vol.lv - vol.lv) - Math.abs(b.vol.lv - vol.lv))
    .slice(0, 1);

  return [...sameTask, ...sibling].slice(0, 3);
}

export default function SkuDetailPage({ task, vol }: { task: ProductTask; vol: Vol }) {
  const cat = catalogTaskBySlug(task.slug);
  const groupLabel = cat?.group.label ?? "";
  const letter = GROUP_LETTER[task.groupIdx];
  const lvName = LEVEL_NAMES[vol.lv - 1];
  const revisions = vol.revisions ?? [{ ver: "v1.0", date: "2026-06-10", note: "初版" }];
  const latest = revisions[0];
  const related = relatedOf(task, vol);

  /* ラダー: タスクの存在 Lv ごとに 1 段（グリッドは Lv 内の巻から集約） */
  const ladder = LEVELS.map((name, i) => {
    const vols = task.vols.filter((x) => x.lv === i + 1);
    if (vols.length === 0) return null;
    const grids = [...new Set(vols.map((x) => x.grid))].join("・");
    return { lv: i + 1, name, grids, note: cat?.task.notes[i] ?? "", current: vol.lv === i + 1 };
  }).filter(Boolean) as { lv: number; name: string; grids: string; note: string; current: boolean }[];

  return (
    <>
      <SiteHeader currentNav="商品" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/products">商品</a><span className="sep">/</span>
          <a href={`/products/${task.slug}`}>{task.name}</a><span className="sep">/</span>
          <span className="cur">{lvName} Vol.{vol.volNo} — {vol.grid}</span>
        </nav>
      </div>

      <main>
        {/* ============ SKU HEAD ============ */}
        <div className="wrap">
          <section className="sku-head">
            <div className="sku-preview-col" aria-label={`${task.name} ${lvName} 紙面プレビュー`}>
              <div className="spv-head">
                <span className="spv-head-stamp">{task.name} {lvName}</span>
                <span className="spv-head-sub">紙面プレビュー · 全 {QUESTIONS_PER_VOL} 問</span>
              </div>
              <SkuPrintPreview sku={vol.sku} grid={vol.grid} />
            </div>

            <div className="sku-meta">
              <div className="sku-tag-row">
                <span>{letter}</span><span className="dot">·</span>
                <span>{groupLabel}</span><span className="dot">·</span>
                <span>Lv.{vol.lv} {lvName}</span><span className="dot">·</span>
                <span>Vol.{vol.volNo}</span>
                {vol.variant && (<><span className="dot">·</span><span>{vol.variant}</span></>)}
              </div>
              <h1 className="sku-name">{task.name} {lvName}<br />— Vol.{vol.volNo}・{vol.grid}</h1>
              <p className="sku-promise">{vol.promise ?? vol.blurb}</p>

              <div className="price-row">
                <div className="price-yen">¥{PRICE}</div>
                <div className="price-meta">税込 · 全 {QUESTIONS_PER_VOL} 問 · PDF ダウンロード</div>
              </div>

              <div className="cta-row">
                <a className="btn-strong" href="#">カートへ →</a>
                <a className="btn-medium" href="#">サンプル 1 枚を見る</a>
              </div>

              <div className="spec-table">
                <div className="spec-row"><span className="spec-label">紙サイズ</span><span className="spec-value">A4・B4・A3（縦横自由・購入後も変更可）</span></div>
                <div className="spec-row"><span className="spec-label">問題数</span><span className="spec-value mono">{QUESTIONS_PER_VOL} 問</span></div>
                <div className="spec-row"><span className="spec-label">グリッド</span><span className="spec-value mono">{vol.grid}</span></div>
                {vol.variant && (
                  <div className="spec-row"><span className="spec-label">この巻の特徴</span><span className="spec-value">{vol.variant}</span></div>
                )}
                <div className="spec-row"><span className="spec-label">対象目安</span><span className="spec-value">{vol.ageLabel}</span></div>
                <div className="spec-row"><span className="spec-label">所要時間</span><span className="spec-value">1 問 1 — 2 分</span></div>
                <div className="spec-row"><span className="spec-label">最終改訂</span><span className="spec-value mono">{latest.ver} · {latest.date}</span></div>
              </div>
            </div>
          </section>
        </div>

        {/* ============ LEVEL LADDER ============ */}
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
                </article>
              ))}
            </div>

            {vol.observeNote && (
              <aside className="memo--observe" style={{ marginTop: 32, maxWidth: 720 }}>
                <div className="memo-label">ここを見てください</div>
                <p className="memo-body">{vol.observeNote}</p>
                <div className="memo-date">{latest.date}</div>
              </aside>
            )}
          </div>
        </section>

        {/* ============ INSIDE ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">この 1 冊に入っているもの</h2>
            <p className="lead">{QUESTIONS_PER_VOL} 問・PDF・親向け解説 + 改訂履歴。¥{PRICE} 一律、サブスクなし。</p>

            <div className="inside-grid">
              <div className="inside-cell">
                <div><span className="ic-num">{QUESTIONS_PER_VOL}</span><span className="ic-unit">問</span></div>
                <div className="ic-label">むずかしさを刻んだ出題順</div>
              </div>
              <div className="inside-cell">
                <div><span className="ic-num">2</span><span className="ic-unit">分 / 問</span></div>
                <div className="ic-label">1 セッション 15 — 25 分</div>
              </div>
              <div className="inside-cell">
                <div><span className="ic-num">¥{PRICE}</span></div>
                <div className="ic-label">買い切り · 印刷自由 · 兄妹再利用可</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ RATIONALE（店主から） ============ */}
        {vol.ownerNote && (
          <section className="s">
            <div className="wrap">
              <h2 className="h2-product">なぜ Lv.{vol.lv} にこの巻が来るか</h2>
              <aside className="memo--rationale" style={{ maxWidth: 720 }}>
                <div className="memo-label">店主から</div>
                <p className="memo-body">{vol.ownerNote}</p>
              </aside>
            </div>
          </section>
        )}

        {/* ============ PARENTS（親へのひとこと） ============ */}
        {vol.parentNote && (
          <section className="s">
            <div className="wrap">
              <h2 className="h2-product">続け方</h2>
              <aside className="memo--parents" style={{ maxWidth: 720 }}>
                <div className="memo-label">親へのひとこと</div>
                <p className="memo-body" style={{ whiteSpace: "pre-line" }}>{vol.parentNote}</p>
              </aside>
            </div>
          </section>
        )}

        {/* ============ REVISION HISTORY ============ */}
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

        {/* ============ RELATED ============ */}
        {related.length > 0 && (
          <section className="s">
            <div className="wrap">
              <h2 className="h2-product">つぎの一冊・近くの一冊</h2>
              <div className="related">
                {related.map((c) => (
                  <a className="related-card" href={volHref(c.task, c.vol)} key={c.vol.sku}>
                    <img src={taskIcon(c.task.slug)} alt="" />
                    <div>
                      <div className="rc-row">{GROUP_LETTER[c.task.groupIdx]} · {c.task.name} · Lv.{c.vol.lv}</div>
                      <div className="rc-name">{volTitle(c.task, c.vol)}</div>
                      <div className="rc-promise">{c.vol.blurb}</div>
                    </div>
                  </a>
                ))}
              </div>
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
