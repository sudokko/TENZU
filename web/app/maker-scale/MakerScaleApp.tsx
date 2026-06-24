"use client";

/* =========================================================================
   拡大メーカー（内部用・/maker-scale）
   copy のおためし点描写メーカー（/maker）と同じ scaffolding で、F（もとの図）
   ＋ 倍率（×2/×3）で R = scale(F, factor) を自動算出。
   - 拡大＝整数倍。固定点(始点=最初に置いた点)を不動点に 新点 = start + factor·(点 − start)
   - 自動補正なし（固定点は図形位置で切り替えない）。始点 = draw 順の先頭 edges[0].a。
     始点から拡大した結果が枠を超えたら警告のみ（自動では動かさない）
   - 拡大図が n×n 枠に収まるかをライブ判定。はみ出すと保存・PDF を抑止
   - 編集画面に「もとの図 ×N けっか」の 2 ペインを並べて結果をライブ表示
   - 保存問題は { gridSize, edges: F, factor }（アンカーは描画時に算出）
   - PDF/プレビューはもとの図ペイン=F・かくマスペイン=R（出題は空・解答は描き入れ）
   - 始点(★)を強調表示・F/R 同座標（拡大の不動点）。枠超過時は結果ペイン非表示＋警告
   - 出題＋解答を 1 PDF に連結（解答ページ上端に「かいとう」見出し）
   - 並びは答えに影響しない（紙面レイアウトだけ）
   ヘッダー・LP・フッターから動線なし。robots noindex。
   ========================================================================= */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, paneSize, gridFor,
  KGAP, CELL_PAD, PRINT_INK, DOT_SCALE, NAME_BAND_MM, nameBandSvgString, dotRadius, edgeWidth,
  type PaperKey, type LayoutPerPage, type PairLayout, type DotSize,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";

// =========================================================================
// Types & constants
// レイアウトエンジン（PAPER/gridFor/paneSize 等）は products/print.ts（SSOT）から import
// =========================================================================
type Point = { c: number; r: number };
type Edge = { a: Point; b: Point };

type GridSize = 5 | 6 | 7 | 8; // 拡大は余白が要るので最低 5×5（8×8 まで）
type ScaleFactor = 2 | 3; // 倍率（×2 が既定・×4 はオーナー判断で廃止）

type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  factor: ScaleFactor; // この問題に焼き付けた倍率（保存時に確定・収まることを検証済）
  selected: boolean;
};

/* 固定点(anchor)まわりの整数倍。anchor 自身は動かず、各点は anchor から factor 倍遠ざかる */
function scalePoint(p: Point, factor: number, anchor: Point): Point {
  return {
    c: anchor.c + factor * (p.c - anchor.c),
    r: anchor.r + factor * (p.r - anchor.r),
  };
}
function scaleEdgesOf(edges: Edge[], factor: number, anchor: Point): Edge[] {
  return edges.map((e) => ({ a: scalePoint(e.a, factor, anchor), b: scalePoint(e.b, factor, anchor) }));
}
function inGrid(edges: Edge[], n: number): boolean {
  return edges.every((e) => [e.a, e.b].every((p) => p.c >= 0 && p.c <= n - 1 && p.r >= 0 && p.r <= n - 1));
}

/* 始点（最初に置いた点 edges[0].a）＝固定点。そこを不動点に factor 倍するだけ。
   自動補正なし：固定点は図形位置で切り替えない（仕様を明快に保つ）。始点から拡大した
   結果が枠を超えるかは判定するが、自動では動かさない（始点・倍率・グリッドで人が調整）。 */
function computeScale(edges: Edge[], factor: ScaleFactor, n: number): { edges: Edge[]; star: Point | undefined; fits: boolean } {
  if (edges.length === 0) return { edges: [], star: undefined, fits: true };
  const start = edges[0].a; // 始点
  const R = scaleEdgesOf(edges, factor, start);
  return { edges: R, star: start, fits: inGrid(R, n) };
}

/* 5 角星 SVG path 文字列。pos 中心・size=外接半径。dot に重ねて基準マーカーとして使う */
function starPathD(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.4;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
  }
  return d + "Z";
}

