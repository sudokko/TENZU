/* =========================================================================
   機械フィルタ — 自明にダメな候補を検品前に弾く
   normalizeEdges（重複・長さ0・共線オーバーラップは正規化で解消済み）の
   後段として、形の成立条件とパラメータ適合を判定する。
   ========================================================================= */

import type { EdgeT, ProblemMetrics } from "../schema";
import { edgeKey } from "../schema";
import type { CopyParams } from "./ladder";

const within = (v: number, [min, max]: [number, number]) => v >= min && v <= max;

/* 形の広がり（bbox スパン）が両方向とも min 以上か */
export function bboxOk(edges: EdgeT[], minSpan: number): boolean {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return cMax - cMin >= minSpan && rMax - rMin >= minSpan;
}

/* 次数1の頂点（ヒゲ）の数。閉じた形を好む巻では制限する */
export function danglingCount(edges: EdgeT[]): number {
  const deg = new Map<string, number>();
  for (const e of edges) for (const p of e) {
    const k = `${p[0]},${p[1]}`;
    deg.set(k, (deg.get(k) ?? 0) + 1);
  }
  let n = 0;
  for (const d of deg.values()) if (d === 1) n++;
  return n;
}

/* パラメータ適合（metrics は computeMetrics 済みのもの） */
export function paramsOk(edges: EdgeT[], m: ProblemMetrics, p: CopyParams): boolean {
  if (!within(m.lines, p.lines)) return false;
  if (!within(m.diagonals, p.diagonals)) return false;
  if (!within(m.crossings, p.crossings)) return false;
  if (!within(m.components, p.components)) return false;
  if (p.slopes !== "any" && m.diagonalAngleKinds > 1) return false; // 非45°混入
  if (!bboxOk(edges, p.bbox)) return false;
  // ヒゲ（次数1の端点）の上限。T 字=3・十字=4 は定番形なので許容しつつ、
  // 全部ヒゲの「線の散らばり」だけを防ぐ
  if (danglingCount(edges) > m.components * 2 + 2) return false;
  return true;
}

/* 非45°のななめ辺（ナイト傾き等）を含むか — slopes:"any" の巻は最低 1 本要求 */
export function hasNon45(edges: EdgeT[]): boolean {
  return edges.some((e) => {
    const dc = Math.abs(e[1][0] - e[0][0]);
    const dr = Math.abs(e[1][1] - e[0][1]);
    return dc !== 0 && dr !== 0 && dc !== dr;
  });
}

/* 候補同士の類似度（Jaccard on edge keys）。巻内多様性の確保に使う */
export function jaccard(a: EdgeT[], b: EdgeT[]): number {
  const ka = new Set(a.map(edgeKey));
  const kb = new Set(b.map(edgeKey));
  let inter = 0;
  for (const k of ka) if (kb.has(k)) inter++;
  return inter / (ka.size + kb.size - inter);
}
