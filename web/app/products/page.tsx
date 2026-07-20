/* =========================================================================
   /products — 商品一覧まとめ（標準＝リスト一枚型）
   構成: 一行リード → レベル帯グラフ（5段階×年齢めやす）→ 3群×タスク行。
   タスク行＝アイコン＋名前＋一言解説＋レベルチップ（一歩〜発展・存在する
   レベルだけクリッカブル・巻数は出さない）。チップは /products/{slug}#lv{n} へ。
   ========================================================================= */

import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { GROUPS, LEVELS, LevelGraph, SiteFooter, TOTAL_KINDS, TOTAL_VOL } from "../catalog";
import { TASK_MINIFIG } from "./task-minifigs";
import "./product.css";

export const metadata: Metadata = {
  title: `商品一覧 — ${TOTAL_KINDS} 種類 × 5 段階 · TENZU`,
  description:
    `点描写プリントの品ぞろえ。3 つの力 × ${TOTAL_KINDS} 種類 × 5 レベル・計 ${TOTAL_VOL} 巻。¥200 一律・サブスクなし。`,
};

/* レベルチップの短縮表記（Lv.1〜5 順） */
const LV_SHORT = ["入門", "初級", "基礎", "応用", "発展"];

/* 力スタンプ（漢字一字＝力の本質・群 index 順）。「重」は「動」と字面がかぶるため「組」を採用。 */
const FORCE_STAMPS = ["写", "動", "組"];

export default function ProductsHub() {
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

          {/* レベルの解説図（5段階×対象年齢のめやす・帯グラフ） */}
          <div className="level-guide plpc-levelband">
            <p className="level-guide-label">レベル目安表</p>
            <div className="lvgraph-wrap"><LevelGraph /></div>
          </div>

          {/* 3群×タスク行（案A: 力スタンプ見出し＋群パネル＋白カード行・図版は実問題準拠の 2〜3 ペイン） */}
          <div className="plpc-list">
            {GROUPS.map((g, gi) => (
              <section className="plpc-group" id={`cat-g${gi + 1}`} key={g.label}>
                <div className="plpc-force-head">
                  <span className="plpc-stamp" aria-hidden="true">{FORCE_STAMPS[gi]}</span>
                  <div>
                    <h2 className="plpc-force-title">{g.label}</h2>
                    <p className="plpc-force-sub">{g.sub}</p>
                  </div>
                </div>
                {g.tasks.map((t) => {
                  const Fig = TASK_MINIFIG[t.slug];
                  return (
                    <div className="plpc-row" key={t.slug}>
                      <div className="plpc-row-main">
                        <p className="plpc-name">{t.name}</p>
                        <p className="plpc-desc">{t.desc}</p>
                      </div>
                      <span className="plpc-fig">{Fig && <Fig />}</span>
                      <div className="plpc-lvs">
                        {LEVELS.map((name, i) =>
                          t.lv[i] > 0 ? (
                            <a
                              className="plpc-lv"
                              href={`/products/${t.slug}#lv${i + 1}`}
                              key={name}
                              aria-label={`${t.name} ${name}`}
                            >
                              {LV_SHORT[i]}
                            </a>
                          ) : (
                            <span className="plpc-lv is-off" key={name} aria-hidden="true">
                              {LV_SHORT[i]}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          {/* 棚を見終えて迷った人への導線（レベル選びガイド） */}
          <a className="level-guide-cta plpc-guide-cta" href="/level-guide">
            <span className="level-guide-cta-main">どこから始めるか迷ったら、<b>レベル選びガイド</b>へ。</span>
            <span className="level-guide-cta-sub">4 つの質問に答えると、はじめる位置の目安とおすすめの一冊が出ます →</span>
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
