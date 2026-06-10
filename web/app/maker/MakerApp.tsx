"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  taskBySlug, volHref, LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL, type Vol,
} from "../products/data";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, paneSize, gridFor, blockArrowPoints,
  KGAP, type PaperKey, type LayoutPerPage, type PairLayout,
} from "../products/print";

// =========================================================================
// Types & constants
// レイアウトエンジン（PAPER/gridFor/paneSize 等）は products/print.ts（SSOT）から import
// =========================================================================
type Point = { c: number; r: number };
type Edge = { a: Point; b: Point };

type GridSize = 3 | 4 | 5;

type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  selected: boolean;
};

const VIEW = 200;
// Soft ink color — used for all drawn dots/lines/labels in panes (printable side).
// UI chrome (toolbar buttons, etc.) stays at the original --fg.
const INK = "#3A424E";

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
// 完了画面レコメンド — 模写（図形）8段ラダー（products/data.ts SSOT）から
// 「作った問題と同じグリッドの最初の Vol」を起点に連続3冊を引く。
// 3×3 のみ斜め有無で起点が分岐（#1 直線のみ / #2 ななめ導入）。
// =========================================================================
const COPY_TASK = taskBySlug("copy")!;

function recommendVols(maxGrid: GridSize, usedDiag: boolean): Vol[] {
  const vols = COPY_TASK.vols; // data.ts の並び＝ラダー順
  let start = vols.findIndex((x) => x.grid === `${maxGrid}×${maxGrid}`);
  if (start < 0) start = 0;
  if (maxGrid === 3 && usedDiag) start = 1;
  start = Math.min(start, vols.length - 3);
  return vols.slice(start, start + 3);
}

function hasDiagonal(problems: Problem[]): boolean {
  return problems.some((p) =>
    p.edges.some((e) => e.a.c !== e.b.c && e.a.r !== e.b.r));
}

// =========================================================================
// PDF 生成 — jsPDF ＋ ページ SVG → 300dpi PNG 焼き込み。
// window.print() はスマホで使いものにならないため、ファイルとして
// ダウンロードさせる（コンビニ印刷・プリンタアプリにもそのまま渡せる）。
// レイアウトは印刷系と同じ gridFor / paneSize / KGAP を共有。
// =========================================================================
const PX_PER_MM = 300 / 25.4; // 300dpi

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] as string));
}

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
function paneSvgString(
  x: number, y: number, pane: number, gridSize: GridSize, edges: Edge[], showLines: boolean,
): string {
  const inset = pane * 0.10;
  const step = (pane - inset * 2) / (gridSize - 1);
  const P = (c: number, r: number) => ({ x: x + inset + c * step, y: y + inset + r * step });
  const dotR = Math.max(0.45, pane * 0.008);
  const lineW = Math.max(0.4, pane * 0.008);
  let s = `<rect x="${x}" y="${y}" width="${pane}" height="${pane}" fill="#FFFFFF" stroke="#999999" stroke-width="0.2"/>`;
  if (showLines) {
    for (const e of edges) {
      const a = P(e.a.c, e.a.r), b = P(e.b.c, e.b.r);
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${INK}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const p = P(c, r);
      s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${INK}"/>`;
    }
  }
  return s;
}

type LogoInfo = { url: string; w: number; h: number };

