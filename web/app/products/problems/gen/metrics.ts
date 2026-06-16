/* =========================================================================
   難易度メトリクスの自動算出（schema.ts ProblemMetrics の実装）
   入力は normalizeEdges 済みの辺集合（単位区間・重複なし）を前提とする。
   - lines: 同一直線上で端点が連続する辺をひとつの「見た目の線分」に併合して数える
   - diagonals / diagonalAngleKinds: 併合後の線分で判定
   - crossings: 端点共有を除く線分交差（T字接触＝端点が他線分の内部に乗る場合も含む）
   - components: union-find 連結成分
   - symmetry: 8 変換（鏡映4・回転2）で辺集合が不変か
   ========================================================================= */

import type { EdgeT, Pt, ProblemMetrics, SymmetryKind } from "../schema";
import { edgeKey, normalizeEdge } from "../schema";

/* ---- 見た目の線分への併合 ---- */
type Seg = { a: Pt; b: Pt };

function dirOf(e: EdgeT): string {
  const dc = e[1][0] - e[0][0];
  const dr = e[1][1] - e[0][1];
  const g = Math.max(1, gcd(Math.abs(dc), Math.abs(dr)));
  return `${dc / g},${dr / g}`; // 正規化済み辺は a<b なので向きは一意
}

function gcd(a: number, b: number): number {
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

const pk = (p: Pt) => `${p[0]},${p[1]}`;

/* 同方向・端点連続の辺をチェーンに併合して maximal な線分のリストを返す */
export function mergedSegments(edges: EdgeT[]): Seg[] {
  const byDir = new Map<string, EdgeT[]>();
  for (const e of edges) {
    const d = dirOf(e);
    if (!byDir.has(d)) byDir.set(d, []);
    byDir.get(d)!.push(e);
  }
  const segs: Seg[] = [];
  for (const group of byDir.values()) {
    // 端点 → 辺 のグラフで連結チェーンをたどる（同方向なので分岐しない）
    const startOf = new Map<string, EdgeT>(); // a端 → 辺
    const hasIncoming = new Set<string>();    // b端の集合
    for (const e of group) {
      startOf.set(pk(e[0]), e);
      hasIncoming.add(pk(e[1]));
    }
    for (const e of group) {
      if (hasIncoming.has(pk(e[0]))) continue; // チェーン先頭でない
      let cur = e;
      while (startOf.has(pk(cur[1]))) cur = startOf.get(pk(cur[1]))!;
      segs.push({ a: e[0], b: cur[1] });
    }
  }
  return segs;
}

/* ---- 交差判定 ---- */
function orient(a: Pt, b: Pt, c: Pt): number {
  return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
}

/* 2 線分が互いの内部を貫いて交わるか（X 型の真の交差のみ）。
   角（端点共有）・T 字の枝分かれ（端点が他線分の内部に接続）は
   「接続」であって交差に数えない（点描写の難易度感覚に合わせる）。 */
function segsCross(s: Seg, t: Seg): boolean {
  const o1 = orient(s.a, s.b, t.a);
  const o2 = orient(s.a, s.b, t.b);
  const o3 = orient(t.a, t.b, s.a);
  const o4 = orient(t.a, t.b, s.b);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}

/* ---- union-find ---- */
function countComponents(edges: EdgeT[]): number {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== c) { const nx = parent.get(c)!; parent.set(c, r); c = nx; }
    return r;
  };
  for (const e of edges) {
    const a = pk(e[0]), b = pk(e[1]);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  }
  const roots = new Set<string>();
  for (const k of parent.keys()) roots.add(find(k));
  return roots.size;
}

/* ---- 対称性 ---- */
const TRANSFORMS: Record<SymmetryKind, (p: Pt, n: number) => Pt> = {
  v: ([c, r], n) => [n - 1 - c, r],
  h: ([c, r], n) => [c, n - 1 - r],
  d1: ([c, r]) => [r, c],
  d2: ([c, r], n) => [n - 1 - r, n - 1 - c],
  r90: ([c, r], n) => [n - 1 - r, c],
  r180: ([c, r], n) => [n - 1 - c, n - 1 - r],
};

function detectSymmetry(edges: EdgeT[], n: number): SymmetryKind[] {
  const keys = new Set(edges.map(edgeKey));
  const out: SymmetryKind[] = [];
  for (const kind of Object.keys(TRANSFORMS) as SymmetryKind[]) {
    const f = TRANSFORMS[kind];
    const ok = edges.every((e) => keys.has(edgeKey(normalizeEdge([f(e[0], n), f(e[1], n)]))));
    if (ok) out.push(kind);
  }
  return out;
}

/* ---- 本体 ---- */
export function computeMetrics(edges: EdgeT[], n: number): ProblemMetrics {
  const segs = mergedSegments(edges);

  let diagonals = 0;
  const angleKinds = new Set<string>();
  for (const s of segs) {
    const dc = s.b[0] - s.a[0];
    const dr = s.b[1] - s.a[1];
    if (dc !== 0 && dr !== 0) {
      diagonals++;
      const g = gcd(Math.abs(dc), Math.abs(dr));
      angleKinds.add(`${Math.abs(dc / g)}:${Math.abs(dr / g)}`); // 45°系は全部 "1:1"
    }
  }

  let crossings = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++)
      if (segsCross(segs[i], segs[j])) crossings++;

  const pts = new Set<string>();
  for (const e of edges) { pts.add(pk(e[0])); pts.add(pk(e[1])); }

  return {
    lines: segs.length,
    diagonals,
    diagonalAngleKinds: angleKinds.size,
    hasNon45: [...angleKinds].some((k) => k !== "1:1"), // 45°系は全部 "1:1"・それ以外＝非45°
    crossings,
    components: countComponents(edges),
    pointsUsed: pts.size,
    symmetry: detectSymmetry(edges, n),
  };
}
