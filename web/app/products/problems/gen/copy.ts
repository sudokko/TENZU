/* =========================================================================
   模写ジェネレータ（成長型ランダムウォーク・seed 決定的）
   COPY_LADDER のパラメータ内で候補を count 問生成する。
   1 候補 = 構成要素ごとにランダムウォークで辺を伸ばし（closedBias で既存頂点へ
   戻って閉路を作る）、正規化 → 機械フィルタ → metrics 検証 → 既採用との
   Jaccard 類似棄却。返り値は難易度スコア緩昇順（検品の初期並び＝出題順のたたき台）。
   同 (sku, seed) なら常に同じ候補列。追加生成は seedCursor++ で呼ぶ。
   ========================================================================= */

import type { EdgeT, Problem, Pt } from "../schema";
import { difficultyScore, edgeKey, normalizeEdges, splitAtLattice } from "../schema";
import { computeMetrics } from "./metrics";
import { bboxOk, hasNon45, jaccard, paramsOk } from "./filters";
import { COPY_LADDER, type CopyParams, type SlopeRule } from "./ladder";
import { pick, randInt, seededRng, type Rng } from "./rng";

export const GENERATOR_VERSION = "1";

/* 許可方向（単位ステップ）。grid≥4 では縦横・45°の 2 倍ステップも低頻度で混ぜる
   （正規化で 2 単位辺に分割され、併合後は 1 本の長い線分になる） */
function moves(slopes: SlopeRule, n: number, rnd: Rng): Pt[] {
  const base: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const d45: Pt[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const knight: Pt[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  let out = slopes === "ortho" ? base : [...base, ...d45];
  if (slopes === "any") out = [...out, ...knight];
  // 2 マスの長いステップ（併合で 1 本の長い線になる）。3×3 でも有効＝
  // 線2本でも盤面いっぱいの L 字が作れる
  if (rnd() < 0.25) {
    const longs: Pt[] = (slopes === "ortho" ? base : [...base, ...d45])
      .map(([c, r]) => [c * 2, r * 2] as Pt);
    out = [...out, ...longs];
  }
  return out;
}

const pkey = (p: Pt) => `${p[0]},${p[1]}`;

/* 1 構成要素ぶんのウォーク。startArea で開始点の偏り（多構成時の重なり回避）を与える */
function walkComponent(
  rnd: Rng, p: CopyParams, edgeBudget: number,
  unitKeys: Set<string>, allEdges: EdgeT[],
): boolean {
  const n = p.grid;
  const start: Pt = [randInt(rnd, 0, n - 1), randInt(rnd, 0, n - 1)];
  const verts = new Map<string, Pt>([[pkey(start), start]]);
  let added = 0;
  let guard = 0;

  while (added < edgeBudget && guard++ < edgeBudget * 30) {
    const vlist = [...verts.values()];
    const v = pick(rnd, vlist);
    const cand = moves(p.slopes, n, rnd)
      .map(([dc, dr]) => [v[0] + dc, v[1] + dr] as Pt)
      .filter((t) => t[0] >= 0 && t[0] < n && t[1] >= 0 && t[1] < n);
    if (cand.length === 0) continue;

    // closedBias: 既存頂点へ戻る手を優先（閉じた形を作る）
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
      // 中間格子点も頂点に登録（長い線の途中から分岐できる＝T 字系を解禁）
      verts.set(pkey(u[0]), u[0]);
      verts.set(pkey(u[1]), u[1]);
    }
    allEdges.push([v, t]);
    added++;
  }
  return added >= Math.max(2, Math.floor(edgeBudget * 0.7));
}

/* 1 候補を生成（失敗は null）。targetLines は呼び出し側のクォータ制御で指定 */
function tryOne(rnd: Rng, p: CopyParams, targetLines: number): EdgeT[] | null {
  // 構成要素数は最小側に強く寄せる（つながった 1 つの形が基本・
  // バラバラはアクセント程度。意図的に離す演出はしない）
  const comps = rnd() < 0.75
    ? p.components[0]
    : randInt(rnd, p.components[0], p.components[1]);
  // 構成要素へ予算配分（最低 2 辺/要素・Lv1 の線2本問題を許す）
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

export function generateCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補（追加生成時の多様性比較対象）
  linesOverride?: number,     // 線本数を固定して生成（検品ツールの指定生成）
): Problem[] {
  const base = COPY_LADDER[sku];
  if (!base) throw new Error(`COPY_LADDER に未定義の sku: ${sku}`);
  const params: CopyParams = linesOverride
    ? { ...base, lines: [linesOverride, linesOverride] }
    : base;

  const rnd = seededRng(`${sku}#${seed}`);
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];
  const simThreshold = params.grid <= 3 ? 0.62 : 0.5; // 3×3 は空間が狭いので緩め
  let attempts = 0;
  const maxAttempts = count * 200;

  /* 線本数の帯域クォータ: やさしい本数〜難しい本数が候補に均等に並ぶようにする
     （一様ランダムだと低本数帯が類似棄却で痩せる）。後半は埋まらない帯を諦めて緩和 */
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
    if (!bboxOk(edges, params.bbox)) continue;

    const m = computeMetrics(edges, params.grid);
    if (!paramsOk(edges, m, params)) continue;
    if (params.slopes === "any" && !hasNon45(edges)) continue; // 非45°の壁を保証
    if (!relax && (bandCount.get(m.lines) ?? 0) >= quota) continue; // 帯域満杯

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
        metrics: m,
        gen: { kind: "auto", generator: "copy", version: GENERATOR_VERSION, seed },
      },
    });
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}
