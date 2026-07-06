"use client";

/* =========================================================================
   重ねメーカー（内部用・/maker-overlay）
   copy のおためし点描写メーカー（/maker）と同じ scaffolding。設問が従来の
   2ペインと根本的に違い、「図形A ＋ 図形B ＝ □（空欄）」の3ペイン式。
   - 編集は3キャンバス: 図形A 編集・図形B 編集・重ね結果プレビュー（読み取り専用）
   - 保存問題は { gridSize, edgesA, edgesB }
   - 結果プレビューだけ A=墨 / B=teal で色分け（重なりの目視確認用・印刷は単色）
   - PDF/プレビューは A・B・空欄を一列に。連結記号は ＋ と ＝
   - 解答 PDF を別出力（用紙MAX・空欄に A∪B の重ね結果を描き込み・「かいとう」見出し）
   ヘッダー・LP・フッターから動線なし。robots noindex。
   レイアウトエンジン（PAPER/gridFor/paneSize）は products/print.ts（SSOT）を
   panes=3 で呼ぶ。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   ========================================================================= */

import { useEffect, useState } from "react";
import {
  PAPER, COUNT_OPTIONS, paperMax, gridFor, PRINT_INK,
  type PaperKey, type LayoutPerPage, type PairLayout,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import { useAuth } from "../AuthContext";
import { ownsMaker } from "../products/capabilities";
import { buyMaker } from "../maker/buyMaker";
import { ModeToggle } from "../maker/erase";
import {
  INK, edgeKey, edgesEqual, samePoint, uid,
  type Edge, type Point,
} from "../maker/core/geometry";
import { buildPageSvgFrame, paneSvgString, type LogoInfo } from "../maker/core/page-svg";
import { exportPdf } from "../maker/core/pdf-export";
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
type Board = "A" | "B";

/* edgesA = 図形A／edgesB = 図形B。重ね結果は描画時に [...edgesA, ...edgesB] */
type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edgesA: Edge[];
  edgesB: Edge[];
  selected: boolean;
};

type Snap = { edgesA: Edge[]; edgesB: Edge[] };

// 結果プレビューで図形Bを示す teal（編集プレビューのみ・印刷は常に単色 PRINT_INK）
const INK_B = "#2C6E7F";

/* 連結記号 ＋ / ＝ — 細い SVG ストローク（中心 x,y）。React 用とPDF文字列用で同形。
   ＝ は並びの流れに直交させる: 横並び=水平2本線／縦並び=垂直2本線（90°回転）。
   ＋ は回転対称なので vertical 不問。 */
