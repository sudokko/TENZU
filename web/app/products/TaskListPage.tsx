/* =========================================================================
   タスク別商品一覧テンプレート（/products/{slug}・9 タスク共通）
   構成: パンくず → タスクヘッド（Fig＋desc＋全 N 巻）→ Lv セクション
   （id="lv{n}" アンカー＝TOP/一覧まとめのチップ着地点）→ フッタ導線。
   live 巻＝詳細ページへのカード／scaffold 巻＝「準備中」で陳列のみ
   （棚の全体像は隠さない）。歯抜け Lv はセクション自体を出さない。
   各カード上部に設問 1 問目のサムネイル（VolThumb・published 連動）。
   ========================================================================= */

import SiteHeader from "../SiteHeader";
import AddPresetButton from "../cart/AddPresetButton";
import { catalogTaskBySlug } from "../catalog";
import VolThumb from "./VolThumb";
import {
  LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL, firstVol,
  cartTotal, currentTier, isTaskComplete, taskPresetSkus, volBySku,
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

  /* 通しプリセット。全巻 live のタスクだけに出す（未入稿を含む通しは売らない）。
     価格はカートのまとめ買い割引（data.ts）から導出＝ここは表示するだけ。 */
  const presetSkus = isTaskComplete(task) ? taskPresetSkus(task) : [];
  const presetN = presetSkus.length;
  const presetList = presetSkus.map((s) => volBySku(s)!.vol);
  const presetList0 = presetList[0];
  const presetListZ = presetList[presetList.length - 1];
  const presetGross = presetN * PRICE;
  const presetTotal = cartTotal(presetN);
  const presetTier = currentTier(presetN);

  return (
    <>
      <SiteHeader currentNav="プリントを探す" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/products">商品</a><span className="sep">/</span>
          <a href={cat ? `/products#cat-g${cat.groupIdx + 1}` : "/products"}>{cat?.group.label}</a><span className="sep">/</span>
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
              {/* レベルジャンプ（SEO/パンくず直行者向けの棚内ナビ。まとめのチップと同じ着地点） */}
              <nav className="plp-lvnav" aria-label="レベルへ移動">
                {sections.map((s) => (
                  <a className="plp-lvnav-chip" href={`#lv${s.lv}`} key={s.lv}>
                    Lv.{s.lv} {s.name}<span className="plp-lvnav-vol">{s.vols.length}巻</span>
                  </a>
                ))}
              </nav>

              {/* 通しプリセット（弱）。ここは「買えることを知らせる」役で、決めるのはページ末。 */}
              {presetTier && (
                <>
                  <div className="preset-bar">
                    <AddPresetButton skus={presetSkus} variant="bar" />
                    <span className="preset-spec">
                      Lv.{presetList0.lv} → Lv.{presetListZ.lv} ・ {presetN * QUESTIONS_PER_VOL} 問 ・{" "}
                      <b>¥{presetTotal.toLocaleString()}</b>
                    </span>
                  </div>
                  <p className="preset-note">
                    3 冊から 15%。ちがう種類をまぜても、合計の冊数で決まります。1 冊ずつでも買えます。
                  </p>
                </>
              )}
            </div>
          </section>
        </div>

        {/* ============ Lv セクション（チップ着地アンカー） ============ */}
        {sections.map((s) => (
          <section className="s" id={`lv${s.lv}`} key={s.lv}>
            <div className="wrap">
              <h2 className="h2-product">Lv.{s.lv} {s.name}</h2>
              {/* note を出すのは、その Lv に複数巻あるときだけ（2026-08-08）。
                  1 巻しかない Lv では note が直下のリード文の言い換えにしかならず、
                  同じ内容が 2cm 離れて二度出ていた。複数巻あるときは
                  note＝レベル共通の説明／各リード文＝Vol ごとの違い、と役割が分かれる。
                  データ自体は温存（レベル選びガイドの結果画面では単独で使う）。 */}
              {s.note && s.vols.length > 1 && <p className="lead">{s.note}</p>}

              <div className="plp-cards">
                {s.vols.map((vol) => {
                  const isStar = vol.sku === star.sku;
                  const body = (
                    <>
                      <VolThumb vol={vol} taskSlug={task.slug} />
                      <div className="plp-card-top">
                        <span className="plp-card-vol">Vol.{vol.volNo}</span>
                        <span className="plp-card-grid">{vol.grid}</span>
                        {vol.variant && <span className="plp-card-variant">{vol.variant}</span>}
                        {isStar && <span className="plp-card-star">★ いちばんやさしい巻</span>}
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
              {/* 通しプリセット（強）。棚を見きった人の受け皿＝内訳を隠さず出す。 */}
              {presetTier && (
                <div className="preset-card">
                  <div>
                    {/* 旧 kicker「MATOME · N VOLUMES」を撤去（2026-08-08）。ローマ字＋英語の
                        ラベルは、直下の H3 が日本語で同じことを言っており冗長だった。 */}
                    <h3 className="preset-h">{task.name} {presetN} 冊を通しで</h3>
                    <p className="preset-desc">
                      Lv.{presetList0.lv} から Lv.{presetListZ.lv} までの {presetN} 冊。
                      やさしい方から順に、同じ考え方を少しずつ深くしていきます。
                    </p>
                  </div>
                  <ul className="preset-list">
                    {presetList.map((vol) => (
                      <li key={vol.sku}>
                        <span>
                          <span className="v">LV.{vol.lv} VOL.{vol.volNo}</span>{vol.grid}
                        </span>
                        <span className="y">¥{PRICE}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="preset-sum">
                    <div>
                      <span>小計（{presetN} 冊）</span>
                      <span>¥{presetGross.toLocaleString()}</span>
                    </div>
                    <div className="off">
                      <span>まとめ買い {presetTier.min} 冊から {Math.round(presetTier.rate * 100)}%</span>
                      <span>−¥{(presetGross - presetTotal).toLocaleString()}</span>
                    </div>
                    <div className="tot">
                      <span>合計（税込）</span>
                      <span>¥{presetTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  <AddPresetButton skus={presetSkus} variant="card" />
                  <p className="preset-note">ちがう種類をまぜても、合計の冊数で決まります。</p>
                </div>
              )}
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
