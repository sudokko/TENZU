"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax,
  type PaperKey, type LayoutPerPage, type PairLayout, type DotSize,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import {
  buildSolidPageSvg,
  type LineStyle,
} from "./solid-print";
import { SolidPaperSVG, editorVB, type Point, type Edge } from "./SolidPaperSVG";
import { ModeToggle } from "../maker/erase";
import { useAuth } from "../AuthContext";
import { ownsMaker } from "../products/capabilities";
import { buyMaker } from "../maker/buyMaker";
import { samePoint, uid } from "../maker/core/geometry";
import { exportPdf } from "../maker/core/pdf-export";
import { DotSizeSeg, EditActions, MakerHeader, OneStrokeSeg } from "../maker/core/chrome";

// =========================================================================
// 立体模写メーカー（自由線エディタ・買い切り ¥980）
// 模写メーカーの「点クリック→任意方向の線分」描画機構をフォークし、
//   ① 横長の矩形点格子（cols×rows・点間隔は縦横で等しく＝セルは正方形）
//   ② 実線＝見える辺 / 点線＝隠れ辺
// を足したもの。AI 生成を捨て、四角すい・八角柱・切り欠き立方体などの
// 立体作品を手描きするためのツール。PDF 書き出しは所有ゲート（capabilities "solid"）。
// =========================================================================
type SolidWork = {
  id: string;
  title: string;
  cols: number;         // 横の点数
  rows: number;         // 縦の点数
  edges: Edge[];
  selected: boolean;    // PDF に含めるか
};

// 横長の盤面。横（cols）と縦（rows）を別々に選ぶ。横・縦とも 7〜15 を 1 刻み。
// 横は左右対称の立体を中心に置きやすいよう奇数推し（既定 7×7）。
const COLS_SIZES = [7, 8, 9, 10, 11, 12, 13, 14, 15];
const ROWS_SIZES = [7, 8, 9, 10, 11, 12, 13, 14, 15];
const DEFAULT_COLS = 7;
const DEFAULT_ROWS = 7;
const STORE_KEY = "tenzu_solid_works";
// 立体は格子が密なので、模写の点サイズ階調（DOT_SCALE 1/1.8/2.8）より一段小さい独自階調。
// 小＝もう一周り小さい新サイズ・中＝既定（r=1.6）・大＝中よりほんのり大きい程度（開きすぎ回避）。
const SOLID_DOT_SCALE: Record<DotSize, number> = { s: 0.6, m: 1.0, l: 1.3 };

// samePoint/uid は共通（maker/core/geometry）を流用。edgeKey/edgesEqual は
// solid の Edge が style を持つ独自型のためスタイル比較込みでここに残す。
function edgeKey(e: Edge) {
  const [a, b] = [e.a, e.b].sort((p, q) => p.c - q.c || p.r - q.r);
  return `${a.c},${a.r}-${b.c},${b.r}`;
}
function edgesEqual(a: Edge[], b: Edge[]) {
  if (a.length !== b.length) return false;
  const ka = new Map(a.map((e) => [edgeKey(e), e.style]));
  return b.every((e) => ka.get(edgeKey(e)) === e.style);
}

