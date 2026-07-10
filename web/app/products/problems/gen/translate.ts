/* =========================================================================
   移動（translate）ジェネレータ（seed 決定的・v1＝ライブラリ＋小箱全列挙ハイブリッド）
   紙面＝maker-translate と同じ 2 ペイン（左=もとの図 F＋★きてん／右=空盤面＋●ここへ）。
   成立条件＝ F と F+(dc,dr) が同一 n×n に収まる＝「動く余白」が要るため、図形は
   盤面より小さい（span + |移動量| ≤ n-1）。copy ライブラリは盤面いっぱいの形が主体で
   この小さい帯が薄いので、小箱（2×2/2×3/3×2 点）の全列挙プールで補完する。
   - 方向・移動量は巻ゲート（TRANSLATE_LADDER: dir/moves）。移動の操作負荷はゲートで
     吸収し、D は図形の土台のみ（difficulty.ts taskDifficulty の設計に従う）。
   - 配置＝F∪F' の union bbox を盤面中央へ（紙面の見た目が安定する）。
   - ★きてん＝F の辞書順最小点／●ここへ＝きてん+(dc,dr)。サムネ・将来の商品紙面が
     共有する導出規約（answer.transform が SSOT・マーカーは描画時に導出）。
   - かぶり除外: 模写公開済み図形（decisions §3.60）＋既存候補・巻内の形シグネチャ。
   - 良問選別（多めに作って選ぶ）: 品質スコア（形の自己対称・閉路・ヒゲ・角度の乱れ
     ＋seed ジッタ）順に、線本数バケットをラウンドロビン採用＝巻内の複雑さ帯を
     満遍なく埋めて count 問返す。
   ========================================================================= */

import type { EdgeT, Problem, Pt } from "../schema";
import { difficultyScore, normalizeEdge, normalizeEdges } from "../schema";
import { computeMetrics } from "./metrics";
import { closedLoops, danglingCount, jaccard, paramsOk } from "./filters";
import { publishedCopySignatures, shapeSignature } from "./dedupe";
import { allVariants, type ShapeVariant } from "./copy";
import type { CopyParams } from "./ladder";
import { TRANSLATE_LADDER } from "./ladder";
import { randInt, seededRng, type Rng } from "./rng";

export const TRANSLATE_GENERATOR_VERSION = "1";

export type TranslateDir = "h" | "v" | "diag" | "compound";

export type TranslateParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  dir: TranslateDir;          // 横／縦／斜め（45°）／複合（右2下1 等）＝巻の主ドライバー
  moves: [number, number];    // 移動量 |dc|+|dr| の範囲（マンハッタン）
  lines: [number, number];    // みほん F の線本数（併合後の見た目線分）
};

/* data.ts の translate 5 巻に対応（Lv＝移動方向・模写連動の複雑さ）。実体は
   ladder.json（SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。 */
export { TRANSLATE_LADDER };

/* ---- 内部ゲート（ladder に出さない・grid から導出） ----
   斜線: grid≤4 は 45°まで／5×5 以上は非45°解禁（fill Lv.4 と同じ「許可のみ・必須なし」）。
   交差: 盤面が広いほど許容。構成要素は常に 1（ばらばらの 2 片を同時に動かす問題は
   ★きてん 1 点のアンカー規約と喧嘩するため出さない）。 */
function copyParamsFor(p: TranslateParams): CopyParams {
  const cross: Record<number, [number, number]> =
    { 3: [0, 0], 4: [0, 1], 5: [0, 2], 6: [0, 3], 7: [0, 3] };
  return {
    grid: p.grid,
    lines: p.lines,
    slopes: p.grid <= 4 ? "ortho45" : "any",
    diagonals: [0, 9],
    crossings: cross[p.grid],
    components: [1, 1],
    bbox: 1,               // 両方向スパン≥1＝棒 1 本だけの図形を除外
    closedBias: 0,         // ウォーク専用（ライブラリ方式では未使用）
    maxDangling: 2,
    minCompEdges: 2,
  };
}

/* =========================================================================
   小箱の全列挙プール
   W×H 点の箱に引ける unit 辺（縦横＋セル 45°対角）は 2×3 で 11 本＝2^11 通り＝
   全列挙できる。連結（1 成分）・両方向スパン≥1・ヒゲ≤2 の形だけを変種化する。
   3×3 盤の移動（figure ≤ 2×3 点）はこのプールが主力になる。
   ========================================================================= */
