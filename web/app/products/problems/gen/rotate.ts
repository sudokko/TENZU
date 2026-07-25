/* =========================================================================
   回転（rotate）ジェネレータ（seed 決定的・v1＝ライブラリ＋小箱列挙ハイブリッド）
   紙面＝maker-rotate と同じ 2 ペイン（左=みほん F／右=解答 R=rotate(F, deg)）。
   回転は盤面中心まわり（deg 90=右回り・-90=左回り・180・schema TransformSpec と
   同規約）＝ R は常に盤内＝移動のような「動く余白」制約が無く、図形は
   盤面いっぱいを使う（centerPlace・mirror と同じ配置）。
   - 巻ゲート＝ROTATE_LADDER（grid/angle/lines・ladder.json SSOT・atelier 編集可）。
   - 回転固有の除外＝その巻の回転で自分に重なる図形（90°巻=r90 対称・180°巻=
     r180/r90 対称）。解答＝出題になり「回さなくても写せる」退化問題になるため
     （鏡の v/h 対称除外・decisions §3.59 と同型の判断）。
   - かぶり除外: 模写公開済み図形（decisions §3.60）。解答ペインに公開済み図形が
     現れるかぶり（rotate(F) が公開形に一致）も弾く（鏡の鏡像照合と同型）。
   - 良問選別（多めに作って選ぶ）: 品質スコア（グリッド対称・閉路・ヒゲ・角度の
     乱れ＋seed ジッタ）順 × 線本数バケットのラウンドロビン採用（translate と同じ）。
   ========================================================================= */

import type { EdgeT, Problem, ProblemMetrics, Pt } from "../schema";
import { difficultyScore, normalizeEdges, symmetryWeight } from "../schema";
import { computeMetrics } from "./metrics";
import { closedLoops, danglingCount, jaccard, paramsOk } from "./filters";
import { publishedCopySignatures, shapeSignature } from "./dedupe";
import { allVariants, type ShapeVariant } from "./copy";
import type { CopyParams } from "./ladder";
import { ROTATE_LADDER } from "./ladder";
import { microShapes } from "./translate";
import { randInt, seededRng } from "./rng";

export const ROTATE_GENERATOR_VERSION = "1";

/* mixed＝1 巻に 3 角度を混ぜる（1 問 1 角度・decisions §3.87）。
   紙面が問題ごとに角度を示せる（弧の矢印＋目じるし□）ので混在が成立する。 */
export type RotateAngle = "90cw" | "90ccw" | "180" | "mixed";

/* 混在巻で実際に割り当てる 3 角度。ラウンドロビンで均等に配る。 */
export const MIXED_ANGLES: Exclude<RotateAngle, "mixed">[] = ["90cw", "90ccw", "180"];

export type RotateParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  angle: RotateAngle;         // 巻の回転角＝主ドライバー（ladder-schema ANGLE と同値）
  lines: [number, number];    // みほん F の線本数（併合後の見た目線分）
};

/* data.ts の rotate 6 巻に対応（角度・方向＝巻の主ドライバー・図形は模写Lv連動）。
   実体は ladder.json（SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。 */
export { ROTATE_LADDER };

export function degOf(angle: RotateAngle): 90 | -90 | 180 {
  return angle === "90cw" ? 90 : angle === "90ccw" ? -90 : 180;
}

/* 盤面中心まわりの回転（maker-rotate / schema と同規約） */
function rotatePt(p: Pt, n: number, deg: 90 | -90 | 180): Pt {
  if (deg === 90) return [n - 1 - p[1], p[0]];
  if (deg === -90) return [p[1], n - 1 - p[0]];
  return [n - 1 - p[0], n - 1 - p[1]];
}

export function rotateEdges(edges: EdgeT[], n: number, deg: 90 | -90 | 180): EdgeT[] {
  return normalizeEdges(edges.map((e) => [rotatePt(e[0], n, deg), rotatePt(e[1], n, deg)] as EdgeT));
}

/* ---- 内部ゲート（ladder に出さない・angle / grid から導出） ----
   斜線: 90°巻（Lv.2-3）＝45°まで／180°巻（Lv.4-5）＝非45°解禁（pack-tasks §16.4・
   許可のみ・必須なし）。交差は盤面が広いほど許容（図形は盤面いっぱい＝translate より緩め）。
   構成要素は 1（回転で 2 片の対応を同時に追うのは横串混在セットの領分）。 */
