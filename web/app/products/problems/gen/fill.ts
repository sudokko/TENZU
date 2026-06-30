/* =========================================================================
   欠け補完ジェネレータ（seed 決定的）
   完全な図形 F（＝みほん）を copy 流のランダムウォークで作り、その「見た目の
   線分」から 1〜missing 本を抜いて欠け図 G＝F∖R を作る。子は左の F を見ながら
   右の G に足りない線（R）を描き足す。
     - edges  … F（完全な図形・みほん／出題図）。metrics も F で算出
     - answer … { explicit, edges: R }＝抜いた線分（子が描き足す＝解答）
     - G（右ペインの欠け図）は描画時に F∖R で導出する
   公平性ルール: 抜いた線分の両端点は G 側に必ず残す（＝つなぐべき 2 点が見えて
   いる）。これで Lv1 でも「どこが足りないか」が自明になる。
   FILL_LADDER のパラメータ内で count 問生成。同 (sku, seed) なら同じ候補列。
   ========================================================================= */

import type { EdgeT, Problem, Pt } from "../schema";
import { difficultyScore, edgeKey, normalizeEdges, splitAtLattice } from "../schema";
import { computeMetrics, mergedSegments } from "./metrics";
import { bboxOk, hasNon45, jaccard, paramsOk } from "./filters";
import type { CopyParams, SlopeRule } from "./ladder";
import { FILL_LADDER } from "./ladder";
import { pick, randInt, seededRng, type Rng } from "./rng";

export const FILL_GENERATOR_VERSION = "1";

/* CopyParams（＝F の生成仕様）＋ missing（抜く線分の本数レンジ）。
   lines は「完成図 F の見た目の線分数」。missing は「そこから抜く本数」。 */
export type FillParams = CopyParams & { missing: [number, number] };

/* data.ts の fill 8 巻に対応（欠け少なめ／多めは missing で吸収）。実体は ladder.json
   （SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。ここでは再 export する。 */
export { FILL_LADDER };

const pkey = (p: Pt) => `${p[0]},${p[1]}`;