function opGlyphPath(x: number, y: number, size: number, kind: "plus" | "eq", vertical = false): string {
  const s = size / 2;
  const g = size * 0.24;
  if (kind === "plus") {
    return `M${x - s} ${y} L${x + s} ${y} M${x} ${y - s} L${x} ${y + s}`;
  }
  return vertical
    ? `M${x - g} ${y - s} L${x - g} ${y + s} M${x + g} ${y - s} L${x + g} ${y + s}`
    : `M${x - s} ${y - g} L${x + s} ${y - g} M${x - s} ${y + g} L${x + s} ${y + g}`;
}
function OpGlyph({ x, y, size, kind, color, vertical }: {
  x: number; y: number; size: number; kind: "plus" | "eq"; color: string; vertical?: boolean;
}) {
  return (
    <path d={opGlyphPath(x, y, size, kind, vertical)} fill="none" stroke={color}
      strokeWidth={Math.max(0.4, size * 0.1)} strokeLinecap="round" />
  );
}
function opGlyphSvgString(x: number, y: number, size: number, kind: "plus" | "eq", color: string, vertical = false): string {
  return `<path d="${opGlyphPath(x, y, size, kind, vertical)}" fill="none" stroke="${color}" stroke-width="${Math.max(0.4, size * 0.1)}" stroke-linecap="round"/>`;
}

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋重ね固有のセル描画。
// レイアウトは印刷系と同じ gridFor / paneSize / KGAP を panes=3 で共有。
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
  answer?: boolean; // true=解答ページ群（空欄ペインに A∪B を描画）
}): string {
  return buildPageSvgFrame<Problem>({
    ...opts,
    panes: 3,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const opSize = gap * 0.5;
      const areaY = cy;
      const areaH = cellH;
      /* 出題: ペイン1=図形A／ペイン2=図形B／ペイン3=空欄（子が重ねた形を描く）
         解答: ペイン3に重ね結果 A∪B を描き込み。連結記号は ＋ / ＝（共通） */
      const resultEdges = opts.answer ? [...p.edgesA, ...p.edgesB] : [];
      const showResult = Boolean(opts.answer);
      let body = "";
      if (pairLayout === "horizontal") {
        const blockW = pane * 3 + gap * 2;
        const sx = cx + (cellW - blockW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const x2 = sx + pane + gap;
        const x3 = sx + 2 * (pane + gap);
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale);
        body += paneSvgString(x2, sy, pane, p.gridSize, p.edgesB, true, dotScale);
        body += paneSvgString(x3, sy, pane, p.gridSize, resultEdges, showResult, dotScale);
        body += opGlyphSvgString(sx + pane + gap / 2, sy + pane / 2, opSize, "plus", PRINT_INK);
        body += opGlyphSvgString(x2 + pane + gap / 2, sy + pane / 2, opSize, "eq", PRINT_INK);
      } else {
        const blockH = pane * 3 + gap * 2;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - blockH) / 2;
        const y2 = sy + pane + gap;
        const y3 = sy + 2 * (pane + gap);
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale);
        body += paneSvgString(sx, y2, pane, p.gridSize, p.edgesB, true, dotScale);
        body += paneSvgString(sx, y3, pane, p.gridSize, resultEdges, showResult, dotScale);
        body += opGlyphSvgString(sx + pane / 2, sy + pane + gap / 2, opSize, "plus", PRINT_INK);
        body += opGlyphSvgString(sx + pane / 2, y2 + pane + gap / 2, opSize, "eq", PRINT_INK, true);
      }
      return body;
    },
  });
}

