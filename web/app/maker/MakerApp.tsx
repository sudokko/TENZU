"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  taskBySlug, volHref, LEVEL_NAMES, PRICE, QUESTIONS_PER_VOL, type Vol,
} from "../products/data";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, paneSize, gridFor,
  KGAP, CELL_PAD, PRINT_INK, SCREEN_DOT, DOT_SCALE, NAME_BAND_MM, nameBandSvgString, dotRadius, edgeWidth,
  type PaperKey, type LayoutPerPage, type PairLayout, type DotSize,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import {
  capabilities, ownsMaker, FREE_MAKER, MAKER_PRICE, type MakerKey, type GridSize,
} from "../products/capabilities";
import { useAuth } from "../AuthContext";
import { buyMaker } from "./buyMaker";
import { EdgeHitLayer, ModeToggle } from "./erase";

// =========================================================================
// Types & constants
// レイアウトエンジン（PAPER/gridFor/paneSize 等）は products/print.ts（SSOT）から import
// =========================================================================
type Point = { c: number; r: number };
type Edge = { a: Point; b: Point };

// GridSize（3|4|5|6）は capabilities.ts（tier ゲート SSOT）で定義。

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
// 2つの辺集合が同一か（順序無視）。編集中の「未保存変更あり」判定に使う。
function edgesEqual(a: Edge[], b: Edge[]) {
  if (a.length !== b.length) return false;
  const ka = new Set(a.map(edgeKey));
  return b.every((e) => ka.has(edgeKey(e)));
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

// 有料機能の鍵アイコン（「奪う」でなく「発見」: ロック要素はプレビューしつつ /pricing へ誘導）
function Lock() {
  return (
    <svg className="lockico" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      <rect x="2.5" y="5.3" width="7" height="4.7" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4 5.3 V3.9 a2 2 0 0 1 4 0 V5.3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// =========================================================================
// 完了画面レコメンド — 模写タスク8段ラダー（products/data.ts SSOT）から
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

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
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
}): string {
  const { paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale, logo } = opts;
  const W = paper.w, H = paper.h;
  const footerH = 12;   // フッター帯（ロゴ＋ページ番号）
  const nameH = nameField ? NAME_BAND_MM : 0;
  const { cols, rows } = gridFor(problemsPerPage, pairLayout, W, H - footerH - nameH, marginMm);
  const cellW = (W - marginMm * 2) / cols;
  const cellH = (H - marginMm * 2 - footerH - nameH) / rows;
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const pane = paneSize(cellW - pad * 2, cellH - pad * 2, pairLayout);
  const gap = pane * KGAP;
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";

  let body = "";
  if (nameField) body += nameBandSvgString(W, marginMm);
  problems.forEach((p, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = marginMm + col * cellW;
    const cy = marginMm + nameH + row * cellH;

    const areaY = cy;
    const areaH = cellH;
    const aSize = gap * 0.9;
    if (pairLayout === "horizontal") {
      const pairW = pane * 2 + gap;
      const sx = cx + (cellW - pairW) / 2;
      const sy = areaY + (areaH - pane) / 2;
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale);
      body += paneSvgString(sx + pane + gap, sy, pane, p.gridSize, [], false, dotScale);
      const hd = aSize * 0.3;
      body += `<path d="M0 0 L${aSize} 0 M${aSize - hd} ${-hd} L${aSize} 0 L${aSize - hd} ${hd}" transform="translate(${sx + pane + (gap - aSize) / 2},${sy + pane / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${Math.max(0.35, aSize * 0.04)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else {
      const pairH = pane * 2 + gap;
      const sx = cx + (cellW - pane) / 2;
      const sy = areaY + (areaH - pairH) / 2;
      body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale);
      body += paneSvgString(sx, sy + pane + gap, pane, p.gridSize, [], false, dotScale);
      const hd = aSize * 0.3;
      body += `<path d="M0 0 L0 ${aSize} M${-hd} ${aSize - hd} L0 ${aSize} L${hd} ${aSize - hd}" transform="translate(${sx + pane / 2},${sy + pane + (gap - aSize) / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${Math.max(0.35, aSize * 0.04)}" stroke-linejoin="round" stroke-linecap="round"/>`;
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
  onEdgeErase,
  erase = false,
  showLines,
  showActiveHighlight,
  ink = INK,
  dotScale = 1,
}: {
  gridSize: GridSize;
  edges: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  onEdgeErase?: (i: number) => void;
  erase?: boolean;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
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
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight ? (isSel ? "#2C6E7F" : SCREEN_DOT) : ink;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />
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
      {interactive && erase && onEdgeErase && (
        <EdgeHitLayer edges={edges} pos={(c, r) => dotPos(c, r, dots)} onErase={onEdgeErase} />
      )}
    </svg>
  );
}

// =========================================================================
// MakerApp
// =========================================================================
export default function MakerApp({ initialOwned = [] }: { initialOwned?: MakerKey[] }) {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // ---- capabilities ----
  // 模写は無料で 4×4 まで（decisions §4.6/§4.7）。ゲートはグリッドサイズ 1 本＝
  // 用紙・問数・記名欄・保存・DL は無料でも全開放。5×5〜8×8 は ¥980 買い切りで解放。
  // 初期値は SSR の cookie（initialOwned）→ /api/me 確定値（useAuth）で置換。
  const { owned: liveOwned, ready } = useAuth();
  const owned = ready ? liveOwned : initialOwned;
  const isOwned = ownsMaker(owned, FREE_MAKER);
  const caps = capabilities(owned, FREE_MAKER);

  // 5×5 以上をクリック → 模写メーカーの買い切り（¥980）へ。owned になれば 8×8 まで解放。
  const [buying, setBuying] = useState(false);
  async function buyCopy() {
    if (buying) return;
    setBuying(true);
    try { await buyMaker(FREE_MAKER); }
    catch (e) { alert(e instanceof Error ? e.message : "購入に進めませんでした"); setBuying(false); }
  }
  // 大きい用紙など（COPY_FREE_CAPS では全開放なので未所有でも通常は出ない）の保険導線。
  function goMakers() {
    window.location.href = "/makers";
  }
  const lockHint = "ほかのメーカー（買い切り ¥980）で使えます";

  // ---- Editor state (current problem) ----
  // 初期グリッド: 所有なら 5×5、無料（4×4 上限）なら 4×4 から（SSR の initialOwned で確定）。
  const [gridSize, setGridSize] = useState<GridSize>(() => {
    const c = capabilities(initialOwned, FREE_MAKER);
    return (c.gridSizes.includes(5) ? 5 : c.gridSizes[c.gridSizes.length - 1]) as GridSize;
  });
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。細かいグリッドで連打が辛い人が ON にする。
  const [oneStroke, setOneStroke] = useState(false);
  // 消す（消しゴム）モード。ON のあいだは線をクリックでその1本を削除（描画は止まる）。
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;

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

  // 消すモード: 線をクリック → その辺を削除
  function eraseEdge(i: number) {
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    pushHistory(updated);
  }

  function handleDot(p: Point) {
    if (erase) return; // 消すモードでは点クリックでは描かない
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    // 一筆書き ON: 線を引いた後、終点を次の線の始点として残す（連続描画）。
    // OFF: 従来どおり選択解除（線ごとに 2 点クリック）。
    const after = oneStroke ? p : null;
    if (edges.some((e) => edgeKey(e) === k)) {
      setSelected(after);
      return;
    }
    const updated = [...edges, next];
    setEdges(updated);
    pushHistory(updated);
    setSelected(after);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    setGridSize(n);
    setEdges([]);
    setSelected(null);
    historyRef.current = [[]];
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

  // Switching paper clamps a manual per-page count to that paper's legible maximum.
  function selectPaper(k: PaperKey) {
    if (!caps.papers.includes(k)) { goMakers(); return; }
    setPaperKey(k);
    const max = paperMax(k);
    setPerPage((p) => (p !== "auto" && p > max ? max : p));
  }

  // 所有状態の確定（/api/me）で caps が変わったとき、各設定を現上限へ丸める。
  // caps は capabilities() が返すモジュール定数＝参照安定なので、所有が変化した時だけ発火する。
  useEffect(() => {
    if (!caps.gridSizes.includes(gridSize)) changeGridSize(caps.gridSizes[caps.gridSizes.length - 1]);
    if (!caps.papers.includes(paperKey)) setPaperKey("A4-P");
    if (!caps.dotSizes.includes(dotSize)) setDotSize("m");
    if (!caps.nameField && nameField) setNameField(false);
    setPerPage((p) => (p !== "auto" && p > caps.perPageMax ? "auto" : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caps]);

  // ---- Saved problems ----
  const [saved, setSaved] = useState<Problem[]>([]);
  const [savingNo, setSavingNo] = useState(1);

  const savedFull = saved.length >= caps.savedMax;
  // 編集後/新規保存の共通リセット（キャンバスを空に戻す）
  function resetCanvas() {
    setEdges([]);
    setSelected(null);
    historyRef.current = [[]];
    histIdxRef.current = 0;
  }
  function saveCurrent() {
    if (edges.length === 0) return;
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edges } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    if (saved.length >= caps.savedMax) { goMakers(); return; } // 保存上限 → アップグレード導線
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, selected: true }]);
    setSavingNo((n) => n + 1);
    resetCanvas();
  }
  // 保存済み問題をエディタに読み込んで編集モードへ。未保存の変更があれば確認。
  function startEdit(id: string) {
    if (id === editingId) return; // すでにこれを編集中
    const p = saved.find((x) => x.id === id);
    if (!p) return;
    const dirty = editingId
      ? (() => { const o = saved.find((x) => x.id === editingId); return !o || !edgesEqual(edges, o.edges); })()
      : edges.length > 0;
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の問題を編集しますか？"
      : "作りかけの問題があります。破棄して編集しますか？")) return;
    setGridSize(p.gridSize);
    setEdges(p.edges);
    setSelected(null);
    historyRef.current = [p.edges];
    histIdxRef.current = 0;
    setEditingId(id);
    rerender();
  }
  // 編集をやめて新規モードへ（変更は破棄）
  function cancelEdit() {
    setEditingId(null);
    resetCanvas();
  }
  function toggleSelectSaved(id: string) {
    setSaved((s) => s.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  }
  function deleteSaved(id: string) {
    setSaved((s) => s.filter((p) => p.id !== id));
    if (id === editingId) cancelEdit(); // 編集中の問題を消したら編集モードも解除
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
  // 1 ページ問数の実上限 = 用紙の上限 ∩ tier の上限。
  const perPageCap = Math.min(paperMax(paperKey), caps.perPageMax);
  // おまかせ = 選択数を 1 ページに（上限でクランプ）。0 問時は 1 扱い。
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(perPageCap, selectedSaved.length))
    : Math.min(perPage, perPageCap);
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

  // ---- 1 日の DL ソフトガード（ゲストのみ・localStorage・回避可能だが「無制限に見せない」）----
  const [todayExports, setTodayExports] = useState(0);
  const QUOTA_KEY = "tenzu_maker_quota";
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTA_KEY);
      if (raw) { const q = JSON.parse(raw); if (q && q.date === todayStr()) setTodayExports(q.count || 0); }
    } catch { /* 壊れた値は無視 */ }
  }, []);
  function bumpExports() {
    setTodayExports((n) => {
      const next = n + 1;
      try { localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: todayStr(), count: next })); } catch { /* quota 無視 */ }
      return next;
    });
  }
  const overDailyLimit = caps.dailyExports != null && todayExports >= caps.dailyExports;

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
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout, nameField, dotScale, logo,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      // tenzu_yyyymmddhhmm.pdf — 2回目以降の上書き事故を防ぐタイムスタンプ命名
      const d = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
      doc.save(`tenzu_${stamp}.pdf`);
      bumpExports();
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

  const editingNo = isEditing ? saved.findIndex((p) => p.id === editingId) + 1 : 0;
  const editingTitle = isEditing
    ? `問題 #${String(editingNo).padStart(2, "0")} を編集中`
    : `問題 #${(saved.length + 1).toString().padStart(2, "0")} を作る`;

  const paper = PAPER[paperKey];

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <header className="maker-header">
        <div className="logo-cluster">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <div className="app-name">模写メーカー</div>
        </div>
        <div className="maker-auth">
          <a className="ma-link" href="/account">マイページ</a>
          <a className="ma-cta" href="/makers">ほかのメーカー</a>
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
          <div className={`canvas-toolbar${isEditing ? " editing" : ""}`}>
            <div className="title">{editingTitle}</div>
          </div>

          {/* 作図の設定をタイトル直下のコンパクト帯に集約。各ラベル+操作は qb-group で一体折返し */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ"
                value={gridSize}
                disabled={isEditing}
                onChange={(e) => {
                  const n = Number(e.target.value) as GridSize;
                  if (!caps.gridSizes.includes(n)) { buyCopy(); return; }
                  changeGridSize(n);
                }}>
                {([3, 4, 5, 6, 7, 8] as GridSize[]).map((n) => (
                  <option key={n} value={n}>
                    {n}×{n}{caps.gridSizes.includes(n) ? "" : `（¥${MAKER_PRICE}で解放）`}
                  </option>
                ))}
              </select>
            </div>
            <ModeToggle erase={erase} onChange={changeErase} />
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
            {erase
              ? <span className="qb-note">消すモード：線をクリックすると、その線だけ消えます。</span>
              : isEditing
                ? <span className="qb-note">編集中はグリッドは固定されます。</span>
                : oneStroke
                  ? <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>
                  : !isOwned && (
                    <span className="qb-note">無料は 4×4 まで。5×5〜8×8 は ¥{MAKER_PRICE} の買い切りで解放できます。</span>
                  )}
          </div>

          <div className="canvas-stage">
            {/* 戻る・進む・全消去 — 作図盤面の真上に（スマホで指の近く・2026-06-25） */}
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
            <div className="paper-pair">
              <div className="paper-pane problem" aria-label="編集中の盤面">
                <PaperSVG
                  gridSize={gridSize}
                  edges={edges}
                  selected={selected}
                  onDotClick={handleDot}
                  onEdgeErase={eraseEdge}
                  erase={erase}
                  showLines={true}
                  showActiveHighlight={true}
                  dotScale={dotScale}
                />
                <div className="pp-stamp">{gridSize}×{gridSize}</div>
              </div>
            </div>
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent}
                disabled={isEditing ? edges.length === 0 : (edges.length === 0 && !savedFull)}>
                {isEditing ? "変更を保存" : "この問題を保存する"}
              </button>
              {isEditing && (
                <button className="btn-cancel-edit" type="button" onClick={cancelEdit}>
                  やめる
                </button>
              )}
              {savedFull && !isEditing && (
                <p className="save-cap-note">
                  模写メーカーで保存できるのは {caps.savedMax} 問まで。
                  <a href="/makers">ほかのメーカー（買い切り）は保存無制限 →</a>
                </p>
              )}
            </div>
            <div className="canvas-help">
              {isEditing
                ? "保存済みの問題を編集中です。線を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。"
                : "点をクリックして線をつなぎます。印刷時は、同じ大きさの書き込み用の空欄がセットで付きます。仕上がりは「出力プレビュー」で確認できます。"}
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
                  const beingEdited = editingId === p.id;
                  return (
                    <div className={`saved-cell${p.selected ? " sel" : ""}${beingEdited ? " editing" : ""}`} key={p.id}>
                      <button className="thumb" type="button"
                        role="checkbox"
                        aria-checked={p.selected}
                        aria-label={`問題 ${num} を PDF に含める`}
                        onClick={() => toggleSelectSaved(p.id)}>
                        <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} />
                      </button>
                      {p.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                      {beingEdited && <span className="edit-mark" aria-hidden="true">編集中</span>}
                      <span className="cnum">{num}</span>
                      {/* 編集・削除は大きいラベル付きボタンを横並び（角の極小×は廃止＝誤タップ対策・案B 2026-06-21） */}
                      <div className="cell-actions">
                        <button className="act-edit" type="button"
                          aria-label={`問題 ${num} を編集`}
                          aria-pressed={beingEdited}
                          onClick={() => startEdit(p.id)}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M10.5 2.5 L13.5 5.5 L5.5 13.5 L2.5 13.5 L2.5 10.5 Z"
                              fill="none" stroke="currentColor" strokeWidth="1.4"
                              strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                          <span className="lbl">{beingEdited ? "編集中" : "編集"}</span>
                        </button>
                        <button className="act-del" type="button" aria-label={`問題 ${num} を削除`}
                          onClick={() => {
                            if (window.confirm(`この問題（#${num}）を削除しますか？`)) deleteSaved(p.id);
                          }}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M 2.5 4.5 L 13.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 6 4.5 L 6 3 L 10 3 L 10 4.5" stroke="currentColor" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <path d="M 4 4.5 L 5 13.5 L 11 13.5 L 12 4.5" stroke="currentColor" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                      </div>
                      <div className="order">
                        <button type="button" aria-label="ひとつ前へ" disabled={i === 0}
                          onClick={() => moveSaved(p.id, -1)}>‹</button>
                        <button type="button" aria-label="ひとつ後へ" disabled={i === saved.length - 1}
                          onClick={() => moveSaved(p.id, 1)}>›</button>
                      </div>
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
                  const locked = !caps.papers.includes(k);
                  return (
                    <button key={k} type="button"
                      className={locked ? "locked" : undefined}
                      aria-pressed={paperKey === k}
                      onClick={() => selectPaper(k)}
                      title={locked ? lockHint : undefined}>
                      <span className="pname">{p.label}{locked && <Lock />}</span>
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
                  const locked = v > caps.perPageMax;
                  return (
                  <button key={v} type="button"
                    className={locked ? "locked" : undefined}
                    aria-pressed={perPage === v}
                    onClick={() => (locked ? goMakers() : setPerPage(v))}
                    title={locked ? lockHint : undefined}>
                    <span className="ldiagram"
                      style={{
                        gridTemplateColumns: `repeat(${g.cols}, 1fr)`,
                        gridTemplateRows:    `repeat(${g.rows}, 1fr)`,
                      }}>
                      {Array.from({ length: g.cols * g.rows }, (_, i) => <span key={i} />)}
                    </span>
                    <span className="lnum">{v} 問{locked && <Lock />}</span>
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
                  className={!caps.nameField ? "locked" : undefined}
                  aria-pressed={nameField}
                  onClick={() => (caps.nameField ? setNameField(true) : goMakers())}
                  title={!caps.nameField ? lockHint : undefined}>
                  つける{!caps.nameField && <Lock />}
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
            {overDailyLimit && (
              <p className="daily-nudge">
                きょうは {caps.dailyExports} 枚そろいました。もっと作りたくなったら
                <a href="/makers"> ほかのメーカーも（買い切り ¥980）→</a>
              </p>
            )}
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
      )}

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
    return "まっすぐの線がすらすら書けていたら、つぎは「斜め」が壁になります。同じ3×3のまま、斜め線だけが加わる一冊を下に置いておきますね。";
  }
  if (maxGrid >= 6) {
    return `${maxGrid}×${maxGrid}まで描けたら、もう十分すぎる手ごたえです。あとは角度を自由にしたり、紙の上で好きなだけ伸ばしたり。同じ細かさから始められる一冊も、下に置いておきますね。`;
  }
  if (maxGrid >= 5) {
    return "5×5がちょうどよければ、もう点描写の標準サイズです。ここから先は、角度が自由になったり、マスがもっと広がったり。一段ずつ伸ばしていけます。";
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
            あなたが作った問題: 最大 {reco.maxGrid}×{reco.maxGrid} · 斜め線{reco.usedDiag ? "あり" : "なし"}
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

        <div className="done-upsell">
          <span className="who">メーカーをもっと使うなら</span>
          <p>
            鏡・平行移動・回転・欠け補完・重ね・分解・折り重ね。模写の次の一手は、
            「動かす・重ねる」メーカー（各 ¥980 の買い切り）。頭の中で形を操る練習へ進めます。
          </p>
          <a className="done-ghost" href="/makers">メーカー一覧を見る →</a>
        </div>

        <div className="done-actions">
          <button type="button" className="done-back" onClick={onBack}>← つづきを作る</button>
          <a className="done-home" href="/">お店を見る →</a>
        </div>

      </div>
    </main>
  );
}

// =========================================================================
// Sub-components: PreviewPage (sidebar PDF preview) & PrintPage (print sheet)
// =========================================================================
function ProblemPair({ p, pairLayout, dotScale }: { p: Problem; pairLayout: PairLayout; dotScale: number }) {
  const isH = pairLayout === "horizontal";
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} ink={PRINT_INK} dotScale={dotScale} />
        </div>
      </div>
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 11 L38 11 M28 3 L38 11 L28 19"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 2 L11 38 M3 28 L11 38 L19 28"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
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
                y={startY + pane / 2}
                size={aSize}
                dir="right"
                color={PRINT_INK}
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
                x={startX + pane / 2}
                y={startY + pane + (gap - aSize) / 2}
                size={aSize}
                dir="down"
                color={PRINT_INK}
              />
            );
          }
          return (
            <g key={p.id} transform={`translate(${cx},${cy})`}>
              <PreviewPane x={aX} y={aY} w={pane} h={pane}
                gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={dotScale} />
              <PreviewPane x={bX} y={bY} w={pane} h={pane}
                gridSize={p.gridSize} edges={[]} showLines={false} dotScale={dotScale} />
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
  x, y, w, h, gridSize, edges, showLines, dotScale,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: GridSize; edges: Edge[]; showLines: boolean; dotScale: number;
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
