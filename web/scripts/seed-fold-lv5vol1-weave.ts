/* fold-lv5-vol1 へ「複雑な図形を 2 層に分解した」候補を投入するバッチ
   （npx tsx scripts/seed-fold-lv5vol1-weave.ts [--png <png>] [--preview <html>]
     [--top N] [--write]）

   ■ 何を作るか（2026-08-11・オーナー指示）
   「単調な折り重ねにせず、複雑な図形をうまく分解した形」。
   fold の完成図 F は P（＝問題1を折り返した姿）と Q（＝問題2）の和なので、
   **F を 1 枚の複雑な模様として設計し、その模様が持つ 2 つの層をそのまま
   P と Q にする**。層は
     ・かたむいた層＝名前の言えるシルエット（五角形・たこ・さかな・ふね…）
     ・骨組みの層＝規則のある構造（まど・はしご・Xぐみ・ますめ・うずまき…）
   の 2 種類で、どちらも単体で 1 枚のカードとして読める（motif-craft §3/§4）。
   絡み（3〜10）は「2 層が互いを貫く」ことで自然に立つ＝背景を置いただけの
   構図にならない。

   ■ 前バッチからの変更点
   - seed-fold-lv5vol1-hard.ts … Q を「わく＋桟」ライブラリから選ばせた結果、
     どの問題も同じ長方形が問題2に出た。→ **Q は問題ごとに手設計**する。
   - seed-fold-lv5vol1-split.ts … F を 1 枚描いて分割を全列挙した。分け方は
     機械が選ぶので「読めない半身」が混じった。→ **分け方も手で決める**。
   ここでは形（2 層）だけを手で決め、**置き方（平行移動・反転・どちらを問題1に
   するか）だけを探索**する。座標の当たりを人力で詰める作業がゲート違反の
   主因だったので、そこだけ機械に任せる＝設計意図は保ったまま収束する。

   ■ 巻ゲート（ladder.json fold-lv5-vol1）
     6×6・slopes any・requireNon45・絡み [3,10]・線 [4,8]/図
   ■ 完成図 F の導出ゲート（gen/fold.ts → gen/overlay.ts copyParamsFor）
     非45° ≤3・交差 ≤12・成分 ≤2・ヒゲ ≤4・閉路 ≥1・ひろがり ≥4
   ■ D 窓 40〜60（採用済み 5 問が 26.6〜40.8 ＝ その上の帯を埋める）
     D ＝ 折り係数×E(問題1) ＋ E(問題2) ＋ 2×絡み ＋ もつれ ＋ ばらけ ＋ 盤面項(6)
     配合の目安: かたむいた層 E13〜18（非45° 2〜3 本）＋ 骨組み層 E5〜8
                ＋ 絡み 5〜8（1 つ 2 点）＋ もつれ 6〜8（分岐 1 か所 1.5・交差 2）
   ■ 折り退化（motif-craft §6.5）: 問題1 が折り軸に対して自分自身に重なると
     出題が成立しない。r ≤ 0.2 をハードゲートにし、スコアでも 0 を強く優先する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  edgeKey, mirrorEdges, normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type Pt,
} from "../app/products/problems/schema";
import { computeMetrics, interCrossings } from "../app/products/problems/gen/metrics";
import {
  foldFactor, foldInvariance, migrateProblem, taskDifficulty,
} from "../app/products/problems/gen/difficulty";
import { publishedCopySignatures, shapeSignature } from "../app/products/problems/gen/dedupe";
import { FOLD_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "fold-lv5-vol1";
const N = 6;
const D_LO = 40;
const D_HI = 60;
const CROSS_HI = 12;      // F の交差上限（gen/overlay.ts copyParamsFor の 6×6）
const NON45_CAP_F = 3;
const DANGLING_MAX_F = 4;
/* 折り退化の上限。r＝「折り返した線が元の線と重なる割合」で、図形自身が持つ
   対称の量を測る（例: 五角形の左右2辺が互いの鏡像なら、それだけで r=0.33）。
   r=1 は完全退化＝折らずに写しても正解になる出題。0.5 を上限に置き、
   スコアでは低いほど強く優先する＝「折る意味」が残る絵だけを採る。 */
