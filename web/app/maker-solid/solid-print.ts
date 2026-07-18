/* =========================================================================
   立体模写メーカー専用の PDF / プレビュー ヘルパ（横長 矩形格子＋点線＝隠れ線）
   products/print.ts（次元非依存プリミティブ・SSOT）を import 流用する。
   盤面は横長の矩形（cols×rows）。点間隔は縦横で等しく保ち（セル＝正方形）、
   斜め線が歪まないようにする。ペインは正方形でないため、gridFor/paneSize は
   使わず、矩形ペイン用のレイアウト計算（solidGridFor / solidPaneH）を持つ。
   production の MakerApp / print.ts には一切手を入れない（回帰リスクゼロ）。
   ========================================================================= */
import {
  PAPER, KGAP, KPAD, CELL_PAD, PRINT_INK, NAME_BAND_MM, nameBandSvgString,
  dotRadius, edgeWidth,
  type PaperKey, type PairLayout,
} from "../products/print";
import { AXIS_INK } from "../maker/core/geometry";
// 300dpi 焼き込み・ロゴ読み込みは全メーカー共通実装（maker/core/page-svg）を流用。
// MakerSolidApp が "./solid-print" 経由で参照しているため re-export で入口を維持する。
import { PX_PER_MM, svgToPng, loadLogo, type LogoInfo } from "../maker/core/page-svg";

export { PX_PER_MM, svgToPng, loadLogo, type LogoInfo };

export type LineStyle = "solid" | "dashed";          // 見える辺 / 隠れ辺
export type SPoint = { c: number; r: number };
export type SEdge = { a: SPoint; b: SPoint; style: LineStyle };

// 点線パターン。step（点間隔）に比例させ、ペイン寸法が変わっても密度を一定に。
function dashFor(step: number) {
  return `${(step * 0.55).toFixed(2)} ${(step * 0.4).toFixed(2)}`;
}

// 格子の縦横比（点の並びのアスペクト）。横長 → ar > 1。
export function gridAspect(cols: number, rows: number) {
  return (cols - 1) / Math.max(1, rows - 1);
}

// 矩形ペインの「高さ」最大値。pw = ph * ar。ペア（みほん＋うつす）が cell に収まる ph。
function solidPaneH(cellW: number, cellH: number, pair: PairLayout, ar: number): number {
  if (pair === "horizontal") {
    // 横並び: 幅 = 2pw + gap = ph(2·ar + KGAP), 高さ = ph(1 + KPAD)
    return Math.min(cellW / (2 * ar + KGAP), cellH / (1 + KPAD));
  }
  // 上下: 幅 = pw = ph·ar, 高さ = 2ph + gap + 2pad = ph(2 + KGAP + 2·KPAD)
  return Math.min(cellW / ar, cellH / (2 + KGAP + 2 * KPAD));
}

