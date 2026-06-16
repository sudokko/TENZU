/* =========================================================================
   線対称ジェネレータ（たたき台・seed 決定的）
   軸の片側（ソース領域）に閉じたランダムウォークで「みほん」を作り、解答は
   derived transform（mirror・軸）として持たせる。みほん＝子が見て写す半分、
   解答＝軸で折り返した残り半分。軸の規約は metrics.ts の TRANSFORMS と同一
   （v: c→n-1-c ／ h: r→n-1-r ／ d1: (c,r)→(r,c)）＝将来のレンダラと自動整合。
   MIRROR_LADDER のパラメータ内で count 問生成。同 (sku, seed) なら同じ候補列。
   ========================================================================= */

import type { EdgeT, Problem, Pt } from "../schema";
import { difficultyScore, edgeKey, normalizeEdges, splitAtLattice } from "../schema";
import { computeMetrics } from "./metrics";
import { jaccard, paramsOk } from "./filters";
import type { SlopeRule } from "./ladder";
import { pick, randInt, seededRng, type Rng } from "./rng";

export const MIRROR_GENERATOR_VERSION = "1";

/* d2（反対角）は当面使わない。data.ts の mirror 6 巻は v/h/d1 で足りる */
export type MirrorAxis = "v" | "h" | "d1";

export type MirrorParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  axis: MirrorAxis;
  lines: [number, number];
  slopes: SlopeRule;          // 線対称では "any"(非45°) は使わない
  diagonals: [number, number];
  crossings: [number, number];
  components: [number, number];
  bbox: number;               // 両方向の最小スパン（片側に閉じるので 1＝非退化の保証）
  closedBias: number;
};

/* data.ts の mirror 6 巻に対応。軸は SKU 単位で固定（縦→横→斜めの順に難化） */
export const MIRROR_LADDER: Record<string, MirrorParams> = {
  /* Lv.2 Vol.1 — 3×3・縦軸デビュー・縦横のみ・少ない線 */
  "mirror-lv2-vol1": {
    grid: 3, axis: "v", lines: [2, 4], slopes: "ortho", diagonals: [0, 0],
    crossings: [0, 0], components: [1, 1], bbox: 1, closedBias: 0.6,
  },
  /* Lv.3 Vol.1 — 4×4・縦軸・45°と交差が少し */
  "mirror-lv3-vol1": {
    grid: 4, axis: "v", lines: [3, 6], slopes: "ortho45", diagonals: [0, 2],
    crossings: [0, 1], components: [1, 1], bbox: 1, closedBias: 0.55,
  },
  /* Lv.4 Vol.1 — 3×3・横軸デビュー（上下を返す） */
  "mirror-lv4-vol1": {
    grid: 3, axis: "h", lines: [2, 5], slopes: "ortho45", diagonals: [0, 2],
    crossings: [0, 1], components: [1, 1], bbox: 1, closedBias: 0.55,
  },
  /* Lv.4 Vol.2 — 4×4・横軸・線と交差を増やす */
  "mirror-lv4-vol2": {
    grid: 4, axis: "h", lines: [3, 6], slopes: "ortho45", diagonals: [1, 3],
    crossings: [0, 2], components: [1, 1], bbox: 1, closedBias: 0.5,
  },
  /* Lv.5 Vol.1 — 3×3・斜め軸デビュー（日常にない反転） */
  "mirror-lv5-vol1": {
    grid: 3, axis: "d1", lines: [2, 5], slopes: "ortho45", diagonals: [0, 3],
    crossings: [0, 1], components: [1, 1], bbox: 1, closedBias: 0.5,
  },
  /* Lv.5 Vol.2 — 4×4・斜め軸・空間操作の総仕上げ */
  "mirror-lv5-vol2": {
    grid: 4, axis: "d1", lines: [3, 7], slopes: "ortho45", diagonals: [1, 4],
    crossings: [0, 2], components: [1, 1], bbox: 1, closedBias: 0.5,
  },
};

const pkey = (p: Pt) => `${p[0]},${p[1]}`;

/* ソース領域（軸の片側）。半平面／三角形なので凸＝長い辺の中間点も自動で領域内 */
function regionOk(p: Pt, n: number, axis: MirrorAxis): boolean {
  const inner = Math.ceil(n / 2) - 1; // 軸に最も近いソース側の列/行（v/h）
  if (axis === "v") return p[0] <= inner;
  if (axis === "h") return p[1] <= inner;
  return p[1] <= p[0]; // d1: 主対角線 c=r 以下（＝c ≥ r 側）を使う
}