const R_MAX = 0.5;

type Seed = {
  label: string;
  category: string;
  /* 層1・層2。どちらが問題1（＝折る紙）になるかは探索が決める。
     座標は 6×6 の上で描いてよい（探索が原点寄せしてから置き直す）。 */
  shapeA: string[];
  shapeB: string[];
  /* 狙う D。巻は「D 窓で巻内を散らす」設計なので、図ごとに別の値を割り当てる。
     形の組み合わせごとに出せる上限が違う（Xぐみ・さんぼんの桟のように
     もつれが大きい骨組みほど上へ伸びる）ので、そこを見て手で配る。 */
  d: number;
};

/* =========================================================================
   2 層の設計
   かたむいた層は非45°を 2〜3 本（F 全体で 3 本まで＝E の最大レバー）。
   骨組みの層は たてよこ／45° だけで組み、非45° の枠を食わない。
   ========================================================================= */
/* ---- かたむいた層（シルエット）----
   非45° を 2〜3 本持たせて E15〜18 を確保する（F の非45° 上限 3 本ぶんを
   こちらで使い切り、骨組み側は たてよこ／45° だけで組む）。
   S1 ごかっけいA  S2 だいけい  S3 はっぱ  S4 とり  S5 ごかっけいB
   S6 さかな  S7 たこ  S8 くじら  S9 たまご  S10 やま  S11 ふね  S12 おばけ */
const S1 = ["2,0 5,2 3,5 2,5 0,2 2,0"];                      // ごかっけい
const S2 = ["0,1 5,0 5,4 1,5 0,1"];                          // だいけい
const S3 = ["0,4 2,1 4,1 5,3 3,5 0,4"];                      // はっぱ
const S4 = ["0,1 2,3 4,1 5,3 3,4 1,4 0,1"];                  // つばさ（切れこみのある形）
const S5 = ["0,2 2,0 5,1 5,4 2,5 0,2"];                      // ごかっけい（別）
const S7 = ["1,0 3,2 2,5 0,2 1,0"];                          // たこ
const S8 = ["0,3 2,1 4,1 5,3 4,5 1,5 0,3"];                  // まるいろっかく
const S9 = ["2,0 4,1 4,4 2,5 1,3 1,1 2,0"];                  // たまごがた
const S11 = ["0,2 5,2 4,5 1,5 0,2", "3,0 3,2", "3,0 1,1 3,1"]; // ふね（はた付き）

/* ---- おりものの帯 ----
   幅 1 の平行四辺形は紙面で「線が 2 本走っているだけ」に見えた（第2稿の実測）。
   幅 2 にして、中にもう 1 本すじを通す＝帯として読める＋非45° を 3 本使い切る。 */
const W1 = ["0,5 2,1 4,1 2,5 0,5", "1,5 3,1"];               // ななめの帯（右上がり）
const W2 = ["0,1 2,5 4,5 2,1 0,1", "1,1 3,5"];               // ななめの帯（右下がり）

/* ---- 骨組みの層（規則のある構造）----
   D40〜60 の帯は「もつれ」で作る。桟が枠の中で交わるたびに +2、桟の端が枠に
   当たる T 字ごとに +1.5。桟 3 本の窓（B1/B2/B8）は もつれ 13 で、
   E7 と合わせて帯の上側（D50 前後）を担う。桟の少ない構造（B5〜B7）は
   帯の下側（D40 前後）。**問題ごとに別の骨組みを当てる**＝前バッチで
   「問題2 がどれも同じ長方形」になった原因を断つ。 */
