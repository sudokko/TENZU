/* =========================================================================
   published Problem → 紙面描画用 RenderProblem の写像（SSOT）
   商品詳細（SkuDetailPage）とサンクスページ（checkout/success）が共用する。
   ここを一本化しないと「商品ページは指示子つき・購入後 PDF は指示子なし」の
   食い違いが起きる（実際に起きていたため集約）。
   かさね・分解・折り重ねは 3 ペイン式「A op B ＝ □」（pack-tasks §のかさね系紙面・
   maker-overlay/-decompose/-fold と同一の見せ方）。ペインの中身は composeTriple が
   published データから導出する。
   ========================================================================= */

import { edgeKey, mirrorEdges, type EdgeT, type SkuProblemSet } from "./schema";
import type { PairLayout } from "../print";

/* 鏡タスクの軸種（schema.ts の TransformSpec.axis と同じ語彙） */
export type MirrorAxis = "v" | "h" | "d1" | "d2";

/* 3 ペイン式のタスク種（answerMode=explicit のうち fill を除く 3 つ） */
export type ComposeKind = "overlay" | "decompose" | "fold";

/* 描画単位は辺集合（本物の問題は閉多角形とは限らない）
   answerEdges: 欠け補完（fill）は抜く線 R。かさね・分解は published answer の辺
     （かさね＝図形B・分解＝引くもの）。折り重ねは完成図 F。
   inputB: 折り重ねの問題2。
   compose: 3 ペイン式のタスク種。未指定の explicit は欠け補完の 2 ペイン描画。
   mirrorAxis / rotateDeg / translateVec: 変換の指示子（decisions §3.87）。 */
export type RenderProblem = {
  n: number;
  edges: EdgeT[];
  answerEdges?: EdgeT[];
  inputB?: EdgeT[];
  compose?: ComposeKind;
  mirrorAxis?: MirrorAxis;
  rotateDeg?: 90 | -90 | 180;
  translateVec?: { dc: number; dr: number };
};

const COMPOSE_TASKS = new Set<string>(["overlay", "decompose", "fold"]);

export function composeKindOf(task: string): ComposeKind | undefined {
  return COMPOSE_TASKS.has(task) ? (task as ComposeKind) : undefined;
}

/* published セット → 紙面描画用の配列。solid は対象外（呼び出し側で分岐）。 */
export function toRenderProblems(set: SkuProblemSet): RenderProblem[] {
  const compose = composeKindOf(set.task);
  return set.problems.map((p) => ({
    n: p.grid.type === "square" ? p.grid.n : 4,
    edges: p.edges,
    ...(compose && { compose }),
    ...(p.inputB && p.inputB.length > 0 && { inputB: p.inputB }),
    ...(p.answer?.mode === "explicit" && { answerEdges: p.answer.edges }),
    ...(p.answer?.mode === "derived" && p.answer.transform.type === "mirror"
      && { mirrorAxis: p.answer.transform.axis }),
    /* 回転・移動は「どう変換するか」が 1 問ごとに違いうる（角度・方向の巻内混在）。
       紙面に指示子を出すため transform をそのまま渡す（decisions §3.87） */
    ...(p.answer?.mode === "derived" && p.answer.transform.type === "rotate"
      && { rotateDeg: p.answer.transform.deg }),
    ...(p.answer?.mode === "derived" && p.answer.transform.type === "translate"
      && { translateVec: { dc: p.answer.transform.dc, dr: p.answer.transform.dr } }),
  }));
}

/* ---- 3 ペイン式の中身（ペイン1 op ペイン2 ＝ ペイン3） ----
   published データからの導出規則（gen/overlay.ts・gen/fold.ts のデータモデルと同規約）:
   - かさね:   edges＝完成図 F・answerEdges＝図形B → A＝F∖B ＋ B ＝ □（こたえ＝F）
   - 分解:     edges＝完成図 C・answerEdges＝引くもの B → C − B ＝ □（こたえ＝C∖B）
   - 折り重ね: edges＝問題1（代表軸 v で焼付・§3.59 と同思想）・inputB＝問題2・
               answerEdges＝完成図 F。折り方は式の並びから導出（横一列=左右に折る v／
               縦一列=上下に折る h・maker-fold と同じ連動）。縦一列では 問題1 を
               P=F∖問題2 から h 軸で焼き直す＝どちらの並びでも折った結果は F のまま。 */
export type ComposeOpKind = "plus" | "minus" | "fold";
export type ComposeTriple = { a: EdgeT[]; b: EdgeT[]; result: EdgeT[]; op: ComposeOpKind };

function minusEdges(edges: EdgeT[], sub: EdgeT[]): EdgeT[] {
  const keys = new Set(sub.map(edgeKey));
  return edges.filter((e) => !keys.has(edgeKey(e)));
}

export function composeTriple(pb: RenderProblem, pair: PairLayout): ComposeTriple | null {
  if (!pb.compose) return null;
  const R = pb.answerEdges ?? [];
  if (pb.compose === "overlay") {
    return { a: minusEdges(pb.edges, R), b: R, result: pb.edges, op: "plus" };
  }
  if (pb.compose === "decompose") {
    return { a: pb.edges, b: R, result: minusEdges(pb.edges, R), op: "minus" };
  }
  // fold（R＝完成図 F）
  const B = pb.inputB ?? [];
  const a = pair === "horizontal"
    ? pb.edges
    : mirrorEdges(minusEdges(R, B), pb.n, "h");
  return { a, b: B, result: R, op: "fold" };
}