/* 3×3 箱（unit 辺 20 本）は 2^20 全走査でも popcount 早期棄却で一瞬（本体処理は
   C(20,3..7)≈13.7万）。4×4 盤 lv3 の主戦場＝3×3 スパン帯を厚くする。 */
const MICRO_BOXES: [number, number][] = [[2, 2], [2, 3], [3, 2], [3, 3]];
let microCache: ShapeVariant[] | null = null;

function microBox(W: number, H: number, seen: Set<string>): ShapeVariant[] {
  const units: EdgeT[] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W - 1; c++)
    units.push(normalizeEdge([[c, r], [c + 1, r]]));
  for (let c = 0; c < W; c++) for (let r = 0; r < H - 1; r++)
    units.push(normalizeEdge([[c, r], [c, r + 1]]));
  for (let r = 0; r < H - 1; r++) for (let c = 0; c < W - 1; c++) {
    units.push(normalizeEdge([[c, r], [c + 1, r + 1]]));
    units.push(normalizeEdge([[c + 1, r], [c, r + 1]]));
  }
  const E = units.length; // 2×3 → 11・2×2 → 6
  const out: ShapeVariant[] = [];
  for (let mask = 1; mask < (1 << E); mask++) {
    let bits = 0;
    for (let m2 = mask; m2; m2 &= m2 - 1) bits++;
    if (bits < 3 || bits > 7) continue; // unit 3〜7 本（併合後 2〜5 線相当）
    const sub: EdgeT[] = [];
    for (let i = 0; i < E; i++) if (mask & (1 << i)) sub.push(units[i]);
    // 連結（1 成分）— 格子点 union-find
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
    for (const e of sub) uni(`${e[0][0]},${e[0][1]}`, `${e[1][0]},${e[1][1]}`);
    const roots = new Set<string>();
    for (const k of parent.keys()) roots.add(find(k));
    if (roots.size !== 1) continue;
    // 両方向スパン ≥1（棒 1 本を除外）＋ヒゲ ≤2
    let cMin = 9, cMax = -9, rMin = 9, rMax = -9;
    for (const e of sub) for (const p of e) {
      cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
      rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
    }
    if (cMax - cMin < 1 || rMax - rMin < 1) continue;
    if (danglingCount(sub) > 2) continue;
    // 原点寄せ（配置計算は「変種＝原点基準」を前提にする）＋シグネチャ重複除去
    const shifted = normalizeEdges(sub.map((e) => [
      [e[0][0] - cMin, e[0][1] - rMin], [e[1][0] - cMin, e[1][1] - rMin],
    ] as EdgeT));
    const sig = shapeSignature(shifted);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      key: `micro${W}x${H}#${mask}`, name: `micro${W}x${H}#${mask}`, family: "micro",
      edges: shifted, spanC: cMax - cMin, spanR: rMax - rMin,
    });
  }
  return out;
}

/* rotate 生成器（gen/rotate.ts）も同じ小箱プールを使う（3×3/4×4 帯の共通補完） */
export function microShapes(): ShapeVariant[] {
  if (microCache) return microCache;
  const seen = new Set<string>();
  microCache = MICRO_BOXES.flatMap(([W, H]) => microBox(W, H, seen));
  return microCache;
}

/* =========================================================================
   ベクトルと配置
   ========================================================================= */
type Vec = { dc: number; dr: number };

/* 移動量 m の (|dc|,|dr|) 分解（方向ゲート別） */
function magPairs(dir: TranslateDir, m: number): [number, number][] {
  if (dir === "h") return [[m, 0]];
  if (dir === "v") return [[0, m]];
  if (dir === "diag") return m % 2 === 0 && m >= 2 ? [[m / 2, m / 2]] : [];
  // compound: 両軸 ≥1・|dc|≠|dr|（=斜め 45°と区別）
  const out: [number, number][] = [];
  for (let a = 1; a < m; a++) {
    const b = m - a;
    if (b >= 1 && a !== b) out.push([a, b]);
  }
  return out;
}

