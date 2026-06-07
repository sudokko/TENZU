"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// =========================================================================
// Types & constants
// =========================================================================
type Point = { c: number; r: number };
type Edge = { a: Point; b: Point };

type GridSize = 3 | 4 | 5;
type PaperKey =
  | "A4-P" | "A4-L"
  | "B4-P" | "B4-L"
  | "A3-P" | "A3-L";
type LayoutPerPage = 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12;
type PairLayout = "horizontal" | "vertical";

type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  selected: boolean;
};

const PAPER: Record<PaperKey, { label: string; w: number; h: number; landscape: boolean; cssSize: string }> = {
  "A4-P": { label: "A4 縦", w: 210, h: 297, landscape: false, cssSize: "A4 portrait" },
  "A4-L": { label: "A4 横", w: 297, h: 210, landscape: true,  cssSize: "A4 landscape" },
  "B4-P": { label: "B4 縦", w: 257, h: 364, landscape: false, cssSize: "257mm 364mm" },
  "B4-L": { label: "B4 横", w: 364, h: 257, landscape: true,  cssSize: "364mm 257mm" },
  "A3-P": { label: "A3 縦", w: 297, h: 420, landscape: false, cssSize: "A3 portrait" },
  "A3-L": { label: "A3 横", w: 420, h: 297, landscape: true,  cssSize: "A3 landscape" },
};

const PAPER_KEYS: PaperKey[] = ["A4-P", "A4-L", "B4-P", "B4-L", "A3-P", "A3-L"];

const COUNT_OPTIONS: LayoutPerPage[] = [1, 2, 3, 4, 6, 8, 10, 12];

// Max problems per page by paper family — larger paper fits more pairs legibly.
function paperMax(key: PaperKey): LayoutPerPage {
  if (key.startsWith("A4")) return 6;
  if (key.startsWith("B4")) return 10;
  return 12; // A3
}

// Pane geometry constants — arrow gap & label band as fractions of the pane.
// Shared by the optimizer and the layout code so both agree on how a pair fits.
const KGAP = 0.18; // arrow gap
const KPAD = 0.08; // breathing pad around the pair (no もんだい/かいとう labels)

// Largest square pane that fits a pair-cell of the given size, for the orientation.
// Horizontal pair: 2 panes + gap wide, 1 pane + pad tall.
// Vertical pair:   1 pane wide, 2 panes + gap + 2 pads tall.
function paneSize(cellW: number, cellH: number, pair: PairLayout): number {
  if (pair === "horizontal") {
    return Math.min(cellW / (2 + KGAP), cellH / (1 + KPAD));
  }
  return Math.min(cellW, cellH / (2 + KGAP + 2 * KPAD));
}

