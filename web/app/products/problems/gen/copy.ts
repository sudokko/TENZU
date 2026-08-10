/* =========================================================================
   模写（図形）ジェネレータ（手設計ライブラリ × 帯適合・決定的）
   ランダムウォークでは「整った図形」にならないため、copy は motif（絵柄）と
   同じライブラリ方式に転換した（2026-06-14）。copy-shapes.ts の幾何ライブラリ
   （パラメトリック族＋一品物＋合成/密パターン）を展開し、各巻の難易度帯
   （COPY_LADDER）に実測 metrics で適合する変種だけを候補化する。
   - 配置は中央寄せ（決定的・整い優先。motif の rng 配置と違い遊びを入れない）
   - 有限ライブラリ＝「打ち止め」。同 Lv 複数 Vol で同じ図形を出さない（兄弟巻排除）
   - 変種キー（gen.variant）で自巻既出・兄弟巻重複を排除
   ========================================================================= */

import type { Candidate, EdgeT, Problem } from "../schema";
import { edgeKey, normalizeEdges, validateProblem } from "../schema";
import { computeMetrics } from "./metrics";
import { baseDifficulty } from "./difficulty";
import { COPY_LADDER } from "./ladder";
import { jaccard } from "./filters";
import { allRawShapes, shapeEdges, type RawShape } from "./copy-shapes";
import { generateSymmetricVariants } from "./symmetric";
import { generateTruchetVariants } from "./truchet";
import { generateRandomVariants, generateBlobVariants, generateHybridVariants } from "./random-engine";
import { randInt, seededRng } from "./rng";

export const COPY_GENERATOR_VERSION = "2"; // 2＝ライブラリ方式（1＝旧ランダム）

/* 同一族（grid/drect…）は 1 巻に最大いくつまで出すか（同族サイズ違いの氾濫防止）。
   sym（対称構築）は各図形が別パターン＝多めに通す。truchet（織り）は似がちなので控えめ。 */
const MAX_PER_FAMILY = 4;
function familyCap(family: string): number {
  if (family === "sym" || family === "rand" || family === "blob" || family === "hybrid") return 12;
  if (family === "truchet") return 4;
  return MAX_PER_FAMILY;
}

/* 米/X（こめ・ばつ）系＝X・対角中心の族。巻あたり頻度をキャップして偏りを抑える
   （オーナー指示 2026-06-15: 控えめに残す＝最大2）。sym/truchet/格子/多角形は対象外。 */
const X_FAMILIES = new Set(["star", "sframe", "mand", "bmand", "hexg", "bigwinX", "paraX", "trapX", "kiteX", "penta"]);
const X_GROUP_CAP = 2;
function isXShape(family: string, variantKey: string): boolean {
  return X_FAMILIES.has(family) || variantKey.includes("d2"); // d2＝わくばつ/こうしばつ
}

export type CopySlope = "ortho" | "ortho45" | "any";
export type CrossMode = "any" | "zero" | "some"; // 交差の種類ゲート: 不問 / 交差なし / 交差あり

/* 難易度スコア D は gen/difficulty.ts の baseDifficulty に一本化した（全9タスク横断 SSOT）。
   式・校正の経緯（2026-06-15 ティア付け→最小二乗・盤面項除外）はそちらのコメント参照。
   copy はこの D をそのまま巻内12問の散らしに使う。 */

/* 巻の振り分け仕様。難しさは D の狭い窓、種類はカテゴリゲートで分離する
   （旧・多次元 band は band が広すぎ・隣接巻と重なり・巻内ばらつき9倍・難易度逆転を
   起こしていた。D 窓化で中央値が単調・窓幅は旧 band の 1/4〜1/6 に圧縮）。 */
export type CopyShapeParams = {
  grid: 3 | 4 | 5 | 6 | 7 | 8;
  slopes: CopySlope;        // ortho=直交のみ / ortho45=45°まで / any=非45°許可
  fullGrid?: boolean;       // 盤面いっぱい必須（Lv3+: 3×3 で完結する小図形を排除）
  requireNon45?: boolean;   // 非45°を必ず含む（5×5 の壁 lv3-vol2→lv4-vol1）
  requireDiag45?: boolean;  // 45°斜めを最低1本要求（3×3 の壁 lv1→lv2-vol1）
  cross?: CrossMode;        // 交差ゲート（4×4 の壁 lv2-vol2[zero]→lv3-vol1[some]）
  D: [number, number];      // 校正難易度スコア D の窓（種類は上のゲートで分離）
};