function copyParamsFor(p: RotateParams): CopyParams {
  const cross: Record<number, [number, number]> =
    { 3: [0, 1], 4: [0, 2], 5: [0, 4], 6: [0, 5], 7: [0, 5] };
  return {
    grid: p.grid,
    lines: p.lines,
    // 180°帯（Lv.4-5）と混在巻（Lv.5）は非45°解禁。90°帯（Lv.2-3）は 45°まで
    slopes: p.angle === "180" || p.angle === "mixed" ? "any" : "ortho45",
    diagonals: [0, 9],
    crossings: cross[p.grid],
    components: [1, 1],
    // 3×3 は小形も可（帯が薄い）・4×4 以上は span≥n-2（「盤面いっぱい」に絞ると
    // 兄弟巻の変種除外でプールが枯れる。少し小さい形＝中心からずれて回る＝位置も
    // 動く問題になり、巻内の味変を兼ねる）
    bbox: p.grid === 3 ? 1 : p.grid - 2,
    closedBias: 0,                       // ウォーク専用（ライブラリ方式では未使用）
    maxDangling: 2,
    minCompEdges: 2,
  };
}

/* 変種を盤面中央へ置く（mirror.ts centerPlace と同じ） */
function centerPlace(v: ShapeVariant, n: number): EdgeT[] {
  const offC = Math.floor((n - 1 - v.spanC) / 2);
  const offR = Math.floor((n - 1 - v.spanR) / 2);
  return normalizeEdges(v.edges.map((e) => [
    [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
  ] as EdgeT));
}

/* =========================================================================
   本体
   ========================================================================= */
type PoolItem = {
  key: string; family: string; edges: EdgeT[]; // edges＝配置済み（盤面座標）
  lines: number; quality: number;
  okDegs: (90 | -90 | 180)[];  // この形を出題してよい角度（退化・かぶりを通過したもの）
};

export function generateRotateCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補の edges（形シグネチャ＋類似度で再出題を防ぐ）
  linesOverride?: number,
  excludeVariants?: Set<string>,  // 兄弟巻で生きている変種キー（同じ形を角度違いで再売しない）
  excludeShapeSigs?: Set<string>, // 兄弟巻の形シグネチャ（別キー同形＝ライブラリ×小箱の衝突を塞ぐ）
): Problem[] {
  const base = ROTATE_LADDER[sku];
  if (!base) throw new Error(`ROTATE_LADDER に未定義の sku: ${sku}`);
  const params: RotateParams = linesOverride
    ? { ...base, lines: [linesOverride, linesOverride] }
    : base;
  const cp = copyParamsFor(params);
  const n = params.grid;
  /* 混在巻は 1 問 1 角度で 3 角度を配る。単一角度巻は従来どおり 1 つだけ。
     退化除外・公開済みかぶりは角度ごとに判定が変わるため、角度は形ごとに持たせる。 */
  const mixed = params.angle === "mixed";
  const angles: (90 | -90 | 180)[] = mixed ? MIXED_ANGLES.map(degOf) : [degOf(params.angle)];
  const rnd = seededRng(`${sku}#${seed}`);

  const pubSigs = publishedCopySignatures();
  const existingSigs = new Set(existing.map(shapeSignature));

  /* この形をこの角度で出題してよいか。
     - 退化: その角度で自分に重なる図形は「回さなくても写せる」＝解答＝出題
     - かぶり: 模写公開済み（みほん側・解答側の両方を照合）
     混在巻では角度ごとに可否が変わる（例: r180 対称は 180°だけ不可・90°は可）。 */
  const okForDeg = (placed: EdgeT[], m: ProblemMetrics, sig: string, d: 90 | -90 | 180): boolean => {
    if (d === 180 ? (m.symmetry.includes("r180") || m.symmetry.includes("r90"))
      : m.symmetry.includes("r90")) return false;
    if (pubSigs.has(sig) || pubSigs.has(shapeSignature(rotateEdges(placed, n, d)))) return false;
    return true;
  };

  /* ---- プール構築（strict → relax の 2 段。退化・ヒゲ・閉路・かぶりは relax でも外さない） ---- */
  const buildPool = (strict: boolean, exclude: Set<string>): PoolItem[] => {
    const out: PoolItem[] = [];
    for (const v of [...allVariants(), ...microShapes()]) {
      if (v.spanC > n - 1 || v.spanR > n - 1) continue;
      if (excludeVariants?.has(v.key)) continue; // 兄弟巻で使用済みの形
      const placed = centerPlace(v, n);
      const sig = shapeSignature(placed);
      if (exclude.has(sig)) continue;
      if (excludeShapeSigs?.has(sig)) continue; // 兄弟巻に同じ形（キー違い含む）
      const m = computeMetrics(placed, n);
      // 回転固有の退化・かぶりは角度ごとに判定。1 つも通らない形はここで落とす
      const okDegs = angles.filter((d) => okForDeg(placed, m, sig, d));
      if (okDegs.length === 0) continue;
      if (existingSigs.has(sig)) continue;
      // 品質ゲート（relax でも外さない）: 4×4 以上は閉じた骨格・ヒゲ最小限
      if (n >= 4 && closedLoops(placed, m.components) < 1) continue;
      if (danglingCount(placed) > 2) continue;
      // 非45°: ortho45 帯は完全排除（paramsOk は単独角度の非45°を素通しする）・
      // 解禁帯（180°巻）も 2 本まで（主役は「回す」＝図形は模写Lv連動のやや軽め）
      if (cp.slopes !== "any" ? m.non45 > 0 : m.non45 > 2) continue;
      if (!paramsOk(placed, m, cp, strict)) continue;
      exclude.add(sig); // プール内の形重複も一度で除去
      out.push({
        key: v.key, family: v.family, edges: placed,
        lines: m.lines, okDegs,
        // 中央配置なのでグリッド対称の検出が生きる＝symmetryWeight をそのまま品質に使える
        quality: symmetryWeight(m.symmetry)
          + 1.0 * closedLoops(placed, m.components)
          - 0.6 * danglingCount(placed)
          - 1.0 * Math.max(0, m.diagonalAngleKinds - 1)
          + randInt(rnd, 0, 150) / 100, // seed ジッタ（再生成で並びが変わる）
      });
    }
    return out;
  };

  const poolSeen = new Set<string>();
  const strictPool = buildPool(true, poolSeen);
  const relaxPool = buildPool(false, poolSeen);

  /* ---- 良問選別: 線本数バケット × 品質順ラウンドロビン（translate と同じ枠組み） ---- */
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];
  const famCount = new Map<string, number>();
  const FAM_CAP = 6;
  const MICRO_CAP = n <= 4 ? 999 : 5; // 3×3/4×4 は小箱プールが主力・5×5 以上は味付け程度
  const simThreshold = n <= 3 ? 0.78 : 0.65;

  /* 角度の割り当て: その形で成立する角度のうち、これまで採用が最も少ないものを選ぶ
     ＝12 問が 3 角度に均等に散る（単一角度巻は選択肢が 1 つなので素通り）。 */
  const degCount = new Map<number, number>(angles.map((d) => [d, 0]));
  const pickDeg = (okDegs: (90 | -90 | 180)[]): 90 | -90 | 180 =>
    [...okDegs].sort((a, b) => (degCount.get(a) ?? 0) - (degCount.get(b) ?? 0)
      || angles.indexOf(a) - angles.indexOf(b))[0];

  const tryAccept = (item: PoolItem): boolean => {
    const cap = item.family === "micro" ? MICRO_CAP : FAM_CAP;
    if ((famCount.get(item.family) ?? 0) >= cap) return false;
    const F = item.edges;
    if (accepted.some((a) => jaccard(a.edges, F) > simThreshold)) return false;
    if (existing.some((e) => jaccard(e, F) > simThreshold)) return false;
    const m = computeMetrics(F, n);
    const deg = pickDeg(item.okDegs);
    degCount.set(deg, (degCount.get(deg) ?? 0) + 1);
    famCount.set(item.family, (famCount.get(item.family) ?? 0) + 1);
    accepted.push({
      edges: F,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n },
        edges: F,
        answer: { mode: "derived", transform: { type: "rotate", deg } },
        metrics: m,
        gen: {
          kind: "auto", generator: "rotate", version: ROTATE_GENERATOR_VERSION, seed,
          variant: item.key,
        },
      },
    });
    return true;
  };

  for (const pool of [strictPool, relaxPool]) {
    if (accepted.length >= count) break;
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
          if (tryAccept(it)) { progressed = true; break; }
        }
      }
    }
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics));
}