// Pick cols×rows for `count` pair-cells on a W×H page (mm) maximizing pane size.
// Dynamic: adapts to paper, pair orientation and count automatically. A light blank-cell
// penalty breaks near-ties toward a fuller grid. Replaces the old hardcoded table —
// "横並び→縦積み／縦並び→横並べ" now falls out of the pane-size search rather than a rule.
function gridFor(
  count: number, pair: PairLayout, W: number, H: number, margin: number,
): { cols: number; rows: number } {
  const usableW = W - margin * 2;
  const usableH = H - margin * 2;
  let best = { cols: 1, rows: count, score: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const pane = paneSize(usableW / cols, usableH / rows, pair);
    const blanks = cols * rows - count;
    const score = pane * (1 - 0.04 * (blanks / count));
    if (score > best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

const VIEW = 200;
// Soft ink color — used for all drawn dots/lines/labels in panes (printable side).
// UI chrome (toolbar buttons, etc.) stays at the original --fg.
const INK = "#3A424E";

// Block-arrow silhouette points (white fill + thin outline) within a w×h box.
function blockArrowPoints(w: number, h: number, dir: "right" | "down"): string {
  let pts: [number, number][];
  if (dir === "right") {
    const top = h * 0.32, bot = h * 0.68, hb = w * 0.55;
    pts = [
      [0, top], [hb, top], [hb, h * 0.10],
      [w, h * 0.5],
      [hb, h * 0.90], [hb, bot], [0, bot],
    ];
  } else {
    const lef = w * 0.32, rig = w * 0.68, hb = h * 0.55;
    pts = [
      [lef, 0], [lef, hb], [w * 0.10, hb],
      [w * 0.5, h],
      [w * 0.90, hb], [rig, hb], [rig, 0],
    ];
  }
  return pts.map(([px, py]) => `${px},${py}`).join(" ");
}

// Outlined block arrow — used between もんだい / かいとう
function ArrowSVG({ x, y, size, dir, color }: {
  x: number; y: number; size: number; dir: "right" | "down"; color: string;
}) {
  const w = dir === "right" ? size : size * 0.55;
  const h = dir === "right" ? size * 0.55 : size;
  const sw = Math.max(0.3, size * 0.028);
  return (
    <polygon
      points={blockArrowPoints(w, h, dir)}
      transform={`translate(${x},${y})`}
      fill="#FFFFFF" stroke={color} strokeWidth={sw}
      strokeLinejoin="round" strokeLinecap="round"
    />
  );
}

function pointKey(p: Point) { return `${p.c},${p.r}`; }
function samePoint(a: Point | null, b: Point | null) {
  return !!a && !!b && a.c === b.c && a.r === b.r;
}
function edgeKey(e: Edge) {
  const [a, b] = [e.a, e.b].sort((p, q) => p.c - q.c || p.r - q.r);
  return `${a.c},${a.r}-${b.c},${b.r}`;
}
function dotPos(c: number, r: number, dots: number) {
  if (dots <= 1) return { x: VIEW / 2, y: VIEW / 2 };
  const inset = VIEW * 0.10;
  const step = (VIEW - inset * 2) / (dots - 1);
  return { x: inset + c * step, y: inset + r * step };
}
function uid() {
  return `p_${Math.random().toString(36).slice(2, 9)}`;
}

// =========================================================================
// Paper pane SVG (used both in canvas and PDF preview)
// =========================================================================
function PaperSVG({
  gridSize,
  edges,
  selected,
  onDotClick,
  showLines,
  showActiveHighlight,
}: {
  gridSize: GridSize;
  edges: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  showLines: boolean;
  showActiveHighlight?: boolean;
}) {
  const dots = gridSize;
  const points: Point[] = [];
  for (let r = 0; r < dots; r++) {
    for (let c = 0; c < dots; c++) points.push({ c, r });
  }
  const interactive = !!onDotClick;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid meet"
      role={interactive ? "application" : "img"}
      aria-label="点描写の盤面"
    >
      {showLines &&
        edges.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={INK}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      {points.map((p) => {
        const pos = dotPos(p.c, p.r, dots);
        const isSel = samePoint(selected ?? null, p);
        const r = showActiveHighlight && isSel ? 4 : 1.6;
        const fill = showActiveHighlight && isSel ? "#2C6E7F" : INK;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />
            {interactive && (
              <circle
                cx={pos.x} cy={pos.y} r={9}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onDotClick?.(p)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// =========================================================================
// MakerApp
// =========================================================================
export default function MakerApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Point | null>(null);

  // history stack of edge arrays — index points at current state
  const historyRef = useRef<Edge[][]>([[]]);
  const histIdxRef = useRef<number>(0);
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((v) => v + 1);

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
    setSelected(null);
    rerender();
  }
  function redo() {
    if (!canRedo()) return;
    histIdxRef.current += 1;
    setEdges(historyRef.current[histIdxRef.current]);
    setSelected(null);
    rerender();
  }
  function clearAll() {
    pushHistory([]);
    setEdges([]);
    setSelected(null);
  }

  function handleDot(p: Point) {
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    if (edges.some((e) => edgeKey(e) === k)) {
      setSelected(null);
      return;
    }
    const updated = [...edges, next];
    setEdges(updated);
    pushHistory(updated);
    setSelected(null);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    setGridSize(n);
    setEdges([]);
    setSelected(null);
    historyRef.current = [[]];
    histIdxRef.current = 0;
  }

  // ---- Paper / layout state ----
  const [paperKey, setPaperKey] = useState<PaperKey>("B4-L");
  const marginMm = 14;
  const [problemsPerPage, setProblemsPerPage] = useState<LayoutPerPage>(2);
  const [pairLayout, setPairLayout] = useState<PairLayout>("horizontal");

  // Switching paper clamps per-page count to that paper's legible maximum.
  function selectPaper(k: PaperKey) {
    setPaperKey(k);
    const max = paperMax(k);
    setProblemsPerPage((p) => (p > max ? max : p));
  }

  // ---- Saved problems ----
  const [saved, setSaved] = useState<Problem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingNo, setSavingNo] = useState(1);

  function saveCurrent() {
    if (edges.length === 0) return;
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, selected: true }]);
    setSavingNo((n) => n + 1);
    // reset canvas for next problem
    setEdges([]);
    setSelected(null);
    historyRef.current = [[]];
    histIdxRef.current = 0;
  }
  function toggleSelectSaved(id: string) {
    setSaved((s) => s.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  }
  function renameSaved(id: string, name: string) {
    setSaved((s) => s.map((p) => (p.id === id ? { ...p, name } : p)));
  }
  function deleteSaved(id: string) {
    setSaved((s) => s.filter((p) => p.id !== id));
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

  // ---- Derived: print payload ----
  const selectedSaved = useMemo(() => saved.filter((p) => p.selected), [saved]);
  const pages = useMemo(() => {
    const ps: Problem[][] = [];
    for (let i = 0; i < selectedSaved.length; i += problemsPerPage) {
      ps.push(selectedSaved.slice(i, i + problemsPerPage));
    }
    return ps;
  }, [selectedSaved, problemsPerPage]);

  // ---- Print ----
  function doPrint() {
    if (selectedSaved.length === 0) return;
    if (typeof window !== "undefined") window.print();
  }

  const edgeCountLabel = `線 ${edges.length} 本`;
  const editingTitle = `問題 #${(saved.length + 1).toString().padStart(2, "0")} を作る`;

  const paper = PAPER[paperKey];

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <header className="maker-header">
        <div className="logo-cluster">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <div className="app-name">おためし点描写メーカー</div>
        </div>
        <div className="actions">
          <span className="save-state">下書き · 端末に保存</span>
          <a className="btn-weak" href="/">← LP に戻る</a>
        </div>
      </header>

      {/* ============ APP SHELL ============ */}
      <div className="app-shell">

        {/* ---------- CENTER ---------- */}
        <main className="canvas-area">
          <div className="canvas-gridbar">
            <span className="gb-label">グリッドサイズ</span>
            <div className="seg" role="group" aria-label="グリッドサイズ">
              {([3, 4, 5] as GridSize[]).map((n) => (
                <button key={n} type="button"
                  aria-pressed={gridSize === n}
                  onClick={() => changeGridSize(n)}>
                  {n}×{n}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-toolbar">
            <div className="title">
              {editingTitle}
              <span className="small">{gridSize} × {gridSize} · {paper.label}</span>
            </div>
            <div className="right">
              <span className="pos-readout">{edgeCountLabel}</span>
              <button className="iconbtn labeled" type="button" title="一つ戻る" aria-label="一つ戻る"
                onClick={undo} disabled={!canUndo()}>
                <svg viewBox="0 0 16 16">
                  <path d="M 6 4 L 3 7 L 6 10" stroke="#1A1F2A" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M 3 7 L 10 7 Q 13 7 13 10 L 13 12" stroke="#1A1F2A" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span className="lbl">戻る</span>
              </button>
              <button className="iconbtn labeled" type="button" title="一つ進める" aria-label="一つ進める"
                onClick={redo} disabled={!canRedo()}>
                <svg viewBox="0 0 16 16">
                  <path d="M 10 4 L 13 7 L 10 10" stroke="#1A1F2A" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M 13 7 L 6 7 Q 3 7 3 10 L 3 12" stroke="#1A1F2A" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span className="lbl">進む</span>
              </button>
              <button className="iconbtn labeled danger" type="button" title="全消去" aria-label="全消去"
                onClick={clearAll} disabled={edges.length === 0}>
                <svg viewBox="0 0 16 16">
                  <path d="M 2.5 4.5 L 13.5 4.5" stroke="#1A1F2A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M 6 4.5 L 6 3 L 10 3 L 10 4.5" stroke="#1A1F2A" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M 4 4.5 L 5 13.5 L 11 13.5 L 12 4.5" stroke="#1A1F2A" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M 7 7.5 L 7 11.5 M 9 7.5 L 9 11.5" stroke="#1A1F2A" strokeWidth="1.2"
                    strokeLinecap="round"/>
                </svg>
                <span className="lbl">全消去</span>
              </button>
            </div>
          </div>

          <div className="canvas-stage">
            <div className="paper-pair-label">問題</div>
            <div className="paper-pair">
              <div className="paper-pane problem" aria-label="編集中の盤面">
                <PaperSVG
                  gridSize={gridSize}
                  edges={edges}
                  selected={selected}
                  onDotClick={handleDot}
                  showLines={true}
                  showActiveHighlight={true}
                />
                <div className="pp-stamp">{gridSize}×{gridSize}</div>
              </div>
            </div>
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent} disabled={edges.length === 0}>
                この問題を保存する
              </button>
            </div>
            <div className="canvas-help">
              点をクリックして線をつないでください。印刷すると、同じ大きさの「写し用」の空欄がセットで付きます。仕上がりは「出力プレビュー」で確認できます。
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">

          <div className="group">
            <h3>保存済みの問題</h3>
            {saved.length === 0 ? (
              <p className="saved-empty">
                まだ保存された問題はありません。<br />1 問つくって「この問題を保存する」を押すと、ここに並びます。
              </p>
            ) : (
              <div className="saved-list">
                {saved.map((p, i) => {
                  const editing = editingId === p.id;
                  return (
                    <div className="saved-row" key={p.id}>
                      <span className="drag" title="ドラッグして並び替え"
                        onClick={() => moveSaved(p.id, -1)}>
                        <svg viewBox="0 0 8 14"><g fill="#767D89">
                          <circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/>
                          <circle cx="2" cy="7" r="1"/><circle cx="6" cy="7" r="1"/>
                          <circle cx="2" cy="12" r="1"/><circle cx="6" cy="12" r="1"/>
                        </g></svg>
                      </span>
                      <button className="chk" type="button"
                        role="checkbox"
                        aria-checked={p.selected}
                        aria-label="PDF に含める"
                        onClick={() => toggleSelectSaved(p.id)} />
                      <span className="num">{(i + 1).toString().padStart(2, "0")}</span>
                      {editing ? (
                        <span className="name editing">
                          <input className="name-input" type="text"
                            value={p.name}
                            autoFocus
                            onChange={(e) => renameSaved(p.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            onKeyDown={(e) => { if (e.key === "Enter") setEditingId(null); }} />
                          <small>{p.gridSize}×{p.gridSize} · {p.edges.length} 本 · 名前変更中</small>
                        </span>
                      ) : (
                        <span className="name" onDoubleClick={() => setEditingId(p.id)}>
                          {p.name}<small>{p.gridSize}×{p.gridSize} · {p.edges.length} 本</small>
                        </span>
                      )}
                      <button className="menu" type="button" aria-label="options"
                        onClick={() => {
                          if (editing) { setEditingId(null); return; }
                          if (window.confirm(`「${p.name}」を削除しますか？`)) deleteSaved(p.id);
                        }}>⋯</button>
                    </div>
                  );
                })}
              </div>
            )}
            {saved.length > 0 && (
              <div className="saved-count">
                <div className="left">
                  <button className="chk-all" type="button"
                    role="checkbox" aria-checked={selectAllState}
                    aria-label="すべて選択" onClick={toggleSelectAll} />
                  <span>選択中 {selectedSaved.length} / {saved.length} 問</span>
                </div>
              </div>
            )}
          </div>

          <div className="group">
            <h3>用紙</h3>
            <div className="paper-grid" role="group" aria-label="用紙サイズ">
              {PAPER_KEYS.map((k) => {
                const p = PAPER[k];
                return (
                  <button key={k} type="button"
                    aria-pressed={paperKey === k}
                    onClick={() => selectPaper(k)}>
                    <span className="pname">{p.label}</span>
                    <span className="pdim">{p.w}×{p.h}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="group">
            <h3>もんだいとかいとうの位置</h3>
            <div className="seg" role="group" aria-label="もんだいとかいとうの位置">
              <button type="button"
                aria-pressed={pairLayout === "horizontal"}
                onClick={() => setPairLayout("horizontal")}>
                横並び（もんだい→かいとう）
              </button>
              <button type="button"
                aria-pressed={pairLayout === "vertical"}
                onClick={() => setPairLayout("vertical")}>
                縦並び（もんだい↓かいとう）
              </button>
            </div>
          </div>

          <div className="group">
            <h3>PDF レイアウト · 1 ページに何問</h3>
            <div className="layout-grid" role="group" aria-label="1ページあたりの問題数">
              {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => {
                const g = gridFor(v, pairLayout, paper.w, paper.h, marginMm);
                return (
                <button key={v} type="button"
                  aria-pressed={problemsPerPage === v}
                  onClick={() => setProblemsPerPage(v)}>
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
            <h3>出力プレビュー</h3>
            <div className="pdf-preview">
              {selectedSaved.length === 0 ? (
                <div className="pp-empty">
                  チェックを入れた問題が、ここに並びます。
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
                        problemsPerPage={problemsPerPage}
                        pairLayout={pairLayout} />
                    ))}
                  </div>
                  <div className="pp-foot">
                    <span>合計 <strong>{selectedSaved.length} 問 / {pages.length} ページ</strong></span>
                    <span>{paper.label} · {problemsPerPage} 問 / ページ</span>
                  </div>
                </>
              )}
            </div>
            <button className="btn-export" type="button"
              onClick={doPrint} disabled={selectedSaved.length === 0}>
              PDF を書き出す
              {selectedSaved.length > 0 && (
                <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
              )}
            </button>
          </div>

          <div className="warning" data-system="warning" role="note">
            <strong>NOTE</strong>
            画面で解かせる機能はありません。<br />必ず印刷して、紙の上で練習してください。
          </div>

        </aside>
      </div>

      {/* ============ PRINT-ONLY SHEETS ============ */}
      <div className="print-only" aria-hidden="true">
        {pages.map((page, pi) => (
          <PrintPage key={pi}
            paper={paper}
            problems={page}
            startIndex={pi * problemsPerPage}
            pageNo={pi + 1}
            pageCount={pages.length}
            marginMm={marginMm}
            problemsPerPage={problemsPerPage}
            pairLayout={pairLayout} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// Sub-components: PreviewPage (sidebar PDF preview) & PrintPage (print sheet)
// =========================================================================
function ProblemPair({ p, pairLayout }: { p: Problem; pairLayout: PairLayout }) {
  const isH = pairLayout === "horizontal";
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} />
        </div>
      </div>
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <polygon points={blockArrowPoints(40, 22, "right")}
              fill="#FFFFFF" stroke={INK} strokeWidth={0.7}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <polygon points={blockArrowPoints(22, 40, "down")}
              fill="#FFFFFF" stroke={INK} strokeWidth={0.7}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} />
        </div>
      </div>
    </>
  );
}

function PreviewPage({
  paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout,
}: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: LayoutPerPage;
  pairLayout: PairLayout;
}) {
  // SVG-based mini preview matching aspect of paper
  const W = paper.w, H = paper.h;
  // Page width conveys real paper size: longest selectable side (A3 = 420mm) → full width.
  const pageScale = Math.max(W, H) / 420;
  // Use problemsPerPage (not problems.length) so pane size stays consistent across pages.
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H, marginMm);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2) / rows;
  // Pane + proportional gap/pad, derived from the same model the optimizer used.
  const pane = paneSize(cellW, cellH, pairLayout);
  const gap = pane * KGAP;
  return (
    <div className="pp-page"
      style={{ aspectRatio: `${W}/${H}`, width: `${(pageScale * 100).toFixed(1)}%` }}>
      <div className="pp-badge">{paper.label} · {W}×{H}<span className="u">mm</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        {problems.map((p, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cx = marginMm + col * cellW;
          const cy = marginMm + row * cellH;
          let aX: number, aY: number, bX: number, bY: number;
          let arrowEl: React.ReactNode;
          const aSize = gap * 0.9;
          if (pairLayout === "horizontal") {
            const pairW = pane * 2 + gap;
            const startX = (cellW - pairW) / 2;
            const startY = (cellH - pane) / 2;
            aX = startX;                  aY = startY;
            bX = startX + pane + gap;     bY = startY;
            arrowEl = (
              <ArrowSVG
                x={startX + pane + (gap - aSize) / 2}
                y={startY + pane / 2 - aSize * 0.55 / 2}
                size={aSize}
                dir="right"
                color={INK}
              />
            );
          } else {
            const pairH = pane * 2 + gap;
            const startX = (cellW - pane) / 2;
            const startY = (cellH - pairH) / 2;
            aX = startX; aY = startY;
            bX = startX; bY = startY + pane + gap;
            arrowEl = (
              <ArrowSVG
                x={startX + pane / 2 - aSize * 0.55 / 2}
                y={startY + pane + (gap - aSize) / 2}
                size={aSize}
                dir="down"
                color={INK}
              />
            );
          }
          return (
            <g key={p.id} transform={`translate(${cx},${cy})`}>
              <PreviewPane x={aX} y={aY} w={pane} h={pane}
                gridSize={p.gridSize} edges={p.edges} showLines={true} />
              <PreviewPane x={bX} y={bY} w={pane} h={pane}
                gridSize={p.gridSize} edges={[]} showLines={false} />
              {arrowEl}
            </g>
          );
        })}
      </svg>
      <div className="pageno">P {pageNo} / {pageCount}</div>
    </div>
  );
}

function PreviewPane({
  x, y, w, h, gridSize, edges, showLines,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: GridSize; edges: Edge[]; showLines: boolean;
}) {
  // inner dots
  const dots = gridSize;
  const inset = Math.min(w, h) * 0.12;
  const stepX = (w - inset * 2) / (dots - 1);
  const stepY = (h - inset * 2) / (dots - 1);
  // Size dots/lines relative to the pane so they stay legible at any preview scale.
  const dotR = Math.max(0.7, Math.min(w, h) * 0.035);
  const lineW = Math.max(0.5, Math.min(w, h) * 0.022);
  const pos = (c: number, r: number) => ({
    x: x + inset + c * stepX,
    y: y + inset + r * stepY,
  });
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke="#E5E3DC" strokeWidth={0.3} />
      <g fill={INK}>
        {Array.from({ length: dots }, (_, r) =>
          Array.from({ length: dots }, (_, c) => {
            const p = pos(c, r);
            return <circle key={`${c}-${r}`} cx={p.x} cy={p.y} r={dotR} />;
          })
        )}
      </g>
      {showLines && edges.map((e, i) => {
        const a = pos(e.a.c, e.a.r);
        const b = pos(e.b.c, e.b.r);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={INK} strokeWidth={lineW}
          strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
  );
}

function PrintPage({
  paper, problems, startIndex, pageNo, pageCount, marginMm, problemsPerPage, pairLayout,
}: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  startIndex: number;
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: LayoutPerPage;
  pairLayout: PairLayout;
}) {
  const layout = gridFor(problemsPerPage, pairLayout, paper.w, paper.h, marginMm);
  // Gaps & arrow shrink as the page gets denser (gap比例化, print side).
  const dense = problemsPerPage <= 4 ? "8mm" : problemsPerPage <= 8 ? "5mm" : "3mm";
  const arrowScale = problemsPerPage <= 4 ? 1 : problemsPerPage <= 8 ? 0.7 : 0.5;
  return (
    <div className="print-page" style={{
      width: `${paper.w}mm`,
      height: `${paper.h}mm`,
    }}>
      <div className="print-page-inner">
        <div className="print-grid" style={{
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows:    `repeat(${layout.rows}, auto)`,
          gap: dense,
          ["--pgap" as string]: dense,
          ["--pscale" as string]: arrowScale,
        }}>
          {problems.map((p, idx) => (
            <div key={p.id} className={`print-problem pair-${pairLayout}`}>
              <div className="pheader">
                {(startIndex + idx + 1).toString().padStart(2, "0")} · {p.name}
                <span className="ptag">{p.gridSize}×{p.gridSize}</span>
              </div>
              <ProblemPair p={p} pairLayout={pairLayout} />
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