/* D 窓＋種類ゲート。巻のレベルは grid（盤面サイズ）＋種類ゲートで決まり、D 窓はその巻の
   難易度帯（盤面ぶんを抜いた線＋斜め＋非45°の量。2026-06-30 改訂で交差は D から撤去）を指定する。窓は盤面非依存なので grid 違いの
   巻どうしは値が重なってよい（grid ゲートで排他）。同 grid 2 巻は「壁」で住み分ける：
   - 3×3: lv1=直交のみ / lv2-vol1=45°斜め出現（requireDiag45）
   - 4×4: lv2-vol2=交差なし / lv3-vol1=交差あり（cross zero/some）
   - 5×5: lv3-vol2=45°まで / lv4-vol1=非45°必須（requireNon45・D は非45°本数 4〜5/本で伸びる）
   ※ 2026-06-15: copyDifficulty から盤面項 6(n−2) を除外。窓は旧値から盤面ぶんを引いた値＝
     振り分けの結果は完全に不変（スコアと窓から同じ定数を引いただけ）。 */
/* 実体は ladder.json（SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。
   ここでは型のため再 export する。 */
export { COPY_LADDER };

/* ---- 変種（原型 × ミラー・原点寄せ・スパン算出） ---- */
export type ShapeVariant = {
  key: string; name: string; family: string;
  edges: EdgeT[]; spanC: number; spanR: number;
};

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
    [e[0][0] + dc, e[0][1] + dr], [e[1][0] + dc, e[1][1] + dr],
  ] as EdgeT);
}

const mirrorV = (edges: EdgeT[]): EdgeT[] =>
  edges.map((e) => [[-e[0][0], e[0][1]], [-e[1][0], e[1][1]]] as EdgeT);

/* 1 図形＝原型のみ（多くてミラー1枚）。回転・角度でパターンを水増ししない
   （オーナー指示 2026-06-15: 角度違いの量産は不要・1〜2 パターンでよい）。
   バリエーションは「図形の種類」と「ランダム線1本追加」で出す。 */
export function expandShape(s: RawShape): ShapeVariant[] {
  const family = s.key.split("#")[0];
  const seen = new Set<string>();
  const out: ShapeVariant[] = [];
  const base = shapeEdges(s);
  for (const variant of [base, mirrorV(base)]) {
    const nb = bounds(variant);
    const placed = normalizeEdges(translate(variant, -nb.cMin, -nb.rMin));
    const sig = placed.map(edgeKey).sort().join("|");
    if (seen.has(sig)) continue;     // 対称形はミラー＝同じなので 1 枚に畳む
    seen.add(sig);
    out.push({
      key: `${s.key}/${out.length}`, name: s.name, family,
      edges: placed, spanC: nb.cMax - nb.cMin, spanR: nb.rMax - nb.rMin,
    });
  }
  return out;
}

/* 静的ライブラリ変種 ＋ 生成エンジン変種（対称構築・Truchet）を合成。
   生成エンジンは Lv3+ の grid 4-7・seed=1 固定（決定的・冪等）。grid3（Lv1-2）は対象外。
   ここ1箇所で全経路（eligibleVariants/generateCopyCandidates/bucketReport/test-gen）に乗る。 */
export function allVariants(): ShapeVariant[] {
  const staticV = allRawShapes().flatMap(expandShape);
  const genV = [4, 5, 6, 7].flatMap((n) => [
    ...generateSymmetricVariants(n, 1),
    ...generateTruchetVariants(n, 1),
    ...generateRandomVariants(n, 1),
    ...generateBlobVariants(n, 1),
    ...generateHybridVariants(n, 1),
  ]);
  return [...staticV, ...genV];
}

/* ---- 帯への適合判定 ---- */
/* 盤面占有。通常は「収まり＋長辺2以上」。fullGrid（Lv3+）は盤面いっぱい必須＝
   長辺＝grid-1 かつ短辺≥grid-2。3×3 で完結する小図形を大盤面から排除する。 */
function spanOk(v: ShapeVariant, p: CopyShapeParams): boolean {
  const n = p.grid;
  if (v.spanC > n - 1 || v.spanR > n - 1) return false;
  if (p.fullGrid) {
    return v.spanC === n - 1 && v.spanR === n - 1; // 4辺接触＝盤面いっぱい（4×4止まりを排除）
  }
  return Math.max(v.spanC, v.spanR) >= Math.min(n - 1, 2);
}

export function variantFits(v: ShapeVariant, p: CopyShapeParams): boolean {
  // 生成エンジン（対称構築・織り・ランダム）は Lv3+（fullGrid 巻）限定。Lv1-2 は不変に保つ
  if ((v.family === "sym" || v.family === "truchet" || v.family === "rand" || v.family === "blob" || v.family === "hybrid") && !p.fullGrid) return false;
  if (!spanOk(v, p)) return false;
  const m = computeMetrics(v.edges, p.grid);
  // ---- 種類ゲート（カテゴリ制約・難しさとは独立） ----
  if (p.slopes !== "any" && m.hasNon45) return false;
  if (p.requireNon45 && !m.hasNon45) return false;
  if (p.requireDiag45 && m.diagonals < 1) return false;
  if (p.cross === "zero" && m.crossings !== 0) return false;
  if (p.cross === "some" && m.crossings < 1) return false;
  // ---- D 窓（難しさ・盤面非依存） ----
  const D = baseDifficulty(m);
  if (D < p.D[0] || D > p.D[1]) return false;
  return true;
}

