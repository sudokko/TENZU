/* =========================================================================
   収録12問の内訳（可視テキスト化）のデータ導出 — LLMO/A案
   published の Problem[] から「本文に書ける日本語」を作るだけの純関数群。
   UI は持たない（SkuDetailPage と dev プレビューが共用）。
   出典: metrics/difficulty は problems/schema.ts・gen/difficulty.ts が SSOT。
   ここでは値を作らず、あるものを言葉にするだけ。
   ========================================================================= */

import {
  metricsLabel, type DifficultyParts, type GridSpec, type Problem, type SkuProblemSet,
} from "./problems/schema";
import { roundD, transformLoad } from "./problems/gen/difficulty";

export type CoverageRow = {
  no: number;
  board: string;        // "6×6" / 立体は "9×9"
  metrics: string;      // metricsLabel() の出力
  lines: number;
  diagonals: number;
  crossings: number;
  non45: number;
  transform?: string;   // 「右へ90°」「右に1・下に2」「欠け3本」等（タスク依存・無い巻もある）
  d?: number;           // 難易度スコア D（未算出の巻は undefined）
  dParts?: string;      // D の内訳（「線9.8（0.7×14）＋盤面5＋画数1.4」）。行が検算可能になる
  dDetail?: string[];   // D の導出（各項が“どう出たか”まで）。設計台帳だけが使う
  aim?: string;         // 「この問題の狙い」。atelier が山場の問題にだけ入れる想定（現状ほぼ空）
};

export type Coverage = {
  rows: CoverageRow[];
  count: number;
  board: string;        // 盤面の代表表記（混在時はレンジ）
  lines: [number, number];
  diagonals: [number, number];
  crossings: [number, number];
  non45Count: number;   // 45°でないななめを含む問題数
  d?: [number, number];
  summary: string;      // 集計文（1〜2文・そのまま本文に置ける）
  note?: string;        // タスク固有の但し書き（無い巻は undefined）
  transformLabel?: string; // 「この巻の回し方 / 動かし方」の見出し語
  showRowTransform: boolean; // 変換が巻内で1種類しかない巻は行に出さない（summary で足りる）
};

/* ---- 盤面表記 ---- */
function boardOf(grid: GridSpec): string {
  return grid.type === "solid" ? `${grid.cols}×${grid.rows}` : `${grid.n}×${grid.n}`;
}

/* ---- 変換の日本語化 ----
   回転の deg: 90=右回り／-90=左回り／180=さかさま（data.ts の variant 表記と同語彙）
   移動の dc/dr: dc>0=右・dr>0=下（画面座標＝print.ts と同規約。「右に2、下に1」表記）
   鏡は axis を出さない。v/h は「印刷時の並びに対応する代表値」であって
   問題そのものの性質ではないため（decisions §3.59）。巻の note 側で説明する。 */
function transformOf(p: Problem): string | undefined {
  const a = p.answer;
  if (!a) return undefined;
  if (a.mode === "explicit") {
    return a.edges.length > 0 ? `欠け${a.edges.length}本` : undefined;
  }
  const t = a.transform;
  if (t.type === "rotate") {
    return t.deg === 90 ? "右へ90°" : t.deg === -90 ? "左へ90°" : "180°（さかさま）";
  }
  if (t.type === "translate") {
    const parts: string[] = [];
    if (t.dc !== 0) parts.push(`${t.dc > 0 ? "右" : "左"}に${Math.abs(t.dc)}`);
    if (t.dr !== 0) parts.push(`${t.dr > 0 ? "下" : "上"}に${Math.abs(t.dr)}`);
    return parts.join("・") || undefined;
  }
  return undefined;
}

const range = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)];
const rangeText = (r: [number, number], unit: string) =>
  r[0] === r[1] ? `${r[0]}${unit}` : `${r[0]}〜${r[1]}${unit}`;

