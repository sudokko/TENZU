/* =========================================================================
   難易度メトリクスの自動算出（schema.ts ProblemMetrics の実装）
   入力は normalizeEdges 済みの辺集合（単位区間・重複なし）を前提とする。
   - lines: 同一直線上で端点が連続する辺をひとつの「見た目の線分」に併合して数える
   - diagonals / diagonalAngleKinds: 併合後の線分で判定
   - crossings: 端点共有を除く線分交差（T字接触＝端点が他線分の内部に乗る場合も含む）
   - components: union-find 連結成分
   - symmetry: 8 変換（鏡映4・回転2）で辺集合が不変か
   ========================================================================= */

import type { EdgeT, Pt, ProblemMetrics, SolidEdge, SymmetryKind } from "../schema";
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

/* ---- A・B 間の絡み（かさね系・直接計測）----
   図ごとに併合した「見た目の線分」同士を突き合わせ、X 型の真の交差だけ数える。
   旧導出 cross(F) − cross(A) − cross(B) は、F 側の線分併合で A の線と B の線が
   一直線に融合したとき、どちらの図にも無い交差が湧く（例: 正方形 2 つの角接触が
   「長い横線×長い縦線」に化けて幻の X 交差になる）＝いちばん易しい配置ほど
   過大評価する欠陥があった（decisions §3.98）。 */
export function interCrossings(a: EdgeT[], b: EdgeT[]): number {
  const sa = mergedSegments(a);
  const sb = mergedSegments(b);
  let n = 0;
  for (const s of sa) for (const t of sb) if (segsCross(s, t)) n++;
  return n;
}

/* ---- 図の中のもつれ（かさね系「もつれの項」の材料・decisions §3.104）----
   絡み（interCrossings）は A・B のあいだの交差だけを見る。同じ図の中で線が
   交わったり 1 点で枝分かれしたりする負荷は、模写の校正（§3.54）で「交差は
   効かない」と落として以来どのタスクにも入っていなかった。かさね・分解・
   折り重ねは 2 枚を重ね合わせて 1 枚を組み立て直す課題で、「この線はどこから
   どこまでか」を目で追い直す場面が模写より多い＝ここだけ計上する。

   selfCrossings … 同じ図の中の X 交差（線分が互いの内部を貫く）。
   branchPoints … 3 方向以上が集まり、かつ 1 本以上がそこで終わっている格子点。
     ＝角・T 字・星形の中心。「両方が通過するだけ」（＝格子点上の X 交差）は
     selfCrossings が数えるのでここでは除く＝同じ場所を二重に数えない。 */
export function selfCrossings(edges: EdgeT[]): number {
  const segs = mergedSegments(edges);
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) if (segsCross(segs[i], segs[j])) n++;
  }
  return n;
}

export function branchPoints(edges: EdgeT[]): number {
  const dirs = new Map<string, number>();   // その点に集まる「線の向き」の数
  const ends = new Map<string, number>();   // その点で終わっている線分の数
  for (const s of mergedSegments(edges)) {
    const dc = s.b[0] - s.a[0], dr = s.b[1] - s.a[1];
    const g = Math.max(1, gcd(Math.abs(dc), Math.abs(dr)));
    for (let i = 0; i <= g; i++) {
      const k = pk([s.a[0] + (dc / g) * i, s.a[1] + (dr / g) * i]);
      const end = i === 0 || i === g;
      dirs.set(k, (dirs.get(k) ?? 0) + (end ? 1 : 2));
      if (end) ends.set(k, (ends.get(k) ?? 0) + 1);
    }
  }
  let n = 0;
  for (const [k, d] of dirs) if (d >= 3 && (ends.get(k) ?? 0) > 0) n++;
  return n;
}

/* ---- A・B の共有点（分解「共有点」項の材料）----
   両図が同じ格子点にふれている数。辺は normalizeEdges 済み＝単位区間なので、
   図が通る格子点はすべてどこかの辺の端点に現れる（T 字接触・角接触も拾える）。
   45° 斜め同士がマス中央で突き抜けるのは格子点でない＝こちらでなく交差で数える。 */