const VIEW = 200;
// Soft ink color — used for all drawn dots/lines/labels in panes (printable side).
// UI chrome (toolbar buttons, etc.) stays at the original --fg.
const INK = "#3A424E";

// Outlined block arrow — used between もとの図 / かくマス
// 細線＋小さな矢じり（案A・2026-06-12）。x,y は線の始点。
function ArrowSVG({ x, y, size, dir, color }: {
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

/* 内部用ツールのため完了画面のレコメンドは省略（copy 側のみ） */

// =========================================================================
// PDF 生成 — jsPDF ＋ ページ SVG → 300dpi PNG 焼き込み。
// window.print() はスマホで使いものにならないため、ファイルとして
// ダウンロードさせる（コンビニ印刷・プリンタアプリにもそのまま渡せる）。
// レイアウトは印刷系と同じ gridFor / paneSize / KGAP を共有。
// =========================================================================
const PX_PER_MM = 300 / 25.4; // 300dpi

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
// starAt: その位置の点を ★ マーカーに置換（拡大の不動点を示す）
function paneSvgString(
  x: number, y: number, pane: number, gridSize: GridSize, edges: Edge[], showLines: boolean,
  dotScale: number, starAt?: Point,
): string {
  const inset = pane * 0.10;
  const step = (pane - inset * 2) / (gridSize - 1);
  const P = (c: number, r: number) => ({ x: x + inset + c * step, y: y + inset + r * step });
  const dotR = dotRadius(pane, dotScale);
  const starR = Math.max(dotR * 4.2, pane * 0.035); // 始点★（強調・大きめ）
  const labelFs = Math.max(2.2, pane * 0.058);
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
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
      if (starAt && c === starAt.c && r === starAt.r) {
        const labelY = r === gridSize - 1 ? p.y - starR - labelFs * 0.3 : p.y + starR + labelFs;
        s += `<path d="${starPathD(p.x, p.y, starR)}" fill="${PRINT_INK}"/>`;
        s += `<text x="${p.x}" y="${labelY}" text-anchor="middle" font-family="${jpFont}" font-size="${labelFs}" font-weight="700" fill="${PRINT_INK}">きてん</text>`;
      } else {
        s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
      }
    }
  }
  return s;
}

