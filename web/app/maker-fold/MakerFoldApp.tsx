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
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, paneSize, gridFor,
  KGAP, CELL_PAD, PRINT_INK, DOT_SCALE, NAME_BAND_MM, nameBandSvgString, dotRadius, edgeWidth,
  type PaperKey, type LayoutPerPage, type PairLayout, type DotSize,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";

// =========================================================================
// Types & constants
// =========================================================================
type Point = { c: number; r: number };
type Edge = { a: Point; b: Point };

type GridSize = 3 | 4 | 5 | 6;
type Board = "A" | "B"; // A=問題1 / B=問題2
type FoldAxis = "v" | "h"; // v=左右に折る（左右反転）/ h=上下に折る（上下反転）

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

// 折り方は式の並びと一意対応（横一列=左右反転 v / 縦一列=上下反転 h）。鏡メーカーと同規約。
function axisOf(pair: PairLayout): FoldAxis {
  return pair === "horizontal" ? "v" : "h";
}

const VIEW = 200;
const INK = "#3A424E";
// 折り返した問題1を示す teal（編集プレビューのみ・印刷は常に単色 PRINT_INK）
const INK_B = "#2C6E7F";

/* 点を折り線で折り返す（schema.ts mirrorEdges と同規約。maker は { c, r } 表現）。
   v: (c,r)→(n-1-c, r) ／ h: (c,r)→(c, n-1-r)。d1/d2 は折り重ねメーカーでは扱わない */
function mirrorPoint(p: Point, n: number, axis: FoldAxis): Point {
  return axis === "v" ? { c: n - 1 - p.c, r: p.r } : { c: p.c, r: n - 1 - p.r };
}
function mirrorEdgesOf(edges: Edge[], n: number, axis: FoldAxis): Edge[] {
  return edges.map((e) => ({ a: mirrorPoint(e.a, n, axis), b: mirrorPoint(e.b, n, axis) }));
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
// PDF 生成 — jsPDF ＋ ページ SVG → 300dpi PNG 焼き込み。panes=3 共有。
// =========================================================================
const PX_PER_MM = 300 / 25.4;

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。
function paneSvgString(
  x: number, y: number, pane: number, gridSize: GridSize, edges: Edge[], showLines: boolean,
  dotScale: number,
): string {
  const inset = pane * 0.10;
  const step = (pane - inset * 2) / (gridSize - 1);
  const P = (c: number, r: number) => ({ x: x + inset + c * step, y: y + inset + r * step });
  const dotR = dotRadius(pane, dotScale);
  const lineW = edgeWidth(pane);
  let s = "";
  if (showLines) {
    for (const e of edges) {
      const a = P(e.a.c, e.a.r), b = P(e.b.c, e.b.r);
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${PRINT_INK}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const p = P(c, r);
      s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
    }
  }
  return s;
}

type LogoInfo = { url: string; w: number; h: number };

function buildPageSvg(opts: {
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
}): string {
  const { paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale, logo } = opts;
  const foldAxis = axisOf(pairLayout); // 折り方は並びから導出
  const W = paper.w, H = paper.h;
  const footerH = 12;
  const nameH = nameField ? NAME_BAND_MM : 0;
  const titleH = opts.answer ? 12 : 0;
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - footerH - nameH - titleH, marginMm, 3);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - footerH - nameH - titleH) / rows;
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout, 3);
  const gap = pane * KGAP;
  const opSize = gap * 0.5;
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";

  let body = "";
  if (nameField) body += nameBandSvgString(W, marginMm);
  if (opts.answer) {
    const ty = marginMm + nameH + 7;
    body += `<text x="${marginMm}" y="${ty}" font-family="${jpFont}" font-size="6" fill="#3A424E" font-weight="600" letter-spacing="0.8">かいとう</text>`;
  }
  problems.forEach((p, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = marginMm + col * cellW;
    const cy = marginMm + nameH + titleH + row * cellH;

    const areaY = cy;
    const areaH = cellH;
    /* 出題: ペイン1=問題1／ペイン2=問題2／ペイン3=空欄（子が描く）
       解答: ペイン3に mirror(問題1)∪問題2 を描き込み。記号 折り返し矢印 / ＝ */
    const resultEdges = opts.answer
      ? [...mirrorEdgesOf(p.edgesA, p.gridSize, foldAxis), ...p.edgesB]
      : [];
    const showResult = Boolean(opts.answer);
    if (pairLayout === "horizontal") {
      const blockW = pane * 3 + gap * 2;
      const sx = cx + (cellW - blockW) / 2;
      const sy = areaY + (areaH - pane) / 2;
      const x2 = sx + pane + gap;
      const x3 = sx + 2 * (pane + gap);
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale);
      body += paneSvgString(x2, sy, pane, p.gridSize, p.edgesB, true, dotScale);
      body += paneSvgString(x3, sy, pane, p.gridSize, resultEdges, showResult, dotScale);
      body += opGlyphSvgString(sx + pane + gap / 2, sy + pane / 2, opSize, "fold", PRINT_INK);
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
      body += opGlyphSvgString(sx + pane / 2, sy + pane + gap / 2, opSize, "fold", PRINT_INK, true);
      body += opGlyphSvgString(sx + pane / 2, y2 + pane + gap / 2, opSize, "eq", PRINT_INK, true);
    }
  });

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
    return null;
  }
}

