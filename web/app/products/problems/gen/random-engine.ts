/* =========================================================================
   ランダムエンジン（独立アルゴリズム・対称に依存しない）
   オーナー指示 2026-06-15: 「対称で作って崩す」アプローチは気持ち悪い→完全に別の
   アルゴリズムでランダム生成する。必須2条件は不変: ①ぐちゃぐちゃにならない②偏らない。

   採用＝Mondrian（再帰的矩形分割）＋斜めアクセント:
   - 盤面の外枠を再帰的にランダム分割（縦/横の線で2分割を繰り返す）→ 不揃いの矩形群。
     分割線は T 字接合＝ヒゲ0・連結・閉路あり＝整い保証（mess にならない）。
   - いくつかの区画に対角線を足す。区画が正方なら45°・非正方なら非45°が自然に出て、
     各 Lv の帯（斜め必須）に振り分く。
   対称性ゼロ＝対称エンジンと明確に別物。分割位置/深さ/対角の seed 発散＝偏らない。
   mess 防止は filters.ts の整いゲート（tidyGate）で最終担保。symmetric には非依存。
   ========================================================================= */

import type { EdgeT, Pt } from "../schema";
import { edgeKey, normalizeEdges } from "../schema";
import { closedLoops, danglingCount, jaccard, minComponentEdges, offCenter } from "./filters";
import { computeMetrics } from "./metrics";
import { pick, randInt, seededRng, type Rng } from "./rng";
import type { ShapeVariant } from "./copy";

function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}
const fullGridOk = (edges: EdgeT[], n: number) => {
  const b = bounds(edges);
  return b.cMin === 0 && b.rMin === 0 && b.cMax === n - 1 && b.rMax === n - 1;
};

/* mess 防止の保証点。frameless（外枠なし）では「外周で終わる線」は散らかりでない
   ので、内部の行き止まり（盤面の縁にない次数1点）だけを数える＋閉路必須を外す。 */
const CROSS_MAX = (n: number) => (n <= 4 ? 4 : n <= 5 ? 6 : n <= 6 ? 9 : 13);
const onBoundary = (p: Pt, n: number) => p[0] === 0 || p[0] === n - 1 || p[1] === 0 || p[1] === n - 1;
function interiorDangling(edges: EdgeT[], n: number): number {
  const deg = new Map<string, number>();
  const pts = new Map<string, Pt>();
  for (const e of edges) for (const p of e) { const k = `${p[0]},${p[1]}`; deg.set(k, (deg.get(k) ?? 0) + 1); pts.set(k, p); }
  let c = 0;
  for (const [k, d] of deg) if (d === 1 && !onBoundary(pts.get(k)!, n)) c++;
  return c;
}
function tidyGate(edges: EdgeT[], n: number, frameless = false, requireLoop = true): boolean {
  const m = computeMetrics(edges, n);
  if (m.components !== 1) return false;
  if ((frameless ? interiorDangling(edges, n) : danglingCount(edges)) > 2) return false;
  if (offCenter(edges, n) > 0.5) return false;
  if (minComponentEdges(edges) < 2) return false;
  if (requireLoop && closedLoops(edges, m.components) < 1) return false;
  if (m.crossings > CROSS_MAX(n)) return false;
  if (m.diagonalAngleKinds > 2) return false;
  return true;
}

/* ---- Mondrian 再帰分割 ---- */
type Rect = { x0: number; y0: number; x1: number; y1: number };

function subdivide(rnd: Rng, rect: Rect, depth: number): Rect[] {
  const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
  const canV = w >= 2, canH = h >= 2;
  if (depth <= 0 || (!canV && !canH)) return [rect];
  if (rnd() < 0.22) return [rect]; // たまに止めて区画サイズに変化
  const vert = canV && (!canH || rnd() < 0.5);
  if (vert) {
    const sx = randInt(rnd, rect.x0 + 1, rect.x1 - 1);
    return [...subdivide(rnd, { ...rect, x1: sx }, depth - 1), ...subdivide(rnd, { ...rect, x0: sx }, depth - 1)];
  }
  const sy = randInt(rnd, rect.y0 + 1, rect.y1 - 1);
  return [...subdivide(rnd, { ...rect, y1: sy }, depth - 1), ...subdivide(rnd, { ...rect, y0: sy }, depth - 1)];
}