const B1 = ["0,1 5,1 5,4 0,4 0,1", "2,1 2,4", "4,1 4,4", "0,2 5,2"];   // よこ長の窓・桟3
const B2 = ["1,0 4,0 4,5 1,5 1,0", "1,2 4,2", "1,4 4,4", "2,0 2,5"];   // たて長の窓・桟3
const B3 = ["1,1 4,1 4,4 1,4 1,1", "1,1 4,4", "4,1 1,4", "1,2 4,2"];   // Xぐみ＋桟
const B4 = ["1,3 3,1 5,3 3,5 1,3", "3,1 3,5", "1,3 5,3"];              // ひしがた十字
const B5 = ["1,0 1,5", "4,0 4,5", "1,1 4,1", "1,2 4,2", "1,4 4,4"];    // たてはしご4段
const B6 = ["0,1 5,1", "0,4 5,4", "1,1 1,4", "2,1 2,4", "4,1 4,4"];    // よこはしご
const B7 = ["0,1 4,1 4,5 0,5 0,1", "2,1 2,5", "0,3 4,3"];              // ますめ
const B8 = ["1,1 4,1 4,4 1,4 1,1", "2,1 2,4", "3,1 3,4", "1,2 4,2"];   // いげたのかご
const B9 = ["0,1 5,1 5,4 0,4 0,1", "2,1 2,4", "0,3 5,3"];              // 田の窓
const B10 = ["1,0 4,0 4,5 1,5 1,0", "1,2 4,2", "1,3 4,3"];             // 目の窓
const B11 = ["1,2 4,2 4,5 1,5 1,2", "2,2 2,5", "3,2 3,5"];             // かご
const B12 = ["1,0 1,5", "4,0 4,5", "1,2 4,2", "1,4 4,4"];              // H形のあみ
const B13 = ["0,1 4,1 4,5 0,5 0,1", "0,1 4,3"];                        // わく＋すじかい
const B14 = ["0,2 5,2", "0,5 5,5", "2,2 2,5", "4,2 4,5"];              // たな

/* ---- こだまの層（同じ形を 2 枚）----
   「複雑な図形をうまく分解した形」のいちばん強い作り方＝**同じ形を 2 枚、
   向きと位置をずらして重ねる**。完成図はかざり模様のように複雑になるのに、
   分けた 2 枚は同じ 1 つの形＝motif-craft §4 の「同じものの繰り返し」を
   最も素直に満たす。子は「同じ形が 2 つある」と気づいた瞬間に読める。
   ★ 非45° は 2 枚ぶん数えられる（上限 3）ので、形が持てる非45° は 1 本まで。
     そのぶん E は内側の桟・斜めの仕切りで稼ぐ（もつれも立つ）。 */
const C1 = ["0,0 4,0 4,2 0,2 0,0", "2,0 2,2", "0,0 4,2"];   // すじかい入りのはこ
const C2 = ["0,0 4,0 4,3 0,3 0,0", "0,0 2,3"];              // ななめに割ったはこ
const C4 = ["0,0 0,4 4,4 4,3 1,3 2,0 0,0"];                 // かぎ形
const C7 = ["0,0 5,0 5,2 0,2 0,0", "0,2 4,0"];              // ななめ入りの帯
const C9 = ["0,0 3,0 3,4 0,4 0,0", "0,0 3,2"];              // たてはこ＋すじかい
const C10 = ["0,0 4,0 4,2 2,2 2,4 0,4 0,0", "0,0 2,4"];     // かぎ＋すじかい
const C11 = ["0,0 4,0 4,4 2,4 2,2 0,2 0,0", "0,2 4,0"];     // 凹＋すじかい

/* 20 問。第2稿（26 問）の目視から、①絵が弱いもの（切れこみのシルエットが
   骨組みの角をかすめるだけの図）②同じ骨組み・同じ silhouette の重複、を落とした。
   ★ 家族の配分＝かさなり8／ばめん1／おりもの3／こだま8。「かたむいた形 × 骨組み」
     だけで埋めると、前バッチと同じ「どれも同じ絵」に戻る。 */
