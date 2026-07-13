/* =========================================================================
   分解（decompose）ジェネレータ（v1＝かさね v2 と共用コア・模写軸ラダー）
   かさねの逆操作。紙面＝maker-decompose と同じ 3 ペイン「正解の図C − 引くもの ＝ □」。
   子は C から引くものを取り除いた「こたえ = C∖引くもの」を描く。
   データモデルはかさねと完全同型: edges＝完成図 C（=A∪B）・
   answer(explicit).edges＝引くもの（=図形B）・こたえ＝C∖B（描画時に導出）。
   違いは紙面の演算子だけ（かさね: A＋B=□／分解: C−B=□）＝生成コアは
   gen/overlay.ts の generateComposedCandidates を共用する。
   - ラダー＝模写軸 4 巻（decisions §3.73・かさね §3.71/§3.72 と同構造）:
     Lv＝図形要素が模写Lv同期（45°→45°必須+交差→非45°必須）・
     絡み（A・B間の交差数）も Lv とともに増え Lv.5 で最大化。
   - かぶり除外: 模写公開済み（§3.60）＋兄弟巻＋**かさねの完成図**（同じ重なり図を
     合成と分解の両タスクで再売しない・generate route が両タスクの sig を渡す）。
   - D＝かさねと同じ固有式（difficulty.ts §3.70: base(A)+base(B)+2×絡み）。
   ========================================================================= */

import type { EdgeT, Problem } from "../schema";
import { DECOMPOSE_LADDER } from "./ladder";
import { generateComposedCandidates, type OverlayParams } from "./overlay";

export const DECOMPOSE_GENERATOR_VERSION = "1";

/* パラメータ形はかさねと同一（ladder-schema も共用） */
export type DecomposeParams = OverlayParams;

export { DECOMPOSE_LADDER };

export function generateDecomposeCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],
  linesOverride?: number,
  excludeShapeSigs?: Set<string>,
): Problem[] {
  return generateComposedCandidates(
    { ladder: DECOMPOSE_LADDER, generator: "decompose", version: DECOMPOSE_GENERATOR_VERSION },
    sku, seed, count, existing, linesOverride, excludeShapeSigs,
  );
}