function rectSides(r: Rect): EdgeT[] {
  return [
    [[r.x0, r.y0], [r.x1, r.y0]], [[r.x1, r.y0], [r.x1, r.y1]],
    [[r.x1, r.y1], [r.x0, r.y1]], [[r.x0, r.y1], [r.x0, r.y0]],
  ];
}

function mondrian(rnd: Rng, n: number): EdgeT[] {
  const board: Rect = { x0: 0, y0: 0, x1: n - 1, y1: n - 1 };
  const depth = randInt(rnd, 2, 4);
  const leaves = subdivide(rnd, board, depth);
  const edges: EdgeT[] = [];
  for (const r of leaves) edges.push(...rectSides(r));
  // 斜めアクセント: 区画に対角線。正方区画＝45°／非正方＝非45°。
  // 巻によって 45°のみ許す帯があるので、正方区画を優先して 45° を出やすくする。
  const diagN = randInt(rnd, 1, 3);
  const squares = leaves.filter((r) => r.x1 - r.x0 === r.y1 - r.y0 && r.x1 - r.x0 >= 1);
  const any = leaves.filter((r) => r.x1 - r.x0 >= 1 && r.y1 - r.y0 >= 1);
  for (let i = 0; i < diagN; i++) {
    const poolD = squares.length > 0 && rnd() < 0.7 ? squares : any;
    if (poolD.length === 0) break;
    const r = pick(rnd, poolD);
    if (rnd() < 0.5) edges.push([[r.x0, r.y0], [r.x1, r.y1]]);
    else edges.push([[r.x1, r.y0], [r.x0, r.y1]]);
  }
  // frameless: 盤面の外枠（縁の上の辺）を除去＝内部の分割線＋斜めだけ残す
  const onEdgeLine = (e: EdgeT) =>
    (e[0][0] === 0 && e[1][0] === 0) || (e[0][0] === n - 1 && e[1][0] === n - 1)
    || (e[0][1] === 0 && e[1][1] === 0) || (e[0][1] === n - 1 && e[1][1] === n - 1);
  return normalizeEdges(edges).filter((e) => !onEdgeLine(e));
}

/* ---- 傾いた多角形＋内部弦（string-art 風・角ばった非矩形テイスト） ----
   各辺の「内側」（隅を除く）から 1〜2 点ずつ取り、時計回りに閉じる。各辺の点を
   隣の辺の点とつなぐので辺が対角線で内部を跨ぐ＝盤面いっぱいの傾いた凸多角形。
   さらに頂点間に弦を数本張る＝内部に斜めの交差構造。矩形（Mondrian）とは別の幾何感。 */
function sidePoints(rnd: Rng, side: number, n: number): Pt[] {
  // 内側位置（隅 0,n-1 を除く）。CW 方向に並べて返す
  const ts: number[] = [];
  const cnt = rnd() < 0.35 ? 2 : 1;
  while (ts.length < cnt) {
    const t = randInt(rnd, 1, n - 2);
    if (!ts.includes(t)) ts.push(t);
  }
  ts.sort((a, b) => a - b);
  return ts.map((t): Pt => {
    if (side === 0) return [t, 0];           // 上（左→右）
    if (side === 1) return [n - 1, t];        // 右（上→下）
    if (side === 2) return [n - 1 - t, n - 1]; // 下（右→左）
    return [0, n - 1 - t];                    // 左（下→上）
  });
}
function boundaryPolygon(rnd: Rng, n: number): EdgeT[] | null {
  if (n < 4) return null; // 内側点（1..n-2）が必要
  const pts: Pt[] = [];
  for (let side = 0; side < 4; side++) pts.push(...sidePoints(rnd, side, n));
  if (pts.length < 4) return null;
  const edges: EdgeT[] = [];
  for (let i = 0; i < pts.length; i++) edges.push([pts[i], pts[(i + 1) % pts.length]]);
  // 内部弦（非隣接頂点を結ぶ）＝内部に斜めの交差構造
  const chordN = randInt(rnd, 1, 3);
  for (let c = 0; c < chordN; c++) {
    const a = randInt(rnd, 0, pts.length - 1);
    const b = randInt(rnd, 0, pts.length - 1);
    if (Math.abs(a - b) <= 1 || Math.abs(a - b) === pts.length - 1) continue;
    edges.push([pts[a], pts[b]]);
  }
  return normalizeEdges(edges);
}

