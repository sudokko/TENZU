/* =========================================================================
   D の計算を実際の収録問題でステップ解説する（設計台帳「D の出し方」内）
   問題は published から条件で自動選定する＝特定の問題 id を直書きしない。
   atelier で問題が差し替わっても、条件に合う別の問題で解説が組み直される。
   数値はすべて metrics / difficulty.parts（backfill 済み）からの導出。
   ========================================================================= */

import { PUBLISHED } from "../problems/published";
import { roundD } from "../problems/gen/difficulty";
import { volBySku, LEVEL_NAMES } from "../data";
import type { Problem } from "../problems/schema";

type Example = { sku: string; title: string; no: number; p: Problem };

/* published を SKU 名順に走査し、条件に合う最初の問題を返す。
   線の少ない問題を優先（図と数字が追いやすい） */
function pick(pred: (p: Problem) => boolean): Example | undefined {
  const hits: Example[] = [];
  for (const sku of Object.keys(PUBLISHED).sort()) {
    const set = PUBLISHED[sku];
    set.problems.forEach((p, i) => {
      if (p.grid.type !== "square" || !p.difficulty?.parts || !pred(p)) return;
      const hit = volBySku(sku);
      const title = hit
        ? `${hit.task.name} ${LEVEL_NAMES[hit.vol.lv - 1]} Vol.${hit.vol.volNo} の問${i + 1}`
        : `${sku} 問${i + 1}`;
      hits.push({ sku, title, no: i + 1, p });
    });
  }
  hits.sort((a, b) => a.p.metrics.lines - b.p.metrics.lines);
  return hits[0];
}

