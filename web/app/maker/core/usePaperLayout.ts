"use client";

/* =========================================================================
   メーカー共通・用紙/レイアウト状態フック
   paperKey・perPage・nameField・dotSize と selectPaper（用紙上限クランプ）。
   pairLayout はタスクで型が違う（copy 系 "auto"|PairLayout / 鏡・折りは強制指定）
   ため各メーカー側に残す。perPage の実効値クランプ式もメーカーごとに微差が
   あるため（copy=caps 併用・他=用紙上限のみ）、ここでは状態だけを持つ。
   ========================================================================= */

import { useState } from "react";
import {
  DOT_SCALE, paperMax,
  type DotSize, type LayoutPerPage, type PaperKey,
} from "../../products/print";

export function usePaperLayout(defaults?: { paperKey?: PaperKey }) {
  /* 既定: A4 縦・となりに書く・3 問/ページ（2026-06-12 オーナー確定・商品ページと共通の基本） */
  const [paperKey, setPaperKey] = useState<PaperKey>(defaults?.paperKey ?? "A4-P");
  const marginMm = 14;
  // 既定「おまかせ」= 選択した問題数を 1 ページに最適表示（用紙上限超は複数ページ）
  const [perPage, setPerPage] = useState<"auto" | LayoutPerPage>("auto");
  const [nameField, setNameField] = useState(false); // なまえ・日付欄（既定 OFF）
  const [dotSize, setDotSize] = useState<DotSize>("m"); // 点の大きさ（既定 中）
  const dotScale = DOT_SCALE[dotSize];

  // Switching paper clamps a manual per-page count to that paper's legible maximum.
  function selectPaper(k: PaperKey) {
    setPaperKey(k);
    const max = paperMax(k);
    setPerPage((p) => (p !== "auto" && p > max ? max : p));
  }

  return {
    paperKey, setPaperKey, selectPaper, marginMm,
    perPage, setPerPage,
    nameField, setNameField,
    dotSize, setDotSize, dotScale,
  };
}
