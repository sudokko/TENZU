/* =========================================================================
   メーカー共通・PDF ページ SVG エンジン（純 TS・React 非依存）
   - paneSvgString: 1ペイン（盤面）の SVG 断片（全メーカー byte-identical だった実装）
   - buildPageSvgFrame: ページの共通フレーム（記名欄・解答見出し帯・セル配置・
     フッター・svg ラッパー）。ペインの中身＝タスク固有部分は renderCell で注入する
   - svgToPng / loadLogo: 300dpi PNG 焼き込みとロゴ読み込み
   レイアウト値（PAPER/gridFor/paneSize/KGAP 等）は products/print.ts（SSOT）。
   ========================================================================= */

import {
  PAPER, paneSize, gridFor, KGAP, CELL_PAD, PRINT_INK, NAME_BAND_MM,
  nameBandSvgString, dotRadius, edgeWidth,
  type PaperKey, type PairLayout,
} from "../../products/print";
import { AXIS_INK, type Edge } from "./geometry";

export const PX_PER_MM = 300 / 25.4; // 300dpi

export type LogoInfo = { url: string; w: number; h: number };

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
// showDots=false（図形模写トライアル §背景の点をとる）で背景ドットを省く。
export function paneSvgString(
  x: number, y: number, pane: number, gridSize: number, edges: Edge[], showLines: boolean,
  dotScale: number, showDots: boolean = true,
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
  if (showDots) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const p = P(c, r);
        s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
      }
    }
  }
  return s;
}

// 点を消したペインの目印（薄い正方形の枠）。「背景の点をとる」ON 時、かくマス側にだけ添える
// （みほん側は線そのものが目印になるため枠は不要）。
export function paneFrameSvgString(x: number, y: number, pane: number): string {
  const inset = pane * 0.02;
  const sw = Math.max(0.25, pane * 0.006);
  const s = pane - inset * 2;
  return `<rect x="${x + inset}" y="${y + inset}" width="${s}" height="${s}" fill="none" stroke="${AXIS_INK}" stroke-width="${sw}"/>`;
}

/* 出題→解答の矢印（ペイン間）。細線＋小さな矢じり（案A・2026-06-12） */
export function arrowSvgString(x: number, y: number, size: number, dir: "right" | "down"): string {
  const hd = size * 0.3;
  const sw = Math.max(0.35, size * 0.04);
  const d = dir === "right"
    ? `M0 0 L${size} 0 M${size - hd} ${-hd} L${size} 0 L${size - hd} ${hd}`
    : `M0 0 L0 ${size} M${-hd} ${size - hd} L0 ${size} L${hd} ${size - hd}`;
  return `<path d="${d}" transform="translate(${x},${y})" fill="none" stroke="${PRINT_INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/* みほん⇔解答の境界を表す薄い点線（鏡面）。pair の進行方向と垂直に引く。
   horizontal: 鏡面は縦線（gap の中央を上下に貫通）
   vertical  : 鏡面は横線（gap の中央を左右に貫通） */
export function mirrorPlaneSvgString(
  cx: number, cy: number, pane: number, gap: number, pair: PairLayout,
): string {
  const lineW = edgeWidth(pane);
  const dashLen = (pane * 0.025).toFixed(2);
  const dashGap = (pane * 0.02).toFixed(2);
  const sw = Math.max(0.3, lineW * 0.7);
  if (pair === "horizontal") {
    const mx = cx + pane + gap / 2;
    const y1 = cy - pane * 0.05;
    const y2 = cy + pane * 1.05;
    return `<line x1="${mx}" y1="${y1}" x2="${mx}" y2="${y2}" stroke="${AXIS_INK}" stroke-width="${sw}" stroke-dasharray="${dashLen} ${dashGap}" stroke-linecap="round"/>`;
  }
  const my = cy + pane + gap / 2;
  const x1 = cx - pane * 0.05;
  const x2 = cx + pane * 1.05;
  return `<line x1="${x1}" y1="${my}" x2="${x2}" y2="${my}" stroke="${AXIS_INK}" stroke-width="${sw}" stroke-dasharray="${dashLen} ${dashGap}" stroke-linecap="round"/>`;
}

/* ページ内 1 セル（1 問）の配置ジオメトリ。renderCell がペイン・矢印等を書き込む */
export type PageCellCtx = {
  cx: number;      // セル左上 x（mm）
  cy: number;      // セル左上 y（mm）
  cellW: number;
  cellH: number;
  pane: number;    // 1 ペインの一辺（mm）
  gap: number;     // ペイン間ギャップ（mm）
  pairLayout: PairLayout;
  dotScale: number;
};

export function buildPageSvgFrame<P>(opts: {
  paper: typeof PAPER[PaperKey];
  problems: P[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  logo: LogoInfo | null;
  answer?: boolean;   // true=解答ページ群（「かいとう」見出し帯を上端に確保）
  panes?: 2 | 3;      // 3=A+B=解の三連セル（overlay/fold/decompose）
  renderCell: (p: P, ctx: PageCellCtx) => string;
}): string {
  const { paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale, logo } = opts;
  const W = paper.w, H = paper.h;
  const footerH = 12;   // フッター帯（ロゴ＋ページ番号）
  const nameH = nameField ? NAME_BAND_MM : 0;
  // 解答ページのみ「かいとう」見出し帯を確保（上端）
  const titleH = opts.answer ? 12 : 0;
  const panes = opts.panes ?? 2;
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - footerH - nameH - titleH, marginMm, panes);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - footerH - nameH - titleH) / rows;
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout, panes);
  const gap = pane * KGAP;
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";

  let body = "";
  if (nameField) body += nameBandSvgString(W, marginMm);
  if (opts.answer) {
    // 「かいとう」見出し（左寄せ・グレー）。ひらがなで親しみ
    const ty = marginMm + nameH + 7;
    body += `<text x="${marginMm}" y="${ty}" font-family="${jpFont}" font-size="6" fill="#3A424E" font-weight="600" letter-spacing="0.8">かいとう</text>`;
  }
  problems.forEach((p, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = marginMm + col * cellW;
    const cy = marginMm + nameH + titleH + row * cellH;
    body += opts.renderCell(p, { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale });
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

export function svgToPng(svg: string, wMm: number, hMm: number): Promise<string> {
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

export async function loadLogo(): Promise<LogoInfo | null> {
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