/* ---- 放射状ファン（中心をずらした sunburst・放射テクスチャ） ----
   盤面枠＋内側の「ハブ点」から外周へスポークを放射。スポークは1点から出るので
   互いに交差せず整然（交差0）、ハブが中心からずれるので非対称。矩形・多角形とは別の感。 */
function perimeter(n: number): Pt[] {
  const p: Pt[] = [];
  for (let c = 0; c < n; c++) p.push([c, 0]);
  for (let r = 1; r < n; r++) p.push([n - 1, r]);
  for (let c = n - 2; c >= 0; c--) p.push([c, n - 1]);
  for (let r = n - 2; r >= 1; r--) p.push([0, r]);
  return p;
}
function radialFan(rnd: Rng, n: number): EdgeT[] | null {
  if (n < 4) return null;
  // frameless: 外枠なし。中心をずらしたハブから外周へスポークだけ放射（星状）。
  // スポーク端は外周（散らかりでない）、ハブは高次数＝内部行き止まりなし。
  const hub: Pt = [randInt(rnd, 1, n - 2), randInt(rnd, 1, n - 2)];
  const perim = perimeter(n);
  const K = randInt(rnd, 4, 7);
  const spokes: EdgeT[] = [];
  for (let s = 0; s < K; s++) {
    const lo = Math.floor((s * perim.length) / K);
    const hi = Math.floor(((s + 1) * perim.length) / K) - 1;
    spokes.push([hub, perim[randInt(rnd, lo, Math.max(lo, hi))]]);
  }
  return normalizeEdges(spokes);
}

/* =========================================================================
   自由形（有機ブロブ）エンジン — 別枠で出す
   盤面のセルを「ふっくら」（隣接の多いセル優先）育てて1つの不定形領域を作り、
   穴を埋めて単連結化→輪郭を描く＋区画に対角線。矩形分割・多角形・放射とは別の、
   自由なかたまり形。輪郭＝閉曲線で整然、育て方が seed 発散で偏らない。
   ========================================================================= */
/* ブロブ領域を育てる：S×S セルを「ふっくら」（隣接多いセル優先）育て、4辺接触必須＋
   穴埋めで単連結化。inside[][]（true=領域内）を返す。育たない/4辺接触しないとき null。 */
