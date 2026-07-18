"use client";

/* =========================================================================
   折り重ねメーカー（内部用・/maker-fold）
   鏡 × 重ねのハイブリッド。問題1(A)・問題2(B) の2図形を描き、
   **問題1を折り返して（鏡像にして）問題2に重ねた** 図
   mirror(問題1, foldAxis) ∪ 問題2 を子に描かせる新タスク。
   - 編集は3キャンバス: 問題1 編集・問題2 編集・折り重ね結果（読み取り専用）
   - 折り方は「式の並び」に一本化（横一列=左右に折る=v / 縦一列=上下に折る=h）。
     鏡メーカーと同じ連動。並びを変えると編集3キャンバスも横↔縦に追従する。
   - 折り目は問題1と問題2の境目（綴じ目）＝ペイン間の折り返し矢印で示す（ペイン内に折り線は引かない）
   - 結果プレビューは 折り返した問題1=teal / 問題2=墨 で色分け（印刷は単色）
   - 紙面は「問題1 →(折り返し矢印) 問題2 ＝ □」の3ペイン式
   - 解答 PDF は別出力（空欄に mirror(問題1)∪問題2 を描き込み・「かいとう」見出し）
   ベース = 重ねメーカー（2図形・3ペイン・panes=3）＋鏡メーカー（mirror関数・並び連動）。
   ヘッダー・LP・フッターから動線なし。robots noindex。print.ts は panes=3。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import {
  PAPER, COUNT_OPTIONS, paperMax, gridFor, PRINT_INK, edgeWidth,
  type PaperKey, type LayoutPerPage, type PairLayout,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import { useAuth } from "../AuthContext";
import { ownsMaker } from "../products/capabilities";
import { buyMaker } from "../maker/buyMaker";
import { ModeToggle } from "../maker/erase";
import {
  AXIS_INK, INK, VIEW, edgeKey, edgesEqual, samePoint, uid,
  type Edge, type Point,
} from "../maker/core/geometry";
import { buildPageSvgFrame, paneFrameSvgString, paneSvgString, type LogoInfo } from "../maker/core/page-svg";
import { exportPdf } from "../maker/core/pdf-export";
import { axisOf, mirrorEdgesOf, type MirrorAxis } from "../maker/core/transforms";
import { PaperSVG, PreviewPage, PreviewPane } from "../maker/core/PaperSVG";
import {
  chunkPages, editorTitle, useEditorHistory, useSavedList,
} from "../maker/core/useMakerEditor";
import { usePaperLayout } from "../maker/core/usePaperLayout";
import {
  DotSizeSeg, EditActions, MakerHeader, NameFieldGroup, NoteBox, OneStrokeSeg,
  PaperGroup, SavedPanel, SettingsFold,
} from "../maker/core/chrome";

// =========================================================================
// Types & constants
// =========================================================================
type GridSize = 3 | 4 | 5 | 6;
type Board = "A" | "B"; // A=問題1 / B=問題2
type FoldAxis = MirrorAxis; // v=左右に折る（左右反転）/ h=上下に折る（上下反転）

/* edgesA=問題1／edgesB=問題2。折り方(foldAxis)は式の並びから導出するので
   問題には焼き付けない。折り重ね結果は描画時に
   [...mirror(edgesA, foldAxis), ...edgesB]（問題1を折り返して問題2に重ねる） */
type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edgesA: Edge[];
  edgesB: Edge[];
  selected: boolean;
};

type Snap = { edgesA: Edge[]; edgesB: Edge[] };

// 折り返した問題1を示す teal（編集プレビューのみ・印刷は常に単色 PRINT_INK）
const INK_B = "#2C6E7F";

/* 連結記号 — 折り返し矢印（fold）と ＝（eq）。x,y は中心。React 用とPDF文字列用で同形。
   fold = 弧＋矢じり（問題1を問題2へ「折り重ねる」動き・横/縦並び連動）。
   ＝ は流れに直交（横並び=水平2本線／縦並び=垂直2本線）。 */