export function sharedPoints(a: EdgeT[], b: EdgeT[]): number {
  const pa = new Set<string>();
  for (const e of a) { pa.add(pk(e[0])); pa.add(pk(e[1])); }
  const hit = new Set<string>();
  for (const e of b) for (const p of e) {
    const k = pk(p);
    if (pa.has(k)) hit.add(k);
  }
  return hit.size;
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

/* ---- 成分間の隔たり（かさね系「ばらけの項」の材料） ----
   「見た目のかたまり」が 2 つ以上のとき、かたまり同士を最小全域木（Prim）で
   つなぎ、木の各辺の「いちばん近い点どうしのチェビシェフ距離（ななめも 1 マス）」
   を返す。1 かたまり以下なら空配列。
   かたまり＝端点共有の連結成分を、さらに「交差でつながって見える」もの同士で
   併合したもの（45°斜め同士がマス中央で交わると格子点を共有しないが、
   見た目はひとつながり＝離れ小島ではない）。点数・成分数は小さいので総当たり。 */
export function componentGaps(edges: EdgeT[]): number[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  const ptOf = new Map<string, Pt>();
  for (const e of edges) {
    const a = pk(e[0]), b = pk(e[1]);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
    ptOf.set(a, e[0]);
    ptOf.set(b, e[1]);
  }
  const groups = new Map<string, Pt[]>();
  const groupEdges = new Map<string, EdgeT[]>();
  for (const [k, p] of ptOf) {
    const r = find(k);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(p);
  }
  for (const e of edges) {
    const r = find(pk(e[0]));
    if (!groupEdges.has(r)) groupEdges.set(r, []);
    groupEdges.get(r)!.push(e);
  }
  let comps = [...groups.keys()].map((r) => ({ pts: groups.get(r)!, edges: groupEdges.get(r)! }));
  /* 交差でつながって見える成分同士を併合（不動点まで繰り返す） */
  for (let merged = true; merged && comps.length > 1;) {
    merged = false;
    outer: for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const cross = comps[i].edges.some((a) => comps[j].edges.some((b) =>
          segsCross({ a: a[0], b: a[1] }, { a: b[0], b: b[1] })));
        if (!cross) continue;
        comps[i] = {
          pts: [...comps[i].pts, ...comps[j].pts],
          edges: [...comps[i].edges, ...comps[j].edges],
        };
        comps = comps.filter((_, k) => k !== j);
        merged = true;
        break outer;
      }
    }
  }
  if (comps.length <= 1) return [];
  const dist = (a: Pt[], b: Pt[]): number => {
    let min = Infinity;
    for (const p of a) for (const q of b)
      min = Math.min(min, Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])));
    return min;
  };
  const inTree = new Set<number>([0]);
  const gaps: number[] = [];
  while (inTree.size < comps.length) {
    let best = Infinity, bestIdx = -1;
    for (let i = 0; i < comps.length; i++) {
      if (inTree.has(i)) continue;
      for (const j of inTree) {
        const d = dist(comps[i].pts, comps[j].pts);
        if (d < best) { best = d; bestIdx = i; }
      }
    }
    inTree.add(bestIdx);
    gaps.push(best);
  }
  return gaps;
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

/* ---- 図形自身の対称（バウンディングボックス軸・D 式 v3 用）----
   盤面のどこに置かれていても、図形そのものが対称なら検出する（detectSymmetry は
   盤面中心軸なので、隅寄せ配置の多い移動タスク等で対称を取りこぼす）。
   斜め軸は bbox が正方形のときだけ格子に乗るので、そのときだけ判定。
   返り値: 最良軸と「折り返して重ならない見た目の線分」の本数（=対称くずし）。
   軸の優先順は v → h → d（同点なら係数の強い軸を採る）。 */
