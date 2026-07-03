/* =========================================================================
   欠け補完ジェネレータ（seed 決定的・v2＝ライブラリ方式）
   完全な図形 F（＝みほん）を copy と同じ検証済み変種プール（静的ライブラリ＋
   対称構築/Truchet/ランダム系エンジン・allVariants）から引き、その「見た目の
   線分」から 1〜missing 本を抜いて欠け図 G＝F∖R を作る。子は左の F を見ながら
   右の G に足りない線（R）を描き足す。
     - edges  … F（完全な図形・みほん／出題図）。metrics も F で算出
     - answer … { explicit, edges: R }＝抜いた線分（子が描き足す＝解答）
     - G（右ペインの欠け図）は描画時に F∖R で導出する
   公平性ルール: 抜いた線分の両端点は G 側に必ず残す（＝つなぐべき 2 点が見えて
   いる）。これで入門でも「どこが足りないか」が自明になる。
   v1（copy 流ランダムウォーク）は開いた形・破片・非45°の乱線が出て検品に耐えず
   撤去（2026-07-01）。欠け補完は「残りから完成形が推定できる」ことが本質なので、
   F は閉じて整ったキュレート済み図形であることが copy 以上に効く。
   FILL_LADDER のパラメータ内で count 問生成。同 (sku, seed) なら同じ候補列。
   ========================================================================= */

import type { EdgeT, Problem } from "../schema";
import { difficultyScore, edgeKey, normalizeEdges, splitAtLattice } from "../schema";
import { computeMetrics, mergedSegments } from "./metrics";
import { closedLoops, danglingCount, jaccard, paramsOk } from "./filters";
import { publishedCopySignatures, shapeSignature } from "./dedupe";
import { allVariants, type ShapeVariant } from "./copy";
import type { CopyParams } from "./ladder";
import { FILL_LADDER } from "./ladder";
import { randInt, seededRng, type Rng } from "./rng";

export const FILL_GENERATOR_VERSION = "2"; // 2＝ライブラリ方式（1＝旧ランダムウォーク・撤去）

/* CopyParams（＝F の生成仕様）＋ missing（抜く線分の本数レンジ）。
   lines は「完成図 F の見た目の線分数」。missing は「そこから抜く本数」。 */
export type FillParams = CopyParams & { missing: [number, number] };

/* data.ts の fill 8 巻に対応（欠け少なめ／多めは missing で吸収）。実体は ladder.json
   （SSOT・atelier から編集/Vol追加）。読み取りは gen/ladder.ts 経由。ここでは再 export する。 */
export { FILL_LADDER };

const pkey = (p: [number, number]) => `${p[0]},${p[1]}`;

/* ---- F（完全な図形）の供給: copy と同じ検証済み変種プール ----
   静的ライブラリ（copy-shapes）＋生成エンジン（対称構築・Truchet・ランダム系）を
   盤面中央へ寄せて配置し、fill のパラメータ帯（lines/diagonals/crossings/components/
   bbox/slopes・整いゲート含む paramsOk）で濾す。slopes:any の巻は非45°を必須
   （copy Lv.4 の壁と同思想）。 */
type PoolItem = { key: string; family: string; edges: EdgeT[]; lines: number };

function centerPlace(v: ShapeVariant, n: number): EdgeT[] {
  const offC = Math.floor((n - 1 - v.spanC) / 2);
  const offR = Math.floor((n - 1 - v.spanR) / 2);
  return normalizeEdges(v.edges.map((e) => [
    [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
  ] as EdgeT));
}

function fillVariantPool(params: FillParams, strictTidy: boolean): PoolItem[] {
  const n = params.grid;
  const out: PoolItem[] = [];
  for (const v of allVariants()) {
    if (v.spanC > n - 1 || v.spanR > n - 1) continue;
    const placed = centerPlace(v, n);
    const m = computeMetrics(placed, n);
    if (params.slopes === "any" && !m.hasNon45) continue;
    // fill の本質ゲート（relax でも外さない）:
    //   閉路≥1 … 純ツリー形（ジグザグ・T・X の散らばり）を排除。「残りから完成形が
    //             推定できる」には輪郭の閉じた骨格が要る
    //   ヒゲ≤2 … 開いた端点だらけの形を排除（とって等の突起は 2 本まで許容）
    if (closedLoops(placed, m.components) < 1) continue;
    if (danglingCount(placed) > 2) continue;
    // かぶり除外: 模写で公開済みの図形は欠け補完に再出題しない（gen/dedupe.ts）
    if (publishedCopySignatures().has(shapeSignature(placed))) continue;
    if (!paramsOk(placed, m, params, strictTidy)) continue;
    out.push({ key: v.key, family: v.family, edges: placed, lines: m.lines });
  }
  return out;
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
  // キュレート形は辺を共有しやすい（盤面枠・対称構築の骨格）ので walk 時代より緩め。
  // 完全一致・準一致（>閾値）だけ弾き、多様性は famCap と検品に委ねる。
  const simThreshold = params.grid <= 3 ? 0.78 : 0.62;
  const FAM_CAP = 6; // 同族（同 family）の上限。エンジン族（sym/truchet/rand…）は1族が大きい

  /* プール＝厳格（整いゲートあり）→ 足りなければ緩和（relax）を継ぎ足す */
  const strictPool = fillVariantPool(params, true);
  const relaxPool = fillVariantPool(params, false)
    .filter((p) => !strictPool.some((s) => s.key === p.key));
  const famCount = new Map<string, number>();
  const usedKeys = new Set<string>();

  const tryAccept = (item: PoolItem): boolean => {
    if (usedKeys.has(item.key)) return false;
    if ((famCount.get(item.family) ?? 0) >= FAM_CAP) return false;
    const F = item.edges;
    const m = computeMetrics(F, params.grid);

    // 欠け本数は「見た目の線分数 − 1」を超えられない（G に最低 1 本残す）。
    const wantGap = gapOverride ?? randInt(rnd, params.missing[0], params.missing[1]);
    const gap = Math.max(1, Math.min(wantGap, m.lines - 1));
    const R = deriveGap(F, gap, rnd);
    if (!R) return false;

    const tooSimilar =
      accepted.some((a) => jaccard(a.edges, F) > simThreshold) ||
      existing.some((e) => jaccard(e, F) > simThreshold);
    if (tooSimilar) return false;

    usedKeys.add(item.key);
    famCount.set(item.family, (famCount.get(item.family) ?? 0) + 1);
    accepted.push({
      edges: F,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "square", n: params.grid },
        edges: F,
        answer: { mode: "explicit", edges: R },
        metrics: m,
        gen: {
          kind: "auto", generator: "fill", version: FILL_GENERATOR_VERSION, seed,
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