const SEEDS: Seed[] = [
  /* ===== かさなり: かたむいたシルエット × 骨組み（8） ===== */
  { label: "ごかっけいとまど", category: "かさなり", shapeA: S1, shapeB: B9, d: 42 },
  { label: "ごかっけいとかご", category: "かさなり", shapeA: S1, shapeB: B11, d: 47 },
  { label: "ごかっけいとXぐみ", category: "かさなり", shapeA: S1, shapeB: B3, d: 57 },
  { label: "だいけいとXぐみ", category: "かさなり", shapeA: S2, shapeB: B3, d: 56 },
  { label: "だいけいとさんぼんの桟", category: "かさなり", shapeA: S2, shapeB: B1, d: 52 },
  { label: "はっぱといげた", category: "かさなり", shapeA: S3, shapeB: B8, d: 48 },
  { label: "ごかっけいとたてまど", category: "かさなり", shapeA: S5, shapeB: B2, d: 53 },
  { label: "たこといげた", category: "かさなり", shapeA: S7, shapeB: B8, d: 46 },

  /* ===== ばめん: もの × 構造（2） ===== */
  { label: "ふねとひしがた", category: "ばめん", shapeA: S11, shapeB: B4, d: 55 },
  { label: "ろっかくとますめ", category: "ばめん", shapeA: S8, shapeB: B7, d: 43 },

  /* ===== おりもの: すじの入ったななめの帯 × たてよこの骨組み（3） ===== */
  { label: "ななめの帯とたてまど", category: "おりもの", shapeA: W1, shapeB: B2, d: 51 },
  { label: "ななめの帯とますめ", category: "おりもの", shapeA: W1, shapeB: B7, d: 50 },
  { label: "ななめの帯といげた", category: "おりもの", shapeA: W2, shapeB: B8, d: 54 },

  /* ===== こだま: 同じ形を 2 枚（5） ===== */
  { label: "すじかいのはこがふたつ", category: "こだま", shapeA: C1, shapeB: C1, d: 52 },
  { label: "ななめに割ったはこがふたつ", category: "こだま", shapeA: C2, shapeB: C2, d: 41 },
  { label: "ななめ入りの帯がふたつ", category: "こだま", shapeA: C7, shapeB: C7, d: 44 },
  { label: "かぎがふたつ", category: "こだま", shapeA: C4, shapeB: C4, d: 41 },
  { label: "すじかいのかぎがふたつ", category: "こだま", shapeA: C10, shapeB: C10, d: 47 },

  /* ===== こだま（別の形どうし）: 兄弟のような 2 枚（2） ===== */
  { label: "はことかぎ", category: "こだま", shapeA: C1, shapeB: C4, d: 43 },
  { label: "かぎとへこみ", category: "こだま", shapeA: C4, shapeB: C11, d: 45 },
];

/* =========================================================================
   置き方の探索
   形は手設計のまま、①4 つの向き（そのまま／よこ反転／たて反転／半回転）
   ②盤面内の平行移動 ③どちらの層を問題1にするか、だけを動かす。
   ========================================================================= */
/* 8 通り（正方形の対称群）。回転を入れているのは「こだま」「おりもの」の
   ため——同じ形をずらして重ねる構図は、2 枚の向きが違うほど絵が複雑になる。 */
const VARIANTS: { key: string; f: (p: Pt) => Pt }[] = [
  { key: "そのまま", f: ([c, r]) => [c, r] },
  { key: "よこ反転", f: ([c, r]) => [-c, r] },
  { key: "たて反転", f: ([c, r]) => [c, -r] },
  { key: "半回転", f: ([c, r]) => [-c, -r] },
  { key: "右90", f: ([c, r]) => [-r, c] },
  { key: "左90", f: ([c, r]) => [r, -c] },
  { key: "ななめ鏡1", f: ([c, r]) => [r, c] },
  { key: "ななめ鏡2", f: ([c, r]) => [-r, -c] },
];