export function eligibleVariants(sku: string): ShapeVariant[] {
  const p = COPY_LADDER[sku];
  if (!p) return [];
  return allVariants().filter((v) => variantFits(v, p));
}

/* dev 検証用: 適合変種を線数バケツでグルーピング（線数ごと ~5 の充足確認） */
export function bucketReport(sku: string): Record<number, number> {
  const p = COPY_LADDER[sku];
  const out: Record<number, number> = {};
  if (!p) return out;
  for (const v of eligibleVariants(sku)) {
    const L = computeMetrics(v.edges, p.grid).lines;
    out[L] = (out[L] ?? 0) + 1;
  }
  return out;
}

/* 盤面中央へ寄せる（決定的・整い優先） */
function centerPlace(v: ShapeVariant, n: number): EdgeT[] {
  const offC = Math.floor((n - 1 - v.spanC) / 2);
  const offR = Math.floor((n - 1 - v.spanR) / 2);
  return normalizeEdges(translate(v.edges, offC, offR));
}

/* ---- 生成本体（motif.generateMotifCandidates と同型・配置は中央固定） ---- */
export function generateCopyCandidates(
  sku: string,
  seed: number,
  count = 9999,                                  // copy は全件ロードが既定
  existing: Pick<Candidate, "edges" | "status" | "gen">[] = [],
  linesOverride?: number,
  excludeVariants: Set<string> = new Set(),      // 兄弟巻で生きている変種キー
): Problem[] {
  const params = COPY_LADDER[sku];
  if (!params) throw new Error(`COPY_LADDER に未定義の sku: ${sku}`);
  const n = params.grid;
  const rnd = seededRng(`${sku}#copy#${seed}`);

  /* 自巻で既出の変種（不採用含む）は二度と出さない＋兄弟巻除外 */
  const usedKeys = new Set<string>(excludeVariants);
  const familyCount = new Map<string, number>();
  for (const c of existing) {
    if (c.gen?.variant) usedKeys.add(c.gen.variant);
    if (c.status !== "rejected" && c.gen?.variant) {
      const fam = c.gen.variant.split("#")[0];
      familyCount.set(fam, (familyCount.get(fam) ?? 0) + 1);
    }
  }
  const liveEdges = existing.filter((c) => c.status !== "rejected").map((c) => c.edges);

  /* 変種キーはグリッド別（同じ形でも盤面が違えば別問題）＝兄弟巻排除は
     「同グリッドの巻どうし」だけに効く。小プリミティブが先の巻に総取りされない */
  const gridKey = (k: string) => `${k}@${n}`;
  let pool = eligibleVariants(sku).filter((v) => !usedKeys.has(gridKey(v.key)));
  if (linesOverride !== undefined) {
    pool = pool.filter((v) => computeMetrics(v.edges, n).lines === linesOverride);
  }

  /* seed 決定的シャッフル（族が固まらないように） */
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(rnd, 0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const simThreshold = n <= 4 ? 0.78 : n <= 6 ? 0.62 : 0.55;
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];

  const tooSimilar = (edges: EdgeT[]) =>
    accepted.some((a) => jaccard(a.edges, edges) > simThreshold) ||
    liveEdges.some((e) => jaccard(e, edges) > simThreshold);

  const emit = (edges: EdgeT[], variantKey: string, name: string): boolean => {
    if (tooSimilar(edges)) return false;
    const problem: Problem = {
      id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
      grid: { type: "square", n },
      edges,
      metrics: computeMetrics(edges, n),
      gen: {
        kind: "auto", generator: "copy", version: COPY_GENERATOR_VERSION, seed,
        motif: name, variant: variantKey,
      },
    };
    if (validateProblem(problem).length > 0) return false;
    accepted.push({ edges, problem });
    return true;
  };

  let xGroupCount = 0;
  for (const v of pool) {
    if (accepted.length >= count) break;
    if ((familyCount.get(v.family) ?? 0) >= familyCap(v.family)) continue;
    const isX = isXShape(v.family, v.key);
    if (isX && xGroupCount >= X_GROUP_CAP) continue; // 米/X 系は巻あたり最大2
    const edges = centerPlace(v, n);
    if (emit(edges, gridKey(v.key), v.name)) {
      familyCount.set(v.family, (familyCount.get(v.family) ?? 0) + 1);
      if (isX) xGroupCount++;
    }
  }

  return accepted
    .map((a) => a.problem)
    .sort((a, b) => baseDifficulty(a.metrics) - baseDifficulty(b.metrics));
}
