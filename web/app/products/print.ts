/* =========================================================================
   印刷レイアウトエンジン（共有プリミティブ・SSOT）
   おためし点描写メーカー（/maker）と商品ページのレイアウトプレビュー／
   PDF 生成（decisions §3.48）が共用する。重複定義を作らない。
   - 紙サイズ定義（A4/B4/A3 × 縦横）と紙別の 1 ページ問数キャップ
   - gridFor: count×紙寸法からペイン最大の cols×rows を総当たり探索
   - paneSize/KGAP/KPAD: ペア（みほん→うつす）の幾何定数
   ========================================================================= */

import type { EdgeT, Pt } from "./problems/schema";

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

/* =========================================================================
   変換の指示子（回転の弧矢印・目じるし□）
   プレビュー（SVG）と PDF（pdf-lib）が同じ数式を共有する＝画面と印刷がズレない。
   いずれも「線分の並び」で返し、SVG は polyline・PDF は drawLine 列で描く。
   ========================================================================= */

/* 盤面中心まわりの回転（gen/rotate.ts・schema TransformSpec と同規約） */
export function rotPtPrint(p: Pt, n: number, deg: 90 | -90 | 180): Pt {
  if (deg === 90) return [n - 1 - p[1], p[0]];
  if (deg === -90) return [p[1], n - 1 - p[0]];
  return [n - 1 - p[0], n - 1 - p[1]];
}

/* 回転の目じるし: みほんの左上(0,0) と、その回転後の隅。
   90°右→右上・90°左→左下・180°→右下 と 3 角度が別々の隅に落ちるため、
   目じるし 1 個で角度が一意に決まる（度数の文字が要らない理由）。 */
export function rotMarkPts(n: number, deg: 90 | -90 | 180): { from: Pt; to: Pt } {
  const from: Pt = [0, 0];
  return { from, to: rotPtPrint(from, n, deg) };
}

/* 移動の目じるし: ★＝図形の起点（辞書順最小点・gen/translate.ts と同規約）／
   ●＝その行き先。巻内で方向が混在しても 1 問ごとに読み取れる。 */
export function translateMarkPts(
  edges: EdgeT[], vec: { dc: number; dr: number },
): { from: Pt; to: Pt } | null {
  if (edges.length === 0) return null;
  let a: Pt = edges[0][0];
  for (const e of edges) for (const p of e) {
    if (p[0] < a[0] || (p[0] === a[0] && p[1] < a[1])) a = p;
  }
  return { from: a, to: [a[0] + vec.dc, a[1] + vec.dr] };
}

/* 目じるし□（格子点を囲む輪郭だけの四角）。塗り点＝格子 と混同しないよう中は抜く。
   返り値は 4 辺の線分（[x1,y1,x2,y2]）。 */
export function markRingSegs(cx: number, cy: number, half: number): [number, number, number, number][] {
  const l = cx - half, r = cx + half, t = cy - half, b = cy + half;
  return [[l, t, r, t], [r, t, r, b], [r, b, l, b], [l, b, l, t]];
}

/* =========================================================================
   3 ペイン式（かさね/分解/折り重ね）の連結記号（＋ − ＝ 折り返し矢印）
   maker 各アプリの opGlyphPath と同じ数式を「線分の並び」で持つ＝
   SVG プレビューは line・PDF は drawLine で描く（回転の弧矢印と同思想）。
   x,y＝記号の中心・size＝記号の呼び寸（ペイン間ギャップ×0.5 が maker と同じ既定）。
   vertical＝縦一列の並び（＝や−は流れに直交する向きへ回転・fold は弧の向きが変わる）。
   ========================================================================= */
export type OpKind = "plus" | "minus" | "eq" | "fold";

export function opWidth(size: number): number {
  return Math.max(0.4, size * 0.1);
}