// =========================================================================
// MakerSolidApp
// =========================================================================
export default function MakerSolidApp() {
  useEffect(() => {
    document.body.classList.add("maker-page", "maker-solid");
    return () => document.body.classList.remove("maker-page", "maker-solid");
  }, []);

  // 所有判定（PDF 書き出しは買い切り ¥980 のゲート・他 9 メーカーと同じ）
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "solid");

  // ---- 作図中の状態 ----
  const [cols, setCols] = useState<number>(DEFAULT_COLS);
  const [rows, setRows] = useState<number>(DEFAULT_ROWS);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Point | null>(null);
  const [drawStyle, setDrawStyle] = useState<LineStyle>("solid");
  const [oneStroke, setOneStroke] = useState(true);
  const [tool, setTool] = useState<"draw" | "erase">("draw"); // 描く / 消す（消しゴム）
  function changeTool(t: "draw" | "erase") { setTool(t); setSelected(null); }
  // 線スタイルを切り替えたら作図中の選択点も解除（引きかけの線が別スタイルへ流れないように）
  function changeDrawStyle(s: LineStyle) { setDrawStyle(s); setSelected(null); }
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;

  // history stack
  const historyRef = useRef<Edge[][]>([[]]);
  const histIdxRef = useRef<number>(0);
  const [, force] = useState(0);
  const rerender = () => force((v) => v + 1);
  function pushHistory(next: Edge[]) {
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(next);
    histIdxRef.current = historyRef.current.length - 1;
  }
  function canUndo() { return histIdxRef.current > 0; }
  function canRedo() { return histIdxRef.current < historyRef.current.length - 1; }
  function undo() {
    if (!canUndo()) return;
    histIdxRef.current -= 1;
    setEdges(historyRef.current[histIdxRef.current]);
    setSelected(null); rerender();
  }
  function redo() {
    if (!canRedo()) return;
    histIdxRef.current += 1;
    setEdges(historyRef.current[histIdxRef.current]);
    setSelected(null); rerender();
  }
  function clearAll() { pushHistory([]); setEdges([]); setSelected(null); }

  function handleDot(p: Point) {
    if (tool === "erase") return; // 消すモードでは点クリックでは描かない
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p, style: drawStyle };
    const k = edgeKey(next);
    const after = oneStroke ? p : null;
    const existing = edges.findIndex((e) => edgeKey(e) === k);
    if (existing >= 0) {
      // 既存の辺を引き直したら、その辺のスタイルを現モードに更新（隠れ線への付け替えが直感的）
      if (edges[existing].style !== drawStyle) {
        const updated = edges.map((e, i) => (i === existing ? { ...e, style: drawStyle } : e));
        setEdges(updated); pushHistory(updated);
      }
      setSelected(after);
      return;
    }
    const updated = [...edges, next];
    setEdges(updated); pushHistory(updated); setSelected(after);
  }

  // 既存の辺をクリック。消す＝削除 / 描く＝実線⇔点線を反転。
  function onEdgeClick(i: number) {
    if (tool === "erase") {
      const updated = edges.filter((_, idx) => idx !== i);
      setEdges(updated); pushHistory(updated);
      return;
    }
    const updated = edges.map((e, idx) =>
      idx === i ? { ...e, style: e.style === "dashed" ? "solid" as const : "dashed" as const } : e);
    setEdges(updated); pushHistory(updated);
  }

  function changeDims(nextCols: number, nextRows: number) {
    if ((nextCols === cols && nextRows === rows) || isEditing) return;
    setCols(nextCols); setRows(nextRows);
    setEdges([]); setSelected(null);
    historyRef.current = [[]]; histIdxRef.current = 0;
  }

  // ---- 用紙 / レイアウト ----
  const [paperKey, setPaperKey] = useState<PaperKey>("A4-L"); // 立体は横長が自然
  const marginMm = 14;
  const [perPage, setPerPage] = useState<"auto" | LayoutPerPage>("auto");
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto");
  const [nameField, setNameField] = useState(false);
  const [dotSize, setDotSize] = useState<DotSize>("m"); // 模写メーカーと同じ既定（中）
  const dotScale = SOLID_DOT_SCALE[dotSize];
  // 背景の点をとる（白紙模写形式）。みほん・かくマスの点格子を消し、かくマス側に薄い矩形枠を残す。
  const [noDots, setNoDots] = useState(false);
  function selectPaper(k: PaperKey) {
    setPaperKey(k);
    const max = paperMax(k);
    setPerPage((p) => (p !== "auto" && p > max ? max : p));
  }

  // ---- 保存済み作品（localStorage 永続） ----
  const [works, setWorks] = useState<SolidWork[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.works)) {
          // 旧形式（正方形 n）→ 矩形（cols/rows）へ移行
          const migrated: SolidWork[] = parsed.works.map((w: SolidWork & { n?: number }) => ({
            ...w,
            cols: w.cols ?? w.n ?? DEFAULT_COLS,
            rows: w.rows ?? w.n ?? DEFAULT_ROWS,
          }));
          setWorks(migrated);
        }
      }
    } catch { /* 壊れた値は無視 */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, works })); }
    catch { /* quota 無視 */ }
  }, [works, hydrated]);

  function resetCanvas() {
    setEdges([]); setSelected(null);
    historyRef.current = [[]]; histIdxRef.current = 0;
  }
  function saveCurrent() {
    if (edges.length === 0) return;
    if (editingId) {
      setWorks((s) => s.map((w) => (w.id === editingId ? { ...w, cols, rows, edges } : w)));
      setEditingId(null); resetCanvas();
      return;
    }
    const id = uid("s_");
    const title = `無題 ${(works.length + 1).toString().padStart(2, "0")}`;
    setWorks((s) => [...s, { id, title, cols, rows, edges, selected: true }]);
    resetCanvas();
  }
  function startEdit(id: string) {
    if (id === editingId) return;
    const w = works.find((x) => x.id === id);
    if (!w) return;
    const dirty = editingId
      ? (() => { const o = works.find((x) => x.id === editingId); return !o || !edgesEqual(edges, o.edges); })()
      : edges.length > 0;
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の作品を編集しますか？"
      : "作りかけの作品があります。破棄して編集しますか？")) return;
    setCols(w.cols); setRows(w.rows); setEdges(w.edges); setSelected(null);
    historyRef.current = [w.edges]; histIdxRef.current = 0;
    setEditingId(id); rerender();
  }
  function cancelEdit() { setEditingId(null); resetCanvas(); }
  function toggleSelectWork(id: string) {
    setWorks((s) => s.map((w) => (w.id === id ? { ...w, selected: !w.selected } : w)));
  }
  function deleteWork(id: string) {
    setWorks((s) => s.filter((w) => w.id !== id));
    if (id === editingId) cancelEdit();
  }
  function moveWork(id: string, dir: -1 | 1) {
    setWorks((s) => {
      const i = s.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = s.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function toggleSelectAll() {
    const allSel = works.length > 0 && works.every((w) => w.selected);
    setWorks((s) => s.map((w) => ({ ...w, selected: !allSel })));
  }
  const selectAllState: "true" | "false" | "mixed" = useMemo(() => {
    if (works.length === 0) return "false";
    const sel = works.filter((w) => w.selected).length;
    if (sel === 0) return "false";
    if (sel === works.length) return "true";
    return "mixed";
  }, [works]);

  // ---- 出力ペイロード ----
  const selectedWorks = useMemo(() => works.filter((w) => w.selected), [works]);
  const perPageCap = paperMax(paperKey);
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(perPageCap, selectedWorks.length))
    : Math.min(perPage, perPageCap);
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedWorks.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = useMemo(() => {
    const ps: SolidWork[][] = [];
    for (let i = 0; i < selectedWorks.length; i += effectivePerPage) {
      ps.push(selectedWorks.slice(i, i + effectivePerPage));
    }
    return ps;
  }, [selectedWorks, effectivePerPage]);

  const paper = PAPER[paperKey];

  // プレビュー＝出力（同じ buildSolidPageSvg 文字列を使う・ロゴは省略）
  function pageSvg(page: SolidWork[], pageNo: number, pageCount: number) {
    return buildSolidPageSvg({
      paper, problems: page.map((w) => ({ cols: w.cols, rows: w.rows, edges: w.edges })),
      pageNo, pageCount, marginMm, problemsPerPage: effectivePerPage,
      pairLayout: effectivePairLayout, nameField, dotScale, logo: null, noDots,
    });
  }

  // ---- PDF ----
  const [exporting, setExporting] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  async function doExport() {
    if (selectedWorks.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("solid").catch(() => {}); return; }
    setExporting(true); setDoneMsg(null);
    try {
      await exportPdf({
        paper,
        pageCount: pages.length,
        buildPage: (pi, logo) => buildSolidPageSvg({
          paper, problems: pages[pi].map((w) => ({ cols: w.cols, rows: w.rows, edges: w.edges })),
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout,
          nameField, dotScale, logo, noDots,
        }),
        filename: (stamp) => `tenzu_solid_${stamp}.pdf`,
      });
      setDoneMsg(`PDF をダウンロードしました（${selectedWorks.length} 問 / ${pages.length} ページ）`);
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  const editingNo = isEditing ? works.findIndex((w) => w.id === editingId) + 1 : 0;
  const editingTitle = isEditing
    ? `作品 #${String(editingNo).padStart(2, "0")} を編集中`
    : `作品 #${(works.length + 1).toString().padStart(2, "0")} を作る`;

  return (
    <>
      <MakerHeader appName="立体模写メーカー">
        <div className="maker-auth">
          <a className="ma-link" href="/maker">模写メーカー</a>
          <a className="ma-cta" href="/maker-index">メーカー一覧</a>
        </div>
      </MakerHeader>

      <div className="app-shell">
        {/* ---------- CENTER ---------- */}
        <main className="canvas-area">
          <div className={`canvas-toolbar${isEditing ? " editing" : ""}`}>
            <div className="title">{editingTitle}</div>
          </div>

          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド（横×縦）</span>
              <select className="qb-select" aria-label="横の点数"
                value={cols} disabled={isEditing}
                onChange={(e) => changeDims(Number(e.target.value), rows)}>
                {COLS_SIZES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <span className="qb-x" aria-hidden="true">×</span>
              <select className="qb-select" aria-label="縦の点数"
                value={rows} disabled={isEditing}
                onChange={(e) => changeDims(cols, Number(e.target.value))}>
                {ROWS_SIZES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <ModeToggle erase={tool === "erase"} onChange={(v) => changeTool(v ? "erase" : "draw")} />
            <div className="qb-group">
              <span className="qb-label">線</span>
              <div className="seg qb-seg linestyle" role="group" aria-label="線のスタイル">
                <button type="button" aria-pressed={drawStyle === "solid"} disabled={tool === "erase"}
                  onClick={() => changeDrawStyle("solid")}>実線</button>
                <button type="button" aria-pressed={drawStyle === "dashed"} disabled={tool === "erase"}
                  onClick={() => changeDrawStyle("dashed")}>点線</button>
              </div>
            </div>
            <DotSizeSeg value={dotSize} onChange={setDotSize} />
            <OneStrokeSeg value={oneStroke} onChange={setOneStroke} />
            <span className="qb-note">
              {tool === "erase"
                ? "消すモード：線をクリックすると、その線だけ消えます。点では描けません。"
                : isEditing
                  ? "編集中はグリッドは固定されます。"
                  : drawStyle === "dashed"
                    ? "点線モード：かくれた辺（うしろの線）を引きます。"
                    : "実線＝見える辺／点線＝かくれた辺。描いた線をクリックすると実線⇔点線が入れ替わります。"}
            </span>
          </div>

          <div className="canvas-stage">
            <EditActions
              onUndo={undo} onRedo={redo} onClear={clearAll}
              canUndo={canUndo()} canRedo={canRedo()} canClear={edges.length > 0} />
            <div className="paper-pair">
              <div className="paper-pane problem" aria-label="編集中の盤面"
                style={{ aspectRatio: `${editorVB(cols, rows).vw} / ${editorVB(cols, rows).vh}` }}>
                <SolidPaperSVG
                  cols={cols} rows={rows} edges={edges} selected={selected} tool={tool}
                  onDotClick={handleDot} onEdgeClick={onEdgeClick}
                  showLines interactive dotScale={dotScale}
                />
                <div className="pp-stamp">{cols}×{rows}</div>
              </div>
            </div>
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent}
                disabled={edges.length === 0}>
                {isEditing ? "変更を保存" : "この作品を保存する"}
              </button>
              {isEditing && (
                <button className="btn-cancel-edit" type="button" onClick={cancelEdit}>やめる</button>
              )}
            </div>
            <div className="canvas-help">
              {tool === "erase"
                ? "消すモードです。消したい線をクリックしてください（線にカーソルを合わせると赤くなります）。「描く」に戻すと、また線を引けます。"
                : isEditing
                  ? "保存済みの作品を編集中です。線を直して「変更を保存」を押すと上書きされます（並び順とPDF選択はそのまま）。"
                  : "点をクリックして線をつなぎます。実線で見える辺を、点線でかくれた辺を描きましょう。線を消すときは「消す」モードへ。印刷時は同じ大きさの書き込み用の空欄がセットで付きます。"}
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">
          <div className="group">
            <h3>保存済みの作品</h3>
            {works.length === 0 ? (
              <p className="saved-empty">
                まだ保存された作品はありません。<br />1 つ作って「この作品を保存する」を押すと、ここに並びます。
              </p>
            ) : (
              <div className="saved-grid">
                {works.map((w, i) => {
                  const num = (i + 1).toString().padStart(2, "0");
                  const beingEdited = editingId === w.id;
                  return (
                    <div className={`saved-cell${w.selected ? " sel" : ""}${beingEdited ? " editing" : ""}`} key={w.id}>
                      <button className="thumb" type="button" role="checkbox" aria-checked={w.selected}
                        aria-label={`作品 ${num} を PDF に含める`} onClick={() => toggleSelectWork(w.id)}>
                        <SolidPaperSVG cols={w.cols} rows={w.rows} edges={w.edges} showLines />
                      </button>
                      {w.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                      {beingEdited && <span className="edit-mark" aria-hidden="true">編集中</span>}
                      <span className="cnum">{num}</span>
                      <div className="cell-actions">
                        <button className="act-edit" type="button" aria-label={`作品 ${num} を編集`}
                          aria-pressed={beingEdited} onClick={() => startEdit(w.id)}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M10.5 2.5 L13.5 5.5 L5.5 13.5 L2.5 13.5 L2.5 10.5 Z"
                              fill="none" stroke="currentColor" strokeWidth="1.4"
                              strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                          <span className="lbl">{beingEdited ? "編集中" : "編集"}</span>
                        </button>
                        <button className="act-del" type="button" aria-label={`作品 ${num} を削除`}
                          onClick={() => { if (window.confirm(`この作品（#${num}）を削除しますか？`)) deleteWork(w.id); }}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M 2.5 4.5 L 13.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 6 4.5 L 6 3 L 10 3 L 10 4.5" stroke="currentColor" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <path d="M 4 4.5 L 5 13.5 L 11 13.5 L 12 4.5" stroke="currentColor" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                      </div>
                      <div className="order">
                        <button type="button" aria-label="ひとつ前へ" disabled={i === 0}
                          onClick={() => moveWork(w.id, -1)}>‹</button>
                        <button type="button" aria-label="ひとつ後へ" disabled={i === works.length - 1}
                          onClick={() => moveWork(w.id, 1)}>›</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {works.length > 0 && (
              <div className="saved-count">
                <div className="left">
                  <button className="chk-all" type="button" role="checkbox" aria-checked={selectAllState}
                    aria-label="すべて選択" onClick={toggleSelectAll} />
                  <span>選択中 {selectedWorks.length} / {works.length} 作品</span>
                </div>
              </div>
            )}
          </div>

          <details className="settings-fold">
            <summary>
              <span className="sf-label">詳細設定<span className="sf-chevron" aria-hidden="true" /></span>
              <span className="sf-current">
                用紙: {paper.label} · 問数: {perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 並び: {pairLayout === "auto" ? "おまかせ" : pairLayout === "horizontal" ? "横" : "上下"} · 名前欄: {nameField ? "あり" : "なし"} · 背景の点: {noDots ? "なし" : "あり"}
              </span>
            </summary>
            <div className="sf-body">
              <div className="group">
                <h3>用紙</h3>
                <div className="paper-grid" role="group" aria-label="用紙サイズ">
                  {PAPER_KEYS.map((k) => {
                    const p = PAPER[k];
                    return (
                      <button key={k} type="button" aria-pressed={paperKey === k}
                        onClick={() => selectPaper(k)}>
                        <span className="pname">{p.label}</span>
                        <span className="pdim">{p.w}×{p.h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="group">
                <h3>1 ページに何問</h3>
                <div className="layout-grid" role="group" aria-label="1ページあたりの問題数">
                  <button type="button" aria-pressed={perPage === "auto"} onClick={() => setPerPage("auto")}>
                    <span className="lauto">おまかせ</span>
                  </button>
                  {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => (
                    <button key={v} type="button" aria-pressed={perPage === v} onClick={() => setPerPage(v)}>
                      <span className="lnum">{v} 問</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="group">
                <h3>問題と書き込み欄の並び</h3>
                <div className="seg seg--pair" role="group" aria-label="問題と書き込み欄の並び">
                  <button type="button" aria-pressed={pairLayout === "auto"} onClick={() => setPairLayout("auto")}>おまかせ</button>
                  <button type="button" aria-pressed={pairLayout === "horizontal"} onClick={() => setPairLayout("horizontal")}>
                    <span className="seg-ic"><PairChipIcon pair="horizontal" /></span>横に並べる
                  </button>
                  <button type="button" aria-pressed={pairLayout === "vertical"} onClick={() => setPairLayout("vertical")}>
                    <span className="seg-ic"><PairChipIcon pair="vertical" /></span>上下に並べる
                  </button>
                </div>
              </div>
              <div className="group">
                <h3>名前・日付の記入欄</h3>
                <div className="seg" role="group" aria-label="名前・日付の記入欄">
                  <button type="button" aria-pressed={!nameField} onClick={() => setNameField(false)}>つけない</button>
                  <button type="button" aria-pressed={nameField} onClick={() => setNameField(true)}>つける</button>
                </div>
              </div>
              <div className="group">
                <h3>背景の点</h3>
                <label className="chk-row">
                  <input type="checkbox" checked={noDots}
                    onChange={(e) => setNoDots(e.target.checked)} />
                  <span>背景の点をとる</span>
                </label>
                <p className="seg-hint">
                  見本・書き込み欄の格子の点を消します。書き込み欄には薄い枠だけが残ります（点線＝かくれた辺は残ります）。
                </p>
              </div>
            </div>
          </details>

          <div className="group">
            <h3>出力プレビュー<span className="pp-paperinfo">{paper.label} · {paper.w}×{paper.h}mm</span></h3>
            <div className="pdf-preview">
              {selectedWorks.length === 0 ? (
                <div className="pp-empty">選択した作品が、ここに並びます。</div>
              ) : (
                <>
                  <div className="pp-pages">
                    {pages.map((page, pi) => (
                      <div key={pi} className="pp-page"
                        style={{ aspectRatio: `${paper.w}/${paper.h}`, width: `${(Math.max(paper.w, paper.h) / 420 * 100).toFixed(1)}%` }}
                        dangerouslySetInnerHTML={{ __html: pageSvg(page, pi + 1, pages.length) }} />
                    ))}
                  </div>
                  <div className="pp-foot">
                    <span>合計 <strong>{selectedWorks.length} 問 / {pages.length} ページ</strong></span>
                    <span>{paper.label} · {effectivePerPage} 問 / ページ</span>
                  </div>
                </>
              )}
            </div>
            {doneMsg && <p className="solid-done">{doneMsg}</p>}
            <button className="btn-export" type="button" onClick={doExport}
              disabled={selectedWorks.length === 0 || exporting}>
              {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
              {!exporting && selectedWorks.length > 0 && (
                <span className="x">{selectedWorks.length} 問 / {pages.length} ページ</span>
              )}
            </button>
          </div>

          <div className="warning" data-system="warning" role="note">
            <strong>NOTE</strong>
            作った作品はこのブラウザにのみ保存されます。PDF の書き出しは買い切り（¥980）で解放されます。
          </div>
        </aside>
      </div>

      {selectedWorks.length > 0 && (
        <div className="mobile-export-bar">
          <button type="button" onClick={doExport} disabled={exporting}>
            {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
            {!exporting && <span className="x">{selectedWorks.length} 問 / {pages.length} ページ</span>}
          </button>
        </div>
      )}
    </>
  );
}
