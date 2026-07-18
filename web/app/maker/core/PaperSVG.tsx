"use client";

/* =========================================================================
   メーカー共通・盤面/プレビュー/印刷 React コンポーネント
   - PaperSVG: 編集キャンバス・サムネ共用の盤面（interactive/readonly）
   - ArrowSVG: 出題→解答の矢印（プレビュー側）
   - PreviewPane: 出力プレビューの 1 ペイン（axis 点線は鏡系のみ使用）
   - PreviewPage: 出力プレビューの 1 ページ（セルの中身は renderCell で注入）
   - PrintPage: window.print() 用の印刷シート（ペアの中身は renderPair で注入）
   ========================================================================= */

import {
  PAPER, paneSize, gridFor, KGAP, CELL_PAD, PRINT_INK, SCREEN_DOT, NAME_BAND_MM,
  nameBandSvgString, dotRadius, edgeWidth,
  type PaperKey, type PairLayout,
} from "../../products/print";
import { EdgeHitLayer } from "../erase";
import {
  VIEW, INK, AXIS_INK, dotPos, pointKey, samePoint,
  type Edge, type Point,
} from "./geometry";

// =========================================================================
// Paper pane SVG (used both in canvas and PDF preview)
// =========================================================================
export function PaperSVG({
  gridSize,
  edges,
  selected,
  onDotClick,
  onEdgeErase,
  erase = false,
  showLines,
  showActiveHighlight,
  ink = INK,
  dotScale = 1,
  edgeColor,
  underlay,
  overlay,
  showDots = true,
}: {
  gridSize: number;
  edges: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  onEdgeErase?: (i: number) => void;
  erase?: boolean;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
  dotScale?: number;
  edgeColor?: (e: Edge, i: number) => string; // overlay/fold の B 図テールなど
  underlay?: React.ReactNode;                 // decompose のゴースト・鏡の軸線など
  overlay?: React.ReactNode;                  // translate の★マーカーなど
  showDots?: boolean;                         // false=背景ドットを描かない（図形模写トライアル）
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
      {underlay}
      {showLines &&
        edges.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={edgeColor ? edgeColor(e, i) : ink}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      {points.map((p) => {
        const pos = dotPos(p.c, p.r, dots);
        const isSel = samePoint(selected ?? null, p);
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight ? (isSel ? "#2C6E7F" : SCREEN_DOT) : ink;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            {showDots && <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />}
            {interactive && !erase && (
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
      {overlay}
      {interactive && erase && onEdgeErase && (
        <EdgeHitLayer edges={edges} pos={(c, r) => dotPos(c, r, dots)} onErase={onEdgeErase} />
      )}
    </svg>
  );
}

// Outlined block arrow — used between もんだい / かいとう
// 細線＋小さな矢じり（案A・2026-06-12）。x,y は線の始点。
export function ArrowSVG({ x, y, size, dir, color }: {
  x: number; y: number; size: number; dir: "right" | "down"; color: string;
}) {
  const hd = size * 0.3; // 矢じりの開き
  const sw = Math.max(0.35, size * 0.04);
  const d = dir === "right"
    ? `M0 0 L${size} 0 M${size - hd} ${-hd} L${size} 0 L${size - hd} ${hd}`
    : `M0 0 L0 ${size} M${-hd} ${size - hd} L0 ${size} L${hd} ${size - hd}`;
  return (
    <path
      d={d}
      transform={`translate(${x},${y})`}
      fill="none" stroke={color} strokeWidth={sw}
      strokeLinejoin="round" strokeLinecap="round"
    />
  );
}

// =========================================================================
// PreviewPane — 出力プレビューの 1 ペイン。axis は鏡系のみ（点線の軸を重ねる）
// =========================================================================
export function PreviewPane({
  x, y, w, h, gridSize, edges, showLines, dotScale, axis, showDots = true, frame = false,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: number; edges: Edge[]; showLines: boolean; dotScale: number;
  axis?: "v" | "h";
  showDots?: boolean; // false=背景ドットを描かない（図形模写トライアル）
  frame?: boolean;    // true=薄い正方形の枠を添える（点を消したかくマス側の目印）
}) {
  // inner dots
  const dots = gridSize;
  const inset = Math.min(w, h) * 0.10;
  const stepX = (w - inset * 2) / (dots - 1);
  const stepY = (h - inset * 2) / (dots - 1);
  // 印刷（paneSvgString）と同じ比率 — プレビュー＝仕上がり
  const dotR = dotRadius(Math.min(w, h), dotScale);
  const lineW = edgeWidth(Math.min(w, h));
  const pos = (c: number, r: number) => ({
    x: x + inset + c * stepX,
    y: y + inset + r * stepY,
  });
  const paneMin = Math.min(w, h);
  return (
    <g>
      {axis && (
        axis === "v"
          ? <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h}
              stroke={AXIS_INK} strokeWidth={Math.max(0.25, lineW * 0.55)}
              strokeDasharray={`${(paneMin * 0.02).toFixed(2)} ${(paneMin * 0.015).toFixed(2)}`}
              strokeLinecap="round" />
          : <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2}
              stroke={AXIS_INK} strokeWidth={Math.max(0.25, lineW * 0.55)}
              strokeDasharray={`${(paneMin * 0.02).toFixed(2)} ${(paneMin * 0.015).toFixed(2)}`}
              strokeLinecap="round" />
      )}
      {showDots && (
        <g fill={PRINT_INK}>
          {Array.from({ length: dots }, (_, r) =>
            Array.from({ length: dots }, (_, c) => {
              const p = pos(c, r);
              return <circle key={`${c}-${r}`} cx={p.x} cy={p.y} r={dotR} />;
            })
          )}
        </g>
      )}
      {frame && (
        <rect x={x + paneMin * 0.02} y={y + paneMin * 0.02}
          width={w - paneMin * 0.04} height={h - paneMin * 0.04}
          fill="none" stroke={AXIS_INK} strokeWidth={Math.max(0.25, lineW * 0.55)} />
      )}
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

// =========================================================================
// PreviewPage — 出力プレビューの 1 ページ。セルの中身（ペイン・矢印・鏡面等）は
// renderCell で注入（PDF 側 buildPageSvgFrame と同じ責務分割）。
// =========================================================================
export type PreviewCellCtx = {
  cellW: number;
  cellH: number;
  pane: number;
  gap: number;
  pairLayout: PairLayout;
  dotScale: number;
};

export function PreviewPage<P extends { id: string }>({
  paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale,
  panes = 2, renderCell,
}: {
  paper: typeof PAPER[PaperKey];
  problems: P[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  panes?: 2 | 3;
  renderCell: (p: P, ctx: PreviewCellCtx) => React.ReactNode;
}) {
  // SVG-based mini preview matching aspect of paper
  const W = paper.w, H = paper.h;
  // Page width conveys real paper size: longest selectable side (A3 = 420mm) → full width.
  const pageScale = Math.max(W, H) / 420;
  const nameH = nameField ? NAME_BAND_MM : 0;
  // Use problemsPerPage (not problems.length) so pane size stays consistent across pages.
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - nameH, marginMm, panes);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - nameH) / rows;
  // Pane + proportional gap/pad, derived from the same model the optimizer used.
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout, panes);
  const gap = pane * KGAP;
  const ctx: PreviewCellCtx = { cellW, cellH, pane, gap, pairLayout, dotScale };
  return (
    <div className="pp-page"
      style={{ aspectRatio: `${W}/${H}`, width: `${(pageScale * 100).toFixed(1)}%` }}>
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        {/* なまえ・日付の記入欄（PDF と同じ断片を共用） */}
        {nameField && (
          <g dangerouslySetInnerHTML={{ __html: nameBandSvgString(W, marginMm) }} />
        )}
        {problems.map((p, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cx = marginMm + col * cellW;
          const cy = marginMm + nameH + row * cellH;
          return (
            <g key={p.id} transform={`translate(${cx},${cy})`}>
              {renderCell(p, ctx)}
            </g>
          );
        })}
      </svg>
      <div className="pageno">P {pageNo} / {pageCount}</div>
    </div>
  );
}

// =========================================================================
// PrintPage — window.print() 用の印刷シート。ペアの中身は renderPair で注入。
// =========================================================================
export function PrintPage<P extends { id: string }>({
  paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout,
  nameField, renderPair,
}: {
  paper: typeof PAPER[PaperKey];
  problems: P[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  renderPair: (p: P) => React.ReactNode;
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
          ["--pscale" as string]: arrowScale,
        }}>
          {problems.map((p) => (
            <div key={p.id} className={`print-problem pair-${pairLayout}`}>
              {renderPair(p)}
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
