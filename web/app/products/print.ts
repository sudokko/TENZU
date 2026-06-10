/* =========================================================================
   印刷レイアウトエンジン（共有プリミティブ・SSOT）
   おためし点描写メーカー（/maker）と商品ページのレイアウトプレビュー／
   PDF 生成（decisions §3.48）が共用する。重複定義を作らない。
   - 紙サイズ定義（A4/B4/A3 × 縦横）と紙別の 1 ページ問数キャップ
   - gridFor: count×紙寸法からペイン最大の cols×rows を総当たり探索
   - paneSize/KGAP/KPAD: ペア（みほん→うつす）の幾何定数
   ========================================================================= */

export type PaperKey =
  | "A4-P" | "A4-L"
  | "B4-P" | "B4-L"
  | "A3-P" | "A3-L";
export type LayoutPerPage = 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12;
export type PairLayout = "horizontal" | "vertical";

export const PAPER: Record<PaperKey, { label: string; w: number; h: number; landscape: boolean; cssSize: string }> = {
  "A4-P": { label: "A4 縦", w: 210, h: 297, landscape: false, cssSize: "A4 portrait" },
  "A4-L": { label: "A4 横", w: 297, h: 210, landscape: true,  cssSize: "A4 landscape" },
  "B4-P": { label: "B4 縦", w: 257, h: 364, landscape: false, cssSize: "257mm 364mm" },
  "B4-L": { label: "B4 横", w: 364, h: 257, landscape: true,  cssSize: "364mm 257mm" },
  "A3-P": { label: "A3 縦", w: 297, h: 420, landscape: false, cssSize: "A3 portrait" },
  "A3-L": { label: "A3 横", w: 420, h: 297, landscape: true,  cssSize: "A3 landscape" },
};

export const PAPER_KEYS: PaperKey[] = ["A4-P", "A4-L", "B4-P", "B4-L", "A3-P", "A3-L"];

export const COUNT_OPTIONS: LayoutPerPage[] = [1, 2, 3, 4, 6, 8, 10, 12];

// Max problems per page by paper family — larger paper fits more pairs legibly.
export function paperMax(key: PaperKey): LayoutPerPage {
  if (key.startsWith("A4")) return 6;
  if (key.startsWith("B4")) return 10;
  return 12; // A3
}

// Pane geometry constants — arrow gap & breathing pad as fractions of the pane.
// Shared by the optimizer and the layout code so both agree on how a pair fits.
export const KGAP = 0.18; // arrow gap
export const KPAD = 0.08; // breathing pad around the pair (no もんだい/かいとう labels)

// Largest square pane that fits a pair-cell of the given size, for the orientation.
// Horizontal pair: 2 panes + gap wide, 1 pane + pad tall.
// Vertical pair:   1 pane wide, 2 panes + gap + 2 pads tall.
export function paneSize(cellW: number, cellH: number, pair: PairLayout): number {
  if (pair === "horizontal") {
    return Math.min(cellW / (2 + KGAP), cellH / (1 + KPAD));
  }
  return Math.min(cellW, cellH / (2 + KGAP + 2 * KPAD));
}

// Pick cols×rows for `count` pair-cells on a W×H page (mm) maximizing pane size.
// Dynamic: adapts to paper, pair orientation and count automatically. A light blank-cell
// penalty breaks near-ties toward a fuller grid.
export function gridFor(
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

// Block-arrow silhouette points (white fill + thin outline) within a w×h box.
export function blockArrowPoints(w: number, h: number, dir: "right" | "down"): string {
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