/* この変種（span）で成立する移動ベクトル一覧（F と F' が n×n に収まる） */
function feasibleVectors(spanC: number, spanR: number, p: TranslateParams): Vec[] {
  const n = p.grid;
  const out: Vec[] = [];
  for (let m = p.moves[0]; m <= p.moves[1]; m++) {
    for (const [a, b] of magPairs(p.dir, m)) {
      if (spanC + a > n - 1 || spanR + b > n - 1) continue;
      for (const dc of a === 0 ? [0] : [a, -a]) {
        for (const dr of b === 0 ? [0] : [b, -b]) out.push({ dc, dr });
      }
    }
  }
  return out;
}

/* 右・下（正方向）優先でベクトルを選ぶ（読み書きの方向と一致＝子に自然）。
   3 割は逆向きも混ぜて巻内の味変にする。 */
function pickVector(vecs: Vec[], rnd: Rng): Vec {
  const pos = vecs.filter((v) => v.dc >= 0 && v.dr >= 0);
  const pool = pos.length > 0 && randInt(rnd, 0, 9) < 7 ? pos : vecs;
  return pool[randInt(rnd, 0, pool.length - 1)];
}

/* F∪F' の union bbox を盤面中央へ置く。F は負方向移動のとき union の反対側に寄る */
function placeWithVector(
  v: ShapeVariant, vec: Vec, n: number,
): { F: EdgeT[]; anchor: Pt } {
  const uC = v.spanC + Math.abs(vec.dc);
  const uR = v.spanR + Math.abs(vec.dr);
  const offC = Math.floor((n - 1 - uC) / 2) + (vec.dc < 0 ? -vec.dc : 0);
  const offR = Math.floor((n - 1 - uR) / 2) + (vec.dr < 0 ? -vec.dr : 0);
  const F = normalizeEdges(v.edges.map((e) => [
    [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
  ] as EdgeT));
  // ★きてん＝F の辞書順最小点（描画側と同じ導出規約）
  let anchor: Pt = F[0][0];
  for (const e of F) for (const p of e) {
    if (p[0] < anchor[0] || (p[0] === anchor[0] && p[1] < anchor[1])) anchor = p;
  }
  return { F, anchor };
}

/* =========================================================================
   品質スコア（採用順）
   metrics.symmetry は盤面中心基準＝移動の非中央配置では立たないため、
   形そのものの自己対称は原点寄せシグネチャの一致で判定する。
   ========================================================================= */
function selfSymScore(edges: EdgeT[]): number {
  const sig = shapeSignature(edges);
  const flipV = shapeSignature(edges.map((e) => [
    [-e[0][0], e[0][1]], [-e[1][0], e[1][1]],
  ] as EdgeT));
  const flipH = shapeSignature(edges.map((e) => [
    [e[0][0], -e[0][1]], [e[1][0], -e[1][1]],
  ] as EdgeT));
  return (sig === flipV ? 2 : 0) + (sig === flipH ? 2 : 0);
}

function shapeQuality(edges: EdgeT[], components: number, angleKinds: number): number {
  return selfSymScore(edges)
    + 1.0 * closedLoops(edges, components)
    - 0.6 * danglingCount(edges)
    - 1.0 * Math.max(0, angleKinds - 1);
}

/* =========================================================================
   本体
   ========================================================================= */
type PoolItem = {
  key: string; family: string; variant: ShapeVariant;
  lines: number; quality: number;
};

export function generateTranslateCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補の edges（形シグネチャで再出題を防ぐ）
  linesOverride?: number,
  excludeShapeSigs?: Set<string>, // 兄弟巻の形シグネチャ（同じ形を移動量違いで再売しない）
): Problem[] {
  const base = TRANSLATE_LADDER[sku];
  if (!base) throw new Error(`TRANSLATE_LADDER に未定義の sku: ${sku}`);
  const params: TranslateParams = linesOverride
    ? { ...base, lines: [linesOverride, linesOverride] }
    : base;
  const cp = copyParamsFor(params);
  const n = params.grid;
  const rnd = seededRng(`${sku}#${seed}`);

  const pubSigs = publishedCopySignatures();
  const existingSigs = new Set(existing.map(shapeSignature));

  /* ---- プール構築（strict → relax の 2 段。連結・ヒゲ・閉路・かぶりは relax でも外さない） ---- */
  const buildPool = (strict: boolean, exclude: Set<string>): PoolItem[] => {
    const out: PoolItem[] = [];
    for (const v of [...allVariants(), ...microShapes()]) {
      if (feasibleVectors(v.spanC, v.spanR, params).length === 0) continue;
      const sig = shapeSignature(v.edges);
      if (exclude.has(sig)) continue;
      // かぶり除外: 模写で公開済みの図形＋この巻の既存候補＋兄弟巻の形
      if (pubSigs.has(sig) || existingSigs.has(sig)) continue;
      if (excludeShapeSigs?.has(sig)) continue;
      const m = computeMetrics(v.edges, n); // 数量系メトリクスは配置不変（原点基準で判定）
      // 品質ゲート（relax でも外さない）: ヒゲ最小限・4×4 以上は閉じた骨格を要求
      //（3×3 の入門は く・L字などの開いた小形が定番＝鏡 Lv.2 と同じ判断）
      if (n >= 4 && closedLoops(v.edges, m.components) < 1) continue;
      if (danglingCount(v.edges) > 2) continue;
      // 移動固有: 非45°は解禁帯（grid≥5）でも 2 本まで（主役は「移動」＝図形は
      // 模写Lv連動のやや軽め。載りすぎは D が模写の同 Lv 窓を超えて genre 外になる）。
      // ortho45 帯は完全排除（paramsOk の種類数ゲートは単独角度の非45°を素通しする）
      if (cp.slopes !== "any" ? m.non45 > 0 : m.non45 > 2) continue;
      if (!paramsOk(v.edges, m, cp, strict)) continue;
      exclude.add(sig); // プール内の形重複も一度で除去
      out.push({
        key: v.key, family: v.family, variant: v,
        lines: m.lines,
        quality: shapeQuality(v.edges, m.components, m.diagonalAngleKinds)
          + randInt(rnd, 0, 150) / 100, // seed ジッタ（再生成で並びが変わる）
      });
    }
    return out;
  };

  const poolSeen = new Set<string>();
  const strictPool = buildPool(true, poolSeen);
  const relaxPool = buildPool(false, poolSeen); // strict 採録済みシグネチャは poolSeen で除外済み

  /* ---- 良問選別: 線本数バケット × 品質順ラウンドロビン ----
     「多めに作って良品だけ残す」= プール全体（通常 count の数倍）から、
     複雑さ帯（lines）を満遍なく・各帯は品質スコア降順で採用する。 */
  const accepted: { edges: EdgeT[]; problem: Problem }[] = [];
  const famCount = new Map<string, number>();
  const FAM_CAP = 6;
  // 3×3/4×4 盤は動く余白の制約で図形帯そのものが小さい＝小箱プールが主力。
  // 5×5 以上はライブラリが厚いので小箱は味付け程度に絞る。
  const MICRO_CAP = n <= 4 ? 999 : 5;
  const simThreshold = n <= 3 ? 0.78 : 0.65;

  const tryAccept = (item: PoolItem): boolean => {
    const cap = item.family === "micro" ? MICRO_CAP : FAM_CAP;
    if ((famCount.get(item.family) ?? 0) >= cap) return false;
    const vecs = feasibleVectors(item.variant.spanC, item.variant.spanR, params);
    if (vecs.length === 0) return false;
    const vec = pickVector(vecs, rnd);
    const { F, anchor } = placeWithVector(item.variant, vec, n);
    void anchor; // ★きてんは描画側が同じ規約で導出する（データには焼かない）
    if (accepted.some((a) => jaccard(a.edges, F) > simThreshold)) return false;
    const m = computeMetrics(F, n);
    famCount.set(item.family, (famCount.get(item.family) ?? 0) + 1);
    accepted.push({
      edges: F,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n },
        edges: F,
        answer: { mode: "derived", transform: { type: "translate", dc: vec.dc, dr: vec.dr } },
        metrics: m,
        gen: {
          kind: "auto", generator: "translate", version: TRANSLATE_GENERATOR_VERSION, seed,
          variant: `${item.key}@${vec.dc},${vec.dr}`,
        },
      },
    });
    return true;
  };

  for (const pool of [strictPool, relaxPool]) {
    if (accepted.length >= count) break;
    // lines 昇順のバケット列。各バケットは品質降順
    const buckets = new Map<number, PoolItem[]>();
    for (const it of pool) {
      const arr = buckets.get(it.lines) ?? [];
      arr.push(it);
      buckets.set(it.lines, arr);
    }
    const keys = [...buckets.keys()].sort((a, b) => a - b);
    for (const k of keys) buckets.get(k)!.sort((a, b) => b.quality - a.quality);
    // ラウンドロビン採用（帯が尽きるまで巡回）
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
