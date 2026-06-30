/* =========================================================================
   模写（絵柄）ジェネレータ（モチーフ・ライブラリ × 決定的バリアント展開）
   copy（ランダムウォーク）と違い、絵柄は手設計モチーフの組み合わせ空間
   （ミラー × ディテール段階 × 盤面内配置）を seed 決定的に展開する。

   巻への割り当ては「変種の実測 metrics が MOTIF_LADDER の帯に入るか」で決まる。
   - 同 grid の 2 巻（4×4 の Lv2/Lv3、5×5 の Lv3/Lv4）は
     線数帯・傾き規則（Lv4 Vol.1 は非45°必須）で住み分ける
   - 変種キー（gen.variant）を候補 JSON に持たせ、
     ① 自巻で一度出した変種（不採用含む）は再生成しない
     ② 兄弟巻（他の motif SKU）で生きている変種は出さない（巻またぎ重複防止）
   ========================================================================= */

import type { Candidate, EdgeT, Problem, Pt } from "../schema";
import { difficultyScore, normalizeEdges, validateProblem } from "../schema";
import { computeMetrics } from "./metrics";
import { hasNon45, jaccard } from "./filters";
import { MOTIFS, parsePaths, type MotifDef } from "./motif-shapes";
import { MOTIF_LADDER } from "./ladder";
import { randInt, seededRng } from "./rng";

export const MOTIF_GENERATOR_VERSION = "1";

export type SlopeRule = "ortho45" | "any";

export type MotifParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  slopes: SlopeRule;       // ortho45=非45°禁止 / any=許可
  requireNon45?: boolean;  // Lv4 Vol.1「複雑な角度」: 非45°を必ず含む変種のみ
  lines: [number, number];
  crossings: [number, number];
  components: [number, number];
};

/* 7 巻の難易度帯（pack-design §11 絵柄ライン Lv.2〜5・data.ts の grid と同期）。実体は
   ladder.json（SSOT）。読み取りは gen/ladder.ts 経由。絵柄ラインは廃止済だが seed 用に温存。 */
export { MOTIF_LADDER };

/* 同一モチーフの変種は 1 巻に最大いくつまで出すか（候補・採用・保留を通算） */
const MAX_PER_MOTIF = 2;

/* ---- 変種（モチーフ × ディテール prefix × ミラー） ---- */
export type MotifVariant = {
  motif: MotifDef;
  detailCount: number;   // details の先頭から何個適用するか（累積）
  mirror: boolean;
  key: string;           // "house4~m+2"
  edges: EdgeT[];        // 正規化済み・原点寄せ（配置前）
  spanC: number;
  spanR: number;
};

export function variantKey(motifKey: string, detailCount: number, mirror: boolean): string {
  return `${motifKey}${mirror ? "~m" : ""}+${detailCount}`;
}

function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

function translate(edges: EdgeT[], dc: number, dr: number): EdgeT[] {
  return edges.map((e) => [
    [e[0][0] + dc, e[0][1] + dr],
    [e[1][0] + dc, e[1][1] + dr],
  ] as EdgeT);
}

function mirrorC(edges: EdgeT[], cMin: number, cMax: number): EdgeT[] {
  const f = (p: Pt): Pt => [cMin + cMax - p[0], p[1]];
  return edges.map((e) => [f(e[0]), f(e[1])] as EdgeT);
}

/* 1 モチーフの全変種を展開（原点寄せ・正規化済み） */
export function expandVariants(motif: MotifDef): MotifVariant[] {
  const out: MotifVariant[] = [];
  const detailMax = motif.details?.length ?? 0;
  for (let d = 0; d <= detailMax; d++) {
    const paths = [
      ...motif.paths,
      ...(motif.details ?? []).slice(0, d).flatMap((dt) => dt.paths),
    ];
    const base = normalizeEdges(parsePaths(paths));
    const mirrors = motif.mirrorable ? [false, true] : [false];
    for (const mirror of mirrors) {
      const b = bounds(base);
      const placed = mirror ? mirrorC(base, b.cMin, b.cMax) : base;
      const nb = bounds(placed);
      out.push({
        motif, detailCount: d, mirror,
        key: variantKey(motif.key, d, mirror),
        edges: normalizeEdges(translate(placed, -nb.cMin, -nb.rMin)),
        spanC: nb.cMax - nb.cMin,
        spanR: nb.rMax - nb.rMin,
      });
    }
  }
  return out;
}

export function allVariants(): MotifVariant[] {
  return MOTIFS.flatMap(expandVariants);
}