function growBlobRegion(rnd: Rng, n: number): boolean[][] | null {
  const S = n - 1; // S×S セル
  if (S < 3) return null;
  const inside: boolean[][] = Array.from({ length: S }, () => Array(S).fill(false));
  inside[randInt(rnd, 0, S - 1)][randInt(rnd, 0, S - 1)] = true;
  let count = 1;
  const target = randInt(rnd, Math.round(S * S * 0.45), Math.round(S * S * 0.7));
  let guard = 0;
  while (count < target && guard++ < S * S * 20) {
    const fr: { i: number; j: number; nb: number }[] = [];
    for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
      if (inside[i][j]) continue;
      let nb = 0;
      if (i > 0 && inside[i - 1][j]) nb++;
      if (i < S - 1 && inside[i + 1][j]) nb++;
      if (j > 0 && inside[i][j - 1]) nb++;
      if (j < S - 1 && inside[i][j + 1]) nb++;
      if (nb > 0) fr.push({ i, j, nb });
    }
    if (fr.length === 0) break;
    const total = fr.reduce((s, f) => s + f.nb * f.nb, 0); // 隣接多い＝ふっくら優先
    let x = randInt(rnd, 1, total), chosen = fr[0];
    for (const f of fr) { x -= f.nb * f.nb; if (x <= 0) { chosen = f; break; } }
    inside[chosen.i][chosen.j] = true; count++;
  }
  // 4辺接触（盤面いっぱい）必須
  let top = false, bot = false, left = false, right = false;
  for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) if (inside[i][j]) {
    if (j === 0) top = true; if (j === S - 1) bot = true; if (i === 0) left = true; if (i === S - 1) right = true;
  }
  if (!(top && bot && left && right)) return null;
  // 穴埋め（外周から到達できない非内部セル＝穴→埋めて単連結化）
  const outside: boolean[][] = Array.from({ length: S }, () => Array(S).fill(false));
  const stack: [number, number][] = [];
  const seed = (i: number, j: number) => { if (!inside[i][j] && !outside[i][j]) { outside[i][j] = true; stack.push([i, j]); } };
  for (let i = 0; i < S; i++) { seed(i, 0); seed(i, S - 1); }
  for (let j = 0; j < S; j++) { seed(0, j); seed(S - 1, j); }
  while (stack.length) {
    const [i, j] = stack.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const ni = i + di, nj = j + dj;
      if (ni >= 0 && ni < S && nj >= 0 && nj < S) seed(ni, nj);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) if (!inside[i][j] && !outside[i][j]) inside[i][j] = true;
  return inside;
}

/* 領域の輪郭（内部/外部の境界辺）を返す。 */
function regionOutline(inside: boolean[][], S: number): EdgeT[] {
  const isIn = (i: number, j: number) => i >= 0 && i < S && j >= 0 && j < S && inside[i][j];
  const edges: EdgeT[] = [];
  for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
    if (!inside[i][j]) continue;
    if (!isIn(i, j - 1)) edges.push([[i, j], [i + 1, j]]);
    if (!isIn(i, j + 1)) edges.push([[i, j + 1], [i + 1, j + 1]]);
    if (!isIn(i - 1, j)) edges.push([[i, j], [i, j + 1]]);
    if (!isIn(i + 1, j)) edges.push([[i + 1, j], [i + 1, j + 1]]);
  }
  return edges;
}

/* 凸角の面取り（chamfer）: 輪郭の出っ張った直角を斜めにカット＝外周に斜め辺が出る。
   凸角＝格子点まわり4セルのうち内部が1つだけ。その2本の境界辺を斜め1本に置換。 */
function chamferOutline(inside: boolean[][], outline: EdgeT[], rnd: Rng, S: number): EdgeT[] {
  const isIn = (i: number, j: number) => i >= 0 && i < S && j >= 0 && j < S && inside[i][j];
  const removeKeys = new Set<string>();
  const addDiag: EdgeT[] = [];
  for (let gi = 0; gi <= S; gi++) for (let gj = 0; gj <= S; gj++) {
    const tl = isIn(gi - 1, gj - 1), tr = isIn(gi, gj - 1), bl = isIn(gi - 1, gj), br = isIn(gi, gj);
    if ((tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0) !== 1) continue; // 凸角のみ
    if (rnd() < 0.4) continue; // 一部だけ面取り（多様性）
    let e1: EdgeT, e2: EdgeT, diag: EdgeT;
    if (br) { e1 = [[gi, gj], [gi + 1, gj]]; e2 = [[gi, gj], [gi, gj + 1]]; diag = [[gi + 1, gj], [gi, gj + 1]]; }
    else if (bl) { e1 = [[gi, gj], [gi - 1, gj]]; e2 = [[gi, gj], [gi, gj + 1]]; diag = [[gi - 1, gj], [gi, gj + 1]]; }
    else if (tr) { e1 = [[gi, gj], [gi + 1, gj]]; e2 = [[gi, gj], [gi, gj - 1]]; diag = [[gi + 1, gj], [gi, gj - 1]]; }
    else { e1 = [[gi, gj], [gi - 1, gj]]; e2 = [[gi, gj], [gi, gj - 1]]; diag = [[gi - 1, gj], [gi, gj - 1]]; }
    removeKeys.add(edgeKey(e1)); removeKeys.add(edgeKey(e2)); addDiag.push(diag);
  }
  const result = outline.filter((e) => !removeKeys.has(edgeKey(e)));
  return normalizeEdges([...result, ...addDiag]);
}