/* ---- D の内訳文字列 ----
   difficulty.parts（各項の寄与値・gen/difficulty.ts が算出）を、式セクションと
   同じ語彙で並べる。行単位で「D がどう出たか」を検算できる＝数値が主張でなく
   証明になる。項の値はすべて算出済みの寄与（係数適用後）なので、足せば D になる。
   ほぼ対称の上限（1.10×非対称値）が効いた行だけ合計と D がずれる→「上限適用」を添える。 */
export function dBreakdown(parts?: DifficultyParts, d?: number): string | undefined {
  if (!parts || d === undefined) return undefined;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const t: string[] = [];
  let sum = 0;
  const push = (label: string, v: number) => { t.push(`${label}${r1(v)}`); sum += v; };

  if (typeof parts.E === "number" && typeof parts.k === "number") {
    const kE = parts.k * parts.E;
    t.push(parts.k < 1 ? `線${r1(kE)}（${parts.k}×${r1(parts.E)}）` : `線${r1(parts.E)}`);
    sum += kE;
  } else if (typeof parts.E === "number") {
    push("線", parts.E);
    if (typeof parts.pair === "number") push("対の図", parts.pair);
  }
  if (typeof parts.A === "number" && typeof parts.B === "number") {
    push("図A ", parts.A);
    push("図B ", parts.B);
  }
  if (typeof parts["絡み"] === "number" && parts["絡み"] > 0) push("絡み", parts["絡み"]);
  if (typeof parts.G === "number") push("盤面", parts.G);
  if (typeof parts.strokes === "number" && parts.strokes > 0) push("画数", parts.strokes);
  if (typeof parts.brk === "number" && parts.brk > 0) push("くずし", parts.brk);
  if (typeof parts["変換"] === "number" && parts["変換"] > 0) push("変換", parts["変換"]);
  if (typeof parts.gap === "number" && parts.gap > 0) push("欠け", parts.gap);
  if (typeof parts.hidden === "number" && parts.hidden > 0) push("隠れ辺", parts.hidden);
  if (t.length === 0) return undefined;

  /* 丸めは式の最後に一度だけなので、内訳の合計を同じ丸めにかけると D と厳密に一致する。
     一致しない＝ほぼ対称の上限（1.10×非対称値）が効いた行。誤差許容は要らない。 */
  const capped = roundD(sum) !== d;
  return `${t.join("＋")}${capped ? "（上限適用）" : ""}`;
}

const dBreakdownOf = (p: Problem) => dBreakdown(p.difficulty?.parts, p.difficulty?.value);

/* ---- D の導出（1 行ずつ）----
   dBreakdown は「項の値」を並べるだけだが、こちらは各項が“どう出たか”まで書く。
   例: 線 2.8 ＝ 0.7（左右対称）×（たてよこ1本×1 ＋ 45°のななめ2本×1.5 ＝ 4）
   設計台帳（全部見せるページ）で使う。SKU ページは compact な dBreakdown のまま。 */
const SYM_LABEL: Record<number, string> = { 0.7: "左右対称", 0.75: "上下対称", 0.85: "ななめ対称" };