/* もとの図⇔かくマスの境界に細線矢印（模写と同じ）。拡大方向は ★ マーカーの位置で示す */
function arrowSvgString(
  cx: number, cy: number, pane: number, gap: number, pair: PairLayout,
): string {
  const aSize = gap * 0.9;
  const hd = aSize * 0.3;
  const sw = Math.max(0.35, aSize * 0.04);
  if (pair === "horizontal") {
    return `<path d="M0 0 L${aSize} 0 M${aSize - hd} ${-hd} L${aSize} 0 L${aSize - hd} ${hd}" transform="translate(${cx + pane + (gap - aSize) / 2},${cy + pane / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  return `<path d="M0 0 L0 ${aSize} M${-hd} ${aSize - hd} L0 ${aSize} L${hd} ${aSize - hd}" transform="translate(${cx + pane / 2},${cy + pane + (gap - aSize) / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

type LogoInfo = { url: string; w: number; h: number };

// なまえ・日付の記入欄 SVG は products/print.ts（nameBandSvgString）を共用。

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
  answer?: boolean; // true=解答ページ群（かくマス側に R 描画）
}): string {
  const { paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale, logo } = opts;
  const W = paper.w, H = paper.h;
  const footerH = 12;   // フッター帯（ロゴ＋ページ番号）
  const nameH = nameField ? NAME_BAND_MM : 0;
  // 解答ページのみ「かいとう」見出し帯を確保（上端）
  const titleH = opts.answer ? 12 : 0;
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - footerH - nameH - titleH, marginMm);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - footerH - nameH - titleH) / rows;
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout);
  const gap = pane * KGAP;
  const fs = Math.max(3, gap * 0.6); // ×N ラベルの字サイズ
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

    const areaY = cy;
    const areaH = cellH;
    /* 出題と解答で同じペアレイアウトを共用。違いはかくマスペインの中身だけ。
       出題: もとの図=F＋★(不動点)／かくマス=空欄＋同じ★（子が描く目印）
       解答: もとの図=F＋★／かくマス=R＋同じ★（描き入れた状態）
       境界は標準の細線矢印＋「×N」ラベル */
    const sc = computeScale(p.edges, p.factor, p.gridSize);
    const star = sc.star;
    const answerEdges = opts.answer ? sc.edges : [];
    const rightShow = Boolean(opts.answer);
    const opLabel = `×${p.factor}`;
    if (pairLayout === "horizontal") {
      const pairW = pane * 2 + gap;
      const sx = cx + (cellW - pairW) / 2;
      const sy = areaY + (areaH - pane) / 2;
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, star);
      body += paneSvgString(sx + pane + gap, sy, pane, p.gridSize, answerEdges, rightShow, dotScale, star);
      body += arrowSvgString(sx, sy, pane, gap, "horizontal");
      body += `<text x="${sx + pane + gap / 2}" y="${sy + pane / 2 - gap * 0.18}" text-anchor="middle" font-family="${jpFont}" font-size="${fs}" fill="${PRINT_INK}" font-weight="700">${opLabel}</text>`;
    } else {
      const pairH = pane * 2 + gap;
      const sx = cx + (cellW - pane) / 2;
      const sy = areaY + (areaH - pairH) / 2;
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, star);
      body += paneSvgString(sx, sy + pane + gap, pane, p.gridSize, answerEdges, rightShow, dotScale, star);
      body += arrowSvgString(sx, sy, pane, gap, "vertical");
      body += `<text x="${sx + pane / 2 + fs * 0.95}" y="${sy + pane + gap / 2 + fs * 0.35}" text-anchor="middle" font-family="${jpFont}" font-size="${fs}" fill="${PRINT_INK}" font-weight="700">${opLabel}</text>`;
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
  ink = INK,
  dotScale = 1,
  starAt,
  starInk = "#2C6E7F",
  starLabel = true,
}: {
  gridSize: GridSize;
  edges: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
  dotScale?: number;
  starAt?: Point;
  starInk?: string;   // 始点★の色（画面=teal 強調 / 印刷経路=PRINT_INK）
  starLabel?: boolean; // 「きてん」ラベルを出すか（サムネは false）
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
              stroke={ink}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      {points.map((p) => {
        const pos = dotPos(p.c, p.r, dots);
        const isSel = samePoint(selected ?? null, p);
        const isStar = starAt && p.c === starAt.c && p.r === starAt.r;
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight && isSel ? "#2C6E7F" : ink;
        const starR = Math.max(1.6 * dotScale * 4.4, 8); // 始点★を大きく
        const lastRow = p.r === dots - 1;
        const labelY = lastRow ? pos.y - starR - 4 : pos.y + starR + 12;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            {isStar
              ? <>
                  <circle cx={pos.x} cy={pos.y} r={starR * 1.5} fill={starInk} opacity={0.12} />
                  <path d={starPathD(pos.x, pos.y, starR)} fill={starInk} />
                  {starLabel && (
                    <text x={pos.x} y={labelY} textAnchor="middle" fontSize={12} fontWeight={700}
                      fill={starInk} style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>きてん</text>
                  )}
                </>
              : <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />}
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
// MakerScaleApp
// =========================================================================
type Snap = { edges: Edge[] };

export default function MakerScaleApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [edges, setEdges] = useState<Edge[]>([]); // F
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。
  const [oneStroke, setOneStroke] = useState(false);
  /* 倍率は独立選択（並びとは無関係に拡大図が決まる）。2 択: ×2/×3。保存時に問題へ焼き付ける */
  const [factor, setFactor] = useState<ScaleFactor>(2);

  // history stack — F snapshots
  const historyRef = useRef<Snap[]>([{ edges: [] }]);
  const histIdxRef = useRef<number>(0);
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((v) => v + 1);

  function pushHistory(next: Snap) {
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(next);
    histIdxRef.current = historyRef.current.length - 1;
  }
  function applySnap(s: Snap) {
    setEdges(s.edges);
    setSelected(null);
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
    pushHistory({ edges: [] });
    setEdges([]);
    setSelected(null);
  }

  function handleDot(p: Point) {
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    // 一筆書き ON: 線を引いた（消した）後、終点を次の線の始点として残す（連続描画）。
    // OFF: 従来どおり選択解除（線ごとに 2 点クリック）。
    const after = oneStroke ? p : null;
    if (edges.some((e) => edgeKey(e) === k)) {
      // 既存線をもう一度なぞる→消す
      const updated = edges.filter((e) => edgeKey(e) !== k);
      setEdges(updated);
      pushHistory({ edges: updated });
      setSelected(after);
      return;
    }
    const updated = [...edges, next];
    setEdges(updated);
    pushHistory({ edges: updated });
    setSelected(after);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    setGridSize(n);
    setEdges([]);
    setSelected(null);
    historyRef.current = [{ edges: [] }];
    histIdxRef.current = 0;
  }

  // ---- Paper / layout state ----
  /* 既定: A4 縦・となりに書く・3 問/ページ（2026-06-12 オーナー確定・商品ページと共通の基本） */
  const [paperKey, setPaperKey] = useState<PaperKey>("A4-P");
  const marginMm = 14;
  // 既定「おまかせ」= 選択した問題数を 1 ページに最適表示（用紙上限超は複数ページ）
  const [perPage, setPerPage] = useState<"auto" | LayoutPerPage>("auto");
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で上下/横を自動
  const [nameField, setNameField] = useState(false); // なまえ・日付欄（既定 OFF）
  const [dotSize, setDotSize] = useState<DotSize>("m"); // 点の大きさ（既定 中）
  const dotScale = DOT_SCALE[dotSize];

  // ---- Derived: 現在編集中の図形の拡大結果（ライブ） ----
  const cur = useMemo(() => computeScale(edges, factor, gridSize), [edges, factor, gridSize]);
  const resultEdges = cur.edges;
  const canSave = edges.length > 0 && cur.fits;
  const startPoint = edges.length > 0 ? edges[0].a : undefined; // 始点（最初に置いた点）＝固定点
  const resultStar = cur.fits ? cur.star : undefined;

  // Switching paper clamps a manual per-page count to that paper's legible maximum.
  function selectPaper(k: PaperKey) {
    setPaperKey(k);
    const max = paperMax(k);
    setPerPage((p) => (p !== "auto" && p > max ? max : p));
  }

  // ---- Saved problems ----
  const [saved, setSaved] = useState<Problem[]>([]);
  const [savingNo, setSavingNo] = useState(1);

  function saveCurrent() {
    if (!canSave) return;
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, factor, selected: true }]);
    setSavingNo((n) => n + 1);
    // reset canvas for next problem
    setEdges([]);
    setSelected(null);
    historyRef.current = [{ edges: [] }];
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
  // おまかせ = 選択数を 1 ページに（用紙上限でクランプ）。0 問時は 1 扱い。
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(paperMax(paperKey), selectedSaved.length))
    : perPage;
  // おまかせ並び = 選択 2 問以下は上下（1 問でもスカスカに見えない）・3 問以上は横。
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedSaved.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = useMemo(() => {
    const ps: Problem[][] = [];
    for (let i = 0; i < selectedSaved.length; i += effectivePerPage) {
      ps.push(selectedSaved.slice(i, i + effectivePerPage));
    }
    return ps;
  }, [selectedSaved, effectivePerPage]);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  const [exporting, setExporting] = useState(false);
  /* 出題ページ群 → 解答ページ群 を 1 つの PDF に連結。
     倍率は各問題に焼き付けた p.factor を使用（混在可） */
  async function doExport() {
    if (selectedSaved.length === 0 || exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const logo = await loadLogo();
      const orientation = paper.landscape ? "landscape" : "portrait";
      const format: [number, number] = [Math.min(paper.w, paper.h), Math.max(paper.w, paper.h)];
      const doc = new jsPDF({ orientation, unit: "mm", format });
      const totalPages = pages.length * 2; // 出題ページ群 ＋ 解答ページ群（同レイアウト）

      // 出題ページ群（もとの図=F／かくマス=空・×N 指示）
      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) doc.addPage(format, orientation);
        const svg = buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: totalPages,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout, nameField, dotScale, logo,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      // 解答ページ群（同じレイアウトで かくマス=R = scale(F, factor) を描き入れた版）
      for (let pi = 0; pi < pages.length; pi++) {
        doc.addPage(format, orientation);
        const svg = buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pages.length + pi + 1, pageCount: totalPages,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout, nameField, dotScale, logo,
          answer: true,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      const d = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
      doc.save(`tenzu_scale_${stamp}.pdf`);
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
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <header className="maker-header">
        <div className="logo-cluster">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <div className="app-name">拡大メーカー（内部用）</div>
        </div>
      </header>

      {/* 内部用ツールのため完了画面なし */}
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

          {/* 作図の設定（グリッド・倍率・点の大きさ・一筆書き）をタイトル直下のコンパクト帯に集約。各ラベル+操作は qb-group で一体折返し */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ"
                value={gridSize}
                onChange={(e) => changeGridSize(Number(e.target.value) as GridSize)}>
                {([5, 6, 7, 8] as GridSize[]).map((n) => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
            </div>
            <div className="qb-group">
              <span className="qb-label">倍率</span>
              <div className="seg qb-seg" role="group" aria-label="倍率">
                {([2, 3] as ScaleFactor[]).map((f) => (
                  <button key={f} type="button"
                    aria-pressed={factor === f}
                    onClick={() => setFactor(f)}>
                    ×{f}
                  </button>
                ))}
              </div>
            </div>
            <div className="qb-group">
              <span className="qb-label">点の大きさ</span>
              <div className="seg qb-seg" role="group" aria-label="点の大きさ">
                {(["s", "m", "l"] as const).map((k) => (
                  <button key={k} type="button"
                    aria-pressed={dotSize === k}
                    onClick={() => setDotSize(k)}>
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
            {/* もとの図 ×N けっか の 3 要素（重ね/折りメーカーと同じ overlay-boards を流用） */}
            <div className="overlay-boards">
              <div className="overlay-board">
                <span className="ob-cap">もとの図（★＝始点）</span>
                <div className="paper-pane problem" aria-label="編集中の盤面">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edges}
                    selected={selected}
                    onDotClick={handleDot}
                    showLines={true}
                    showActiveHighlight={true}
                    dotScale={dotScale}
                    starAt={startPoint}
                  />
                  <div className="pp-stamp">{gridSize}×{gridSize}</div>
                </div>
              </div>
              <div className="overlay-op">×{factor}</div>
              <div className="overlay-board">
                <span className="ob-cap">拡大した図（じどう）</span>
                <div className="paper-pane" aria-label="拡大結果のプレビュー">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={resultEdges}
                    showLines={cur.fits}
                    ink={INK}
                    dotScale={dotScale}
                    starAt={resultStar}
                  />
                  <div className="pp-stamp">けっか</div>
                </div>
              </div>
            </div>

            {edges.length > 0 && !cur.fits && (
              <div role="alert" style={{
                width: "100%", maxWidth: 760,
                background: "#fdecec", border: "1px solid #e3a0a0", color: "#b33a3a",
                borderRadius: 8, padding: "8px 12px", fontSize: 13, lineHeight: 1.5,
              }}>
                この倍率では拡大図が枠からはみ出します。<br />
                もとの図を小さく描く／倍率を下げる／グリッドを大きくしてください。
              </div>
            )}

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
              <button className="btn-save" type="button" onClick={saveCurrent} disabled={!canSave}>
                この問題を保存する
              </button>
            </div>
            <div className="canvas-help">
              <strong>最初に置いた点が「始点」（★）になります。</strong>
              ★は動きません。そこを固定して {factor} 倍に広がります。
              線を引く＝点を 2 つクリック（同じ線をもう一度で消える）。
              始点を図形の角にすると枠に収まりやすい。はみ出すときは倍率を下げる／グリッドを大きく。
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
                  const sc = computeScale(p.edges, p.factor, p.gridSize);
                  return (
                    <div className={`saved-cell${p.selected ? " sel" : ""}`} key={p.id}>
                      <button className="thumb" type="button"
                        role="checkbox"
                        aria-checked={p.selected}
                        aria-label={`問題 ${num}（×${p.factor}）を PDF に含める`}
                        onClick={() => toggleSelectSaved(p.id)}>
                        <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true}
                          starAt={sc.star} starLabel={false} />
                      </button>
                      {p.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                      <button className="del" type="button" aria-label={`問題 ${num} を削除`}
                        onClick={() => {
                          if (window.confirm(`この問題（#${num}）を削除しますか？`)) deleteSaved(p.id);
                        }}>×</button>
                      <span className="cnum">{num} · ×{p.factor}</span>
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

          <details className="settings-fold">
            <summary>
              <span className="sf-label">詳細設定<span className="sf-chevron" aria-hidden="true" /></span>
              <span className="sf-current">
                用紙: {paper.label} · 問数: {perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 並び: {pairLayout === "auto" ? "おまかせ" : pairLayout === "horizontal" ? "横" : "上下"} · 名前欄: {nameField ? "あり" : "なし"}
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
                  const g = gridFor(v, effectivePairLayout, paper.w, paper.h, marginMm);
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
              <h3>問題と書き込み欄の並び</h3>
              <div className="seg seg--pair" role="group" aria-label="問題と書き込み欄の並び">
                <button type="button"
                  aria-pressed={pairLayout === "auto"}
                  onClick={() => setPairLayout("auto")}>
                  おまかせ
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "horizontal"}
                  onClick={() => setPairLayout("horizontal")}>
                  <span className="seg-ic"><PairChipIcon pair="horizontal" /></span>
                  横に並べる
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "vertical"}
                  onClick={() => setPairLayout("vertical")}>
                  <span className="seg-ic"><PairChipIcon pair="vertical" /></span>
                  上下に並べる
                </button>
              </div>
              {pairLayout === "auto" && (
                <p className="seg-hint">問題が 2 問までは上下、3 問以上は横に自動で並べます。</p>
              )}
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
            <h3>出力プレビュー<span className="pp-paperinfo">{paper.label} · {paper.w}×{paper.h}mm</span></h3>
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
                        pairLayout={effectivePairLayout}
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

      {/* モバイル（≤1200px）専用・画面下固定の DL バー */}
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
            pairLayout={effectivePairLayout}
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
function ProblemPair({ p, pairLayout, dotScale }: { p: Problem; pairLayout: PairLayout; dotScale: number }) {
  const isH = pairLayout === "horizontal";
  const sc = computeScale(p.edges, p.factor, p.gridSize);
  const star = sc.star;
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} ink={PRINT_INK} dotScale={dotScale} starAt={star} starInk={PRINT_INK} />
        </div>
      </div>
      {/* 模写と同じ標準の細線矢印＋「×N」 */}
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <text x="20" y="7" textAnchor="middle" fontSize="8" fontWeight="700" fill={PRINT_INK}>×{p.factor}</text>
            <path d="M2 13 L38 13 M28 6 L38 13 L28 20"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <text x="17" y="23" textAnchor="middle" fontSize="8" fontWeight="700" fill={PRINT_INK}>×{p.factor}</text>
            <path d="M8 2 L8 38 M1 28 L8 38 L15 28"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題 PDF と同じく解答ペインは空。拡大の起点だけ ★ で示す */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK} dotScale={dotScale} starAt={star} />
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
  // SVG-based mini preview matching aspect of paper
  const W = paper.w, H = paper.h;
  // Page width conveys real paper size: longest selectable side (A3 = 420mm) → full width.
  const pageScale = Math.max(W, H) / 420;
  const nameH = nameField ? NAME_BAND_MM : 0;
  // Use problemsPerPage (not problems.length) so pane size stays consistent across pages.
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - nameH, marginMm);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - nameH) / rows;
  // Pane + proportional gap/pad, derived from the same model the optimizer used.
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout);
  const gap = pane * KGAP;
  const fs = Math.max(2.4, gap * 0.6);
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
          let aX: number, aY: number, bX: number, bY: number;
          /* 拡大: 境界に標準の細線矢印（模写と同じ）＋ ×N。拡大方向は ★ で示す */
          let arrowEl: ReactNode;
          let opEl: ReactNode;
          if (pairLayout === "horizontal") {
            const pairW = pane * 2 + gap;
            const startX = (cellW - pairW) / 2;
            const startY = (cellH - pane) / 2;
            aX = startX;                  aY = startY;
            bX = startX + pane + gap;     bY = startY;
            const aSize = gap * 0.9;
            arrowEl = (
              <ArrowSVG x={startX + pane + (gap - aSize) / 2} y={startY + pane / 2}
                size={aSize} dir="right" color={PRINT_INK} />
            );
            opEl = (
              <text x={startX + pane + gap / 2} y={startY + pane / 2 - gap * 0.18}
                textAnchor="middle" fontSize={fs} fontWeight={700} fill={PRINT_INK}>×{p.factor}</text>
            );
          } else {
            const pairH = pane * 2 + gap;
            const startX = (cellW - pane) / 2;
            const startY = (cellH - pairH) / 2;
            aX = startX; aY = startY;
            bX = startX; bY = startY + pane + gap;
            const aSize = gap * 0.9;
            arrowEl = (
              <ArrowSVG x={startX + pane / 2} y={startY + pane + (gap - aSize) / 2}
                size={aSize} dir="down" color={PRINT_INK} />
            );
            opEl = (
              <text x={startX + pane / 2 + fs * 0.95} y={startY + pane + gap / 2 + fs * 0.35}
                textAnchor="middle" fontSize={fs} fontWeight={700} fill={PRINT_INK}>×{p.factor}</text>
            );
          }
          const sc = computeScale(p.edges, p.factor, p.gridSize);
          const star = sc.star;
          return (
            <g key={p.id} transform={`translate(${cx},${cy})`}>
              <PreviewPane x={aX} y={aY} w={pane} h={pane}
                gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={dotScale} starAt={star} />
              <PreviewPane x={bX} y={bY} w={pane} h={pane}
                gridSize={p.gridSize} edges={[]} showLines={false} dotScale={dotScale} starAt={star} />
              {arrowEl}
              {opEl}
            </g>
          );
        })}
      </svg>
      <div className="pageno">P {pageNo} / {pageCount}</div>
    </div>
  );
}