/* 許可方向（単位ステップ）。低頻度で 2 倍ステップ＝盤面いっぱいの長い線を許す */
function moves(slopes: SlopeRule, rnd: Rng): Pt[] {
  const base: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const d45: Pt[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const unit = slopes === "ortho" ? base : [...base, ...d45];
  if (rnd() < 0.25) return [...unit, ...unit.map(([c, r]) => [c * 2, r * 2] as Pt)];
  return unit;
}

function startPoint(rnd: Rng, n: number, axis: MirrorAxis): Pt {
  for (let i = 0; i < 50; i++) {
    const p: Pt = [randInt(rnd, 0, n - 1), randInt(rnd, 0, n - 1)];
    if (regionOk(p, n, axis)) return p;
  }
  return [0, 0];
}

/* 1 構成要素ぶんの領域内ウォーク（copy の walkComponent を領域制約つきに縮約） */
function walkComponent(
  rnd: Rng, p: MirrorParams, budget: number,
  unitKeys: Set<string>, allEdges: EdgeT[],
): boolean {
  const n = p.grid;
  const start = startPoint(rnd, n, p.axis);
  const verts = new Map<string, Pt>([[pkey(start), start]]);
  let added = 0;
  let guard = 0;

  while (added < budget && guard++ < budget * 40) {
    const v = pick(rnd, [...verts.values()]);
    const cand = moves(p.slopes, rnd)
      .map(([dc, dr]) => [v[0] + dc, v[1] + dr] as Pt)
      .filter((t) => t[0] >= 0 && t[0] < n && t[1] >= 0 && t[1] < n && regionOk(t, n, p.axis));
    if (cand.length === 0) continue;

    let pool = cand;
    if (verts.size >= 3 && rnd() < p.closedBias) {
      const closing = cand.filter((t) => verts.has(pkey(t)));
      if (closing.length > 0) pool = closing;
    }
    const t = pick(rnd, pool);

    const units = splitAtLattice([v, t]);
    if (units.some((u) => unitKeys.has(edgeKey(u)))) continue; // 重複辺
    for (const u of units) {
      unitKeys.add(edgeKey(u));
      verts.set(pkey(u[0]), u[0]);
      verts.set(pkey(u[1]), u[1]);
    }
    allEdges.push([v, t]);
    added++;
  }
  return added >= Math.max(2, Math.floor(budget * 0.7));
}

function tryOne(rnd: Rng, p: MirrorParams, targetLines: number): EdgeT[] | null {
  // 鏡うつしは「ひとつの形」が分かりやすいので 1 構成に寄せる
  const unitKeys = new Set<string>();
  const raw: EdgeT[] = [];
  if (!walkComponent(rnd, p, Math.max(targetLines, 2), unitKeys, raw)) return null;
  return normalizeEdges(raw);
}

/* d1（斜め軸）で、図形が対角線上だけに乗ると鏡像＝原形になり問題が退化する。
   対角線から外れた点（c ≠ r）を最低 1 つ要求する */
function hasOffDiagonal(edges: EdgeT[]): boolean {
  return edges.some((e) => e.some((p) => p[0] !== p[1]));
}

export function generateMirrorCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補の edges（追加生成時の多様性比較）
  linesOverride?: number,
): Problem[] {
  const base = MIRROR_LADDER[sku];
  if (!base) throw new Error(`MIRROR_LADDER に未定義の sku: ${sku}`);
  const params: MirrorParams = linesOverride
    ? { ...base, lines: [linesOverride, linesOverride] }
    : base;

  const rnd = seededRng(`${sku}#${seed}`);
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];
  const simThreshold = params.grid <= 3 ? 0.62 : 0.5;
  let attempts = 0;
  const maxAttempts = count * 300; // 片側に閉じるぶん copy より試行を厚めに

  const [lineMin, lineMax] = params.lines;
  const quota = Math.ceil(count / (lineMax - lineMin + 1));
  const bandCount = new Map<number, number>();

  while (accepted.length < count && attempts++ < maxAttempts) {
    const relax = attempts > maxAttempts * 0.6;
    let target = randInt(rnd, lineMin, lineMax);
    if (!relax) {
      for (let L = lineMin; L <= lineMax; L++) {
        if ((bandCount.get(L) ?? 0) < quota) { target = L; break; }
      }
    }

    const edges = tryOne(rnd, params, target);
    if (!edges) continue;

    const m = computeMetrics(edges, params.grid);
    if (!paramsOk(edges, m, params)) continue;
    if (params.axis === "d1" && !hasOffDiagonal(edges)) continue;
    if (!relax && (bandCount.get(m.lines) ?? 0) >= quota) continue;

    const tooSimilar =
      accepted.some((a) => jaccard(a.edges, edges) > simThreshold) ||
      existing.some((e) => jaccard(e, edges) > simThreshold);
    if (tooSimilar) continue;

    bandCount.set(m.lines, (bandCount.get(m.lines) ?? 0) + 1);
    accepted.push({
      edges,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n: params.grid },
        edges,
        answer: { mode: "derived", transform: { type: "mirror", axis: params.axis } },
        metrics: m,
        gen: { kind: "auto", generator: "mirror", version: MIRROR_GENERATOR_VERSION, seed },
      },
    });
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}