/* ---- F（完全な図形）の生成: copy のランダムウォークを縮約再掲 ---- */
function moves(slopes: SlopeRule, rnd: Rng): Pt[] {
  const base: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const d45: Pt[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const knight: Pt[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  let out = slopes === "ortho" ? base : [...base, ...d45];
  if (slopes === "any") out = [...out, ...knight];
  if (rnd() < 0.25) {
    const longs: Pt[] = (slopes === "ortho" ? base : [...base, ...d45])
      .map(([c, r]) => [c * 2, r * 2] as Pt);
    out = [...out, ...longs];
  }
  return out;
}

function walkComponent(
  rnd: Rng, p: FillParams, edgeBudget: number,
  unitKeys: Set<string>, allEdges: EdgeT[],
): boolean {
  const n = p.grid;
  const start: Pt = [randInt(rnd, 0, n - 1), randInt(rnd, 0, n - 1)];
  const verts = new Map<string, Pt>([[pkey(start), start]]);
  let added = 0;
  let guard = 0;

  while (added < edgeBudget && guard++ < edgeBudget * 30) {
    const v = pick(rnd, [...verts.values()]);
    const cand = moves(p.slopes, rnd)
      .map(([dc, dr]) => [v[0] + dc, v[1] + dr] as Pt)
      .filter((t) => t[0] >= 0 && t[0] < n && t[1] >= 0 && t[1] < n);
    if (cand.length === 0) continue;

    let pool = cand;
    if (verts.size >= 3 && rnd() < p.closedBias) {
      const closing = cand.filter((t) => verts.has(pkey(t)));
      if (closing.length > 0) pool = closing;
    }
    const t = pick(rnd, pool);

    const units = splitAtLattice([v, t]);
    if (units.some((u) => unitKeys.has(edgeKey(u)))) continue;
    for (const u of units) {
      unitKeys.add(edgeKey(u));
      verts.set(pkey(u[0]), u[0]);
      verts.set(pkey(u[1]), u[1]);
    }
    allEdges.push([v, t]);
    added++;
  }
  return added >= Math.max(2, Math.floor(edgeBudget * 0.7));
}

function buildFigure(rnd: Rng, p: FillParams, targetLines: number): EdgeT[] | null {
  const comps = rnd() < 0.75
    ? p.components[0]
    : randInt(rnd, p.components[0], p.components[1]);
  const budgets: number[] = [];
  let rest = Math.max(targetLines, comps * 2);
  for (let i = 0; i < comps; i++) {
    const share = i === comps - 1 ? rest : Math.max(2, Math.round(rest / (comps - i)));
    budgets.push(share);
    rest -= share;
  }
  const unitKeys = new Set<string>();
  const raw: EdgeT[] = [];
  for (const b of budgets) {
    if (!walkComponent(rnd, p, b, unitKeys, raw)) return null;
  }
  return normalizeEdges(raw);
}

/* ---- 欠けの抽出 ----
   F の見た目の線分から missing 本を抜く。欠け補完は左に完全みほんが常にあるので
   「どこを描くか」は読み取れるが、欠けが既存線に接していると見つけやすい。そこで
   公平性を段階で採る:
     ① 両端接続（つなぐべき 2 点が見える）＝最良。見つかれば即採用
     ② 片端接続（欠けが図形に必ず接する）＝次善。床はここ
   ②も満たせない（＝空中に浮く欠け）組合せは採らず null を返す。2 本図形でも
   L 字の自由端を抜けば片端接続になるので、最小ケースは②で成立する。
   返り値は R（unit 辺）。 */
function shuffled<T>(arr: T[], rnd: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rnd, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deriveGap(F: EdgeT[], missing: number, rnd: Rng): EdgeT[] | null {
  const segs = mergedSegments(F);
  if (segs.length <= missing) return null; // G に最低 1 本は残す
  const segUnits = segs.map((s) => splitAtLattice([s.a, s.b]));
  const toR = (idx: number[]): EdgeT[] =>
    normalizeEdges(idx.flatMap((i) => segUnits[i]));

  let oneSide: EdgeT[] | null = null;  // ② 片端接続（床）

  for (let attempt = 0; attempt < 80; attempt++) {
    const idx = shuffled(segs.map((_, i) => i), rnd).slice(0, missing);
    const removeKeys = new Set<string>();
    for (const i of idx) for (const u of segUnits[i]) removeKeys.add(edgeKey(u));
    const G = F.filter((e) => !removeKeys.has(edgeKey(e)));
    if (G.length === 0) continue;

    const ptsG = new Set<string>();
    for (const e of G) { ptsG.add(pkey(e[0])); ptsG.add(pkey(e[1])); }
    const ends = idx.map((i) => [ptsG.has(pkey(segs[i].a)), ptsG.has(pkey(segs[i].b))] as const);

    if (ends.every(([a, b]) => a && b)) return toR(idx);      // ① 即採用
    if (!oneSide && ends.every(([a, b]) => a || b)) oneSide = toR(idx);
  }
  return oneSide;
}

export function generateFillCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補の F（追加生成時の多様性比較）
  figureOverride?: number,    // 完成図 F の線分本数を固定（検品ツールの「線分の本数」）
  gapOverride?: number,       // 抜く本数を固定（検品ツールの「欠けの本数」）
): Problem[] {
  const base = FILL_LADDER[sku];
  if (!base) throw new Error(`FILL_LADDER に未定義の sku: ${sku}`);
  const params: FillParams = {
    ...base,
    ...(figureOverride ? { lines: [figureOverride, figureOverride] as [number, number] } : {}),
    ...(gapOverride ? { missing: [gapOverride, gapOverride] as [number, number] } : {}),
  };

  const rnd = seededRng(`${sku}#${seed}`);
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];
  const simThreshold = params.grid <= 3 ? 0.62 : 0.5;
  let attempts = 0;
  const maxAttempts = count * 300; // 欠け抽出の失敗ぶん試行を厚めに

  /* 完成図 F の線本数で帯域クォータ（図形サイズに多様性を持たせる） */
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

    const F = buildFigure(rnd, params, target);
    if (!F) continue;
    if (!bboxOk(F, params.bbox)) continue;

    const m = computeMetrics(F, params.grid);
    if (!paramsOk(F, m, params)) continue;
    if (params.slopes === "any" && !hasNon45(F)) continue;
    if (!relax && (bandCount.get(m.lines) ?? 0) >= quota) continue;

    // 欠け本数は「見た目の線分数 − 1」を超えられない（G に最低 1 本残す）。
    // 線分2本×欠け3本のような無理な指定でも 1 本に丸めて成立させる。
    const wantGap = gapOverride ?? randInt(rnd, params.missing[0], params.missing[1]);
    const gap = Math.max(1, Math.min(wantGap, m.lines - 1));
    const R = deriveGap(F, gap, rnd);
    if (!R) continue;

    const tooSimilar =
      accepted.some((a) => jaccard(a.edges, F) > simThreshold) ||
      existing.some((e) => jaccard(e, F) > simThreshold);
    if (tooSimilar) continue;

    bandCount.set(m.lines, (bandCount.get(m.lines) ?? 0) + 1);
    accepted.push({
      edges: F,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n: params.grid },
        edges: F,
        answer: { mode: "explicit", edges: R },
        metrics: m,
        gen: { kind: "auto", generator: "fill", version: FILL_GENERATOR_VERSION, seed },
      },
    });
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}
