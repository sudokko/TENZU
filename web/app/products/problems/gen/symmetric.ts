/* =========================================================================
   対称性構築エンジン（fundamental domain × 二面体群）
   オーナー指示 2026-06-15: 「関数で幾何パターンを量産する方法」。
   盤面の基本領域に小さなモチーフ（数本の線分）を seed 決定的に生成し、二面体群
   （D2＝縦横ミラー／D4＝4回転＋ミラー）で畳んで 1 枚の対称図形を構築する。seed を
   振れば無数の異なる対称パターンが出る。「ランダムだが対称が整いを保証」＝無制約
   ランダムウォーク（散らかる）とは別物。
   ※「図形全体を回転して向き違いを量産」とも別物（向きコピーでなく対称図形の構築）。
   出力は copy.ts の ShapeVariant 型。配置は copy.ts の centerPlace（span=n-1 で off=0）。
   ========================================================================= */

import type { EdgeT, Pt } from "../schema";
import { edgeKey, mirrorEdges, normalizeEdges, splitAtLattice } from "../schema";
import { pick, randInt, seededRng, type Rng } from "./rng";
import type { ShapeVariant } from "./copy";

export type SymMode = "D2" | "D4";

/* 90°回転（metrics TRANSFORMS.r90 と同式・偶奇とも格子→格子に閉じる） */
export function rotate90(edges: EdgeT[], n: number): EdgeT[] {
  const f = (p: Pt): Pt => [n - 1 - p[1], p[0]];
  return edges.map((e) => [f(e[0]), f(e[1])] as EdgeT);
}

const pkey = (p: Pt) => `${p[0]},${p[1]}`;

/* 基本領域: 中央軸を 1 つ越えるまで含める（偶奇とも中心線をまたぐ辺で左右が連結）。
   D4 は主対角下半分（octant）にさらに限定。 */
function regionOk(p: Pt, half: number, mode: SymMode): boolean {
  if (p[0] < 0 || p[1] < 0 || p[0] > half || p[1] > half) return false;
  return mode === "D4" ? p[1] <= p[0] : true;
}

/* モチーフの許可方向。米/X 抑制のため斜めは控えめ（辺平行の直交を優先）。 */
function dirPool(rnd: Rng): { allowDiag: boolean; allowKnight: boolean } {
  const r = rnd();
  if (r < 0.45) return { allowDiag: false, allowKnight: false }; // 直交のみ
  if (r < 0.85) return { allowDiag: true, allowKnight: false };  // 45°まで
  return { allowDiag: true, allowKnight: true };                 // 非45°あり
}

function moves(allowDiag: boolean, allowKnight: boolean): Pt[] {
  const base: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const d45: Pt[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const knight: Pt[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  let out = [...base];
  if (allowDiag) out = [...out, ...d45];
  if (allowKnight) out = [...out, ...knight];
  return out;
}

/* 基本領域内モチーフ。盤面隅 (0,0) を起点に領域内をウォーク（reach-edge を保証＝
   折返し後に4辺・4隅に届く）。中央軸（c==half または r==half）に届くこと（reach-center
   ＝折返しで中央が連結）を要求。失敗は null。 */
function buildMotif(rnd: Rng, n: number, mode: SymMode, k: number): EdgeT[] | null {
  const half = Math.ceil((n - 1) / 2);
  const { allowDiag, allowKnight } = dirPool(rnd);
  const start: Pt = [0, 0];
  const verts = new Map<string, Pt>([[pkey(start), start]]);
  const unitKeys = new Set<string>();
  const raw: EdgeT[] = [];
  let guard = 0;
  while (raw.length < k && guard++ < k * 30) {
    const v = pick(rnd, [...verts.values()]);
    const cand = moves(allowDiag, allowKnight)
      .map(([dc, dr]) => [v[0] + dc, v[1] + dr] as Pt)
      .filter((t) => regionOk(t, half, mode));
    if (cand.length === 0) continue;
    const t = pick(rnd, cand);
    const units = splitAtLattice([v, t]);
    if (units.some((u) => unitKeys.has(edgeKey(u)))) continue;
    for (const u of units) { unitKeys.add(edgeKey(u)); verts.set(pkey(u[0]), u[0]); verts.set(pkey(u[1]), u[1]); }
    raw.push([v, t]);
  }
  if (raw.length < 2) return null;
  const pts = [...verts.values()];
  const reachCenter = pts.some((p) => p[0] === half || p[1] === half);
  if (!reachCenter) return null; // 中央連結の保証（バラけ防止）
  return normalizeEdges(raw);
}

/* 二面体群で畳む */
function applyGroup(m: EdgeT[], n: number, mode: SymMode): EdgeT[] {
  const v = mirrorEdges(m, n, "v");
  const h = mirrorEdges(m, n, "h");
  const vh = mirrorEdges(v, n, "h");
  let all = [...m, ...v, ...h, ...vh];
  if (mode === "D4") {
    const base = [...all];
    all = [...all, ...rotate90(base, n), ...rotate90(rotate90(base, n), n), ...rotate90(rotate90(rotate90(base, n), n), n)];
  }
  return normalizeEdges(all);
}

function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

/* attempts 回モチーフを振って、盤面いっぱい（4辺接触）の対称図形を量産。
   重複（対称形は向きが同じになる）は edgeKey 署名で除去。seed 固定で完全再現。 */
export function generateSymmetricVariants(n: number, seed = 1, attempts = 300): ShapeVariant[] {
  const rnd = seededRng(`sym#${n}#${seed}`);
  const out: ShapeVariant[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < attempts; i++) {
    const mode: SymMode = rnd() < 0.55 ? "D2" : "D4";
    const k = randInt(rnd, 2, 5);
    const m = buildMotif(rnd, n, mode, k);
    if (!m) continue;
    const full = applyGroup(m, n, mode);
    const b = bounds(full);
    if (b.cMin !== 0 || b.rMin !== 0 || b.cMax !== n - 1 || b.rMax !== n - 1) continue; // 盤面いっぱい必須
    const sig = full.map(edgeKey).sort().join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      key: `sym#${n}#${seed}-${i}/0`, name: "たいしょう", family: "sym",
      edges: full, spanC: n - 1, spanR: n - 1,
    });
  }
  return out;
}