export function shapeSymmetry(edges: EdgeT[]): { axis: "v" | "h" | "d" | "none"; miss: number } {
  const segs = mergedSegments(edges);
  if (segs.length === 0) return { axis: "none", miss: 0 };
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const s of segs) for (const p of [s.a, s.b]) {
    minC = Math.min(minC, p[0]); maxC = Math.max(maxC, p[0]);
    minR = Math.min(minR, p[1]); maxR = Math.max(maxR, p[1]);
  }
  const segKey = (a: Pt, b: Pt) => {
    const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
    return `${pk(p)}-${pk(q)}`;
  };
  const keys = new Set(segs.map((s) => segKey(s.a, s.b)));
  const axes: ["v" | "h" | "d", (p: Pt) => Pt][] = [
    ["v", (p) => [minC + maxC - p[0], p[1]]],
    ["h", (p) => [p[0], minR + maxR - p[1]]],
  ];
  if (maxC - minC === maxR - minR) {
    axes.push(["d", (p) => [minC + (p[1] - minR), minR + (p[0] - minC)]]);
    axes.push(["d", (p) => [minC + (maxR - p[1]), minR + (maxC - p[0])]]);
  }
  let axis: "v" | "h" | "d" | "none" = "none";
  let miss = segs.length;
  for (const [name, f] of axes) {
    const u = segs.filter((s) => !keys.has(segKey(f(s.a), f(s.b)))).length;
    if (u < miss) { miss = u; axis = name; }
  }
  return { axis, miss };
}

/* ---- 最小ストローク数（画数）----
   全部の線をなぞるのに筆を何回置くか。辺を単位格子ステップに分解した
   グラフで、成分ごとに max(1, 奇数次数点/2) の和（オイラー路の古典）。
   離れ小島（連結成分）と枝分かれによる筆離しの両方をひとつで表す。 */
export function strokeCount(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const deg = new Map<string, number>();
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== c) { const nx = parent.get(c)!; parent.set(c, r); c = nx; }
    return r;
  };
  const uni = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  };
  for (const e of edges) {
    const dc = e[1][0] - e[0][0];
    const dr = e[1][1] - e[0][1];
    const g = Math.max(1, gcd(Math.abs(dc), Math.abs(dr)));
    for (let i = 0; i < g; i++) {
      const p = pk([e[0][0] + (dc / g) * i, e[0][1] + (dr / g) * i]);
      const q = pk([e[0][0] + (dc / g) * (i + 1), e[0][1] + (dr / g) * (i + 1)]);
      deg.set(p, (deg.get(p) ?? 0) + 1);
      deg.set(q, (deg.get(q) ?? 0) + 1);
      uni(p, q);
    }
  }
  const oddByRoot = new Map<string, number>();
  const roots = new Set<string>();
  for (const [k, d] of deg) {
    const r = find(k);
    roots.add(r);
    if (d % 2 === 1) oddByRoot.set(r, (oddByRoot.get(r) ?? 0) + 1);
  }
  let total = 0;
  for (const r of roots) total += Math.max(1, (oddByRoot.get(r) ?? 0) / 2);
  return total;
}