// count 個のペアを W×H(mm) に詰める cols×rows を、ペイン高さ最大で総当たり探索。
export function solidGridFor(
  count: number, pair: PairLayout, W: number, H: number, margin: number, ar: number,
): { cols: number; rows: number } {
  const usableW = W - margin * 2;
  const usableH = H - margin * 2;
  let best = { cols: 1, rows: count, score: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const ph = solidPaneH(usableW / cols, usableH / rows, pair, ar);
    const blanks = cols * rows - count;
    const score = ph * (1 - 0.04 * (blanks / count));
    if (score > best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

// 1ペイン（矩形盤面）を mm 座標の SVG 断片で描く。点間隔は縦横で等しく中央寄せ。
// showDots=false（背景の点をとる）で格子ドットを省く。frame=true でかくマス側に薄い矩形枠を添える
// （枠は AXIS_INK の細い実線＝隠れ辺の点線＝PRINT_INK 破線とは色・線種で区別）。
export function solidPaneSvgString(
  x: number, y: number, paneW: number, paneH: number,
  cols: number, rows: number, edges: SEdge[], showLines: boolean, dotScale: number,
  showDots: boolean = true, frame: boolean = false,
): string {
  const inset = Math.min(paneW, paneH) * 0.10;
  const step = Math.min(
    (paneW - inset * 2) / Math.max(1, cols - 1),
    (paneH - inset * 2) / Math.max(1, rows - 1),
  );
  const gw = step * (cols - 1), gh = step * (rows - 1);
  const ox = x + (paneW - gw) / 2, oy = y + (paneH - gh) / 2;
  const P = (c: number, r: number) => ({ x: ox + c * step, y: oy + r * step });
  const paneMin = Math.min(paneW, paneH);
  const dotR = dotRadius(paneMin, dotScale);
  const lineW = edgeWidth(paneMin);
  let s = "";
  if (showLines) {
    for (const e of edges) {
      const a = P(e.a.c, e.a.r), b = P(e.b.c, e.b.r);
      const dash = e.style === "dashed" ? ` stroke-dasharray="${dashFor(step)}"` : "";
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${PRINT_INK}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
    }
  }
  if (showDots) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = P(c, r);
        s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
      }
    }
  }
  if (frame) {
    // 格子の外周に少し余白を足した矩形枠（点を消した書き込み欄の目印）。
    const fx = ox - step * 0.5, fy = oy - step * 0.5;
    const fw = gw + step, fh = gh + step;
    const sw = Math.max(0.25, lineW * 0.55);
    s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="none" stroke="${AXIS_INK}" stroke-width="${sw}"/>`;
  }
  return s;
}

export type SolidPageProblem = { cols: number; rows: number; edges: SEdge[] };

export function buildSolidPageSvg(opts: {
  paper: typeof PAPER[PaperKey];
  problems: SolidPageProblem[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  logo: LogoInfo | null;
  noDots?: boolean; // true=背景の点をとる（かくマス側に薄い矩形枠を添える）
}): string {
  const { paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale, logo } = opts;
  const showDots = !opts.noDots;
  const W = paper.w, H = paper.h;
  const footerH = 12;
  const nameH = nameField ? NAME_BAND_MM : 0;
  // セル割りは、このページで最も横長な図形のアスペクトに合わせる（幅広図形も収まるよう）。
  const pageAr = problems.reduce((m, p) => Math.max(m, gridAspect(p.cols, p.rows)), 0.1);
  const { cols: gcols, rows: grows } = solidGridFor(problemsPerPage, pairLayout, W, H - footerH - nameH, marginMm, pageAr);
  const cellW = (W - marginMm * 2) / gcols;
  const cellH = (H - marginMm * 2 - footerH - nameH) / grows;
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";

  let body = "";
  if (nameField) body += nameBandSvgString(W, marginMm);
  problems.forEach((p, idx) => {
    const ar = gridAspect(p.cols, p.rows);
    const pad = Math.min(cellW, cellH) * CELL_PAD;
    const ph = solidPaneH(cellW - pad * 2, cellH - pad * 2, pairLayout, ar);
    const pw = ph * ar;
    const gap = ph * KGAP;
    const aSize = gap * 0.9;
    const hd = aSize * 0.3;
    const col = idx % gcols;
    const row = Math.floor(idx / gcols);
    const cx = marginMm + col * cellW;
    const cy = marginMm + nameH + row * cellH;
    if (pairLayout === "horizontal") {
      const pairW = pw * 2 + gap;
      const sx = cx + (cellW - pairW) / 2;
      const sy = cy + (cellH - ph) / 2;
      body += solidPaneSvgString(sx, sy, pw, ph, p.cols, p.rows, p.edges, true, dotScale, showDots);
      body += solidPaneSvgString(sx + pw + gap, sy, pw, ph, p.cols, p.rows, [], false, dotScale, showDots, opts.noDots);
      body += `<path d="M0 0 L${aSize} 0 M${aSize - hd} ${-hd} L${aSize} 0 L${aSize - hd} ${hd}" transform="translate(${sx + pw + (gap - aSize) / 2},${sy + ph / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${Math.max(0.35, aSize * 0.04)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else {
      const pairH = ph * 2 + gap;
      const sx = cx + (cellW - pw) / 2;
      const sy = cy + (cellH - pairH) / 2;
      body += solidPaneSvgString(sx, sy, pw, ph, p.cols, p.rows, p.edges, true, dotScale, showDots);
      body += solidPaneSvgString(sx, sy + ph + gap, pw, ph, p.cols, p.rows, [], false, dotScale, showDots, opts.noDots);
      body += `<path d="M0 0 L0 ${aSize} M${-hd} ${aSize - hd} L0 ${aSize} L${hd} ${aSize - hd}" transform="translate(${sx + pw / 2},${sy + ph + (gap - aSize) / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${Math.max(0.35, aSize * 0.04)}" stroke-linejoin="round" stroke-linecap="round"/>`;
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
