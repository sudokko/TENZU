/* =========================================================================
   折り重ね（fold）ジェネレータ（v1＝かさね v2 と共用コア・模写軸ラダー）
   鏡 × かさねのハイブリッド＝能力ラダーの最終段。紙面＝maker-fold と同じ
   3 ペイン「問題1 →(折り返し矢印) 問題2 ＝ □」。子は問題1を折り返して
   （鏡像にして）問題2に重ねた図 mirror(問題1)∪問題2 を □ に描く。
   折り方は印刷時の並びで決まる（横一列=左右に折る v／縦一列=上下に折る h・
   maker-fold と同じ「式の並び」連動＝データには焼かない・鏡 §3.59 と同思想）。
   データモデル: edges＝問題1（左ペイン）・inputB＝問題2・
   answer(explicit).edges＝完成図（=mirror(問題1,v)∪問題2・代表軸 v で焼く）。
   - 生成＝かさねの合成コアを共用: コアが作る「2 つの実図形 P・Q が絡み窓どおりに
     交わる完成図 F」を、折り重ねの紙面形へ再割付する＝
     問題1＝mirror(P, v)（折り返す前の姿）・問題2＝Q・answer＝F。
     子が折ると mirror(問題1)＝P に戻り、P∪Q＝F が成立する。
   - ラダー＝模写軸 4 巻（かさね §3.71/§3.72 と同構造・decisions §3.74）。
   - かぶり除外: 模写公開済み（§3.60）＋兄弟巻＋**かさね・分解の完成図**
     （同じ重なり図を 3 タスクで再売しない・fold の完成図は answer 側＝io.ts が対応）。
   - D＝かさね系と同じ固有式（difficulty.ts: base(問題1)+base(問題2)+2×絡み）。
   ========================================================================= */

import type { EdgeT, Problem } from "../schema";
import { edgeKey, mirrorEdges } from "../schema";
import { FOLD_LADDER } from "./ladder";
import { generateComposedCandidates, type OverlayParams } from "./overlay";

export const FOLD_GENERATOR_VERSION = "1";

/* パラメータ形はかさね・分解と同一（ladder-schema も COMPOSE_FIELDS を共用） */
export type FoldParams = OverlayParams;

export { FOLD_LADDER };

export function generateFoldCandidates(
  sku: string, seed: number, count = 20,
  existing: EdgeT[][] = [],   // 既存候補の完成図（answer 側・index.ts が写像して渡す）
  linesOverride?: number,
  excludeShapeSigs?: Set<string>,
): Problem[] {
  const probs = generateComposedCandidates(
    { ladder: FOLD_LADDER, generator: "fold", version: FOLD_GENERATOR_VERSION },
    sku, seed, count, existing, linesOverride, excludeShapeSigs,
  );
  /* 合成コアの出力（edges=完成図 F・answer=図形B）を折り重ねの紙面形へ再割付。
     P＝F∖B（こたえ側のパート）を代表軸 v で鏡映した姿が問題1になる。
     metrics は完成図 F のまま（カード表示・D 計算の土台＝重なり図が正） */
  return probs.map((p) => {
    if (p.grid.type !== "square" || p.answer?.mode !== "explicit") return p;
    const n = p.grid.n;
    const F = p.edges;
    const B = p.answer.edges;
    const bk = new Set(B.map(edgeKey));
    const P = F.filter((e) => !bk.has(edgeKey(e)));
    return {
      ...p,
      edges: mirrorEdges(P, n, "v"),
      inputB: B,
      answer: { mode: "explicit", edges: F },
    };
  });
}
