/* =========================================================================
   レベル選びガイドの設問定義 — 単一ソース（SSOT）

   なぜ独立ファイルなのか:
     設問数（「4 つの質問に答えると…」）が GuideApp.tsx と products/page.tsx の
     2 か所にハードコードされていた。GuideApp は "use client" のため、サーバー
     コンポーネントである商品一覧から素直に読めない。設問だけを依存ゼロの葉
     モジュールへ切り出し、両者が QUESTIONS.length を参照する形にした
     （2026-08-08）。文言に数字を直書きしないこと。

   出典: acquisition/funnel.md §3（レベル選びガイドの SSOT）
   ========================================================================= */

export type Question = {
  key: string;
  q: string;
  help?: string;
  opts: { v: string; label: string }[];
};

export const QUESTIONS: Question[] = [
  {
    key: "age",
    q: "お子さんの年齢は？",
    help: "答えはレベルの「めやす」にだけ使います。最後は、いまの手ごたえで決めます。",
    opts: [
      { v: "4", label: "4才以下" },
      { v: "5", label: "5才" },
      { v: "6", label: "6才" },
      { v: "7", label: "7才" },
      { v: "8", label: "8才以上" },
    ],
  },
  {
    key: "naname",
    q: "ななめ（斜め）の線は、引けそうですか？",
    opts: [
      { v: "sui", label: "すいすい引ける" },
      { v: "toki", label: "ときどき・練習中" },
      { v: "mada", label: "まだむずかしい" },
    ],
  },
  {
    key: "komaka",
    q: "細かいマス目（5×5 以上）や、線が交差する形は？",
    opts: [
      { v: "fun", label: "楽しめそう" },
      { v: "futsu", label: "ふつうかな" },
      { v: "mada", label: "まだ難しそう" },
    ],
  },
  {
    key: "mokuteki",
    q: "いちばんのきっかけ・目的は？",
    help: "「どの種類から始めるか」のおすすめに使います。",
    opts: [
      { v: "first", label: "はじめての点描写。とにかく始めたい" },
      { v: "kumon", label: "公文・運筆の「次」を探している" },
      { v: "struggle", label: "図形が苦手・つまずいた" },
      { v: "draw", label: "絵を描くのが好き。楽しく続けたい" },
      { v: "harder", label: "もっと頭を使う問題を" },
      { v: "solid", label: "立体・空間の感覚を育てたい" },
    ],
  },
];

/** 設問数。本文中に数字を直書きせず、必ずこれを使うこと。 */
export const QUESTION_COUNT = QUESTIONS.length;