function PreviewPane({
  x, y, w, h, gridSize, edges, showLines, dotScale, starAt,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: GridSize; edges: Edge[]; showLines: boolean; dotScale: number;
  starAt?: Point;
}) {
  // inner dots
  const dots = gridSize;
  const inset = Math.min(w, h) * 0.10;
  const stepX = (w - inset * 2) / (dots - 1);
  const stepY = (h - inset * 2) / (dots - 1);
  // 印刷（paneSvgString）と同じ比率 — プレビュー＝仕上がり
  const dotR = dotRadius(Math.min(w, h), dotScale);
  const paneMin = Math.min(w, h);
  const starR = Math.max(dotR * 4.2, paneMin * 0.035);
  const labelFs = Math.max(2.0, paneMin * 0.058);
  const lineW = edgeWidth(paneMin);
  const pos = (c: number, r: number) => ({
    x: x + inset + c * stepX,
    y: y + inset + r * stepY,
  });
  return (
    <g>
      <g fill={PRINT_INK}>
        {Array.from({ length: dots }, (_, r) =>
          Array.from({ length: dots }, (_, c) => {
            const p = pos(c, r);
            if (starAt && c === starAt.c && r === starAt.r) {
              const labelY = r === dots - 1 ? p.y - starR - labelFs * 0.3 : p.y + starR + labelFs;
              return (
                <g key={`s-${c}-${r}`}>
                  <path d={starPathD(p.x, p.y, starR)} />
                  <text x={p.x} y={labelY} textAnchor="middle" fontSize={labelFs} fontWeight={700}
                    style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>きてん</text>
                </g>
              );
            }
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
              <ProblemPair p={p} pairLayout={pairLayout} dotScale={dotScale} />
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
