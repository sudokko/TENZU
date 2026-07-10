"use client";

/* =========================================================================
   DoneScreen — PDF 書き出し後の完了画面（案A・動的レコメンド）。copy 専用。
   funnel §14: サンクスページが広告回収の勝負所。「次の3冊」へつなぐ。
   模写タスク8段ラダー（products/data.ts SSOT）から
   「作った問題と同じグリッドの最初の Vol」を起点に連続3冊を引く。
   3×3 のみ斜め有無で起点が分岐（#1 直線のみ / #2 ななめ導入）。
   ========================================================================= */

import {
  taskBySlug, volHref, LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL, type Vol,
} from "../products/data";
import type { GridSize } from "../products/capabilities";
import { INK, type Edge } from "./core/geometry";

export const COPY_TASK = taskBySlug("copy")!;

export function recommendVols(maxGrid: GridSize, usedDiag: boolean): Vol[] {
  const vols = COPY_TASK.vols; // data.ts の並び＝ラダー順
  let start = vols.findIndex((x) => x.grid === `${maxGrid}×${maxGrid}`);
  if (start < 0) start = 0;
  if (maxGrid === 3 && usedDiag) start = 1;
  start = Math.min(start, vols.length - 3);
  return vols.slice(start, start + 3);
}

export function hasDiagonal(problems: { edges: Edge[] }[]): boolean {
  return problems.some((p) =>
    p.edges.some((e) => e.a.c !== e.b.c && e.a.r !== e.b.r));
}

function DotThumb({ grid }: { grid: string }) {
  const n = parseInt(grid, 10) || 3;
  const inset = 10;
  const step = (72 - inset * 2) / (n - 1);
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      dots.push(
        <circle key={`${c}-${r}`}
          cx={inset + c * step} cy={inset + r * step}
          r={n <= 4 ? 2.4 : 2} fill={INK} />,
      );
    }
  }
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={`${grid} の点のならび`}>
      {dots}
    </svg>
  );
}

const DONE_STARS = ["★ 同じ細かさで", "つぎの一歩", "そのさき"];

function doneMemo(maxGrid: GridSize, usedDiag: boolean): string {
  if (maxGrid === 3 && !usedDiag) {
    return "まっすぐの線がすらすら書けていたら、つぎは「斜め」が壁になります。同じ3×3のまま、斜め線だけが加わる一冊を下に置いておきますね。";
  }
  if (maxGrid >= 6) {
    return `${maxGrid}×${maxGrid}まで描けたら、もう十分すぎる手ごたえです。あとは角度を自由にしたり、紙の上で好きなだけ伸ばしたり。同じ細かさから始められる一冊も、下に置いておきますね。`;
  }
  if (maxGrid >= 5) {
    return "5×5がちょうどよければ、もう点描写の標準サイズです。ここから先は、角度が自由になったり、マスがもっと広がったり。一段ずつ伸ばしていけます。";
  }
  return "いま作った問題が「ちょうどいい」と感じたら、その手ごたえがいちばんの目安です。同じ細かさから始められる一冊を、下に置いておきますね。";
}

export function DoneScreen({
  reco, count, onBack,
}: {
  reco: { maxGrid: GridSize; usedDiag: boolean; vols: Vol[] };
  count: number;
  onBack: () => void;
}) {
  return (
    <main className="maker-done">
      <div className="done-inner">

        <span className="done-check">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="#2C6E7F" strokeWidth="1.5" />
            <path d="M4.8 8.2 7 10.4 11.2 5.8" fill="none" stroke="#2C6E7F"
              strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          PDF をダウンロードしました · {count} 問
        </span>
        <h1 className="done-h1">きょうの一枚、できあがり。</h1>
        <p className="done-lead">あとはダウンロードした PDF を印刷して、紙と鉛筆で。おうちのプリンタでも、コンビニ印刷でも。</p>

        <div className="done-memo">
          <span className="who">— 店主から</span>
          {doneMemo(reco.maxGrid, reco.usedDiag)}
        </div>

        <hr className="done-dashed" />

        <div className="done-next">
          <span className="done-basis">
            あなたが作った問題: 最大 {reco.maxGrid}×{reco.maxGrid} · 斜め線{reco.usedDiag ? "あり" : "なし"}
          </span>
          <h3>この細かさなら、ここから。</h3>
          <p className="sub">
            いま作った問題と同じ細かさから、一段ずつ。1冊 = {QUESTIONS_PER_VOL}問 / A4 / PDF。中身はぜんぶ見られます。
          </p>
          <div className="done-sku-row">
            {reco.vols.map((vol, i) => (
              <a className="done-sku" key={vol.sku} href={volHref(COPY_TASK, vol)}>
                <div className="thumb"><DotThumb grid={vol.grid} /></div>
                <span className="star">{DONE_STARS[i]}</span>
                <div className="tag">{COPY_TASK.name} / {vol.grid}</div>
                <div className="name">Lv.{vol.lv} {LEVEL_NAMES[vol.lv - 1]} Vol.{vol.volNo}</div>
                <div className="desc">{vol.blurb}</div>
                <div className="meta">{vol.ageLabel} · {QUESTIONS_PER_VOL} 問 · ¥{PRICE}</div>
              </a>
            ))}
          </div>
          <div className="done-links">
            <a className="done-ghost" href="/level-guide">どのレベルが合うか迷ったら — レベル選びガイドへ</a>
          </div>
        </div>

        <div className="done-upsell">
          <span className="who">メーカーをもっと使うなら</span>
          <p>
            鏡・移動・回転・欠け補完・重ね・分解・折り重ね。模写の次の一手は、
            「動かす・重ねる」メーカー（各 ¥980 の買い切り）。頭の中で形を操る練習へ進めます。
          </p>
          <a className="done-ghost" href="/makers">メーカー一覧を見る →</a>
        </div>

        <div className="done-actions">
          <button type="button" className="done-back" onClick={onBack}>← つづきを作る</button>
          <a className="done-home" href="/">お店を見る →</a>
        </div>

      </div>
    </main>
  );
}