/* ---- 帯への適合判定 ---- */
const within = (v: number, [min, max]: [number, number]) => v >= min && v <= max;

/* 盤面占有規則: 長辺方向は盤面いっぱい（= grid-1）・短辺も grid-3 以上。
   小さい絵が大きい盤面にぽつんと載るのを防ぎ、grid 間のモチーフ重複も切る */
function spanOk(v: MotifVariant, n: number): boolean {
  const maxSpan = Math.max(v.spanC, v.spanR);
  const minSpan = Math.min(v.spanC, v.spanR);
  return maxSpan === n - 1 && minSpan >= n - 3;
}

export function variantFits(v: MotifVariant, p: MotifParams): boolean {
  if (!spanOk(v, p.grid)) return false;
  const non45 = hasNon45(v.edges);
  if (p.slopes === "ortho45" && non45) return false;
  if (p.requireNon45 && !non45) return false;
  const m = computeMetrics(v.edges, p.grid);
  if (!within(m.lines, p.lines)) return false;
  if (!within(m.crossings, p.crossings)) return false;
  if (!within(m.components, p.components)) return false;
  return true;
}

/* sku の帯に入る全変種（ladder 未定義 sku は空） */
export function eligibleVariants(sku: string): MotifVariant[] {
  const p = MOTIF_LADDER[sku];
  if (!p) return [];
  return allVariants().filter((v) => variantFits(v, p));
}

/* ---- 生成本体 ---- */
export function generateMotifCandidates(
  sku: string,
  seed: number,
  count = 20,
  existing: Pick<Candidate, "edges" | "status" | "gen">[] = [],
  linesOverride?: number,
  excludeVariants: Set<string> = new Set(), // 兄弟巻で生きている変種キー
): Problem[] {
  const params = MOTIF_LADDER[sku];
  if (!params) throw new Error(`MOTIF_LADDER に未定義の sku: ${sku}`);

  const rnd = seededRng(`${sku}#motif#${seed}`);
  const n = params.grid;

  /* 自巻で既出の変種（不採用含む）は二度と出さない */
  const usedKeys = new Set<string>(excludeVariants);
  const motifCount = new Map<string, number>();
  for (const c of existing) {
    if (c.gen?.variant) usedKeys.add(c.gen.variant);
    if (c.status !== "rejected" && c.gen?.motif !== undefined) {
      const mk = c.gen.variant?.split(/~|\+/)[0];
      if (mk) motifCount.set(mk, (motifCount.get(mk) ?? 0) + 1);
    }
  }
  const liveEdges = existing.filter((c) => c.status !== "rejected").map((c) => c.edges);

  let pool = eligibleVariants(sku).filter((v) => !usedKeys.has(v.key));
  if (linesOverride !== undefined) {
    pool = pool.filter((v) => computeMetrics(v.edges, n).lines === linesOverride);
  }

  /* seed 決定的シャッフル（Fisher–Yates） */
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(rnd, 0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  /* copy より緩い類似閾値。絵柄は「胴体の四角」等を共有しても別モチーフなら
     別問題（同一性は variant キー＋同族上限が管理）。同族 prefix 変種の
     近似重複（J≒0.9）だけ確実に弾ければよい */
  const simThreshold = n <= 4 ? 0.68 : 0.6;
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];

  for (const v of pool) {
    if (accepted.length >= count) break;
    if ((motifCount.get(v.motif.key) ?? 0) >= MAX_PER_MOTIF) continue;

    /* 盤面内配置（短辺方向の遊びだけ rng で決める） */
    const offC = randInt(rnd, 0, n - 1 - v.spanC);
    const offR = randInt(rnd, 0, n - 1 - v.spanR);
    const edges = normalizeEdges(translate(v.edges, offC, offR));

    const tooSimilar =
      accepted.some((a) => jaccard(a.edges, edges) > simThreshold) ||
      liveEdges.some((e) => jaccard(e, edges) > simThreshold);
    if (tooSimilar) continue;

    const problem: Problem = {
      id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
      grid: { type: "square", n },
      edges,
      metrics: computeMetrics(edges, n),
      gen: {
        kind: "auto", generator: "motif", version: MOTIF_GENERATOR_VERSION, seed,
        motif: v.motif.name, variant: v.key,
      },
    };
    if (validateProblem(problem).length > 0) continue; // 作図ミスの保険（audit で検出済みのはず）

    motifCount.set(v.motif.key, (motifCount.get(v.motif.key) ?? 0) + 1);
    accepted.push({ edges, problem });
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}