/* ---- 本体 ---- */
export function computeMetrics(edges: EdgeT[], n: number): ProblemMetrics {
  const segs = mergedSegments(edges);

  let diagonals = 0;
  let non45 = 0;
  let non45Gentle = 0;
  const angleKinds = new Set<string>();
  for (const s of segs) {
    const dc = s.b[0] - s.a[0];
    const dr = s.b[1] - s.a[1];
    if (dc !== 0 && dr !== 0) {
      diagonals++;
      const g = gcd(Math.abs(dc), Math.abs(dr));
      const kind = `${Math.abs(dc / g)}:${Math.abs(dr / g)}`; // 45°系は全部 "1:1"
      angleKinds.add(kind);
      if (kind !== "1:1") {
        non45++; // 非45°（ナイト傾き等）の本数。難易度Dの最大ドライバー
        if (kind === "1:2" || kind === "2:1") non45Gentle++; // 2:1系＝ゆるい非45°（D式で軽め）
      }
    }
  }

  let crossings = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++)
      if (segsCross(segs[i], segs[j])) crossings++;

  const pts = new Set<string>();
  for (const e of edges) { pts.add(pk(e[0])); pts.add(pk(e[1])); }

  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const e of edges) for (const p of e) {
    minC = Math.min(minC, p[0]); maxC = Math.max(maxC, p[0]);
    minR = Math.min(minR, p[1]); maxR = Math.max(maxR, p[1]);
  }
  const sym = shapeSymmetry(edges);

  return {
    lines: segs.length,
    diagonals,
    non45,
    non45Gentle,
    diagonalAngleKinds: angleKinds.size,
    hasNon45: non45 > 0, // 45°系は全部 "1:1"・それ以外＝非45°
    crossings,
    components: countComponents(edges),
    pointsUsed: pts.size,
    symmetry: detectSymmetry(edges, n),
    boardN: n,
    bboxW: edges.length ? maxC - minC + 1 : 0,
    bboxH: edges.length ? maxR - minR + 1 : 0,
    strokes: strokeCount(edges),
    symAxis: sym.axis,
    symMiss: sym.miss,
  };
}

/* =========================================================================
   立体模写のメトリクス（solid 専用）
   立体は隠れ線を含む手描きなので square 用の線分併合・格子点分割は通さない。
   引いた辺（solidEdges）をそのまま数える。lines＝辺数、diagonals＝縦横以外、
   non45＝|dc|≠|dr|、crossings＝0（立体は交差を難易度に数えない）、symmetry＝[]。
   ========================================================================= */
export function computeSolidMetrics(edges: SolidEdge[]): ProblemMetrics {
  let diagonals = 0;
  let non45 = 0;
  let non45Gentle = 0;
  const angleKinds = new Set<string>();
  const parent = new Map<string, string>();
  const pts = new Set<string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== c) { const nx = parent.get(c)!; parent.set(c, r); c = nx; }
    return r;
  };
  const key = (p: { c: number; r: number }) => `${p.c},${p.r}`;
  let hiddenLines = 0;
  for (const e of edges) {
    if (e.style === "dashed") hiddenLines++;
    const dc = e.b.c - e.a.c;
    const dr = e.b.r - e.a.r;
    if (dc !== 0 && dr !== 0) {
      diagonals++;
      const g = Math.max(1, gcd(Math.abs(dc), Math.abs(dr)));
      const kind = `${Math.abs(dc / g)}:${Math.abs(dr / g)}`;
      angleKinds.add(kind);
      if (kind !== "1:1") {
        non45++;
        if (kind === "1:2" || kind === "2:1") non45Gentle++;
      }
    }
    const a = key(e.a), b = key(e.b);
    pts.add(a); pts.add(b);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  }
  const roots = new Set<string>();
  for (const k of parent.keys()) roots.add(find(k));

  /* 立体の盤面は問題ごとに図形へ合わせて切り出される（cols×rows 可変）ため、
     盤面項の材料はエッジ座標の広がりで持つ。対称・画数は立体では使わない
     （D 式 v3 の適用範囲外・decisions §3.90）。 */
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const e of edges) for (const p of [e.a, e.b]) {
    minC = Math.min(minC, p.c); maxC = Math.max(maxC, p.c);
    minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r);
  }

  return {
    lines: edges.length,
    diagonals,
    non45,
    non45Gentle,
    diagonalAngleKinds: angleKinds.size,
    hasNon45: non45 > 0,
    crossings: 0,
    components: roots.size,
    pointsUsed: pts.size,
    symmetry: [],
    hiddenLines,
    bboxW: edges.length ? maxC - minC + 1 : 0,
    bboxH: edges.length ? maxR - minR + 1 : 0,
  };
}