export function opSegs(
  kind: OpKind, x: number, y: number, size: number, vertical = false,
): [number, number, number, number][] {
  const s = size / 2;
  if (kind === "plus") {
    return [[x - s, y, x + s, y], [x, y - s, x, y + s]];
  }
  if (kind === "minus") {
    return vertical ? [[x, y - s, x, y + s]] : [[x - s, y, x + s, y]];
  }
  if (kind === "eq") {
    const g = size * 0.24;
    return vertical
      ? [[x - g, y - s, x - g, y + s], [x + g, y - s, x + g, y + s]]
      : [[x - s, y - g, x + s, y - g], [x - s, y + g, x + s, y + g]];
  }
  // fold: 半円の弧＋矢じり（問題1を問題2へ「折り重ねる」動き・maker-fold と同形）
  const r = size * 0.46;
  const ah = size * 0.34;
  const STEPS = 16;
  const segs: [number, number, number, number][] = [];
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    let px = cx + r * Math.cos(a0);
    let py = cy + r * Math.sin(a0);
    for (let i = 1; i <= STEPS; i++) {
      const a = a0 + ((a1 - a0) * i) / STEPS;
      const nx = cx + r * Math.cos(a);
      const ny = cy + r * Math.sin(a);
      segs.push([px, py, nx, ny]);
      px = nx; py = ny;
    }
  };
  if (!vertical) {
    // 上をまたぐ半円（左端→右端）＋右端に下向きの矢じり
    const yb = y + size * 0.26;
    arc(x, yb, Math.PI, Math.PI * 2);
    segs.push([x + r - ah * 0.5, yb - ah * 0.62, x + r, yb + ah * 0.32]);
    segs.push([x + r, yb + ah * 0.32, x + r + ah * 0.58, yb - ah * 0.46]);
  } else {
    // 左をまたぐ半円（上端→下端）＋下端に右向きの矢じり
    const xb = x - size * 0.26;
    arc(xb, y, Math.PI * 1.5, Math.PI * 0.5);
    segs.push([xb - ah * 0.62, y + r - ah * 0.5, xb + ah * 0.32, y + r]);
    segs.push([xb + ah * 0.32, y + r, xb - ah * 0.46, y + r + ah * 0.58]);
  }
  return segs;
}

/* 回転の弧矢印の半径・線幅。ペイン間ギャップ（pane*KGAP）だけだと弧が豆粒になり
   「1/4 か半周か」を読み分けられない。ドットはペインの 10%〜90% にしか置かれない＝
   ペイン端の 10% は必ず余白なので、そこまで食い込ませて弧を大きく取る。 */
export function rotArcRadius(pane: number, gap: number): number {
  return (gap + pane * 0.18) * 0.45;
}
export function rotArcWidth(pane: number, gap: number): number {
  return Math.max(0.35, rotArcRadius(pane, gap) * 0.13);
}

/* 回転の弧矢印。中心 (cx,cy) まわりに |deg| ぶんの弧を折れ線で返し、終端に矢じりを付ける。
   弧は上をまたぐ向きに固定（90°は 1/4・180°は半周）＝弧の長さがそのまま「まわす量」。 */
export function rotArcSegs(
  cx: number, cy: number, r: number, deg: 90 | -90 | 180,
): [number, number, number, number][] {
  // 画面座標（y 下向き）: 角度が増える向き＝時計回り
  const [a0, a1] = deg === 90 ? [-135, -45]
    : deg === -90 ? [-45, -135]
      : [-180, 0]; // 180°: 左から右へ半周（時計回り）
  const STEPS = 20;
  const at = (a: number): [number, number] => {
    const rad = (a * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const segs: [number, number, number, number][] = [];
  let prev = at(a0);
  for (let i = 1; i <= STEPS; i++) {
    const p = at(a0 + ((a1 - a0) * i) / STEPS);
    segs.push([prev[0], prev[1], p[0], p[1]]);
    prev = p;
  }
  // 矢じり: 終端の接線（進行方向）から左右へ開く。
  // 長さは半径の 0.30（旧 0.62 は矢じりの根元が弧の内側まで届き、90°のように
  // 弧が短いと矢じりが弧そのものを横切って線が二重に見えた）。maker の直線矢印
  // （maker/core/page-svg.ts arrowSvgString＝size*0.3）と同じ比率へそろえる。
  const tan = a1 + (a1 > a0 ? 90 : -90);
  const hd = r * 0.3;
  for (const off of [22, -22]) {
    const rad = ((tan + 180 + off) * Math.PI) / 180;
    segs.push([prev[0], prev[1], prev[0] + hd * Math.cos(rad), prev[1] + hd * Math.sin(rad)]);
  }
  return segs;
}