/* 内部分割線を領域でクリップして重ねる（Mondrian の内側だけ）。縦・横の内部単位辺のうち
   両隣セルが共に内部のものだけ描く。線端は必ず輪郭上に乗る＝内部行き止まりゼロ。
   縦長線分×横長線分が内部で「＋」交差＝crossing 成立。 */
function internalGridLines(inside: boolean[][], rnd: Rng, S: number): EdgeT[] {
  const isIn = (i: number, j: number) => i >= 0 && i < S && j >= 0 && j < S && inside[i][j];
  const pickDistinct = (lo: number, hi: number, k: number): number[] => {
    const pool: number[] = [];
    for (let v = lo; v <= hi; v++) pool.push(v);
    const out: number[] = [];
    while (out.length < k && pool.length) out.push(pool.splice(randInt(rnd, 0, pool.length - 1), 1)[0]);
    return out;
  };
  const edges: EdgeT[] = [];
  if (S >= 2) {
    const cap = Math.min(3, S - 1);
    for (const k of pickDistinct(1, S - 1, randInt(rnd, 1, cap))) // 内部縦線 c=k
      for (let j = 0; j < S; j++) if (isIn(k - 1, j) && isIn(k, j)) edges.push([[k, j], [k, j + 1]]);
    for (const k of pickDistinct(1, S - 1, randInt(rnd, 1, cap))) // 内部横線 r=k
      for (let i = 0; i < S; i++) if (isIn(i, k - 1) && isIn(i, k)) edges.push([[i, k], [i + 1, k]]);
  }
  return edges;
}

/* 自由形（有機ブロブ）の輪郭＝面取り済み。育成→輪郭→面取りの合成。 */
function blobShape(rnd: Rng, n: number): EdgeT[] | null {
  const inside = growBlobRegion(rnd, n);
  if (!inside) return null;
  const S = n - 1;
  return chamferOutline(inside, regionOutline(inside, S), rnd, S);
}

/* 非45°アクセント。**ハイブリッドは非45°を含んでよい＝正式設計**（オーナー承認 2026-06-15・
   旧「hybrid に非45°弦は入れない」判断を撤回）。既存頂点どうしを 2:1 の短い弦で結ぶ＝
   連結維持・ヒゲを増やさず・横切り最小。mess は tidyGate が最終的に弾く。これにより
   非45°必須帯（lv4-vol1）にも hybrid が供給され、any 帯（lv4-vol2/lv5）の多様性も増える。 */
function addNon45Chord(edges: EdgeT[], rnd: Rng): EdgeT[] | null {
  const seen = new Map<string, Pt>();
  for (const e of edges) for (const p of e) seen.set(`${p[0]},${p[1]}`, p);
  const verts = [...seen.values()];
  const existing = new Set(edges.map(edgeKey));
  const cands: EdgeT[] = [];
  for (let a = 0; a < verts.length; a++) {
    for (let b = a + 1; b < verts.length; b++) {
      const dc = Math.abs(verts[a][0] - verts[b][0]);
      const dr = Math.abs(verts[a][1] - verts[b][1]);
      if (dc === 0 || dr === 0 || dc === dr) continue; // 直交・45°を除外＝非45°のみ
      if (dc + dr > 3) continue;                        // 2:1 / 1:2 の短い弦に限定（横切りすぎ防止）
      const e: EdgeT = [verts[a], verts[b]];
      if (existing.has(edgeKey(e))) continue;
      cands.push(e);
    }
  }
  if (cands.length === 0) return null;
  return normalizeEdges([...edges, cands[randInt(rnd, 0, cands.length - 1)]]);
}

/* ハイブリッド＝ブロブ有機輪郭（面取り）＋内部 Mondrian 線（領域クリップ）。
   約半数に非45°弦を1本足す＝非45°必須帯（lv4-vol1）にも供給。45°のみ版も残す（ortho45 帯用）。 */
