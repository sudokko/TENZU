/* =========================================================================
   かさね（overlay）ジェネレータ（seed 決定的・v2＝模写軸ラダー・合成主経路）
   紙面＝maker-overlay と同じ 3 ペイン「図形A ＋ 図形B ＝ □」。子は A と B を
   頭の中で重ねて、□ に A∪B を描く。
   データモデル（既存手設計・maker と同一）: edges＝完成図 F（=A∪B）・
   answer(explicit).edges＝R＝図形B・図形A＝F∖R。紙面・解答 PDF はすべてここから導出。
   - ラダー＝模写軸（decisions §3.71）: Lv＝図形要素（45°→45°+交差→非45°必須）が
     模写Lvに同期・Vol＝絡み（A・B間の交差数＝かさね固有の難しさ）の窓・
     線本数は per-part の成立窓に降格。
   - 生成＝合成が主経路: パーツプール（per-part 帯を満たす実図形カード）から
     A（中央寄せ）と B（ランダム配置）を引き、「絡み窓に入る交差」を配置で直接
     製造する。copy ライブラリは整った（交差の少ない）図形が主体＝単一 F の
     分割では絡みを製造できないための構造。A・B とも実図形＝かさねの古典形式。
   - フォールバック＝逆算分割: 合成で不足時のみ、完成図 F をライブラリから引いて
     辺隣接グラフ上の連結ランダム成長で A・B に分割する（v1 の方式）。
   - かぶり除外: 模写公開済み図形（decisions §3.60・F=子が描き上げる図）＋
     兄弟巻の形シグネチャ（同じ完成図を再売しない・§3.68）。
   ========================================================================= */

import type { EdgeT, Problem, Pt } from "../schema";
import { difficultyScore, edgeKey, normalizeEdges, symmetryWeight } from "../schema";
import { computeMetrics, interCrossings, mergedSegments } from "./metrics";
import { bboxOk, closedLoops, danglingCount, jaccard, paramsOk } from "./filters";
import { publishedCopySignatures, shapeSignature } from "./dedupe";
import { allVariants, type ShapeVariant } from "./copy";
import type { CopyParams } from "./ladder";
import { OVERLAY_LADDER } from "./ladder";
import { microShapes } from "./translate";
import { randInt, seededRng, type Rng } from "./rng";

export const OVERLAY_GENERATOR_VERSION = "2"; // 2＝模写軸ラダー（斜め/非45°=Lv軸・絡み=Vol軸・線分数は成立窓へ降格）

export type OverlayParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  slopes: "ortho" | "ortho45" | "any"; // 模写Lv連動（Lv2-3=ortho45／Lv4-5=any）
  requireDiag45?: boolean;    // 45°斜めを最低1本（Lv3+＝模写Lv3「45°+交差」同期）
  requireNon45?: boolean;     // 非45°を必須（Lv4+＝模写Lv4の壁と同期）
  entangle: [number, number]; // 絡み（A・B間の交差数）の窓＝Vol分けドライバー（かさね固有の難しさ）
  lines: [number, number];    // 1 図あたりの線本数（成立窓・主ドライバーではない）
};

/* data.ts の overlay 7 巻に対応（Lv＝模写連動・巻内 Vol＝線分数 少/多）。実体は
   ladder.json（SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。 */
export { OVERLAY_LADDER };

/* ---- 内部ゲート（ladder に出さない・grid から導出） ----
   斜線・非45°の要求は ladder（模写Lv連動）が持つ。交差の下限＝絡み窓の下限
   （A・B 間の交差は F の総交差の部分集合＝F の交差が絡みの上限になる）。
   構成要素は 1（ばらばらの完成図は「重ねた結果」として読めない）。 */
function copyParamsFor(p: OverlayParams): CopyParams {
  const crossHi: Record<number, number> = { 3: 4, 4: 8, 5: 10, 6: 12, 7: 12 };
  return {
    grid: p.grid,
    // F（完成図）の線本数窓: per-part 成立窓 [lo,hi] の 2 図ぶん。分割で長い線分が
    // 切れてパート側の本数が増えるため、下限は 2·lo より少し緩める
    lines: [2 * p.lines[0] - 2, 2 * p.lines[1]],
    slopes: p.slopes,
    diagonals: [0, 14],
    crossings: [p.entangle[0], crossHi[p.grid]],
    components: [1, 1],
    // 中央配置。3×3=1・4×4=2（広め）・5×5/6×6=n-3（非45°必須×絡み窓の交差点が
    // 薄いため、少し小さい完成図も許容してプールを確保する）
    bbox: p.grid === 3 ? 1 : p.grid <= 4 ? 2 : p.grid - 3,
    closedBias: 0,
    maxDangling: 2,
    minCompEdges: 2,
  };
}

