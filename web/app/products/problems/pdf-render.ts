/** Vector PDF adapter shared by browser downloads and offline books. Coordinates are PDF points, y down. */
import { rgb, grayscale, type PDFPage, type PDFPageDrawLineOptions, type PDFPageDrawCircleOptions } from "pdf-lib";
import { pairGeom, arrowProps, CELL_PAD, DOT_SCALE, dotRadius, edgeWidth, rotMarkPts, translateMarkPts, markRingSegs, rotArcSegs, rotArcRadius, rotArcWidth, opSegs, type PairLayout } from "../print";
import { composeTriple, gapEdgesOf, resultEdgesOf, type RenderProblem } from "./render";
import type { EdgeT, Pt, SolidEdge } from "./schema";
import { gridGeometry } from "../print";
const MM2PT = 72 / 25.4;
export type PdfCell = { x: number; y: number; width: number; height: number };

/** A single completed or empty pane. All units are points, with a top origin. */
export function paintGridPdf(page: PDFPage, cell: PdfCell, cols: number, rows: number,
  edges: EdgeT[] | SolidEdge[], options: { minLineMm?: number; dotScale?: number; inkGray?: number } = {}) {
  const g = gridGeometry(cell.x, cell.y, cell.width, cell.height, cols, rows);
  const paneMm = Math.min(cell.width, cell.height) / MM2PT;
  const ink = grayscale(options.inkGray ?? 0.12);
  const P = (c: number, r: number) => { const p = g.point(c, r); return { x: p.x, y: page.getHeight() - p.y }; };
  for (const e of edges) {
    const solid = !Array.isArray(e);
    const a = solid ? P(e.a.c, e.a.r) : P(e[0][0], e[0][1]);
    const b = solid ? P(e.b.c, e.b.r) : P(e[1][0], e[1][1]);
    page.drawLine({ start: a, end: b, color: ink, lineCap: 1,
      thickness: Math.max(edgeWidth(paneMm), options.minLineMm ?? 0) * MM2PT,
      ...(solid && e.style === "dashed" ? { dashArray: [g.step * 0.55, g.step * 0.4] } : {}),
    });
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    page.drawCircle({ ...P(c, r), size: dotRadius(paneMm, options.dotScale ?? 1) * MM2PT, color: ink });
}
/** A worked-example overlay. Its gray dashed edges come only from published data. */
export function paintGuideGridPdf(page: PDFPage, cell: PdfCell, cols: number, rows: number,
  edges: EdgeT[] | SolidEdge[], minLineMm = 0.3) {
  const g = gridGeometry(cell.x, cell.y, cell.width, cell.height, cols, rows);
  const ink = grayscale(0.65);
  for (const e of edges) {
    const solid = !Array.isArray(e);
    const a = solid ? g.point(e.a.c, e.a.r) : g.point(e[0][0], e[0][1]);
    const b = solid ? g.point(e.b.c, e.b.r) : g.point(e[1][0], e[1][1]);
    page.drawLine({ start: { x: a.x, y: page.getHeight() - a.y },
      end: { x: b.x, y: page.getHeight() - b.y },
      thickness: minLineMm * MM2PT, color: ink, dashArray: [1.4 * MM2PT, 1.2 * MM2PT], lineCap: 1 });
  }
}
export function paintProblemPdf(target: PDFPage, pb: RenderProblem, cell: PdfCell, pair: PairLayout,
  options: { dotScale?: number; noDots?: boolean; answer?: boolean; answerGuide?: boolean; minLineMm?: number; monochrome?: boolean; gapScale?: number; markerMaxPaneRatio?: number; inkGray?: number } = {}) {
  const { dotScale = DOT_SCALE.m, noDots = false, answer = false, answerGuide = false, minLineMm = 0, monochrome = false, gapScale = 1, markerMaxPaneRatio, inkGray = 0.12 } = options;
  const ink = monochrome ? grayscale(inkGray) : rgb(0x77/255,0x77/255,0x77/255);
  const frameInk = monochrome ? grayscale(inkGray) : rgb(0x9a/255,0xa0/255,0xaa/255);
  const page = {
    drawLine(o: PDFPageDrawLineOptions) { target.drawLine({ ...o, thickness: Math.max(o.thickness ?? 1, minLineMm * MM2PT), color: monochrome ? ink : o.color }); },
    drawCircle(o: PDFPageDrawCircleOptions) { target.drawCircle(o); },
  };
  const panes = pb.compose ? 3 : 2;
  const pad = Math.min(cell.width, cell.height) * CELL_PAD;
  const g = pairGeom(cell.width - pad * 2, cell.height - pad * 2, pair, panes, gapScale);
  const dotR = dotRadius(g.pane / MM2PT, dotScale) * MM2PT;
  const lw = edgeWidth(g.pane / MM2PT) * MM2PT;
  const n = pb.n, cx = cell.x + pad + g.ox, cyTop = cell.y + pad + g.oy;
  const Y = (y: number) => target.getHeight() - y;

if (!noDots) {
  for (let side = 0; side < panes; side++) {
    const sx = cx + side * g.dx;
    const syTop = cyTop + side * g.dy;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        page.drawCircle({
          x: sx + g.dot(g.pane, c, n), y: Y(syTop + g.dot(g.pane, r, n)), size: dotR, color: ink,
        });
  }
}
/* かさね系: 3 ペイン式「A op B ＝ □」（プレビューと同じ導出）。
   出題＝ペイン3 空欄／解答（answer=true）＝ペイン3 に結果を描き込み */
const triple = composeTriple(pb, pair);
if (triple) {
  const drawEdges = (edges: EdgeT[], ox: number, oyTop: number) => {
    for (const e of edges) {
      page.drawLine({
        start: { x: ox + g.dot(g.pane, e[0][0], n), y: Y(oyTop + g.dot(g.pane, e[0][1], n)) },
        end: { x: ox + g.dot(g.pane, e[1][0], n), y: Y(oyTop + g.dot(g.pane, e[1][1], n)) },
        thickness: lw, color: ink, lineCap: 1,
      });
    }
  };
  drawEdges(triple.a, cx, cyTop);
  drawEdges(triple.b, cx + g.dx, cyTop + g.dy);
  if (answer) {
    drawEdges(triple.result, cx + g.dx * 2, cyTop + g.dy * 2);
  } else if (noDots) {
    // 点をとったとき、空欄のこたえペインにだけ薄い枠（解答は線で埋まるため不要）
    const fx = cx + g.dx * 2 + g.pane * 0.02;
    const fyTop = cyTop + g.dy * 2 + g.pane * 0.02;
    const fs2 = g.pane * 0.96;
    const fsw = Math.max(0.25 * MM2PT, lw * 0.55);
    page.drawLine({ start: { x: fx, y: Y(fyTop) }, end: { x: fx + fs2, y: Y(fyTop) }, thickness: fsw, color: frameInk });
    page.drawLine({ start: { x: fx, y: Y(fyTop + fs2) }, end: { x: fx + fs2, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
    page.drawLine({ start: { x: fx, y: Y(fyTop) }, end: { x: fx, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
    page.drawLine({ start: { x: fx + fs2, y: Y(fyTop) }, end: { x: fx + fs2, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
  }
  const opSize = g.gap * 0.5;
  const ow = Math.max(0.4 * MM2PT, opSize * 0.1);
  const opAt = (k: 1 | 2) => pair === "horizontal"
    ? { x: cx + (k - 1) * g.dx + g.pane + g.gap / 2, y: cyTop + g.pane / 2 }
    : { x: cx + g.pane / 2, y: cyTop + (k - 1) * g.dy + g.pane + g.gap / 2 };
  const drawOp = (kind: "plus" | "minus" | "eq" | "fold", at: { x: number; y: number }) => {
    for (const s of opSegs(kind, at.x, at.y, opSize, pair === "vertical")) {
      page.drawLine({
        start: { x: s[0], y: Y(s[1]) }, end: { x: s[2], y: Y(s[3]) },
        thickness: ow, color: ink, lineCap: 1,
      });
    }
  };
  drawOp(triple.op, opAt(1));
  drawOp("eq", opAt(2));
  if (answerGuide) paintGuideGridPdf(target,
    { x: cx + g.dx * 2, y: cyTop + g.dy * 2, width: g.pane, height: g.pane }, n, n, triple.result, Math.max(0.3, minLineMm));
  return;
}
// 点をとったとき、かくマスが空欄の設問（模写・鏡・回転・移動）にだけ薄い枠を添える。
// 欠け補完（gapEdgesOf ≠ null）には付けない。
if (noDots && !gapEdgesOf(pb)) {
  const fx = cx + g.dx + g.pane * 0.02;
  const fyTop = cyTop + g.dy + g.pane * 0.02;
  const fs2 = g.pane * 0.96;
  const fsw = Math.max(0.25 * MM2PT, lw * 0.55);
  // 4 辺を線分で（drawRectangle は塗り前提のため線分で枠を描く）
  page.drawLine({ start: { x: fx, y: Y(fyTop) }, end: { x: fx + fs2, y: Y(fyTop) }, thickness: fsw, color: frameInk });
  page.drawLine({ start: { x: fx, y: Y(fyTop + fs2) }, end: { x: fx + fs2, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
  page.drawLine({ start: { x: fx, y: Y(fyTop) }, end: { x: fx, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
  page.drawLine({ start: { x: fx + fs2, y: Y(fyTop) }, end: { x: fx + fs2, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
}
for (const e of pb.edges) {
  page.drawLine({
    start: { x: cx + g.dot(g.pane, e[0][0], n), y: Y(cyTop + g.dot(g.pane, e[0][1], n)) },
    end: { x: cx + g.dot(g.pane, e[1][0], n), y: Y(cyTop + g.dot(g.pane, e[1][1], n)) },
    thickness: lw, color: ink, lineCap: 1,
  });
}
// 欠け補完: かくマスペインに G=F∖R を事前印字
const gap = gapEdgesOf(pb);
if (gap) for (const e of gap) {
  page.drawLine({
    start: { x: cx + g.dx + g.dot(g.pane, e[0][0], n), y: Y(cyTop + g.dy + g.dot(g.pane, e[0][1], n)) },
    end:   { x: cx + g.dx + g.dot(g.pane, e[1][0], n), y: Y(cyTop + g.dy + g.dot(g.pane, e[1][1], n)) },
    thickness: lw, color: ink, lineCap: 1,
  });
}
/* 変換の指示子（プレビューと同じ数式）: 回転＝弧の矢印／移動＝★●の目じるし□ */
{
  const marks = pb.rotateDeg
    ? rotMarkPts(n, pb.rotateDeg)
    : pb.translateVec ? translateMarkPts(pb.edges, pb.translateVec) : null;
  if (marks) {
    const half = g.pane * 0.055;
    const msw = Math.max(0.3 * MM2PT, lw * 0.85);
    const ring = (p: Pt, ox: number, oyTop: number) => {
      for (const s of markRingSegs(
        ox + g.dot(g.pane, p[0], n), oyTop + g.dot(g.pane, p[1], n), half,
      )) {
        page.drawLine({
          start: { x: s[0], y: Y(s[1]) }, end: { x: s[2], y: Y(s[3]) },
          thickness: msw, color: ink, lineCap: 1,
        });
      }
    };
    ring(marks.from, cx, cyTop);
    ring(marks.to, cx + g.dx, cyTop + g.dy);
  }
  if (pb.rotateDeg) {
    const radius = markerMaxPaneRatio === undefined ? rotArcRadius(g.pane, g.gap)
      : Math.min(rotArcRadius(g.pane, g.gap), g.pane * markerMaxPaneRatio * 0.8);
    const aw = markerMaxPaneRatio === undefined ? rotArcWidth(g.pane, g.gap) : Math.max(0.35 * MM2PT, radius * 0.13);
    for (const s of rotArcSegs(
      cx + g.dx / 2 + (pair === "horizontal" ? g.pane / 2 : 0),
      cyTop + g.dy / 2 + (pair === "horizontal" ? 0 : g.pane / 2),
      radius, pb.rotateDeg,
    )) {
      page.drawLine({
        start: { x: s[0], y: Y(s[1]) }, end: { x: s[2], y: Y(s[3]) },
        thickness: aw, color: ink, lineCap: 1,
      });
    }
  }
}
if (pb.mirrorAxis) {
  // 鏡 SKU: みほん→解答 の境界は矢印じゃなく薄い点線（鏡面）
  const planeColor = rgb(0x9a / 255, 0xa0 / 255, 0xaa / 255);
  const planeDashStep = Math.max(0.4 * MM2PT, g.pane * 0.025);
  const planeW = Math.max(0.2 * MM2PT, lw * 0.7);
  const drawDashedPlane = (x1: number, y1Top: number, x2: number, y2Top: number) => {
    const dx = x2 - x1, dy = y2Top - y1Top;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let t = 0;
    while (t < len) {
      const t2 = Math.min(t + planeDashStep, len);
      page.drawLine({
        start: { x: x1 + ux * t, y: Y(y1Top + uy * t) },
        end:   { x: x1 + ux * t2, y: Y(y1Top + uy * t2) },
        thickness: planeW, color: planeColor, lineCap: 1,
      });
      t = t2 + planeDashStep * 0.7;
    }
  };
  if (pair === "horizontal") {
    const mx = cx + g.pane + g.gap / 2;
    drawDashedPlane(mx, cyTop - g.pane * 0.05, mx, cyTop + g.pane * 1.05);
  } else {
    const my = cyTop + g.pane + g.gap / 2;
    drawDashedPlane(cx - g.pane * 0.05, my, cx + g.pane * 1.05, my);
  }
} else if (!pb.rotateDeg) {
  // 矢印（みほん→うつす・細線＋小さな矢じり・向きは pair に追従）
  const base = arrowProps(g, cx, cyTop, pair);
  const size = markerMaxPaneRatio === undefined ? base.size : Math.min(base.size, g.pane * markerMaxPaneRatio);
  const arr = markerMaxPaneRatio === undefined ? base : {
    ...base, size,
    x: pair === "horizontal" ? cx + g.pane + (g.gap - size) / 2 : base.x,
    y: pair === "vertical" ? cyTop + g.pane + (g.gap - size) / 2 : base.y,
  };
  const hd = arr.size * 0.3;
  const aw = Math.max(0.35 * MM2PT, arr.size * 0.04);
  const seg = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({
      start: { x: x1, y: Y(y1) }, end: { x: x2, y: Y(y2) },
      thickness: aw, color: ink, lineCap: 1,
    });
  if (arr.dir === "right") {
    seg(arr.x, arr.y, arr.x + arr.size, arr.y);
    seg(arr.x + arr.size - hd, arr.y - hd, arr.x + arr.size, arr.y);
    seg(arr.x + arr.size - hd, arr.y + hd, arr.x + arr.size, arr.y);
  } else {
    seg(arr.x, arr.y, arr.x, arr.y + arr.size);
    seg(arr.x - hd, arr.y + arr.size - hd, arr.x, arr.y + arr.size);
    seg(arr.x + hd, arr.y + arr.size - hd, arr.x, arr.y + arr.size);
  }
}
if (answerGuide) paintGuideGridPdf(target,
  { x: cx + g.dx, y: cyTop + g.dy, width: g.pane, height: g.pane }, n, n,
  gapEdgesOf(pb) ? pb.answerEdges ?? [] : resultEdgesOf(pb, pair), Math.max(0.3, minLineMm));
}
