/* =========================================================================
   メーカー共通・タスク固有の純変換関数（鏡・回転・移動・拡大・縮小 等）
   各メーカーから verbatim 移設。座標系は maker の { c, r } 表現。
   ========================================================================= */

import type { PairLayout } from "../../products/print";
import type { Edge, Point } from "./geometry";

/* ---- 鏡（mirror / fold が共用） ---- */
export type MirrorAxis = "v" | "h"; // v=左右反転 / h=上下反転（d1/d2 は未対応）

/* 点を軸で折り返す（schema.ts mirrorEdges と同規約。maker は { c, r } 表現を使うので
   ここに小さく実装。d1/d2 は鏡メーカーでは扱わない） */
export function mirrorPoint(p: Point, n: number, axis: MirrorAxis): Point {
  return axis === "v" ? { c: n - 1 - p.c, r: p.r } : { c: p.c, r: n - 1 - p.r };
}
export function mirrorEdgesOf(edges: Edge[], n: number, axis: MirrorAxis): Edge[] {
  return edges.map((e) => ({ a: mirrorPoint(e.a, n, axis), b: mirrorPoint(e.b, n, axis) }));
}

/* 並び→軸の導出（横並び=左右反転 / 縦並び=上下反転） */
export function axisOf(pair: PairLayout): MirrorAxis {
  return pair === "horizontal" ? "v" : "h";
}