/* 変種を盤面中央へ置く（mirror/rotate と同じ） */
function centerPlace(v: ShapeVariant, n: number): EdgeT[] {
  const offC = Math.floor((n - 1 - v.spanC) / 2);
  const offR = Math.floor((n - 1 - v.spanR) / 2);
  return normalizeEdges(v.edges.map((e) => [
    [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
  ] as EdgeT));
}

/* 辺集合の連結成分数（端点共有ベース・小規模用） */
function componentsOf(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const pk = (p: Pt) => `${p[0]},${p[1]}`;
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  const uni = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  };
  for (const e of edges) uni(pk(e[0]), pk(e[1]));
  const roots = new Set<string>();
  for (const k of parent.keys()) roots.add(find(k));
  return roots.size;
}

/* =========================================================================
   分割 — F の unit 辺を A・B の 2 パートへ
   B＝辺隣接グラフ（端点共有）上の連結ランダム成長（サイズ≈半分±1）。
   ゲート: **絡み（A・B 間の交差数）が entangle 窓内**＝Vol 分けドライバー・
   両パートの線本数（併合後）が band 内・連結（strict＝両方 1 成分／
   relax＝2 成分まで・ただし孤立 1 辺の成分は不可）。
   絡み＝A・B の線分同士の直接交差（interCrossings・difficulty.ts と同じ計測。
   旧引き算導出は F の線分併合で幻交差が湧くため廃止＝decisions §3.98）。
   パーティション＝A∩B は常に空（データモデル上も A=F∖R で共有辺は表現不能）。
   ========================================================================= */
function splitEdges(
  F: EdgeT[], bandIn: [number, number], entangleIn: [number, number],
  n: number, rnd: Rng, strict: boolean,
): { A: EdgeT[]; B: EdgeT[] } | null {
  // relax 段は per-part 帯・絡み窓を ±1 緩める（候補段階の緩和・採否は検品で判断）
  const band: [number, number] = strict
    ? bandIn
    : [Math.max(2, bandIn[0] - 1), bandIn[1] + 1];
  const entangle: [number, number] = strict
    ? entangleIn
    : [Math.max(0, entangleIn[0] - 1), entangleIn[1] + 1];
  const pk = (p: Pt) => `${p[0]},${p[1]}`;
  const byPt = new Map<string, number[]>();
  F.forEach((e, i) => {
    for (const p of e) {
      const k = pk(p);
      const arr = byPt.get(k) ?? [];
      arr.push(i);
      byPt.set(k, arr);
    }
  });
  const adj: number[][] = F.map(() => []);
  for (const idxs of byPt.values()) {
    for (const a of idxs) for (const b of idxs) if (a !== b) adj[a].push(b);
  }
  const partOk = (part: EdgeT[]): boolean => {
    const lines = mergedSegments(part).length;
    if (lines < band[0] || lines > band[1]) return false;
    const comps = componentsOf(part);
    if (strict) return comps === 1;
    if (comps > 2) return false;
    // relax でも「孤立 1 辺」の成分は不可（散らばって見える）
    if (comps === 2) {
      const seen = new Map<string, number>(); // root -> unit 辺数（簡易: 最小成分辺数で判定）
      void seen;
      // 成分ごとの辺数はコストが要るので、全体 unit 辺数 ≥ 4 を粗い下限にする
      if (part.length < 4) return false;
    }
    return comps <= 2;
  };
  for (let t = 0; t < 40; t++) {
    const target = Math.max(2, Math.min(F.length - 2,
      Math.round(F.length / 2) + randInt(rnd, 0, 2) - 1)); // 半分 ±1
    const start = randInt(rnd, 0, F.length - 1);
    const inB = new Set<number>([start]);
    const frontier: number[] = [...adj[start]];
    while (inB.size < target && frontier.length > 0) {
      const pick = frontier.splice(randInt(rnd, 0, frontier.length - 1), 1)[0];
      if (inB.has(pick)) continue;
      inB.add(pick);
      for (const nx of adj[pick]) if (!inB.has(nx)) frontier.push(nx);
    }
    if (inB.size !== target) continue;
    const B = F.filter((_, i) => inB.has(i));
    const A = F.filter((_, i) => !inB.has(i));
    // B は成長により常に連結。A 側と band を検査（B の band も念のため）
    if (!partOk(A) || !partOk(B)) continue;
    // 絡み窓（Vol 分けドライバー）: A・B 間の交差数が窓内か
    const inter = interCrossings(A, B);
    if (inter < entangle[0] || inter > entangle[1]) continue;
    return { A, B };
  }
  return null;
}

