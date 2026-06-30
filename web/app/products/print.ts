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

// 設問セルの内側余白（セル短辺比）。隣の設問の点との距離が
// 格子内の点間隔より明確に広くないと設問の区切りが読めない（3×3 が最悪ケース）。
// 0.06 では既定レイアウト（A4 縦 3 問）で両者がほぼ同値（約1.07倍）。
// 0.08 で約1.3倍（オーナー調整 2026-06-12）。
export const CELL_PAD = 0.08;

// Largest square pane that fits a pair-cell of the given size, for the orientation.
// `panes` 個のペインを (panes-1) 個の gap でつないだ並び（既定 2＝みほん→うつす）。
// Horizontal: panes 枚 + (panes-1)gap 幅, 1 pane + pad 高さ。
// Vertical:   1 pane 幅, panes 枚 + (panes-1)gap + 2pad 高さ。
// panes=3（重ねメーカー /maker-overlay の「A ＋ B ＝ □」）でも同式で成立。
export function paneSize(cellW: number, cellH: number, pair: PairLayout, panes = 2): number {
  if (pair === "horizontal") {
    return Math.min(cellW / (panes + (panes - 1) * KGAP), cellH / (1 + KPAD));
  }
  return Math.min(cellW, cellH / (panes + (panes - 1) * KGAP + 2 * KPAD));
}

// Pick cols×rows for `count` pair-cells on a W×H page (mm) maximizing pane size.
// Dynamic: adapts to paper, pair orientation and count automatically. A light blank-cell
// penalty breaks near-ties toward a fuller grid.
export function gridFor(
  count: number, pair: PairLayout, W: number, H: number, margin: number, panes = 2,
): { cols: number; rows: number } {
  const usableW = W - margin * 2;
  const usableH = H - margin * 2;
  let best = { cols: 1, rows: count, score: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const pane = paneSize(usableW / cols, usableH / rows, pair, panes);
    const blanks = cols * rows - count;
    const score = pane * (1 - 0.04 * (blanks / count));
    if (score > best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

/* ---- 紙面の共通表現（点・線・矢印・記名欄）。maker と商品ページが共用 ---- */

// 印刷面の点・線・矢印用グレー — 真っ黒よりインク消費が少なく、視認性は保つ
export const PRINT_INK = "#777777";
// 記名欄など書き込み基準線の濃色
export const BAND_INK = "#3A424E";
// 各メーカー編集盤面の格子ドット色（画面表示のみ・全メーカー共通 SSOT）。
// 線（見える辺）より控えめにして、線を主役に見せる。印刷の点は PRINT_INK のまま。
export const SCREEN_DOT = "#828A94";

// 点の大きさ 3 段階（基準半径への倍率）
export type DotSize = "s" | "m" | "l";
export const DOT_SCALE: Record<DotSize, number> = { s: 1, m: 1.8, l: 2.8 };

// ペイン寸法（mm）から印刷される点の半径（mm）
export function dotRadius(pane: number, scale: number): number {
  return Math.max(0.45, pane * 0.008) * scale;
}
// 図形線の太さ（mm）
export function edgeWidth(pane: number): number {
  return Math.max(0.4, pane * 0.008);
}

// 名前・日付の記入欄（ON 時のみページ上部に 1 行）
export const NAME_BAND_MM = 11;

// 記入欄の SVG 断片（mm 座標・右寄せ）。プレビュー SVG と PDF 用ラスタライズが共用。
export function nameBandSvgString(W: number, marginMm: number): string {
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
  const R = W - marginMm;          // 右端
  const ty = marginMm + 6.4;       // テキストベースライン
  const ly = marginMm + 7.6;       // 下線
  const label = (x: number, s: string) =>
    `<text x="${x}" y="${ty}" text-anchor="end" font-family="${jpFont}" font-size="4.8" fill="${BAND_INK}">${s}</text>`;
  const line = (x1: number, x2: number) =>
    `<line x1="${x1}" y1="${ly}" x2="${x2}" y2="${ly}" stroke="${BAND_INK}" stroke-width="0.35"/>`;
  // 右から: なまえ＋長い下線 ← にち ← がつ（空欄はラベルの前）
  return (
    line(R - 117, R - 105) + label(R - 94, "がつ") +
    line(R - 92, R - 80) + label(R - 69, "にち") +
    label(R - 52, "なまえ") + line(R - 50, R)
  );
}