// =========================================================================
// MakerOverlayApp
// =========================================================================
export default function MakerOverlayApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "overlay");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edgesA, setEdgesA] = useState<Edge[]>([]);
  const [edgesB, setEdgesB] = useState<Edge[]>([]);
  const [selectedA, setSelectedA] = useState<Point | null>(null);
  const [selectedB, setSelectedB] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 図形A・図形B 両盤面に効く（盤面ごとに selected が分かれているので handleDot 内で終点を渡す）。
  const [oneStroke, setOneStroke] = useState(false);
  // 消す（消しゴム）モード。ON のあいだは線をクリックでその1本を、その盤面から削除。
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelectedA(null); setSelectedB(null); }
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;

  // history stack — { edgesA, edgesB } snapshots（A/B 両ボード共通）
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
      // 既存線をもう一度なぞる→消す
      updated = edges.filter((e) => edgeKey(e) !== k);
    } else {
      updated = [...edges, next];
    }
    setEdges(updated);
    hist.pushHistory(isA ? { edgesA: updated, edgesB } : { edgesA, edgesB: updated });
    // 一筆書き ON: 終点 p を次の線の始点として残す（連続描画）。OFF: 従来どおり選択解除。
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
  /* 既定: A4 縦・横一列・3 問/ページ（商品ページと共通の基本） */
  const layout = usePaperLayout();
  const { paperKey, selectPaper, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で縦/横を自動

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState } = list;

  // 編集後/新規保存の共通リセット（A・B 両盤と各選択点・history を空に戻す）
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
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持・A/B 両盤を書き戻す）→ 新規モードに戻る
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
  // 保存済み問題をエディタに読み込んで編集モードへ。未保存の変更があれば確認（A・B どちらの変更も対象）。
  function startEdit(id: string) {
    if (id === editingId) return; // すでにこれを編集中
    const p = saved.find((x) => x.id === id);
    if (!p) return;
    const dirty = editingId
      ? (() => {
          const o = saved.find((x) => x.id === editingId);
          return !o || !edgesEqual(edgesA, o.edgesA) || !edgesEqual(edgesB, o.edgesB);
        })()
      : (edgesA.length > 0 || edgesB.length > 0);
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の問題を編集しますか？"
      : "作りかけの問題があります。破棄して編集しますか？")) return;
    // gridSize と A・B 両盤を復元。選択点は解除し、history を復元状態の1コマへ。
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
  // おまかせ = 選択数を 1 ページに（用紙上限でクランプ）。0 問時は 1 扱い。
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(paperMax(paperKey), selectedSaved.length))
    : perPage;
  // おまかせ並び = 選択 2 問以下は縦一列（1 問でもスカスカに見えない）・3 問以上は横一列。
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedSaved.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = chunkPages(selectedSaved, effectivePerPage);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  /* 問題（mode="q"）／解答（mode="a"）を別々の PDF に出力。
     解答ページは同レイアウトで 空欄ペインに A∪B を描き込んだ版。 */
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("overlay").catch(() => {}); return; }
    setExporting(mode);
    try {
      await exportPdf({
        paper,
        pageCount: pages.length,
        buildPage: (pi, logo) => buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout, nameField, dotScale, logo,
          answer: mode === "a",
        }),
        // tenzu_overlay_{q|a}_yyyymmddhhmm.pdf — 上書き事故を防ぐタイムスタンプ命名
        filename: (stamp) => `tenzu_overlay_${mode}_${stamp}.pdf`,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  const editingTitle = editorTitle(saved, editingId);
  const paper = PAPER[paperKey];

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <MakerHeader appName="重ねメーカー（内部用）" />

      {/* 内部用ツールのため完了画面なし */}
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
                : oneStroke && <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>}
          </div>

          <div className="canvas-stage">
            <EditActions
              onUndo={hist.undo} onRedo={hist.redo} onClear={clearAll}
              canUndo={hist.canUndo()} canRedo={hist.canRedo()}
              canClear={edgesA.length > 0 || edgesB.length > 0} />
            <div className="paper-pair-label">問題（図形A ＋ 図形B ＝ 重ねたかたち）</div>
            <div className="overlay-boards">
              <div className="overlay-board">
                <div className="ob-cap">図形A</div>
                <div className="paper-pane problem" aria-label="図形A の盤面">
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
              <div className="overlay-op" aria-hidden="true">＋</div>
              <div className="overlay-board">
                <div className="ob-cap">図形B</div>
                <div className="paper-pane problem" aria-label="図形B の盤面">
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
              <div className="overlay-op" aria-hidden="true">＝</div>
              <div className="overlay-board">
                <div className="ob-cap">重ねたかたち</div>
                <div className="paper-pane" aria-label="重ねた結果（図形A＋図形B）">
                  {/* 結果プレビューは A=墨 / B=teal で重ね描き（edgeColor で第2辺集合を色分け） */}
                  <PaperSVG
                    gridSize={gridSize}
                    edges={[...edgesA, ...edgesB]}
                    showLines={true}
                    edgeColor={(_, i) => (i < edgesA.length ? INK : INK_B)}
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
                ? "保存済みの問題を編集中です。図形A・図形B の線を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。"
                : "図形A・図形B にそれぞれ線を引きます（点を 2 つクリック／同じ線をもう一度クリックで消えます）。右の「重ねたかたち」が仕上がり。印刷では「図形A ＋ 図形B ＝ 空欄」が一列に並び、空欄に重ねた形を描かせます。"}
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
              /* サムネは「図形A ＋ 図形B」の2枚セットで見分けやすく */
              <span className="thumb-pair">
                <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} />
                <span className="tp-op" aria-hidden="true">＋</span>
                <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} />
              </span>
            )}
          />

          <SettingsFold
            current={`用紙: ${paper.label} · 問数: ${perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 並び: ${pairLayout === "auto" ? "おまかせ" : pairLayout === "horizontal" ? "横一列" : "縦一列"} · 名前欄: ${nameField ? "あり" : "なし"}`}>

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
                  const g = gridFor(v, effectivePairLayout, paper.w, paper.h, marginMm, 3);
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

            <div className="group">
              <h3>式の並び</h3>
              <div className="seg seg--pair" role="group" aria-label="式の並び">
                <button type="button"
                  aria-pressed={pairLayout === "auto"}
                  onClick={() => setPairLayout("auto")}>
                  おまかせ
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "horizontal"}
                  onClick={() => setPairLayout("horizontal")}>
                  <span className="seg-ic"><PairChipIcon pair="horizontal" /></span>
                  横一列
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "vertical"}
                  onClick={() => setPairLayout("vertical")}>
                  <span className="seg-ic"><PairChipIcon pair="vertical" /></span>
                  縦一列
                </button>
              </div>
              {pairLayout === "auto" && (
                <p className="seg-hint">問題が 2 問までは縦一列、3 問以上は横一列に自動で並べます。</p>
              )}
            </div>

            <NameFieldGroup value={nameField} onChange={setNameField} />
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
                        pairLayout={effectivePairLayout}
                        nameField={nameField}
                        dotScale={dotScale}
                        panes={3}
                        renderCell={(p, { cellW, cellH, pane, gap, pairLayout, dotScale }) => {
                          const opSize = gap * 0.5;
                          let p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number };
                          let plus: { x: number; y: number }, eq: { x: number; y: number };
                          if (pairLayout === "horizontal") {
                            const blockW = pane * 3 + gap * 2;
                            const startX = (cellW - blockW) / 2;
                            const startY = (cellH - pane) / 2;
                            p1 = { x: startX, y: startY };
                            p2 = { x: startX + pane + gap, y: startY };
                            p3 = { x: startX + 2 * (pane + gap), y: startY };
                            plus = { x: startX + pane + gap / 2, y: startY + pane / 2 };
                            eq = { x: startX + 2 * pane + gap + gap / 2, y: startY + pane / 2 };
                          } else {
                            const blockH = pane * 3 + gap * 2;
                            const startX = (cellW - pane) / 2;
                            const startY = (cellH - blockH) / 2;
                            p1 = { x: startX, y: startY };
                            p2 = { x: startX, y: startY + pane + gap };
                            p3 = { x: startX, y: startY + 2 * (pane + gap) };
                            plus = { x: startX + pane / 2, y: startY + pane + gap / 2 };
                            eq = { x: startX + pane / 2, y: startY + 2 * pane + gap + gap / 2 };
                          }
                          return (
                            <>
                              <PreviewPane x={p1.x} y={p1.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={p.edgesA} showLines={true} dotScale={dotScale} />
                              <PreviewPane x={p2.x} y={p2.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={p.edgesB} showLines={true} dotScale={dotScale} />
                              <PreviewPane x={p3.x} y={p3.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={[...p.edgesA, ...p.edgesB]} showLines={true} dotScale={dotScale} />
                              <OpGlyph x={plus.x} y={plus.y} size={opSize} kind="plus" color={PRINT_INK} />
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
            </div>
          </div>

          <NoteBox />

        </aside>
      </div>

      {/* モバイル（≤1200px）専用・画面下固定の DL バー */}
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
            pairLayout={effectivePairLayout}
            nameField={nameField}
            dotScale={dotScale} />
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
function ProblemTriple({ p, dotScale }: { p: Problem; dotScale: number }) {
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true">＋</div>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true">＝</div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題なので結果ペインは空（子が描く）。解答は PDF 側へ */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
    </>
  );
}

function PrintPage({
  paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale,
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
}) {
  const layout = gridFor(problemsPerPage, pairLayout, paper.w, paper.h, marginMm, 3);
  // Gaps shrink as the page gets denser (gap比例化, print side).
  const dense = problemsPerPage <= 4 ? "8mm" : problemsPerPage <= 8 ? "5mm" : "3mm";
  return (
    <div className="print-page" style={{
      width: `${paper.w}mm`,
      height: `${paper.h}mm`,
    }}>
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
              <ProblemTriple p={p} dotScale={dotScale} />
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