/* =========================================================================
   パーツ（1 枚のカード＝図形 A / B）のプール
   合成方式の主経路で使う。ライブラリ＋小箱列挙から「per-part 線本数帯・連結・
   ヒゲ≤2・斜線ルール」を満たす形を引く。数量系メトリクスは配置不変なので
   原点基準で前計算しておく（配置後の union だけ都度計算）。
   ========================================================================= */
type PartShape = {
  key: string; family: string; edges: EdgeT[]; // 原点基準
  spanC: number; spanR: number;
  lines: number; non45: number; diag45: number;
  quality: number;
};

function partPool(params: OverlayParams, n: number, rnd: Rng): PartShape[] {
  const out: PartShape[] = [];
  const seen = new Set<string>();
  for (const v of [...allVariants(), ...microShapes()]) {
    if (v.spanC > n - 1 || v.spanR > n - 1) continue;
    const sig = shapeSignature(v.edges);
    if (seen.has(sig)) continue;
    const m = computeMetrics(v.edges, n);
    if (m.components !== 1) continue; // 1 枚のカード＝1 つの形
    if (m.lines < params.lines[0] || m.lines > params.lines[1]) continue;
    if (params.slopes !== "any" ? m.non45 > 0 : m.non45 > 3) continue;
    if (danglingCount(v.edges) > 2) continue;
    seen.add(sig);
    out.push({
      key: v.key, family: v.family, edges: v.edges,
      spanC: v.spanC, spanR: v.spanR,
      lines: m.lines, non45: m.non45, diag45: m.diagonals - m.non45,
      quality: 1.0 * closedLoops(v.edges, 1)
        - 0.6 * danglingCount(v.edges)
        - 1.0 * Math.max(0, m.diagonalAngleKinds - 1)
        + randInt(rnd, 0, 150) / 100, // seed ジッタ（再生成で並びが変わる）
    });
  }
  return out.sort((a, b) => b.quality - a.quality);
}