// =========================================================================
// Paper pane SVG (canvas & PDF preview)
// edgesB を渡すと第2辺集合を inkB で重ね描き（折り返した問題1の色分け）。
// =========================================================================
function PaperSVG({
  gridSize, edges, edgesB, selected, onDotClick, showLines, showActiveHighlight,
  ink = INK, inkB = INK_B, dotScale = 1,
}: {
  gridSize: GridSize;
  edges: Edge[];
  edgesB?: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
  inkB?: string;
  dotScale?: number;
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
            <line key={`a${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
      {showLines && edgesB &&
        edgesB.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line key={`b${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={inkB} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
      {points.map((p) => {
        const pos = dotPos(p.c, p.r, dots);
        const isSel = samePoint(selected ?? null, p);
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight && isSel ? "#2C6E7F" : ink;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />
            {interactive && (
              <circle cx={pos.x} cy={pos.y} r={9} fill="transparent"
                style={{ cursor: "pointer" }} onClick={() => onDotClick?.(p)} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// =========================================================================
// MakerFoldApp
// =========================================================================
type Snap = { edgesA: Edge[]; edgesB: Edge[] };

export default function MakerFoldApp() {
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edgesA, setEdgesA] = useState<Edge[]>([]); // 問題1
  const [edgesB, setEdgesB] = useState<Edge[]>([]); // 問題2
  const [selectedA, setSelectedA] = useState<Point | null>(null);
  const [selectedB, setSelectedB] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 問題1・問題2 の両盤面に適用（各盤面の終点を渡す）。
  const [oneStroke, setOneStroke] = useState(false);

  const historyRef = useRef<Snap[]>([{ edgesA: [], edgesB: [] }]);
  const histIdxRef = useRef<number>(0);
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((v) => v + 1);

  function pushHistory(next: Snap) {
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(next);
    histIdxRef.current = historyRef.current.length - 1;
  }
  function applySnap(s: Snap) {
    setEdgesA(s.edgesA);
    setEdgesB(s.edgesB);
    setSelectedA(null);
    setSelectedB(null);
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
  function clearAll() {
    pushHistory({ edgesA: [], edgesB: [] });
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
  }

  function handleDot(board: Board, p: Point) {
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
    pushHistory(isA ? { edgesA: updated, edgesB } : { edgesA, edgesB: updated });
    // 一筆書き ON: この盤面の終点 p を次の線の始点として残す。OFF: 従来どおり選択解除。
    setSelected(oneStroke ? p : null);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    setGridSize(n);
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    historyRef.current = [{ edgesA: [], edgesB: [] }];
    histIdxRef.current = 0;
  }

  // ---- Paper / layout state ----
  const [paperKey, setPaperKey] = useState<PaperKey>("A4-P");
  const marginMm = 14;
  const [perPage, setPerPage] = useState<"auto" | LayoutPerPage>("auto");
  const [pairLayout, setPairLayout] = useState<PairLayout>("horizontal");
  const [nameField, setNameField] = useState(false);
  const [dotSize, setDotSize] = useState<DotSize>("m");
  const dotScale = DOT_SCALE[dotSize];

  // 折り方は式の並びから導出（横一列=左右反転 v / 縦一列=上下反転 h）
  const foldAxis = axisOf(pairLayout);
  const isVertical = pairLayout === "vertical";

  // 折り返した問題1（自動算出・結果プレビューの teal 重ね描き用）
  const mirrorA = useMemo(() => mirrorEdgesOf(edgesA, gridSize, foldAxis), [edgesA, gridSize, foldAxis]);

  function selectPaper(k: PaperKey) {
    setPaperKey(k);
    const max = paperMax(k);
    setPerPage((p) => (p !== "auto" && p > max ? max : p));
  }

  // ---- Saved problems ----
  const [saved, setSaved] = useState<Problem[]>([]);
  const [savingNo, setSavingNo] = useState(1);

  function saveCurrent() {
    if (edgesA.length === 0 && edgesB.length === 0) return;
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edgesA, edgesB, selected: true }]);
    setSavingNo((n) => n + 1);
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    historyRef.current = [{ edgesA: [], edgesB: [] }];
    histIdxRef.current = 0;
  }
  function toggleSelectSaved(id: string) {
    setSaved((s) => s.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
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
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(paperMax(paperKey), selectedSaved.length))
    : perPage;
  const pages = useMemo(() => {
    const ps: Problem[][] = [];
    for (let i = 0; i < selectedSaved.length; i += effectivePerPage) {
      ps.push(selectedSaved.slice(i, i + effectivePerPage));
    }
    return ps;
  }, [selectedSaved, effectivePerPage]);

  // ---- PDF ダウンロード（出題群→解答群を1ファイル連結） ----
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
      const totalPages = pages.length * 2;

      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) doc.addPage(format, orientation);
        const svg = buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: totalPages,
          marginMm, problemsPerPage: effectivePerPage, pairLayout, nameField, dotScale, logo,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      for (let pi = 0; pi < pages.length; pi++) {
        doc.addPage(format, orientation);
        const svg = buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pages.length + pi + 1, pageCount: totalPages,
          marginMm, problemsPerPage: effectivePerPage, pairLayout, nameField, dotScale, logo,
          answer: true,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      const d = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
      doc.save(`tenzu_fold_${stamp}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  const editingTitle = `問題 #${(saved.length + 1).toString().padStart(2, "0")} を作る`;
  const paper = PAPER[paperKey];

  return (
    <>
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <header className="maker-header">
        <div className="logo-cluster">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <div className="app-name">折り重ねメーカー（内部用）</div>
        </div>
      </header>

      <>
      {/* ============ APP SHELL ============ */}
      <div className="app-shell">

        {/* ---------- CENTER ---------- */}
        <main className="canvas-area">
          <div className="canvas-toolbar">
            <div className="title">
              {editingTitle}
            </div>
          </div>

          {/* 作図の設定（グリッド・点の大きさ・一筆書き）をタイトル直下のコンパクト帯に集約 */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ" value={gridSize}
                onChange={(e) => changeGridSize(Number(e.target.value) as GridSize)}>
                {([3, 4, 5, 6] as GridSize[]).map((n) => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
            </div>
            <div className="qb-group">
              <span className="qb-label">点の大きさ</span>
              <div className="seg qb-seg" role="group" aria-label="点の大きさ">
                {(["s", "m", "l"] as const).map((k) => (
                  <button key={k} type="button" aria-pressed={dotSize === k} onClick={() => setDotSize(k)}>
                    {k === "s" ? "小" : k === "m" ? "中" : "大"}
                  </button>
                ))}
              </div>
            </div>
            <div className="qb-group">
              <span className="qb-label">一筆書き</span>
              <div className="seg qb-seg" role="group" aria-label="一筆書きモード">
                <button type="button" aria-pressed={!oneStroke} onClick={() => setOneStroke(false)}>OFF</button>
                <button type="button" aria-pressed={oneStroke} onClick={() => setOneStroke(true)}>ON</button>
              </div>
            </div>
            {oneStroke && <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>}
          </div>

          <div className="canvas-stage">
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
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edgesB}
                    edgesB={mirrorA}
                    showLines={true}
                  />
                </div>
              </div>
            </div>
            <div className="canvas-actions">
              <div className="edit-actions">
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
                  onClick={clearAll} disabled={edgesA.length === 0 && edgesB.length === 0}>
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
              <button className="btn-save" type="button" onClick={saveCurrent}
                disabled={edgesA.length === 0 && edgesB.length === 0}>
                この問題を保存する
              </button>
            </div>
            <div className="canvas-help">
              問題1・問題2 にそれぞれ線を引きます（点を 2 つクリック／同じ線をもう一度で消えます）。
              問題1を矢印の向きに折り返して問題2に重ねた仕上がりが右に出ます（青＝折り返した問題1）。
              「式の並び」を縦一列にすると、この画面も上下の並びに変わります。
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">

          <div className="group">
            <h3>保存済みの問題</h3>
            {saved.length === 0 ? (
              <p className="saved-empty">
                まだ保存された問題はありません。<br />1 問作って「この問題を保存する」を押すと、ここに並びます。
              </p>
            ) : (
              <div className="saved-grid">
                {saved.map((p, i) => {
                  const num = (i + 1).toString().padStart(2, "0");
                  const res = [...mirrorEdgesOf(p.edgesA, p.gridSize, foldAxis), ...p.edgesB];
                  return (
                    <div className={`saved-cell${p.selected ? " sel" : ""}`} key={p.id}>
                      <button className="thumb" type="button"
                        role="checkbox"
                        aria-checked={p.selected}
                        aria-label={`問題 ${num} を PDF に含める`}
                        onClick={() => toggleSelectSaved(p.id)}>
                        <PaperSVG gridSize={p.gridSize} edges={res} showLines={true} />
                      </button>
                      {p.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                      <button className="del" type="button" aria-label={`問題 ${num} を削除`}
                        onClick={() => {
                          if (window.confirm(`この問題（#${num}）を削除しますか？`)) deleteSaved(p.id);
                        }}>×</button>
                      <span className="cnum">{num}</span>
                      <span className="order">
                        <button type="button" aria-label="ひとつ前へ" disabled={i === 0}
                          onClick={() => moveSaved(p.id, -1)}>‹</button>
                        <button type="button" aria-label="ひとつ後へ" disabled={i === saved.length - 1}
                          onClick={() => moveSaved(p.id, 1)}>›</button>
                      </span>
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

          <details className="settings-fold">
            <summary>
              <span className="sf-label">詳細設定<span className="sf-chevron" aria-hidden="true" /></span>
              <span className="sf-current">
                用紙: {paper.label} · 問数: {perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 名前欄: {nameField ? "あり" : "なし"}
              </span>
            </summary>
            <div className="sf-body">

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

            <div className="group">
              <h3>名前・日付の記入欄</h3>
              <div className="seg" role="group" aria-label="名前・日付の記入欄">
                <button type="button"
                  aria-pressed={!nameField}
                  onClick={() => setNameField(false)}>
                  つけない
                </button>
                <button type="button"
                  aria-pressed={nameField}
                  onClick={() => setNameField(true)}>
                  つける
                </button>
              </div>
            </div>

            </div>
          </details>

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
                        dotScale={dotScale} />
                    ))}
                  </div>
                  <div className="pp-foot">
                    <span>合計 <strong>{selectedSaved.length} 問 / {pages.length} ページ</strong></span>
                    <span>{paper.label} · {effectivePerPage} 問 / ページ</span>
                  </div>
                </>
              )}
            </div>
            <button className="btn-export" type="button"
              onClick={doExport} disabled={selectedSaved.length === 0 || exporting}>
              {exporting ? "PDF を作成中…" : "PDF をダウンロード（出題＋解答）"}
              {!exporting && selectedSaved.length > 0 && (
                <span className="x">{selectedSaved.length} 問 / 出題 {pages.length}p ＋ 解答 {pages.length}p</span>
              )}
            </button>
          </div>

          <div className="warning" data-system="warning" role="note">
            <strong>NOTE</strong>
            画面で解かせる機能はありません。<br />必ず印刷して、紙の上で練習してください。
          </div>

        </aside>
      </div>

      {selectedSaved.length > 0 && (
        <div className="mobile-export-bar">
          <button type="button" onClick={doExport} disabled={exporting}>
            {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
            {!exporting && (
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
            dotScale={dotScale} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// Sub-components: PreviewPage (sidebar PDF preview) & PrintPage (print sheet)
// =========================================================================
function ProblemTriple({ p, pairLayout, dotScale }: { p: Problem; pairLayout: PairLayout; dotScale: number }) {
  const vertical = pairLayout === "vertical";
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true"><FoldMark size={20} vertical={vertical} /></div>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true"><EqMark size={18} vertical={vertical} /></div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題なので結果ペインは空（子が描く）。解答は PDF 側へ */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
    </>
  );
}

function PreviewPage({
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
  const W = paper.w, H = paper.h;
  const pageScale = Math.max(W, H) / 420;
  const nameH = nameField ? NAME_BAND_MM : 0;
  const foldAxis = axisOf(pairLayout);
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - nameH, marginMm, 3);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - nameH) / rows;
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout, 3);
  const gap = pane * KGAP;
  const opSize = gap * 0.5;
  return (
    <div className="pp-page"
      style={{ aspectRatio: `${W}/${H}`, width: `${(pageScale * 100).toFixed(1)}%` }}>
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        {nameField && (
          <g dangerouslySetInnerHTML={{ __html: nameBandSvgString(W, marginMm) }} />
        )}
        {problems.map((p, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cx = marginMm + col * cellW;
          const cy = marginMm + nameH + row * cellH;
          // 出力プレビュー＝解答（ペイン3に mirror(問題1)∪問題2）
          const answer = [...mirrorEdgesOf(p.edgesA, p.gridSize, foldAxis), ...p.edgesB];
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
            <g key={p.id} transform={`translate(${cx},${cy})`}>
              <PreviewPane x={p1.x} y={p1.y} w={pane} h={pane}
                gridSize={p.gridSize} edges={p.edgesA} showLines={true} dotScale={dotScale} />
              <PreviewPane x={p2.x} y={p2.y} w={pane} h={pane}
                gridSize={p.gridSize} edges={p.edgesB} showLines={true} dotScale={dotScale} />
              <PreviewPane x={p3.x} y={p3.y} w={pane} h={pane}
                gridSize={p.gridSize} edges={answer} showLines={true} dotScale={dotScale} />
              <OpGlyph x={foldP.x} y={foldP.y} size={opSize} kind="fold" color={PRINT_INK} vertical={pairLayout === "vertical"} />
              <OpGlyph x={eq.x} y={eq.y} size={opSize} kind="eq" color={PRINT_INK} vertical={pairLayout === "vertical"} />
            </g>
          );
        })}
      </svg>
      <div className="pageno">P {pageNo} / {pageCount}</div>
    </div>
  );
}

function PreviewPane({
  x, y, w, h, gridSize, edges, showLines, dotScale,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: GridSize; edges: Edge[]; showLines: boolean; dotScale: number;
}) {
  const dots = gridSize;
  const inset = Math.min(w, h) * 0.10;
  const stepX = (w - inset * 2) / (dots - 1);
  const stepY = (h - inset * 2) / (dots - 1);
  const dotR = dotRadius(Math.min(w, h), dotScale);
  const lineW = edgeWidth(Math.min(w, h));
  const pos = (c: number, r: number) => ({ x: x + inset + c * stepX, y: y + inset + r * stepY });
  return (
    <g>
      <g fill={PRINT_INK}>
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
          stroke={PRINT_INK} strokeWidth={lineW}
          strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
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
              <ProblemTriple p={p} pairLayout={pairLayout} dotScale={dotScale} />
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