export function dBreakdownDetail(p: Problem): string[] | undefined {
  const parts = p.difficulty?.parts;
  const d = p.difficulty?.value;
  if (!parts || d === undefined) return undefined;
  const m = p.metrics;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const out: string[] = [];

  /* 線の重み。単図タスクは metrics から本数の内訳まで復元できる */
  if (typeof parts.E === "number") {
    const tate = m.lines - m.diagonals;
    const a45 = m.diagonals - m.non45;
    const gentle = m.non45Gentle ?? 0;
    const steep = m.non45 - gentle;
    const terms: string[] = [];
    if (tate > 0) terms.push(`たてよこ${tate}本×1`);
    if (a45 > 0) terms.push(`45°のななめ${a45}本×1.5`);
    if (gentle > 0) terms.push(`45°でないななめ(ゆるい)${gentle}本×4`);
    if (steep > 0) terms.push(`45°でないななめ(急)${steep}本×5`);
    const body = terms.join(" ＋ ");
    const k = parts.k ?? 1;
    const kLabel = SYM_LABEL[k];
    out.push(k < 1 && kLabel
      ? `線 ${r1(k * parts.E)} ＝ ${k}（${kLabel}）×（${body} ＝ ${r1(parts.E)}）`
      : `線 ${r1(parts.E)} ＝ ${body}`);
    if (typeof parts.pair === "number") out.push(`対の図 ${r1(parts.pair)}（同じ図をもう一度たどる）`);
  }
  /* 2 図タスクは図ごとの metrics を保存していないので、値だけを示す */
  if (typeof parts.A === "number") out.push(`図A ${r1(parts.A)}（図A の線の重み）`);
  if (typeof parts.B === "number") out.push(`図B ${r1(parts.B)}（図B の線の重み）`);
  if (typeof parts["絡み"] === "number" && parts["絡み"] > 0) {
    out.push(`絡み ${r1(parts["絡み"])} ＝ 2×${parts["絡み"] / 2}か所（A と B の交差）`);
  }

  if (typeof parts.G === "number") {
    const n = m.boardN ?? Math.max(m.bboxW ?? 0, m.bboxH ?? 0);
    const w = m.bboxW ?? n;
    const h = m.bboxH ?? n;
    out.push(`盤面 ${r1(parts.G)} ＝ 0.5×${n} ＋ 0.25×（${w} ＋ ${h}）`);
  }
  if (typeof parts.strokes === "number" && parts.strokes > 0) {
    out.push(`画数 ${r1(parts.strokes)} ＝ 0.7×（${m.strokes}画 − 1）`);
  }
  if (typeof parts.brk === "number" && parts.brk > 0) {
    out.push(`対称くずし ${r1(parts.brk)} ＝ 3×${parts.brk / 3}本（対称からずれた線）`);
  }
  if (typeof parts["変換"] === "number" && parts["変換"] > 0) {
    /* 移動量・角度の内訳は difficulty.ts の transformLoad が文言まで持つ */
    const tf = transformLoad(p);
    out.push(tf ? `${tf.label} ＝ ${r1(parts["変換"])}` : `変換 ${r1(parts["変換"])}`);
  }
  if (typeof parts.gap === "number" && parts.gap > 0) {
    out.push(`欠け ${r1(parts.gap)} ＝ 2×${parts.gap / 2}本（補う線分）`);
  }
  if (typeof parts.hidden === "number" && parts.hidden > 0) {
    out.push(`隠れ辺 ${r1(parts.hidden)} ＝ 3×${parts.hidden / 3}本（点線で描く辺）`);
  }
  if (out.length === 0) return undefined;

  const sum = (parts.k ?? 1) * (parts.E ?? 0) + (parts.pair ?? 0)
    + (parts.A ?? 0) + (parts.B ?? 0) + (parts["絡み"] ?? 0)
    + (parts.G ?? 0) + (parts.strokes ?? 0) + (parts.brk ?? 0)
    + (parts["変換"] ?? 0) + (parts.gap ?? 0) + (parts.hidden ?? 0);
  out.push(roundD(sum) === d
    ? `合計 ＝ ${d}`
    : `合計 ${r1(sum)} → ほぼ対称の上限（対称なしで計算した値の1.10倍）で止めて ${d}`);
  return out;
}

