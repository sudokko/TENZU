"use client";

/* =========================================================================
   メーカー共通・編集状態フック
   - useEditorHistory<S>: undo/redo スタック（S=スナップショット型。
     copy 系 {edges} / overlay 系 {edgesA, edgesB} / fill {edges, rEdges} など）
   - useSavedList<P>: 保存済み問題リスト（選択・削除・並べ替え・全選択）
   handleDot / saveCurrent / startEdit はタスクごとに意味が違う（再クリックの
   挙動・axis/factor の焼き付け・並びの書き戻し等）ため各メーカー側に残す。
   ========================================================================= */

import { useMemo, useRef, useState } from "react";

export function useEditorHistory<S>(emptySnap: S, applySnap: (s: S) => void) {
  const historyRef = useRef<S[]>([emptySnap]);
  const histIdxRef = useRef<number>(0);
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((v) => v + 1);

  function pushHistory(next: S) {
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(next);
    histIdxRef.current = historyRef.current.length - 1;
  }
  function canUndo() { return histIdxRef.current > 0; }
  function canRedo() { return histIdxRef.current < historyRef.current.length - 1; }
  function undo() {
    if (!canUndo()) return;
    histIdxRef.current -= 1;
    applySnap(historyRef.current[histIdxRef.current]);
    rerender();
  }
  function redo() {
    if (!canRedo()) return;
    histIdxRef.current += 1;
    applySnap(historyRef.current[histIdxRef.current]);
    rerender();
  }
  /* 履歴を初期化して s を現在状態にする（グリッド変更・保存後リセット・編集開始） */
  function resetHistory(s: S) {
    historyRef.current = [s];
    histIdxRef.current = 0;
  }
  return { pushHistory, canUndo, canRedo, undo, redo, resetHistory, rerender };
}

export function useSavedList<P extends { id: string; selected: boolean }>() {
  const [saved, setSaved] = useState<P[]>([]);
  const [savingNo, setSavingNo] = useState(1);

  function toggleSelectSaved(id: string) {
    setSaved((s) => s.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  }
  function deleteSaved(id: string, onDeleted?: () => void) {
    setSaved((s) => s.filter((p) => p.id !== id));
    onDeleted?.();
  }
  function moveSaved(id: string, dir: -1 | 1) {
    setSaved((s) => {
      const i = s.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = s.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function toggleSelectAll() {
    const allSel = saved.length > 0 && saved.every((p) => p.selected);
    setSaved((s) => s.map((p) => ({ ...p, selected: !allSel })));
  }
  const selectAllState: "true" | "false" | "mixed" = useMemo(() => {
    if (saved.length === 0) return "false";
    const sel = saved.filter((p) => p.selected).length;
    if (sel === 0) return "false";
    if (sel === saved.length) return "true";
    return "mixed";
  }, [saved]);
  const selectedSaved = useMemo(() => saved.filter((p) => p.selected), [saved]);

  return {
    saved, setSaved, savingNo, setSavingNo,
    toggleSelectSaved, deleteSaved, moveSaved, toggleSelectAll,
    selectAllState, selectedSaved,
  };
}

/* 編集タイトル（「問題 #NN を編集中 / を作る」）— 全メーカー共通の導出 */
export function editorTitle(saved: { id: string }[], editingId: string | null): string {
  const isEditing = editingId != null;
  const editingNo = isEditing ? saved.findIndex((p) => p.id === editingId) + 1 : 0;
  return isEditing
    ? `問題 #${String(editingNo).padStart(2, "0")} を編集中`
    : `問題 #${(saved.length + 1).toString().padStart(2, "0")} を作る`;
}

/* ページ分割（選択問題 → effectivePerPage ごと） */
export function chunkPages<T>(items: T[], perPage: number): T[][] {
  const ps: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    ps.push(items.slice(i, i + perPage));
  }
  return ps;
}
