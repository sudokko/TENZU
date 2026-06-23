/* =========================================================================
   タスク別商品一覧テンプレート（/products/{slug}・9 タスク共通）
   構成: パンくず → タスクヘッド（Fig＋desc＋全 N 巻）→ Lv セクション
   （id="lv{n}" アンカー＝TOP/一覧ハブのチップ着地点）→ フッタ導線。
   live 巻＝詳細ページへのカード／scaffold 巻＝「準備中」で陳列のみ
   （棚の全体像は隠さない）。歯抜け Lv はセクション自体を出さない。
   ========================================================================= */

import SiteHeader from "../SiteHeader";
import { catalogTaskBySlug } from "../catalog";
import {
  LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL, firstVol,
  type ProductTask,
} from "./data";
import "./product.css";

export default function TaskListPage({ task }: { task: ProductTask }) {
  const cat = catalogTaskBySlug(task.slug);
  const Fig = cat?.task.Fig;
  const star = firstVol(task);

  const sections = LEVEL_NAMES.map((name, i) => ({
    lv: i + 1,
    name,
    note: cat?.task.notes[i] ?? "",
    vols: task.vols.filter((x) => x.lv === i + 1),
  })).filter((s) => s.vols.length > 0);

  return (
    <>
      <SiteHeader currentNav="商品" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/products">商品</a><span className="sep">/</span>
          <a href="/products">{cat?.group.label}</a><span className="sep">/</span>
          <span className="cur">{task.name}</span>
        </nav>
      </div>

      <main>
        {/* ============ タスクヘッド ============ */}
        <div className="wrap">
          <section className="plp-head">
            <div className="plp-head-fig">{Fig && <Fig />}</div>
            <div className="plp-head-meta">
              <p className="plp-kicker">{cat?.group.label}</p>
              <h1 className="plp-h1">{task.name}</h1>
              <p className="plp-desc">{cat?.task.desc}</p>
              <p className="plp-stat">
                全 {task.vols.length} 巻 ・ 1 冊 {QUESTIONS_PER_VOL} 問 ・ ¥{PRICE} 一律
              </p>
            </div>
          </section>
        </div>

        {/* ============ Lv セクション（チップ着地アンカー） ============ */}
        {sections.map((s) => (
          <section className="s" id={`lv${s.lv}`} key={s.lv}>
            <div className="wrap">
              <h2 className="h2-product">Lv.{s.lv} {s.name}</h2>
              {s.note && <p className="lead">{s.note}</p>}

              <div className="plp-cards">
                {s.vols.map((vol) => {
                  const isStar = vol.sku === star.sku;
                  const body = (
                    <>
                      <div className="plp-card-top">
                        <span className="plp-card-vol">Vol.{vol.volNo}</span>
                        <span className="plp-card-grid">{vol.grid}</span>
                        {vol.variant && <span className="plp-card-variant">{vol.variant}</span>}
                        {isStar && <span className="plp-card-star">★ 最初の1冊</span>}
                        {vol.status === "scaffold" && <span className="plp-card-soon">準備中</span>}
                      </div>
                      <p className="plp-card-blurb">{vol.blurb}</p>
                      <div className="plp-card-foot">
                        <span className="plp-card-age">{vol.ageLabel}</span>
                        <span className="plp-card-price">
                          {QUESTIONS_PER_VOL} 問 ・ ¥{PRICE}
                          {vol.status === "live" && <span className="plp-card-go"> →</span>}
                        </span>
                      </div>
                    </>
                  );
                  return vol.status === "live" ? (
                    <a className="plp-card" href={`/products/${vol.sku}`} key={vol.sku}>{body}</a>
                  ) : (
                    <div className="plp-card is-soon" key={vol.sku} aria-disabled="true">{body}</div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        {/* ============ フッタ導線 ============ */}
        <section className="s">
          <div className="wrap">
            <div className="plp-foot">
              <p className="plp-foot-note">
                どの巻から始めるか迷ったら、手ごたえで選べるガイドがあります。年齢はめやすです。
              </p>
              <div className="plp-foot-actions">
                <a className="btn-medium" href="/level-guide">レベル選びガイドへ →</a>
                <a className="btn-weak" href="/products">ほかの種類を見る →</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