/* ---- タスク固有の但し書き＋「この巻の変換」まとめ ---- */
function noteOf(task: string, rows: CoverageRow[]): { note?: string; transformLabel?: string } {
  const kinds = [...new Set(rows.map((r) => r.transform).filter(Boolean))] as string[];
  if (task === "mirror") {
    return {
      note: "鏡の線は、印刷時の並べ方（横に並べる／下に並べる）で左右の鏡・上下の鏡が切り替わります。同じ12問をどちらの向きでも使えます。",
    };
  }
  if (task === "rotate" && kinds.length > 0) {
    if (kinds.length === 1) {
      return { transformLabel: "この巻の回し方", note: `${rows.length}問すべて ${kinds[0]}。` };
    }
    const counts = kinds.map((k) => `${k}（${rows.filter((r) => r.transform === k).length}問）`);
    return { transformLabel: "この巻の回し方", note: `${kinds.length}通りが混ざります — ${counts.join("／")}` };
  }
  if (task === "translate" && kinds.length > 0) {
    /* 区切りは「／」。ラベル自身が「右に1・下に1」と "・" を含むため、
       "・" で連結すると 8 通りが 12 個に見えてしまう */
    return { transformLabel: "この巻の動かし方", note: `${kinds.length}通り — ${kinds.join("／")}` };
  }
  if (task === "fill" && kinds.length > 0) {
    const ns = rows.map((r) => Number((r.transform ?? "").replace(/[^0-9]/g, ""))).filter((n) => n > 0);
    return ns.length ? { note: `欠けている線は ${rangeText(range(ns), "本")}。` } : {};
  }
  return {};
}

export function coverageOf(set: SkuProblemSet): Coverage {
  const rows: CoverageRow[] = set.problems.map((p, i) => ({
    no: i + 1,
    board: boardOf(p.grid),
    metrics: metricsLabel(p.metrics, p.grid),
    lines: p.metrics.lines,
    diagonals: p.metrics.diagonals,
    crossings: p.metrics.crossings,
    non45: p.metrics.non45,
    transform: transformOf(p),
    d: p.difficulty?.value,
    dParts: dBreakdownOf(p),
    dDetail: dBreakdownDetail(p),
    aim: p.aim,
  }));

  /* 盤面表記。立体は 1 問ごとに矩形の縦横が変わるので、種類数ではなく「点の数」の
     レンジで言う（9種類（9×9〜8×7）のような、大小の分からない書き方を避ける） */
  const boards = [...new Set(rows.map((r) => r.board))]
    .sort((a, b) => {
      const area = (s: string) => s.split("×").reduce((x, y) => x * Number(y), 1);
      return area(a) - area(b);
    });
  const board = boards.length === 1 ? boards[0]
    : boards.length <= 3 ? boards.join("・")
    : `${boards[0]}〜${boards[boards.length - 1]}（問題ごとに変わります）`;

  const lines = range(rows.map((r) => r.lines));
  const diagonals = range(rows.map((r) => r.diagonals));
  const crossings = range(rows.map((r) => r.crossings));
  const non45Count = rows.filter((r) => r.non45 > 0).length;
  const symCount = set.problems.filter(
    (p) => p.metrics.symAxis && p.metrics.symAxis !== "none" && p.metrics.symMiss === 0,
  ).length;
  const ds = rows.map((r) => r.d).filter((v): v is number => typeof v === "number");
  const d = ds.length === rows.length ? range(ds) : undefined;

  /* 集計文。語彙は D 式（gen/difficulty.ts）と同じものだけを使う（交差・かたちは
     式に入っていないので言わない）。「やさしい順」は D が概ね昇順という実態に
     合わせて "おおむね" と書く（厳密な昇順ではない巻がある＝盛らない） */
  const s: string[] = [
    `この巻は ${board} の盤面で全 ${rows.length} 問。`,
    `線は ${rangeText(lines, "本")}、`,
    diagonals[1] === 0 ? "ななめの線は登場しません。" : `ななめは ${rangeText(diagonals, "本")}。`,
  ];
  if (non45Count > 0) s.push(`45°でないななめを含む問題が ${non45Count} 問あります。`);
  if (symCount > 0) s.push(`左右・上下・ななめに対称な図形が ${symCount} 問。`);
  if (d) s.push(`難易度スコア D は ${d[0]}〜${d[1]}。おおむねやさしい順に並べています。`);

  const kinds = new Set(rows.map((r) => r.transform).filter(Boolean));

  return {
    rows, count: rows.length, board, lines, diagonals, crossings, non45Count, d,
    summary: s.join("").replace(/、$/, "。"),
    showRowTransform: kinds.size >= 2,
    ...noteOf(set.task, rows),
  };
}