/* 図（点格子＋線）。紙面と同じ意匠のミニ版 */
function Fig({ p }: { p: Problem }) {
  if (p.grid.type !== "square") return null;
  const n = p.grid.n;
  const S = 26, M = 14;
  const W = (n - 1) * S + M * 2;
  const c = (v: number) => M + v * S;
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W} role="img"
      aria-label={`${n}×${n} の点格子に描かれた例題の図形`}>
      {Array.from({ length: n * n }, (_, i) => (
        <circle key={i} cx={c(i % n)} cy={c(Math.floor(i / n))} r={2.3} fill="#9AA0AA" />
      ))}
      {p.edges.map((e, i) => (
        <line key={`e${i}`} x1={c(e[0][0])} y1={c(e[0][1])} x2={c(e[1][0])} y2={c(e[1][1])}
          stroke="#3A424E" strokeWidth={2.8} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/* 表示用の丸め。D 本体の丸めは式側（roundD）と同じ小数第1位 */
const r1 = roundD;
const AXIS_JA = { v: "左右", h: "上下", d: "ななめ" } as const;

/* 1 例ぶんのステップ解説。parts（実計算の寄与値）を式の語彙で言葉にする */
function Walkthrough({ ex }: { ex: Example }) {
  const m = ex.p.metrics;
  const parts = ex.p.difficulty!.parts!;
  const d = ex.p.difficulty!.value;
  const tate = m.lines - m.diagonals;
  const a45 = m.diagonals - m.non45;
  const E = parts.E ?? 0;
  const k = parts.k ?? 1;
  const G = parts.G ?? 0;
  const strokes = parts.strokes ?? 0;
  const brk = parts.brk ?? 0;
  const axis = m.symAxis && m.symAxis !== "none" ? AXIS_JA[m.symAxis] : undefined;
  /* 丸めは最後の一度だけなので、合計を同じ丸めにかければ D と厳密に一致する。
     一致しない＝ほぼ対称の上限が効いた問題（coverage.ts と同じ判定） */
  const capped = roundD(k * E + G + strokes + brk) !== d;

  const steps: { head: string; body: string }[] = [];

  const lineTerms: string[] = [];
  if (tate > 0) lineTerms.push(`たてよこが${tate}本（1点×${tate}）`);
  if (a45 > 0) lineTerms.push(`45°のななめが${a45}本（1.5点×${a45}）`);
  if (m.non45 > 0) lineTerms.push(`45°でないななめが${m.non45}本`);
  steps.push({
    head: `線を数える → 線の重み ${r1(E)}`,
    body: `${lineTerms.join("、")}。合わせて線の重みは ${r1(E)}。`,
  });

  if (axis && (m.symMiss ?? 0) === 0) {
    steps.push({
      head: `対称を見る → ×${k} で ${r1(k * E)}`,
      body: `この図形は${axis}対称。半分を見れば残りの構造がわかるので、線の重みに ×${k} を掛けて ${r1(E)} → ${r1(k * E)}。`,
    });
  } else if (axis && (m.symMiss ?? 0) >= 1) {
    steps.push({
      head: `対称を見る → ほぼ${axis}対称（ずれ${m.symMiss}本）`,
      body: `${m.symMiss}本だけ対称からずれた「対称くずし」。対称な本体には ×${k} を掛けつつ（${r1(E)} → ${r1(k * E)}）、ずれた線は子どもが対称にそろえて描いてしまう罠なので、あとで 1本＋3点を足す。`,
    });
  } else {
    steps.push({
      head: "対称を見る → 対称なし（×1.0）",
      body: "左右・上下・ななめのどの軸でも折り返して重ならないので、対称の割引はなし。",
    });
  }

  steps.push({
    head: `盤面を見る → 盤面の項 ${r1(G)}`,
    body: `盤面は ${m.boardN}×${m.boardN}、図形の広がりは横${m.bboxW}×縦${m.bboxH}。0.5×${m.boardN} ＋ 0.25×(${m.bboxW}＋${m.bboxH}) ＝ ${r1(G)}。`,
  });

  if ((m.strokes ?? 1) >= 2) {
    steps.push({
      head: `画数を数える → ＋${r1(strokes)}`,
      body: `この図形は一筆では描けず、最低 ${m.strokes} 画。2画目からが負荷なので 0.7×${(m.strokes ?? 1) - 1} ＝ ＋${r1(strokes)}。`,
    });
  } else {
    steps.push({
      head: "画数を数える → 一筆で描ける（＋0）",
      body: "筆を置き直さずに全部の線をなぞれるので、画数の加点はなし。",
    });
  }

  if (brk > 0) {
    steps.push({
      head: `対称くずしを足す → ＋${r1(brk)}`,
      body: `ずれた線 ${m.symMiss} 本 × 3点 ＝ ＋${r1(brk)}。${capped ? "足すと大きくなりすぎるので、上限（対称なしで計算した値の1.10倍）で止める。" : ""}`,
    });
  }

  const sumText = [
    `${k < 1 ? `${k}×${r1(E)}` : r1(E)}`,
    r1(G),
    ...(strokes > 0 ? [r1(strokes)] : []),
    ...(brk > 0 ? [r1(brk)] : []),
  ].join(" ＋ ");
  steps.push({
    head: `合計 → D ＝ ${d}`,
    body: `${sumText} ${capped ? "→ 上限適用で" : "＝"} ${d}（最後に小数第1位へ丸め）。`,
  });

  return (
    <div className="dl-ex">
      <div className="dl-ex-fig">
        <Fig p={ex.p} />
        <p className="dl-ex-cap">{ex.title}</p>
      </div>
      <ol className="dl-ex-steps">
        {steps.map((s) => (
          <li key={s.head}>
            <b>{s.head}</b>
            <span>{s.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function DWorkedExamples() {
  /* 例1: 基本形＝対称あり・2画以上・非45°なし（線・対称・盤面・画数の4項が全部動く） */
  const ex1 = pick((p) =>
    p.metrics.non45 === 0
    && (p.metrics.symMiss ?? 9) === 0
    && (p.metrics.symAxis === "v" || p.metrics.symAxis === "h")
    && (p.metrics.strokes ?? 1) >= 2
    && p.metrics.diagonals > 0,
  ) ?? pick((p) => (p.metrics.symMiss ?? 9) === 0 && (p.metrics.symAxis ?? "none") !== "none");

  /* 例2: 対称くずし＝1本だけずれている図形（罠の扱いを見せる） */
  const ex2 = pick((p) => (p.metrics.symMiss ?? 0) === 1 && p.metrics.non45 === 0)
    ?? pick((p) => (p.metrics.symMiss ?? 0) === 1);

  if (!ex1) return null;
  return (
    <>
      <h3 className="dl-ex-head">実際の問題で計算してみる</h3>
      <Walkthrough ex={ex1} />
      {ex2 && (
        <>
          <h3 className="dl-ex-head">「対称くずし」の問題ではこうなる</h3>
          <Walkthrough ex={ex2} />
        </>
      )}
    </>
  );
}