function buildPageSvg(opts: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  startIndex: number;
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: LayoutPerPage;
  pairLayout: PairLayout;
  logo: LogoInfo | null;
}): string {
  const { paper, problems, startIndex, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, logo } = opts;
  const W = paper.w, H = paper.h;
  const footerH = 12;   // フッター帯（ロゴ＋ページ番号）
  const headerBand = 7; // 各問題の見出し行
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - footerH, marginMm);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - footerH) / rows;
  const pane = paneSize(cellW, cellH - headerBand, pairLayout);
  const gap = pane * KGAP;
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";

  let body = "";
  problems.forEach((p, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = marginMm + col * cellW;
    const cy = marginMm + row * cellH;
    const num = (startIndex + idx + 1).toString().padStart(2, "0");
    body += `<text x="${cx + 1}" y="${cy + 4.6}" font-family="${jpFont}" font-size="3.6" fill="${INK}">${num} · ${escapeXml(p.name)}<tspan dx="3" font-size="2.6" fill="#777777">${p.gridSize}×${p.gridSize}</tspan></text>`;

    const areaY = cy + headerBand;
    const areaH = cellH - headerBand;
    const aSize = gap * 0.9;
    if (pairLayout === "horizontal") {
      const pairW = pane * 2 + gap;
      const sx = cx + (cellW - pairW) / 2;
      const sy = areaY + (areaH - pane) / 2;
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true);
      body += paneSvgString(sx + pane + gap, sy, pane, p.gridSize, [], false);
      const ah = aSize * 0.55;
      body += `<g transform="translate(${sx + pane + (gap - aSize) / 2},${sy + pane / 2 - ah / 2})"><polygon points="${blockArrowPoints(aSize, ah, "right")}" fill="#FFFFFF" stroke="${INK}" stroke-width="0.25" stroke-linejoin="round" stroke-linecap="round"/></g>`;
    } else {
      const pairH = pane * 2 + gap;
      const sx = cx + (cellW - pane) / 2;
      const sy = areaY + (areaH - pairH) / 2;
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true);
      body += paneSvgString(sx, sy + pane + gap, pane, p.gridSize, [], false);
      const aw = aSize * 0.55;
      body += `<g transform="translate(${sx + pane / 2 - aw / 2},${sy + pane + (gap - aSize) / 2})"><polygon points="${blockArrowPoints(aw, aSize, "down")}" fill="#FFFFFF" stroke="${INK}" stroke-width="0.25" stroke-linejoin="round" stroke-linecap="round"/></g>`;
    }
  });

  // フッター: ロゴ（左）＋ ページ番号（右）
  const fy = H - marginMm - 6.5;
  let footer = "";
  if (logo) {
    const lw = 6.5 * (logo.w / logo.h);
    footer += `<image href="${logo.url}" x="${marginMm}" y="${fy}" width="${lw}" height="6.5"/>`;
  }
  footer += `<text x="${W - marginMm}" y="${fy + 5}" text-anchor="end" font-family="${jpFont}" font-size="2.8" fill="#888888" letter-spacing="0.3">P ${pageNo} / ${pageCount}</text>`;

  const pxW = Math.round(W * PX_PER_MM);
  const pxH = Math.round(H * PX_PER_MM);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${pxW}" height="${pxH}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${body}${footer}</svg>`;
}

function svgToPng(svg: string, wMm: number, hMm: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(wMm * PX_PER_MM);
      canvas.height = Math.round(hMm * PX_PER_MM);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function loadLogo(): Promise<LogoInfo | null> {
  try {
    const res = await fetch("/assets/logo-horizontal.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = await new Promise<string>((ok) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result as string);
      fr.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; });
    return { url, w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null; // ロゴが読めなくても PDF 生成は続行
  }
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

  // ---- PDF ダウンロード → 完了画面 ----
  const [done, setDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  async function doExport() {
    if (selectedSaved.length === 0 || exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const logo = await loadLogo();
      const orientation = paper.landscape ? "landscape" : "portrait";
      const format: [number, number] = [Math.min(paper.w, paper.h), Math.max(paper.w, paper.h)];
      const doc = new jsPDF({ orientation, unit: "mm", format });
      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) doc.addPage(format, orientation);
        const svg = buildPageSvg({
          paper, problems: pages[pi], startIndex: pi * problemsPerPage,
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage, pairLayout, logo,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      doc.save("tenzu-otameshi-tenbyosha.pdf");
      setDone(true);
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  // 書き出した問題から「最大グリッド」と「斜め線の使用」を判定
  const reco = useMemo(() => {
    if (selectedSaved.length === 0) return null;
    const maxGrid = Math.max(...selectedSaved.map((p) => p.gridSize)) as GridSize;
    const usedDiag = hasDiagonal(selectedSaved);
    return { maxGrid, usedDiag, vols: recommendVols(maxGrid, usedDiag) };
  }, [selectedSaved]);

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

      {/* ============ DONE SCREEN ============ */}
      {done && reco ? (
        <DoneScreen reco={reco} count={selectedSaved.length} onBack={() => setDone(false)} />
      ) : (
      <>
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
              onClick={doExport} disabled={selectedSaved.length === 0 || exporting}>
              {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
              {!exporting && selectedSaved.length > 0 && (
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
      </>
      )}

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
// DoneScreen — PDF 書き出し後の完了画面（案A・動的レコメンド）
// funnel §14: サンクスページが広告回収の勝負所。「次の3冊」へつなぐ。
// =========================================================================
function DotThumb({ grid }: { grid: string }) {
  const n = parseInt(grid, 10) || 3;
  const inset = 10;
  const step = (72 - inset * 2) / (n - 1);
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      dots.push(
        <circle key={`${c}-${r}`}
          cx={inset + c * step} cy={inset + r * step}
          r={n <= 4 ? 2.4 : 2} fill={INK} />,
      );
    }
  }
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={`${grid} の点のならび`}>
      {dots}
    </svg>
  );
}

const DONE_STARS = ["★ 同じ細かさで", "つぎの一歩", "そのさき"];

function doneMemo(maxGrid: GridSize, usedDiag: boolean): string {
  if (maxGrid === 3 && !usedDiag) {
    return "まっすぐの線がすらすら書けていたら、つぎは「ななめ」が壁になります。同じ3×3のまま、ななめ線だけが加わる一冊を下に置いておきますね。";
  }
  if (maxGrid >= 5) {
    return "5×5がちょうどよければ、もう点描写の標準サイズです。ここから先は、角度が自由になったり、マスが6×6に広がったり。このメーカーでは作れない世界が続きます。";
  }
  return "いま作った問題が「ちょうどいい」と感じたら、その手ごたえがいちばんの目安です。同じ細かさから始められる一冊を、下に置いておきますね。";
}

function DoneScreen({
  reco, count, onBack,
}: {
  reco: { maxGrid: GridSize; usedDiag: boolean; vols: Vol[] };
  count: number;
  onBack: () => void;
}) {
  return (
    <main className="maker-done">
      <div className="done-inner">

        <span className="done-check">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="#2C6E7F" strokeWidth="1.5" />
            <path d="M4.8 8.2 7 10.4 11.2 5.8" fill="none" stroke="#2C6E7F"
              strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          PDF をダウンロードしました · {count} 問
        </span>
        <h1 className="done-h1">きょうの一枚、できあがり。</h1>
        <p className="done-lead">あとはダウンロードした PDF を印刷して、紙と鉛筆で。おうちのプリンタでも、コンビニ印刷でも。</p>

        <div className="done-memo">
          <span className="who">— 店主から</span>
          {doneMemo(reco.maxGrid, reco.usedDiag)}
        </div>

        <hr className="done-dashed" />

        <div className="done-next">
          <span className="done-basis">
            あなたが作った問題: 最大 {reco.maxGrid}×{reco.maxGrid} · ななめ線{reco.usedDiag ? "あり" : "なし"}
          </span>
          <h3>この細かさなら、ここから。</h3>
          <p className="sub">
            いま作った問題と同じ細かさから、一段ずつ。1冊 = {QUESTIONS_PER_VOL}問 / A4 / PDF。中身はぜんぶ見られます。
          </p>
          <div className="done-sku-row">
            {reco.vols.map((vol, i) => (
              <a className="done-sku" key={vol.sku} href={volHref(COPY_TASK, vol)}>
                <div className="thumb"><DotThumb grid={vol.grid} /></div>
                <span className="star">{DONE_STARS[i]}</span>
                <div className="tag">{COPY_TASK.name} / {vol.grid}</div>
                <div className="name">Lv.{vol.lv} {LEVEL_NAMES[vol.lv - 1]} Vol.{vol.volNo}</div>
                <div className="desc">{vol.blurb}</div>
                <div className="meta">{vol.ageLabel} · {QUESTIONS_PER_VOL} 問 · ¥{PRICE}</div>
              </a>
            ))}
          </div>
          <div className="done-links">
            <a className="done-ghost" href="/level-guide">どのレベルが合うか迷ったら — レベル選びガイドへ</a>
          </div>
        </div>

        <div className="done-actions">
          <button type="button" className="done-back" onClick={onBack}>← つづきを作る</button>
          <a className="done-home" href="/">お店をみる →</a>
        </div>

      </div>
    </main>
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
