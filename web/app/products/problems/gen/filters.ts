/* =========================================================================
   機械フィルタ — 自明にダメな候補を検品前に弾く
   normalizeEdges（重複・長さ0・共線オーバーラップは正規化で解消済み）の
   後段として、形の成立条件とパラメータ適合を判定する。
   ========================================================================= */

import type { EdgeT, ProblemMetrics } from "../schema";
import { edgeKey, symmetryWeight } from "../schema";
import type { CopyParams } from "./ladder";

const within = (v: number, [min, max]: [number, number]) => v >= min && v <= max;
const pk = (p: [number, number]) => `${p[0]},${p[1]}`;

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

/* パラメータ適合（metrics は computeMetrics 済みのもの）。
   strictTidy=false（生成ループの relax フェーズ）では整いゲートを外し、
   形の成立条件だけを課す＝12問が揃わない時のフォールバック。 */
export function paramsOk(edges: EdgeT[], m: ProblemMetrics, p: CopyParams, strictTidy = true): boolean {
  if (!within(m.lines, p.lines)) return false;
  if (!within(m.diagonals, p.diagonals)) return false;
  if (!within(m.crossings, p.crossings)) return false;
  if (!within(m.components, p.components)) return false;
  if (p.slopes !== "any" && m.diagonalAngleKinds > 1) return false; // 非45°混入
  if (!bboxOk(edges, p.bbox)) return false;
  // ヒゲ（次数1の端点）の上限。T 字=3・十字=4 は定番形なので許容しつつ、
  // 全部ヒゲの「線の散らばり」だけを防ぐ（既存の緩い天井）
  if (danglingCount(edges) > m.components * 2 + 2) return false;
  // ---- 整いゲート（ラダーに値があるときだけ効く・relax 時は外す） ----
  if (strictTidy) {
    if (!maxDanglingOk(edges, p.maxDangling)) return false; // ヒゲ厳格化
    if (!centerOk(edges, p.grid, p.centerTol)) return false; // 隅寄り排除
    if (!minCompEdgesOk(edges, p.minCompEdges)) return false; // 1辺の孤立片を排除
    if (!angleKindsOk(m, p.maxAngleKinds)) return false;     // ナイト傾きの暴れ抑制
  }
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

/* =========================================================================
   「整い」系ヘルパ — 見た目の秩序を測る。tidyScore（ソフト・採用順）と
   整いゲート（ハード・paramsOk から呼ぶ／Phase 2 で結線）で共用する。
   ========================================================================= */

/* bbox 中心がグリッド中心 (n-1)/2 からどれだけ離れているか（マンハッタン・半単位）。
   隅寄りの図形を検知する。0＝完全中央。 */
export function offCenter(edges: EdgeT[], n: number): number {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  const center = (n - 1) / 2;
  return Math.abs((cMin + cMax) / 2 - center) + Math.abs((rMin + rMax) / 2 - center);
}

/* union-find で各連結成分の辺数を数え、最小成分の辺数を返す。
   1（＝単独辺の孤立片）が混じると「散らばり」に見える。多構成巻でも
   「各かたちがちゃんとした形か」を測れる（最大成分の支配率より適切）。 */
export function minComponentEdges(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    while (parent.get(x) !== r) { const nx = parent.get(x)!; parent.set(x, r); x = nx; }
    return r;
  };
  const union = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  };
  for (const e of edges) union(pk(e[0]), pk(e[1]));
  const count = new Map<string, number>();
  for (const e of edges) {
    const r = find(pk(e[0]));
    count.set(r, (count.get(r) ?? 0) + 1);
  }
  return Math.min(...count.values());
}

/* 閉路ボーナス: 循環数（E - V + 成分数）。閉じた形ほど大きい。木構造は 0。 */
export function closedLoops(edges: EdgeT[], components: number): number {
  const verts = new Set<string>();
  for (const e of edges) { verts.add(pk(e[0])); verts.add(pk(e[1])); }
  return Math.max(0, edges.length - verts.size + components);
}

/* 整いスコア（高いほど整って見える）。採用順の同難度タイブレークに使う。
   破綻（ヒゲ・隅寄り・角度の乱れ）は減点、対称・閉路は加点。 */
export function tidyScore(m: ProblemMetrics, edges: EdgeT[], n: number): number {
  return symmetryWeight(m.symmetry)
    - 0.6 * danglingCount(edges)
    - 0.8 * offCenter(edges, n)
    + 1.0 * closedLoops(edges, m.components)
    - 1.0 * Math.max(0, m.diagonalAngleKinds - 1);
}

/* ---- 整いゲート（ハード・Phase 2 で paramsOk から呼ぶ） ----
   ラダーに該当フィールドが無ければ true（＝従来挙動）にフォールバックする。 */
export function maxDanglingOk(edges: EdgeT[], max: number | undefined): boolean {
  return max === undefined || danglingCount(edges) <= max;
}
export function centerOk(edges: EdgeT[], n: number, tol: number | undefined): boolean {
  return tol === undefined || offCenter(edges, n) <= tol;
}
export function minCompEdgesOk(edges: EdgeT[], min: number | undefined): boolean {
  return min === undefined || minComponentEdges(edges) >= min;
}
export function angleKindsOk(m: ProblemMetrics, max: number | undefined): boolean {
  return max === undefined || m.diagonalAngleKinds <= max;
}