function placeAt(edges: EdgeT[], offC: number, offR: number): EdgeT[] {
  return normalizeEdges(edges.map((e) => [
    [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
  ] as EdgeT));
}

/* =========================================================================
   本体
   ========================================================================= */
type PoolItem = {
  key: string; family: string; edges: EdgeT[]; // edges＝配置済み完成図 F
  lines: number; quality: number;
};

/* 合成タスク（かさね・分解）の共用生成コア。
   両タスクはデータ形が同一（edges=完成図・answer(explicit)=図形B・もう片方=F∖B）で、
   違いは紙面の演算子だけ（かさね: A＋B=□／分解: C−B=□）。task 指定で
   provenance の generator 名とラダーを差し替える。 */
export function generateComposedCandidates(
  task: { ladder: Record<string, OverlayParams>; generator: string; version: string },
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補の F（形シグネチャ＋類似度で再出題を防ぐ）
  linesOverride?: number,     // 1 図あたりの線本数を固定
  excludeShapeSigs?: Set<string>, // 兄弟巻の完成図シグネチャ（同じ F を再売しない）
): Problem[] {
  const base = task.ladder[sku];
  if (!base) throw new Error(`${task.generator} ladder に未定義の sku: ${sku}`);
  const params: OverlayParams = linesOverride
    ? { ...base, lines: [linesOverride, linesOverride] }
    : base;
  const cp = copyParamsFor(params);
  const n = params.grid;
  const rnd = seededRng(`${sku}#${seed}`);

  const pubSigs = publishedCopySignatures();
  const existingSigs = new Set(existing.map(shapeSignature));

  /* ---- 完成図 F のプール（strict → relax。連結・ヒゲ・閉路・かぶりは relax でも外さない） ---- */
  const buildPool = (strict: boolean, exclude: Set<string>): PoolItem[] => {
    const out: PoolItem[] = [];
    for (const v of [...allVariants(), ...microShapes()]) {
      if (v.spanC > n - 1 || v.spanR > n - 1) continue;
      const placed = centerPlace(v, n);
      const sig = shapeSignature(placed);
      if (exclude.has(sig)) continue;
      if (excludeShapeSigs?.has(sig)) continue; // 兄弟巻に同じ完成図
      if (pubSigs.has(sig) || existingSigs.has(sig)) continue;
      const m = computeMetrics(placed, n);
      // 完成図の品質（relax でも外さない）: 連結 1・閉じた骨格（n≥4）・ヒゲ最小限
      if (m.components !== 1) continue;
      if (n >= 4 && closedLoops(placed, m.components) < 1) continue;
      if (danglingCount(placed) > 2) continue;
      // 非45°: ortho45 帯は完全排除・解禁帯（Lv4-5）は 3 本まで
      // （requireNon45 巻は非45°が必須かつ希少＝キャップを 1 本ぶん緩めて取れ高を確保）
      if (cp.slopes !== "any" ? m.non45 > 0 : m.non45 > 3) continue;
      // 模写Lv連動の要素ゲート: 45°斜め必須（Lv3+）・非45°必須（Lv4+＝模写Lv4の壁）
      if (params.requireDiag45 && m.diagonals - m.non45 < 1) continue;
      if (params.requireNon45 && m.non45 < 1) continue;
      if (!paramsOk(placed, m, cp, strict)) continue;
      exclude.add(sig);
      out.push({
        key: v.key, family: v.family, edges: placed,
        lines: m.lines,
        quality: symmetryWeight(m.symmetry)
          + 1.0 * closedLoops(placed, m.components)
          - 0.6 * danglingCount(placed)
          - 1.0 * Math.max(0, m.diagonalAngleKinds - 1)
          + randInt(rnd, 0, 150) / 100,
      });
    }
    return out;
  };

  /* ---- 選別の共有状態（合成・分割の両経路が使う） ---- */
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];
  const famCount = new Map<string, number>();
  const FAM_CAP = 6;
  const MICRO_CAP = n <= 3 ? 999 : 6;
  const simThreshold = n <= 3 ? 0.78 : 0.65;
  const usedFSigs = new Set<string>();

  const pushProblem = (
    F: EdgeT[], B: EdgeT[], mF: ReturnType<typeof computeMetrics>,
    family: string, variant: string,
  ) => {
    famCount.set(family, (famCount.get(family) ?? 0) + 1);
    accepted.push({
      edges: F,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n },
        edges: F,
        answer: { mode: "explicit", edges: B },
        metrics: mF,
        gen: {
          kind: "auto", generator: task.generator, version: task.version, seed,
          variant,
        },
      },
    });
  };

  /* ---- 主経路: 合成 — 2 つの実図形 A・B を「交差するように」配置して重ねる ----
     copy ライブラリは整った（交差の少ない）図形が主体＝単一 F の分割では絡みを
     製造できない。合成なら絡み＝配置で直接作れる上、A・B とも「ちゃんとした形の
     カード」になる（かさねの古典形式）。A は中央寄せ・B はランダム配置で試行。 */
  const parts = partPool(params, n, rnd);
  const tryCompose = (A: PartShape, strict: boolean): boolean => {
    const ent: [number, number] = strict
      ? params.entangle
      : [Math.max(0, params.entangle[0] - 1), params.entangle[1] + 1];
    const offAC = Math.floor((n - 1 - A.spanC) / 2);
    const offAR = Math.floor((n - 1 - A.spanR) / 2);
    const Aplaced = placeAt(A.edges, offAC, offAR);
    const aKeys = new Set(Aplaced.map(edgeKey));
    for (let t = 0; t < 60; t++) {
      const B = parts[randInt(rnd, 0, parts.length - 1)];
      const offC = randInt(rnd, 0, n - 1 - B.spanC);
      const offR = randInt(rnd, 0, n - 1 - B.spanR);
      const Bplaced = placeAt(B.edges, offC, offR);
      // 辺の共有はデータモデル上表現不能（A=F∖R が欠ける）＝不可
      if (Bplaced.some((e) => aKeys.has(edgeKey(e)))) continue;
      const F = normalizeEdges([...Aplaced, ...Bplaced]);
      const mF = computeMetrics(F, n);
      // 絡み＝A・B の線分同士の直接交差（difficulty.ts と同じ計測・§3.98）
      const inter = interCrossings(Aplaced, Bplaced);
      if (inter < ent[0] || inter > ent[1]) continue;
      const comps = componentsOf(F);
      if (comps > 2) continue;
      // 交差ゼロの合成は「接している」こと（離れ小島 2 つは重ねる意味が薄い）
      if (inter === 0 && comps !== 1) continue;
      // 模写Lv連動の要素ゲート（union レベル）
      if (params.requireNon45 && A.non45 + B.non45 < 1) continue;
      if (params.requireDiag45 && A.diag45 + B.diag45 < 1) continue;
      if (mF.non45 > 3) continue;
      if (mF.crossings > cp.crossings[1]) continue;
      if (!bboxOk(F, cp.bbox)) continue;
      if (danglingCount(F) > 4) continue; // カード 2 枚ぶん（各 ≤2）
      const sig = shapeSignature(F);
      if (usedFSigs.has(sig) || pubSigs.has(sig) || existingSigs.has(sig)) continue;
      if (excludeShapeSigs?.has(sig)) continue;
      if (accepted.some((a) => jaccard(a.edges, F) > simThreshold)) continue;
      if (existing.some((e) => jaccard(e, F) > simThreshold)) continue;
      usedFSigs.add(sig);
      pushProblem(F, Bplaced, mF, A.family, `${A.key}+${B.key}@${offC},${offR}`);
      return true;
    }
    return false;
  };

  for (const strict of [true, false]) {
    let progressed = true;
    while (accepted.length < count && progressed) {
      progressed = false;
      for (const A of parts) {
        if (accepted.length >= count) break;
        const cap = A.family === "micro" ? MICRO_CAP : FAM_CAP;
        if ((famCount.get(A.family) ?? 0) >= cap) continue;
        if (tryCompose(A, strict)) progressed = true;
      }
    }
    if (accepted.length >= count) break;
  }

  /* ---- フォールバック: 単一 F の分割（従来方式）で不足分を補う ---- */
  if (accepted.length < count) {
    const poolSeen = new Set<string>(usedFSigs);
    const strictPool = buildPool(true, poolSeen);
    const relaxPool = buildPool(false, poolSeen);

    const tryAccept = (item: PoolItem, strict: boolean): boolean => {
      const cap = item.family === "micro" ? MICRO_CAP : FAM_CAP;
      if ((famCount.get(item.family) ?? 0) >= cap) return false;
      const F = item.edges;
      if (accepted.some((a) => jaccard(a.edges, F) > simThreshold)) return false;
      if (existing.some((e) => jaccard(e, F) > simThreshold)) return false;
      // 分割（A・B）が成立しない完成図は捨てる（絡み窓・線本数帯・連結ゲート込み）
      const m = computeMetrics(F, n);
      const split = splitEdges(F, params.lines, params.entangle, n, rnd, strict);
      if (!split) return false;
      usedFSigs.add(shapeSignature(F));
      pushProblem(F, split.B, m, item.family, item.key);
      return true;
    };

    /* strict 段で分割に失敗した完成図は捨てずに取り置き、relax 段（緩い分割条件＝
       2 成分許容）で再挑戦する。 */
    const leftovers: PoolItem[] = [];
    const runPhase = (pool: PoolItem[], strict: boolean) => {
      const buckets = new Map<number, PoolItem[]>();
      for (const it of pool) {
        const arr = buckets.get(it.lines) ?? [];
        arr.push(it);
        buckets.set(it.lines, arr);
      }
      const keys = [...buckets.keys()].sort((a, b) => a - b);
      for (const k of keys) buckets.get(k)!.sort((a, b) => b.quality - a.quality);
      let progressed = true;
      while (accepted.length < count && progressed) {
        progressed = false;
        for (const k of keys) {
          if (accepted.length >= count) break;
          const arr = buckets.get(k)!;
          while (arr.length > 0) {
            const it = arr.shift()!;
            if (tryAccept(it, strict)) { progressed = true; break; }
            if (strict) leftovers.push(it);
          }
        }
      }
    };
    runPhase(strictPool, true);
    if (accepted.length < count) runPhase([...relaxPool, ...leftovers], false);
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}

/* かさね: 共用コアのラッパー（レジストリはこれを呼ぶ） */
export function generateOverlayCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],
  linesOverride?: number,
  excludeShapeSigs?: Set<string>,
): Problem[] {
  return generateComposedCandidates(
    { ladder: OVERLAY_LADDER, generator: "overlay", version: OVERLAY_GENERATOR_VERSION },
    sku, seed, count, existing, linesOverride, excludeShapeSigs,
  );
}

/* 検品補助: 候補の A（=F∖R）を返す。AtelierApp のかさね表示・検証スクリプトが使う */
export function overlayPartA(F: EdgeT[], R: EdgeT[]): EdgeT[] {
  const rk = new Set(R.map(edgeKey));
  return F.filter((e) => !rk.has(edgeKey(e)));
}
