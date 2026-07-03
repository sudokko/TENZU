/* =========================================================================
   鏡（旧 線対称）ジェネレータ（seed 決定的・v3＝ライブラリ方式・軸レス全盤面）
   「みほん」F は copy と同じ検証済み変種プール（静的ライブラリ＋対称構築/Truchet/
   ランダム系エンジン・allVariants）から引く。F は盤面全体を使う（旧 v1/v2 の
   「軸の片側＝半盤面」制約は撤去）。
   子への軸（左右反転か上下反転か）は maker-mirror と同じく**印刷時の並び選択**で
   決まる（横並び=左右反転 v／縦並び=上下反転 h）。answer には代表値として
   derived(mirror, axis:"v") を焼く（サムネ・難易度計算用。軸で D は変わらない）。
   鏡固有の除外＝v/h 対称の図形（鏡像＝原形になり左右/上下どちらの印刷でも退化）。
   斜め軸（d1）は廃止（maker に存在せず・紙面のペイン間鏡面で表現不能・decisions §3.59）。
   MIRROR_LADDER のパラメータ内で count 問生成。同 (sku, seed) なら同じ候補列。
   ========================================================================= */

import type { EdgeT, Problem } from "../schema";
import { difficultyScore, normalizeEdges } from "../schema";
import { computeMetrics } from "./metrics";
import { closedLoops, danglingCount, jaccard, paramsOk } from "./filters";
import { mirroredShapeSignature, publishedCopySignatures, shapeSignature } from "./dedupe";
import { allVariants, type ShapeVariant } from "./copy";
import type { SlopeRule } from "./ladder";
import { MIRROR_LADDER } from "./ladder";
import { randInt, seededRng, type Rng } from "./rng";

export const MIRROR_GENERATOR_VERSION = "3"; // 3＝ライブラリ方式・軸レス（1/2＝半盤面ウォーク・撤去）

/* 印刷時の並びから導出される軸（v=左右反転／h=上下反転）。d1/d2 は廃止 */
export type MirrorAxis = "v" | "h";

export type MirrorParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  lines: [number, number];
  slopes: SlopeRule;          // 鏡タスクでは "any"(非45°) は使わない
  diagonals: [number, number];
  crossings: [number, number];
  components: [number, number];
  bbox: number;               // 両方向の最小スパン（盤面いっぱいを要求）
};

/* data.ts の mirror 4 巻に対応（Lv＝図形の複雑さ・模写連動の 3→4→5→6）。実体は
   ladder.json（SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。再 export する。 */
export { MIRROR_LADDER };

/* ---- F（みほん）の供給: copy と同じ検証済み変種プール ---- */
type PoolItem = { key: string; family: string; edges: EdgeT[] };

function centerPlace(v: ShapeVariant, n: number): EdgeT[] {
  const offC = Math.floor((n - 1 - v.spanC) / 2);
  const offR = Math.floor((n - 1 - v.spanR) / 2);
  return normalizeEdges(v.edges.map((e) => [
    [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
  ] as EdgeT));
}

function mirrorVariantPool(params: MirrorParams, strictTidy: boolean): PoolItem[] {
  const n = params.grid;
  const out: PoolItem[] = [];
  for (const v of allVariants()) {
    if (v.spanC > n - 1 || v.spanR > n - 1) continue;
    const placed = centerPlace(v, n);
    const m = computeMetrics(placed, n);
    // 鏡は非45°を使わない（角度が読めず鏡うつしが崩れる）
    if (m.hasNon45) continue;
    // 鏡固有: v/h 対称の図形は鏡像＝原形＝どちらの並びで刷っても問題が退化する
    if (m.symmetry.includes("v") || m.symmetry.includes("h")) continue;
    // 品質ゲート（relax でも外さない）: ヒゲ最小限。閉路は 4×4 以上のみ要求
    //（鏡は「裏返して写す」＝fill と違い閉じた骨格が本質ではない。3×3 の入門は
    //  く・L字などの開いた小形が定番で、オーナー採用済みの 2 問も開いた形）
    if (n >= 4 && closedLoops(placed, m.components) < 1) continue;
    if (danglingCount(placed) > 2) continue;
    // かぶり除外: 模写で公開済みの図形は鏡に再出題しない。鏡は「こたえペイン」に
    // 鏡像が印字されるため、鏡像側が公開済み図形に一致する場合も弾く（gen/dedupe.ts）
    {
      const sigs = publishedCopySignatures();
      if (sigs.has(shapeSignature(placed)) || sigs.has(mirroredShapeSignature(placed))) continue;
    }
    // paramsOk は CopyParams を受ける（closedBias はウォーク専用・ライブラリ方式では未使用のためダミー）
    if (!paramsOk(placed, m, { ...params, closedBias: 0 }, strictTidy)) continue;
    out.push({ key: v.key, family: v.family, edges: placed });
  }
  return out;
}

function shuffled<T>(arr: T[], rnd: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rnd, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const simThreshold = params.grid <= 3 ? 0.78 : 0.62;
  const FAM_CAP = 6;

  const strictPool = mirrorVariantPool(params, true);
  const relaxPool = mirrorVariantPool(params, false)
    .filter((p) => !strictPool.some((s) => s.key === p.key));
  const famCount = new Map<string, number>();
  const usedKeys = new Set<string>();

  const tryAccept = (item: PoolItem): boolean => {
    if (usedKeys.has(item.key)) return false;
    if ((famCount.get(item.family) ?? 0) >= FAM_CAP) return false;
    const F = item.edges;

    const tooSimilar =
      accepted.some((a) => jaccard(a.edges, F) > simThreshold) ||
      existing.some((e) => jaccard(e, F) > simThreshold);
    if (tooSimilar) return false;

    const m = computeMetrics(F, params.grid);
    usedKeys.add(item.key);
    famCount.set(item.family, (famCount.get(item.family) ?? 0) + 1);
    accepted.push({
      edges: F,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n: params.grid },
        edges: F,
        answer: { mode: "derived", transform: { type: "mirror", axis: "v" } },
        metrics: m,
        gen: {
          kind: "auto", generator: "mirror", version: MIRROR_GENERATOR_VERSION, seed,
          variant: item.key,
        },
      },
    });
    return true;
  };

  for (const pool of [strictPool, relaxPool]) {
    if (accepted.length >= count) break;
    for (const item of shuffled(pool, rnd)) {
      if (accepted.length >= count) break;
      tryAccept(item);
    }
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}