function hybridShape(rnd: Rng, n: number): EdgeT[] | null {
  const inside = growBlobRegion(rnd, n);
  if (!inside) return null;
  const S = n - 1;
  const chamfered = chamferOutline(inside, regionOutline(inside, S), rnd, S);
  const internal = internalGridLines(inside, rnd, S);
  if (internal.length === 0) return null; // 内部仕切りが立たない＝再試行
  const base = normalizeEdges([...chamfered, ...internal]);
  if (rnd() < 0.55) {
    const withChord = addNon45Chord(base, rnd);
    if (withChord) return withChord;
  }
  return base;
}

export function generateBlobVariants(n: number, seed = 1, attempts = 500): ShapeVariant[] {
  const rnd = seededRng(`blob#${n}#${seed}`);
  const out: ShapeVariant[] = [];
  const seen = new Set<string>();
  const accepted: EdgeT[][] = [];
  for (let i = 0; i < attempts; i++) {
    const cand = blobShape(rnd, n);
    if (!cand || cand.length === 0) continue;
    if (!fullGridOk(cand, n)) continue;
    if (!tidyGate(cand, n)) continue;
    const sig = cand.map(edgeKey).sort().join("|");
    if (seen.has(sig)) continue;
    if (accepted.some((a) => jaccard(a, cand) > 0.82)) continue;
    seen.add(sig);
    accepted.push(cand);
    out.push({ key: `blob#${n}#${seed}-${i}`, name: "じゆうけい", family: "blob", edges: cand, spanC: n - 1, spanR: n - 1 });
  }
  return out;
}

/* ---- ハイブリッド（自由形輪郭 × ランダム分割の内部線・seed 固定で決定的） ---- */
export function generateHybridVariants(n: number, seed = 1, attempts = 500): ShapeVariant[] {
  const rnd = seededRng(`hybrid#${n}#${seed}`);
  const out: ShapeVariant[] = [];
  const seen = new Set<string>();
  const accepted: EdgeT[][] = [];
  for (let i = 0; i < attempts; i++) {
    const cand = hybridShape(rnd, n);
    if (!cand || cand.length === 0) continue;
    if (!fullGridOk(cand, n)) continue;
    if (!tidyGate(cand, n)) continue;
    const sig = cand.map(edgeKey).sort().join("|");
    if (seen.has(sig)) continue;
    if (accepted.some((a) => jaccard(a, cand) > 0.82)) continue;
    seen.add(sig);
    accepted.push(cand);
    out.push({ key: `hybrid#${n}#${seed}-${i}`, name: "くみあわせ", family: "hybrid", edges: cand, spanC: n - 1, spanR: n - 1 });
  }
  return out;
}

/* ---- 量産（Mondrian ＋ 傾き多角形 ＋ 放射ファンを混合・seed 固定で決定的） ---- */
export function generateRandomVariants(n: number, seed = 1, attempts = 700): ShapeVariant[] {
  const rnd = seededRng(`rand#${n}#${seed}`);
  const out: ShapeVariant[] = [];
  const seen = new Set<string>();
  const accepted: EdgeT[][] = [];
  for (let i = 0; i < attempts; i++) {
    const roll = rnd();
    const cand = (roll < 0.4 ? mondrian(rnd, n)
      : roll < 0.72 ? boundaryPolygon(rnd, n)
        : radialFan(rnd, n)) ?? mondrian(rnd, n);
    if (cand.length === 0) continue;
    if (!fullGridOk(cand, n)) continue;
    if (!tidyGate(cand, n, true, false)) continue; // frameless・閉路必須なし
    const sig = cand.map(edgeKey).sort().join("|");
    if (seen.has(sig)) continue;
    if (accepted.some((a) => jaccard(a, cand) > 0.82)) continue; // 近似重複＝偏り防止
    seen.add(sig);
    accepted.push(cand);
    out.push({ key: `rand#${n}#${seed}-${i}`, name: "ランダム", family: "rand", edges: cand, spanC: n - 1, spanR: n - 1 });
  }
  return out;
}