function opGlyphPath(x: number, y: number, size: number, kind: "eq" | "fold", vertical = false): string {
  const s = size / 2;
  const g = size * 0.24;
  if (kind === "fold") {
    const r = size * 0.46;
    const ah = size * 0.34;
    if (!vertical) {
      const yb = y + size * 0.26;
      return `M${x - r} ${yb} A ${r} ${r} 0 0 1 ${x + r} ${yb} `
        + `M${x + r - ah * 0.5} ${yb - ah * 0.62} L${x + r} ${yb + ah * 0.32} L${x + r + ah * 0.58} ${yb - ah * 0.46}`;
    }
    const xb = x - size * 0.26;
    return `M${xb} ${y - r} A ${r} ${r} 0 0 0 ${xb} ${y + r} `
      + `M${xb - ah * 0.62} ${y + r - ah * 0.5} L${xb + ah * 0.32} ${y + r} L${xb - ah * 0.46} ${y + r + ah * 0.58}`;
  }
  // eq
  return vertical
    ? `M${x - g} ${y - s} L${x - g} ${y + s} M${x + g} ${y - s} L${x + g} ${y + s}`
    : `M${x - s} ${y - g} L${x + s} ${y - g} M${x - s} ${y + g} L${x + s} ${y + g}`;
}
function OpGlyph({ x, y, size, kind, color, vertical }: {
  x: number; y: number; size: number; kind: "eq" | "fold"; color: string; vertical?: boolean;
}) {
  return (
    <path d={opGlyphPath(x, y, size, kind, vertical)} fill="none" stroke={color}
      strokeWidth={Math.max(0.4, size * 0.1)} strokeLinecap="round" strokeLinejoin="round" />
  );
}
function opGlyphSvgString(x: number, y: number, size: number, kind: "eq" | "fold", color: string, vertical = false): string {
  return `<path d="${opGlyphPath(x, y, size, kind, vertical)}" fill="none" stroke="${color}" stroke-width="${Math.max(0.4, size * 0.1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
// 編集ステージ・印刷の「折り重ね」マーク（独立 svg・currentColor 追従）
function FoldMark({ size = 26, vertical = false }: { size?: number; vertical?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d={opGlyphPath(12, 11, 17, "fold", vertical)} fill="none" stroke="currentColor"
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
// 編集ステージの ＝ マーク（縦並びでは ‖ に回転）
function EqMark({ size = 22, vertical = false }: { size?: number; vertical?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d={opGlyphPath(12, 12, 15, "eq", vertical)} fill="none" stroke="currentColor"
        strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋折り重ね固有のセル描画。
// panes=3 共有。折り方は並びから導出。
// =========================================================================
export function buildPageSvg(opts: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  logo: LogoInfo | null;
  answer?: boolean; // true=解答ページ群（空欄ペインに mirror(問題1)∪問題2 を描画）
  noDots?: boolean; // true=背景の点をとる（出題時のみ、結果ペインに薄い枠を添える）
}): string {
  const foldAxis = axisOf(opts.pairLayout); // 折り方は並びから導出
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    panes: 3,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const opSize = gap * 0.5;
      const areaY = cy;
      const areaH = cellH;
      /* 出題: ペイン1=問題1／ペイン2=問題2／ペイン3=空欄（子が描く）
         解答: ペイン3に mirror(問題1)∪問題2 を描き込み。記号 折り返し矢印 / ＝ */
      const resultEdges = opts.answer
        ? [...mirrorEdgesOf(p.edgesA, p.gridSize, foldAxis), ...p.edgesB]
        : [];
      const showResult = Boolean(opts.answer);
      // 枠は「結果ペインが空欄の出題時」のみ（解答時は線で埋まるため不要）。
      const showFrame = Boolean(opts.noDots) && !opts.answer;
      let body = "";
      if (pairLayout === "horizontal") {
        const blockW = pane * 3 + gap * 2;
        const sx = cx + (cellW - blockW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const x2 = sx + pane + gap;
        const x3 = sx + 2 * (pane + gap);
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale, showDots);
        body += paneSvgString(x2, sy, pane, p.gridSize, p.edgesB, true, dotScale, showDots);
        body += paneSvgString(x3, sy, pane, p.gridSize, resultEdges, showResult, dotScale, showDots);
        if (showFrame) body += paneFrameSvgString(x3, sy, pane);
        body += opGlyphSvgString(sx + pane + gap / 2, sy + pane / 2, opSize, "fold", PRINT_INK);
        body += opGlyphSvgString(x2 + pane + gap / 2, sy + pane / 2, opSize, "eq", PRINT_INK);
      } else {
        const blockH = pane * 3 + gap * 2;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - blockH) / 2;
        const y2 = sy + pane + gap;
        const y3 = sy + 2 * (pane + gap);
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale, showDots);
        body += paneSvgString(sx, y2, pane, p.gridSize, p.edgesB, true, dotScale, showDots);
        body += paneSvgString(sx, y3, pane, p.gridSize, resultEdges, showResult, dotScale, showDots);
        if (showFrame) body += paneFrameSvgString(sx, y3, pane);
        body += opGlyphSvgString(sx + pane / 2, sy + pane + gap / 2, opSize, "fold", PRINT_INK, true);
        body += opGlyphSvgString(sx + pane / 2, y2 + pane + gap / 2, opSize, "eq", PRINT_INK, true);
      }
      return body;
    },
  });
}

// =========================================================================
// MakerFoldApp
// =========================================================================
export default function MakerFoldApp() {
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "fold");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edgesA, setEdgesA] = useState<Edge[]>([]); // 問題1
  const [edgesB, setEdgesB] = useState<Edge[]>([]); // 問題2
  const [selectedA, setSelectedA] = useState<Point | null>(null);
  const [selectedB, setSelectedB] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 問題1・問題2 の両盤面に適用（各盤面の終点を渡す）。
  const [oneStroke, setOneStroke] = useState(false);
  // 消す（消しゴム）モード。ON のあいだは線をクリックでその1本を、その盤面から削除。
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelectedA(null); setSelectedB(null); }
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。出題時のみ結果ペインに薄い枠を残す。
  const [noDots, setNoDots] = useState(false);

  function applySnap(s: Snap) {
    setEdgesA(s.edgesA);
    setEdgesB(s.edgesB);
    setSelectedA(null);
    setSelectedB(null);
  }
  const hist = useEditorHistory<Snap>({ edgesA: [], edgesB: [] }, applySnap);

  function clearAll() {
    hist.pushHistory({ edgesA: [], edgesB: [] });
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
  }

  // 消すモード: 線をクリック → その盤面の辺を削除
  function eraseEdge(board: Board, i: number) {
    const isA = board === "A";
    const edges = isA ? edgesA : edgesB;
    const setEdges = isA ? setEdgesA : setEdgesB;
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    hist.pushHistory(isA ? { edgesA: updated, edgesB } : { edgesA, edgesB: updated });
  }

  function handleDot(board: Board, p: Point) {
    if (erase) return; // 消すモードでは点クリックでは描かない
    const isA = board === "A";
    const selected = isA ? selectedA : selectedB;
    const setSelected = isA ? setSelectedA : setSelectedB;
    const edges = isA ? edgesA : edgesB;
    const setEdges = isA ? setEdgesA : setEdgesB;
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    let updated: Edge[];
    if (edges.some((e) => edgeKey(e) === k)) {
      updated = edges.filter((e) => edgeKey(e) !== k);
    } else {
      updated = [...edges, next];
    }
    setEdges(updated);
    hist.pushHistory(isA ? { edgesA: updated, edgesB } : { edgesA, edgesB: updated });
    // 一筆書き ON: この盤面の終点 p を次の線の始点として残す。OFF: 従来どおり選択解除。
    setSelected(oneStroke ? p : null);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    setGridSize(n);
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    hist.resetHistory({ edgesA: [], edgesB: [] });
  }

  // ---- Paper / layout state ----
  const layout = usePaperLayout();
  const { paperKey, selectPaper, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<PairLayout>("horizontal");

  // 折り方は式の並びから導出（横一列=左右反転 v / 縦一列=上下反転 h）
  const foldAxis: FoldAxis = axisOf(pairLayout);
  const isVertical = pairLayout === "vertical";

  // 折り返した問題1（自動算出・結果プレビューの teal 重ね描き用）
  const mirrorA = useMemo(() => mirrorEdgesOf(edgesA, gridSize, foldAxis), [edgesA, gridSize, foldAxis]);

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState } = list;

  // 編集後/新規保存の共通リセット（2盤キャンバスを空に戻す）
  function resetCanvas() {
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    hist.resetHistory({ edgesA: [], edgesB: [] });
  }
  function saveCurrent() {
    if (edgesA.length === 0 && edgesB.length === 0) return;
    if (editingId) {
      /* 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る。
         折り方(foldAxis)は式の並び＝レイアウト状態から導出するので問題には焼かない＝書き戻し不要。
         2図形 edgesA/edgesB を両方とも書き戻す。 */
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edgesA, edgesB } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edgesA, edgesB, selected: true }]);
    setSavingNo((n) => n + 1);
    resetCanvas();
  }
  // 保存済み問題をエディタに読み込んで編集モードへ。未保存の変更があれば確認。
  function startEdit(id: string) {
    if (id === editingId) return; // すでにこれを編集中
    const p = saved.find((x) => x.id === id);
    if (!p) return;
    // dirty 判定は2盤いずれかが元と異なるか（折り方はレイアウト状態なので問題の dirty には含めない）
    const dirty = editingId
      ? (() => {
          const o = saved.find((x) => x.id === editingId);
          return !o || !edgesEqual(edgesA, o.edgesA) || !edgesEqual(edgesB, o.edgesB);
        })()
      : edgesA.length > 0 || edgesB.length > 0;
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の問題を編集しますか？"
      : "作りかけの問題があります。破棄して編集しますか？")) return;
    // gridSize・edgesA・edgesB を全て復元。折り方は式の並び（レイアウト）に従うので変更しない。
    setGridSize(p.gridSize);
    setEdgesA(p.edgesA);
    setEdgesB(p.edgesB);
    setSelectedA(null);
    setSelectedB(null);
    hist.resetHistory({ edgesA: p.edgesA, edgesB: p.edgesB });
    setEditingId(id);
    hist.rerender();
  }
  // 編集をやめて新規モードへ（変更は破棄）
  function cancelEdit() {
    setEditingId(null);
    resetCanvas();
  }

  // ---- Derived: print payload ----
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(paperMax(paperKey), selectedSaved.length))
    : perPage;
  const pages = chunkPages(selectedSaved, effectivePerPage);

  // ---- PDF ダウンロード（出題群→解答群を1ファイル連結） ----
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("fold").catch(() => {}); return; }
    setExporting(mode);
    try {
      await exportPdf({
        paper,
        pageCount: pages.length,
        buildPage: (pi, logo) => buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout, nameField, dotScale, logo,
          answer: mode === "a",
          noDots,
        }),
        filename: (stamp) => `tenzu_fold_${mode}_${stamp}.pdf`,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  /* dev 限定: 選択した保存済み問題を atelier の折り重ね候補として保存する橋。
     座標 {c,r}→[[c,r],[c,r]] に変換、解答＝mirror(問題1)∪問題2。正規化は create API 側で行う。 */
  async function saveToAtelier() {
    if (selectedSaved.length === 0) return;
    const sku = window.prompt("atelier の保存先 SKU（折り重ね）", "fold-lv2-vol1");
    if (!sku) return;
    const axis = axisOf(pairLayout);
    const toRaw = (es: Edge[]) => es.map((e) => [[e.a.c, e.a.r], [e.b.c, e.b.r]]);
    let ok = 0;
    for (const p of selectedSaved) {
      const answer = toRaw([...mirrorEdgesOf(p.edgesA, p.gridSize, axis), ...p.edgesB]);
      const res = await fetch("/api/atelier/candidates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku, edges: toRaw(p.edgesA), inputB: toRaw(p.edgesB),
          answerEdges: answer, title: p.name,
        }),
      });
      if (res.ok) { ok++; continue; }
      const j = await res.json().catch(() => ({}));
      window.alert(`保存失敗: ${j.error ?? res.status}`);
      break;
    }
    if (ok > 0) window.alert(`atelier に ${ok} 問を保存しました（${sku}）`);
  }

  const editingTitle = editorTitle(saved, editingId);
  const paper = PAPER[paperKey];
  const frameStrokeWidth = Math.max(0.25, edgeWidth(VIEW) * 0.55);

  return (
    <>
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <MakerHeader appName="折り重ねメーカー（内部用）" />

      <>
      {/* ============ APP SHELL ============ */}
      <div className="app-shell">

        {/* ---------- CENTER ---------- */}
        <main className="canvas-area">
          <div className={`canvas-toolbar${isEditing ? " editing" : ""}`}>
            <div className="title">
              {editingTitle}
            </div>
          </div>

          {/* 作図の設定（グリッド・点の大きさ・一筆書き）をタイトル直下のコンパクト帯に集約 */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ" value={gridSize}
                disabled={isEditing}
                onChange={(e) => changeGridSize(Number(e.target.value) as GridSize)}>
                {([3, 4, 5, 6] as GridSize[]).map((n) => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
            </div>
            <ModeToggle erase={erase} onChange={changeErase} />
            <DotSizeSeg value={dotSize} onChange={setDotSize} />
            <OneStrokeSeg value={oneStroke} onChange={setOneStroke} />
            {erase
              ? <span className="qb-note">消すモード：線をクリックすると、その線だけ消えます。</span>
              : isEditing
                ? <span className="qb-note">編集中はグリッドは固定されます。</span>
                : oneStroke
                  ? <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>
                  : null}
          </div>

          <div className="canvas-stage">
            <EditActions
              onUndo={hist.undo} onRedo={hist.redo} onClear={clearAll}
              canUndo={hist.canUndo()} canRedo={hist.canRedo()}
              canClear={edgesA.length > 0 || edgesB.length > 0} />
            <div className="paper-pair-label">問題（問題1を折り返して問題2に重ねる）</div>
            <div className={`overlay-boards${isVertical ? " is-vertical" : ""}`}>
              <div className="overlay-board">
                <div className="ob-cap">問題1（問題2に重ねる）</div>
                <div className="paper-pane problem" aria-label="問題1 の盤面">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edgesA}
                    selected={selectedA}
                    onDotClick={(p) => handleDot("A", p)}
                    onEdgeErase={(i) => eraseEdge("A", i)}
                    erase={erase}
                    showLines={true}
                    showActiveHighlight={true}
                  />
                  <div className="pp-stamp">{gridSize}×{gridSize}</div>
                </div>
              </div>
              <div className="overlay-op" aria-hidden="true"><FoldMark vertical={isVertical} /></div>
              <div className="overlay-board">
                <div className="ob-cap">問題2</div>
                <div className="paper-pane problem" aria-label="問題2 の盤面">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edgesB}
                    selected={selectedB}
                    onDotClick={(p) => handleDot("B", p)}
                    onEdgeErase={(i) => eraseEdge("B", i)}
                    erase={erase}
                    showLines={true}
                    showActiveHighlight={true}
                  />
                  <div className="pp-stamp">{gridSize}×{gridSize}</div>
                </div>
              </div>
              <div className="overlay-op" aria-hidden="true"><EqMark vertical={isVertical} /></div>
              <div className="overlay-board">
                <div className="ob-cap">折り重ね（こたえ）</div>
                <div className="paper-pane" aria-label="折り重ね結果（問題1を折り返して問題2に重ねる）">
                  {/* 結果プレビューは 問題2=墨 / 折り返した問題1=teal（edgeColor で第2辺集合を色分け） */}
                  <PaperSVG
                    gridSize={gridSize}
                    edges={[...edgesB, ...mirrorA]}
                    showLines={true}
                    edgeColor={(_, i) => (i < edgesB.length ? INK : INK_B)}
                  />
                </div>
              </div>
            </div>
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent}
                disabled={edgesA.length === 0 && edgesB.length === 0}>
                {isEditing ? "変更を保存" : "この問題を保存する"}
              </button>
              {isEditing && (
                <button className="btn-cancel-edit" type="button" onClick={cancelEdit}>
                  やめる
                </button>
              )}
            </div>
            <div className="canvas-help">
              {isEditing
                ? "保存済みの問題を編集中です。問題1・問題2 を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。グリッドのみ固定で、式の並び（折り方）は切り替えられます。"
                : "問題1・問題2 にそれぞれ線を引きます（点を 2 つクリック／同じ線をもう一度で消えます）。問題1を矢印の向きに折り返して問題2に重ねた仕上がりが右に出ます（青＝折り返した問題1）。「式の並び」を縦一列にすると、この画面も上下の並びに変わります。"}
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">

          <SavedPanel
            saved={saved}
            editingId={editingId}
            selectAllState={selectAllState}
            selectedCount={selectedSaved.length}
            onToggle={list.toggleSelectSaved}
            onEdit={startEdit}
            onDelete={(id) => list.deleteSaved(id, () => { if (id === editingId) cancelEdit(); })}
            onMove={list.moveSaved}
            onToggleAll={list.toggleSelectAll}
            renderThumb={(p) => (
              /* サムネは「問題1 ／ 問題2」の2枚セットで見分けやすく */
              <span className="thumb-pair">
                <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} />
                <span className="tp-op" aria-hidden="true">／</span>
                <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} />
              </span>
            )}
          />

          {/* 式の並びは折り重ねの肝（折り方＝並びが変わる）。詳細設定の前に独立枠で出す */}
          <div className="group group--pair-frame"
            style={{
              border: "1px solid #d6d9dd",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 12,
              background: "#fafbfc",
            }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
              式の並び（折り方と連動）
              <span style={{ marginLeft: 8, fontSize: 11, color: "#6b727b", fontWeight: "normal" }}>
                {isVertical ? "縦一列＝上下に折る" : "横一列＝左右に折る"}
              </span>
            </h3>
            <div className="seg seg--pair" role="group" aria-label="式の並び">
              <button type="button"
                aria-pressed={!isVertical}
                onClick={() => setPairLayout("horizontal")}>
                <span className="seg-ic"><PairChipIcon pair="horizontal" /></span>
                横一列
              </button>
              <button type="button"
                aria-pressed={isVertical}
                onClick={() => setPairLayout("vertical")}>
                <span className="seg-ic"><PairChipIcon pair="vertical" /></span>
                縦一列
              </button>
            </div>
          </div>

          <SettingsFold
            current={`用紙: ${paper.label} · 問数: ${perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 名前欄: ${nameField ? "あり" : "なし"} · 背景の点: ${noDots ? "なし" : "あり"}`}>

            <PaperGroup paperKey={paperKey} onSelect={selectPaper} />

            {/* 1 ページに何問 — ミニ図は panes=3 の gridFor で組む（共通 PerPageGroup は 2 ペイン前提） */}
            <div className="group">
              <h3>1 ページに何問</h3>
              <div className="layout-grid" role="group" aria-label="1ページあたりの問題数">
                <button type="button"
                  aria-pressed={perPage === "auto"}
                  onClick={() => setPerPage("auto")}>
                  <span className="lauto">おまかせ</span>
                </button>
                {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => {
                  const g = gridFor(v, pairLayout, paper.w, paper.h, marginMm, 3);
                  return (
                  <button key={v} type="button"
                    aria-pressed={perPage === v}
                    onClick={() => setPerPage(v)}>
                    <span className="ldiagram"
                      style={{
                        gridTemplateColumns: `repeat(${g.cols}, 1fr)`,
                        gridTemplateRows:    `repeat(${g.rows}, 1fr)`,
                      }}>
                      {Array.from({ length: g.cols * g.rows }, (_, i) => <span key={i} />)}
                    </span>
                    <span className="lnum">{v} 問</span>
                  </button>
                  );
                })}
              </div>
            </div>

            <NameFieldGroup value={nameField} onChange={setNameField} />

            <div className="group">
              <h3>背景の点</h3>
              <label className="chk-row">
                <input type="checkbox" checked={noDots}
                  onChange={(e) => setNoDots(e.target.checked)} />
                <span>背景の点をとる</span>
              </label>
              <p className="seg-hint">
                問題1・問題2・結果の点を消します（出題側）。結果の欄には薄い枠だけが残ります。解答側は対象外です。
              </p>
            </div>
          </SettingsFold>

          <div className="group">
            <h3>出力プレビュー（解答）<span className="pp-paperinfo">{paper.label} · {paper.w}×{paper.h}mm</span></h3>
            <div className="pdf-preview">
              {selectedSaved.length === 0 ? (
                <div className="pp-empty">
                  選択した問題が、ここに並びます。
                </div>
              ) : (
                <>
                  <div className="pp-pages">
                    {pages.map((page, pi) => (
                      <PreviewPage key={pi}
                        paper={paper}
                        problems={page}
                        pageNo={pi + 1}
                        pageCount={pages.length}
                        marginMm={marginMm}
                        problemsPerPage={effectivePerPage}
                        pairLayout={pairLayout}
                        nameField={nameField}
                        dotScale={dotScale}
                        panes={3}
                        renderCell={(p, { cellW, cellH, pane, gap, pairLayout, dotScale }) => {
                          const opSize = gap * 0.5;
                          // 出力プレビュー＝解答（ペイン3に mirror(問題1)∪問題2）
                          const answer = [...mirrorEdgesOf(p.edgesA, p.gridSize, axisOf(pairLayout)), ...p.edgesB];
                          let p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number };
                          let foldP: { x: number; y: number }, eq: { x: number; y: number };
                          if (pairLayout === "horizontal") {
                            const blockW = pane * 3 + gap * 2;
                            const startX = (cellW - blockW) / 2;
                            const startY = (cellH - pane) / 2;
                            p1 = { x: startX, y: startY };
                            p2 = { x: startX + pane + gap, y: startY };
                            p3 = { x: startX + 2 * (pane + gap), y: startY };
                            foldP = { x: startX + pane + gap / 2, y: startY + pane / 2 };
                            eq = { x: startX + 2 * pane + gap + gap / 2, y: startY + pane / 2 };
                          } else {
                            const blockH = pane * 3 + gap * 2;
                            const startX = (cellW - pane) / 2;
                            const startY = (cellH - blockH) / 2;
                            p1 = { x: startX, y: startY };
                            p2 = { x: startX, y: startY + pane + gap };
                            p3 = { x: startX, y: startY + 2 * (pane + gap) };
                            foldP = { x: startX + pane / 2, y: startY + pane + gap / 2 };
                            eq = { x: startX + pane / 2, y: startY + 2 * pane + gap + gap / 2 };
                          }
                          return (
                            <>
                              <PreviewPane x={p1.x} y={p1.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={p.edgesA} showLines={true} dotScale={dotScale}
                                showDots={!noDots} />
                              <PreviewPane x={p2.x} y={p2.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={p.edgesB} showLines={true} dotScale={dotScale}
                                showDots={!noDots} />
                              <PreviewPane x={p3.x} y={p3.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={answer} showLines={true} dotScale={dotScale}
                                showDots={!noDots} />
                              <OpGlyph x={foldP.x} y={foldP.y} size={opSize} kind="fold" color={PRINT_INK} vertical={pairLayout === "vertical"} />
                              <OpGlyph x={eq.x} y={eq.y} size={opSize} kind="eq" color={PRINT_INK} vertical={pairLayout === "vertical"} />
                            </>
                          );
                        }} />
                    ))}
                  </div>
                  <div className="pp-foot">
                    <span>合計 <strong>{selectedSaved.length} 問 / {pages.length} ページ</strong></span>
                    <span>{paper.label} · {effectivePerPage} 問 / ページ</span>
                  </div>
                </>
              )}
            </div>
            <div className="export-actions">
              <button className="btn-export" type="button"
                onClick={() => doExport("q")} disabled={selectedSaved.length === 0 || exporting !== false}>
                {exporting === "q" ? "PDF を作成中…" : "問題をダウンロード"}
                {exporting !== "q" && selectedSaved.length > 0 && (
                  <span className="x">{selectedSaved.length} 問 / {pages.length}p</span>
                )}
              </button>
              <button className="btn-export" type="button"
                onClick={() => doExport("a")} disabled={selectedSaved.length === 0 || exporting !== false}>
                {exporting === "a" ? "PDF を作成中…" : "解答をダウンロード"}
                {exporting !== "a" && selectedSaved.length > 0 && (
                  <span className="x">{selectedSaved.length} 問 / {pages.length}p</span>
                )}
              </button>
              {process.env.NODE_ENV !== "production" && (
                <button className="btn-export" type="button"
                  onClick={saveToAtelier} disabled={selectedSaved.length === 0}>
                  [DEV] atelier 候補として保存
                </button>
              )}
            </div>
          </div>

          <NoteBox />

        </aside>
      </div>

      {selectedSaved.length > 0 && (
        <div className="mobile-export-bar">
          <button type="button" onClick={() => doExport("q")} disabled={exporting !== false}>
            {exporting === "q" ? "PDF を作成中…" : "問題をダウンロード"}
            {exporting !== "q" && (
              <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
            )}
          </button>
          <button type="button" onClick={() => doExport("a")} disabled={exporting !== false}>
            {exporting === "a" ? "PDF を作成中…" : "解答をダウンロード"}
            {exporting !== "a" && (
              <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
            )}
          </button>
        </div>
      )}
      </>

      {/* ============ PRINT-ONLY SHEETS ============ */}
      <div className="print-only" aria-hidden="true">
        {pages.map((page, pi) => (
          <PrintPage key={pi}
            paper={paper}
            problems={page}
            pageNo={pi + 1}
            pageCount={pages.length}
            marginMm={marginMm}
            problemsPerPage={effectivePerPage}
            pairLayout={pairLayout}
            nameField={nameField}
            dotScale={dotScale}
            noDots={noDots}
            frameStrokeWidth={frameStrokeWidth} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// Sub-components: ProblemTriple & PrintPage (print sheet)
// ※ 共通 PrintPage は 2 ペイン（print-problem pair-*・--pscale あり）で DOM が
//   異なるため、3 セル（triple クラス・panes=3 の gridFor）の印刷シートは
//   メーカー固有のまま残す。
// =========================================================================
// noDots=true で背景ドットを省き、結果ペイン（出題＝空欄）にだけ薄い正方形の枠を重ねる。
function ProblemTriple({ p, pairLayout, dotScale, noDots, frameStrokeWidth }: {
  p: Problem; pairLayout: PairLayout; dotScale: number; noDots: boolean; frameStrokeWidth: number;
}) {
  const vertical = pairLayout === "vertical";
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true"><FoldMark size={20} vertical={vertical} /></div>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true"><EqMark size={18} vertical={vertical} /></div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題なので結果ペインは空（子が描く）。解答は PDF 側へ */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots}
            overlay={noDots ? (
              <rect x={VIEW * 0.02} y={VIEW * 0.02} width={VIEW * 0.96} height={VIEW * 0.96}
                fill="none" stroke={AXIS_INK} strokeWidth={frameStrokeWidth} />
            ) : undefined} />
        </div>
      </div>
    </>
  );
}

function PrintPage({
  paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale,
  noDots, frameStrokeWidth,
}: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  noDots: boolean;
  frameStrokeWidth: number;
}) {
  const layout = gridFor(problemsPerPage, pairLayout, paper.w, paper.h, marginMm, 3);
  const dense = problemsPerPage <= 4 ? "8mm" : problemsPerPage <= 8 ? "5mm" : "3mm";
  return (
    <div className="print-page" style={{ width: `${paper.w}mm`, height: `${paper.h}mm` }}>
      <div className="print-page-inner">
        {nameField && (
          <div className="print-nameband" aria-hidden="true">
            <span className="nb-line nb-line--date" /><span className="nb-label">がつ</span>
            <span className="nb-line nb-line--date" /><span className="nb-label">にち</span>
            <span className="nb-label nb-label--name">なまえ</span><span className="nb-line nb-line--name" />
          </div>
        )}
        <div className="print-grid" style={{
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows:    `repeat(${layout.rows}, auto)`,
          gap: dense,
          ["--pgap" as string]: dense,
        }}>
          {problems.map((p) => (
            <div key={p.id} className={`print-problem triple pair-${pairLayout}`}>
              <ProblemTriple p={p} pairLayout={pairLayout} dotScale={dotScale}
                noDots={noDots} frameStrokeWidth={frameStrokeWidth} />
            </div>
          ))}
        </div>
        <div className="print-page-footer">
          <img className="print-logo" src="/assets/logo-horizontal.png"
            alt="点描写プリントの専門店 TENZU" />
          <span>P {pageNo} / {pageCount}</span>
        </div>
      </div>
    </div>
  );
}