function boundsOf(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

/* 1 つの層について「盤面に置ける全パターン」を先に作る（向き × 平行移動） */
function placements(paths: string[]): { key: string; edges: EdgeT[] }[] {
  const base = parsePaths(paths);
  const out: { key: string; edges: EdgeT[] }[] = [];
  const seen = new Set<string>();
  for (const v of VARIANTS) {
    const moved = base.map((e) => [v.f(e[0]), v.f(e[1])] as EdgeT);
    const b = boundsOf(moved);
    const spanC = b.cMax - b.cMin, spanR = b.rMax - b.rMin;
    if (spanC > N - 1 || spanR > N - 1) continue;
    for (let oc = 0; oc <= N - 1 - spanC; oc++) {
      for (let or = 0; or <= N - 1 - spanR; or++) {
        const edges = normalizeEdges(moved.map((e) => [
          [e[0][0] - b.cMin + oc, e[0][1] - b.rMin + or],
          [e[1][0] - b.cMin + oc, e[1][1] - b.rMin + or],
        ] as EdgeT));
        const k = edges.map(edgeKey).sort().join("|");
        if (seen.has(k)) continue;   // 対称な形は向き違いが同一配置に落ちる
        seen.add(k);
        out.push({ key: `${v.key}+${oc},${or}`, edges });
      }
    }
  }
  return out;
}

function componentsOf(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const pk = (p: Pt) => `${p[0]},${p[1]}`;
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const e of edges) {
    const a = pk(e[0]), b = pk(e[1]);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  }
  const roots = new Set<string>();
  for (const k of parent.keys()) roots.add(find(k));
  return roots.size;
}

/* 1 案（P＝問題1 になる層・Q＝問題2 の層）をゲートに通す。
   探索も最終検証もここを通す＝「探索は通ったのに本番で落ちる」を作らない。 */
function evalPair(P: EdgeT[], Q: EdgeT[]) {
  const lad = FOLD_LADDER[SKU];
  const errs: string[] = [];
  const F = normalizeEdges([...P, ...Q]);
  const mP = computeMetrics(P, N), mQ = computeMetrics(Q, N), mF = computeMetrics(F, N);

  for (const [name, part, m] of [["問題1", P, mP], ["問題2", Q, mQ]] as const) {
    if (m.lines < lad.lines[0] || m.lines > lad.lines[1])
      errs.push(`${name}の線 ${m.lines} 本が窓 [${lad.lines[0]}, ${lad.lines[1]}] の外`);
    const comps = componentsOf(part);
    if (comps !== 1) errs.push(`${name}が ${comps} つに分かれる`);
  }
  const pKeys = new Set(P.map(edgeKey));
  for (const e of Q) if (pKeys.has(edgeKey(e))) { errs.push("2 層が辺を共有"); break; }

  const b = boundsOf(F);
  if (b.cMax - b.cMin < N - 2 || b.rMax - b.rMin < N - 2) errs.push("ひろがり不足");
  if (mF.non45 > NON45_CAP_F) errs.push(`非45° ${mF.non45} 本`);
  if (lad.requireNon45 && mF.non45 < 1) errs.push("非45° なし");
  if (mF.crossings > CROSS_HI) errs.push(`交差 ${mF.crossings}`);
  if (danglingCount(F) > DANGLING_MAX_F) errs.push(`ヒゲ ${danglingCount(F)}`);
  if (closedLoops(F, mF.components) < 1) errs.push("閉路なし");
  const comps = componentsOf(F);
  if (comps > 2) errs.push(`完成図が ${comps} つ`);

  const inter = interCrossings(P, Q);
  if (inter < lad.entangle[0] || inter > lad.entangle[1])
    errs.push(`絡み ${inter} が窓 [${lad.entangle[0]}, ${lad.entangle[1]}] の外`);
  if (inter === 0 && comps !== 1) errs.push("絡み 0 で接してもいない");

  const P1 = mirrorEdges(P, N, "v");
  const probe: Problem = {
    id: `${SKU}-probe`, grid: { type: "square", n: N }, edges: P1, inputB: Q,
    metrics: mF, answer: { mode: "explicit", edges: F }, gen: { kind: "manual" },
  };
  const d = taskDifficulty("fold", probe);
  if (d.value < D_LO) errs.push(`D=${d.value} < ${D_LO}`);
  if (d.value > D_HI) errs.push(`D=${d.value} > ${D_HI}`);
  errs.push(...validateProblem(probe));
  errs.push(...validateProblem({ ...probe, id: `${SKU}-probeF`, edges: F }));

  const r = foldInvariance(P1, N);
  if (r > R_MAX) errs.push(`折り退化 r=${r.toFixed(2)}（上限 ${R_MAX}）`);

  return { errs, F, P1, mF, mP, mQ, inter, r, kf: foldFactor(r), D: d.value, parts: d.parts };
}

type Ev = ReturnType<typeof evalPair>;

/* 数値ゲートを通ったあと、絵として良いものを上に持ってくる。
   ・D は窓の中央寄り（端に固まると巻の中で散らない）
   ・両方の層が閉じた骨格を持つ＝1 枚のカードとして読める（motif-craft §3）
   ・ヒゲが少ない／完成図が団子でない（交差が多すぎない）
   ・折り退化 r は 0 が理想 */
function score(P: EdgeT[], Q: EdgeT[], ev: Ev, targetD: number): number {
  return -Math.abs(ev.D - targetD) * 0.8
    + Math.min(ev.inter, 8) * 0.8
    - 25 * ev.r
    - 1.2 * danglingCount(ev.F)
    + 3 * (closedLoops(P, 1) > 0 ? 1 : 0)
    + 3 * (closedLoops(Q, 1) > 0 ? 1 : 0)
    - 2 * Math.max(0, ev.mF.crossings - 8)
    + 0.5 * ((ev.mF.bboxW ?? 0) + (ev.mF.bboxH ?? 0));
}

/* ---- SVG 3 ペイン（問題1 →おる 問題2 ＝ 完成図）---- */
function svgTriple(P1: EdgeT[], Q: EdgeT[], P: EdgeT[]): string[] {
  const cell = 24, pad = 12, size = (N - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < N; c++) for (let r = 0; r < N; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.2" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  const board = (body: string) =>
    `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + body + "</svg>";
  return [
    board(P1.map((e) => line(e, "#2b2925", 2.4)).join("")),
    board(Q.map((e) => line(e, "#1a56a8", 2.4)).join("")),
    board(P.map((e) => line(e, "#2b2925", 2.2)).join("")
      + Q.map((e) => line(e, "#1a56a8", 2.2)).join("")),
  ];
}

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

type Row = {
  seed: Seed; P: EdgeT[]; Q: EdgeT[]; ev: Ev; sc: number; place: string; tried: number; passed: number;
};

async function main() {
  const write = process.argv.includes("--write");
  const pngIdx = process.argv.indexOf("--png");
  const pvIdx = process.argv.indexOf("--preview");
  const topIdx = process.argv.indexOf("--top");
  const topN = topIdx >= 0 ? Number(process.argv[topIdx + 1]) : 0;

  /* ---- かぶり台帳（模写公開済み・かさね/分解/折り重ねの完成図・生成ライブラリ）---- */
  const known = new Map<string, string>();
  for (const sig of publishedCopySignatures()) known.set(sig, "published:copy");
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!/^(overlay|decompose|fold)-/.test(sku)) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      const F = sku.startsWith("fold-") && p.answer?.mode === "explicit" ? p.answer.edges : p.edges;
      known.set(shapeSignature(F), `published:${p.id}`);
    }
  }
  const liveSame: EdgeT[][] = [];
  for (const f of (await fs.readdir(CAND_DIR)).filter((x) => /^(overlay|decompose|fold)-/.test(x))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.grid.type !== "square") continue;
      const F = file.sku.startsWith("fold-") && c.answer?.mode === "explicit" ? c.answer.edges : c.edges;
      known.set(shapeSignature(F), `candidates:${c.id}(${c.status})`);
      if (file.sku === SKU && c.status !== "rejected") liveSame.push(F);
    }
  }
  for (const v of [...allVariants(), ...microShapes()]) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }

  /* ---- 探索 ---- */
  const rows: Row[] = [];
  console.log(`===== ${SKU}（D ${D_LO}〜${D_HI}・2 層分解）=====`);
  for (const seed of SEEDS) {
    const targetD = seed.d;
    const plA = placements(seed.shapeA);
    const plB = placements(seed.shapeB);
    let best: Row | null = null;
    const alts: Row[] = [];
    let tried = 0, passed = 0;
    const tally = new Map<string, number>();
    for (const a of plA) for (const b of plB) {
      /* どちらの層を問題1にするかも試す（折り退化 r と D の kf が変わる） */
      for (const [P, Q, tag] of [[a.edges, b.edges, "A→問題1"], [b.edges, a.edges, "B→問題1"]] as const) {
        tried++;
        const ev = evalPair(P, Q);
        if (ev.errs.length > 0) {
          for (const e of ev.errs) {
            const k = e.replace(/-?[\d.]+/g, "N");
            tally.set(k, (tally.get(k) ?? 0) + 1);
          }
          continue;
        }
        if (known.has(shapeSignature(ev.F))) { tally.set("形かぶり", (tally.get("形かぶり") ?? 0) + 1); continue; }
        passed++;
        /* バッチ内の似すぎ penalty。同じ形を別の骨組みと組んだ seed があるので、
           ここを効かせないと「向きだけ違う同じ絵」が並ぶ。 */
        let dup = 0;
        for (const r of rows) {
          dup = Math.max(dup, jaccard(r.ev.F, ev.F),
            jaccard(r.Q, Q) * 0.8, jaccard(r.P, P) * 0.8);
        }
        const sc = score(P, Q, ev, targetD) - dup * 40;
        const row: Row = { seed, P: [...P], Q: [...Q], ev, sc, place: `${a.key}｜${b.key}｜${tag}`, tried, passed };
        alts.push(row);
        if (!best || sc > best.sc) best = row;
      }
    }
    if (!best) {
      const top = [...tally.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3)
        .map(([k, v]) => `${k}(${v})`).join(" / ");
      console.log(`NG   ${seed.label}: 試行${tried} 通過0｜主因 ${top}`);
      continue;
    }
    best.tried = tried; best.passed = passed;
    rows.push(best);
    const { ev } = best;
    console.log(`OK   ${seed.label}: ${passed}/${tried} 通過 → `
      + `問題1 線${ev.mP.lines}/E${ev.parts.A} 問題2 線${ev.mQ.lines}/E${ev.parts.B}`
      + ` 絡み${ev.inter} もつれ${ev.parts["もつれ"] ?? 0} 交差${ev.mF.crossings}`
      + ` 非45°${ev.mF.non45} ヒゲ${danglingCount(ev.F)} r=${ev.r.toFixed(2)} D=${ev.D}`);
    if (topN > 0) {
      for (const alt of alts.sort((x, y) => y.sc - x.sc).slice(0, topN)) {
        console.log(`     alt ${alt.place} D=${alt.ev.D} 絡み${alt.ev.inter} sc=${alt.sc.toFixed(1)}`);
      }
    }
  }

  const ds = rows.map((r) => r.ev.D);
  console.log(`\n${rows.length}/${SEEDS.length} 図が成立  D=${Math.min(...ds)}〜${Math.max(...ds)}`);
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const jf = jaccard(rows[i].ev.F, rows[j].ev.F);
    if (jf > 0.5) console.log(`⚠ #${i + 1}「${rows[i].seed.label}」と #${j + 1}「${rows[j].seed.label}」が似ている J=${jf.toFixed(2)}`);
  }
  for (const r of rows) {
    for (const other of liveSame) {
      const j = jaccard(other, r.ev.F);
      if (j > 0.6) console.log(`⚠ ${r.seed.label} は同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
  }

  /* ---- コンタクトシート ---- */
  if (pngIdx >= 0) {
    const cols = 2, board = (N - 1) * 24 + 24;
    const cellW = 3 * board + 150, cellH = board + 46;
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const svgs = svgTriple(r.ev.P1, r.Q, r.P);
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 34)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("")
        + `<text x="${board + 3}" y="${board / 2 + 5}" font-size="12" font-family="sans-serif">→おる</text>`
        + `<text x="${2 * board + 40}" y="${board / 2 + 5}" font-size="15" font-family="sans-serif">＝</text>`;
      return `<g transform="translate(${x},${y})">`
        + `<text x="8" y="18" font-size="14" font-family="sans-serif">#${i + 1} ${r.seed.label}`
        + `  D=${r.ev.D} 絡み${r.ev.inter} r=${r.ev.r.toFixed(2)}</text>`
        + `<g transform="translate(8,26)">${g}</g></g>`;
    }).join("\n");
    const w = cols * cellW, h = Math.ceil(rows.length / cols) * cellH;
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
      + `<rect width="100%" height="100%" fill="#faf8f4"/>${cells}</svg>`;
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(sheet), { density: 110 }).png().toFile(process.argv[pngIdx + 1]);
    console.log(`png → ${process.argv[pngIdx + 1]}`);
  }

  if (pvIdx >= 0) {
    const cards = rows.map((r, i) => {
      const [p1, q, f] = svgTriple(r.ev.P1, r.Q, r.P);
      return `<div class="card"><div class="head"><b>#${i + 1} ${r.seed.label}</b>`
        + `<span class="cat">${r.seed.category}</span></div>`
        + `<div class="pair">${p1}<span class="op">→おる</span>${q}<span class="op">＝</span>${f}</div>`
        + `<div class="meta">D=${r.ev.D}・絡み${r.ev.inter}・交差${r.ev.mF.crossings}`
        + `・非45° ${r.ev.mF.non45}・r=${r.ev.r.toFixed(2)}・${r.place}</div></div>`;
    }).join("\n");
    await fs.writeFile(process.argv[pvIdx + 1],
      `<!doctype html><meta charset="utf-8"><title>fold Lv.5 2層分解</title>
<style>body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px}
.head{display:flex;justify-content:space-between;gap:12px;align-items:center}
.cat{font-size:12px;color:#888}.pair{display:flex;gap:6px;align-items:center;margin:6px 0}
.op{font-size:13px;color:#666}.meta{font-size:12px;color:#444}
svg{background:#fffdf9;border:1px dashed #eee}</style>
<h1>${SKU}（${rows.length}問・D${D_LO}〜${D_HI}）</h1>
<p style="font-size:13px;color:#666">問題1（黒）→おる 問題2（青）＝ 完成図</p>
<div class="grid">${cards}</div>`, "utf8");
    console.log(`preview → ${process.argv[pvIdx + 1]}`);
  }

  /* ---- 書き込み ---- */
  if (!write) return;
  if (rows.length === 0) { console.error("成立 0 件のため中断"); process.exitCode = 1; return; }
  const today = new Date().toISOString().slice(0, 10);
  const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, `${SKU}.json`), "utf8"))) as CandidateFile;
  let maxM = file.candidates.reduce((mx, c) =>
    Math.max(mx, parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10)), 0);
  for (const r of rows) {
    const base: Problem = {
      id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
      grid: { type: "square", n: N },
      edges: r.ev.P1,
      inputB: r.Q,
      answer: { mode: "explicit", edges: r.ev.F },
      metrics: r.ev.mF,
      provenance: { source: "blank", createdAt: today, label: r.seed.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("fold", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.seed.label}  D=${r.ev.D}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log(`書き込み完了 → ${SKU}.json（${rows.length} 問）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
