/* =========================================================================
   ピン素材レンダリング（純関数・SSOT）
   Pinterest 用の縦長(2:3 = 1000×1500)ピンを SVG 文字列で組み立てる。
   素材は published 済みの実問題（メーカー出力そのもの）— AI 画像は使わない。
   - 3 テンプレ: P1 一問プレビュー / P2 難度ちがい / P3 まとめ表紙
   - キャプション（煽り語ゼロ・CTA はピン直リンク）＋ハッシュタグ 3-4 個＋UTM 付きメーカー URL
   描画と書き出し（canvas→PNG）は PinsApp.tsx 側。ここは文字列を作るだけ。
   ========================================================================= */
import type { Problem } from "../../products/problems/schema";
import { metricsLabel } from "../../products/problems/schema";
import { LEVEL_NAMES, volBySku, type ProductTask, type Vol } from "../../products/data";
import { PUBLISHED } from "../../products/problems/published";
import { TASK_DESC } from "../../products/task-desc";
import type { MakerKey } from "../../products/capabilities";

export const PIN_W = 1000;
export const PIN_H = 1500;

export const INK = "#3A424E";       // 画面表示の濃色（atelier と同系）
export const MUTED = "#6B7480";     // ラベル等のグレー
export const ACCENT = "#2C6E7F";    // 「到達・うつす」のみに使う差し色（design rev.5 規則）
export const JP = "'Yu Gothic','Hiragino Sans','Meiryo',sans-serif"; // ラスタライズ確実な系統フォント

export type PinTemplate = "p1" | "p2" | "p3";

/* 正方格子の n（P2 の「n×n」ラベル用。solid は 0 を返すので P2 の対象外になる）。 */
function gn(p: Problem): number {
  return p.grid.type === "square" ? p.grid.n : 0;
}

/* ---- 図形の共通表現（square と solid を 1 本にそろえる）----
   solid は edges が [] で実体が solidEdges（隠れ線 style 付き）にあるため、
   edges をそのまま描くと何も出ない。両方をここで Seg に開いてから描く。 */
export type Seg = { a: [number, number]; b: [number, number]; dashed?: boolean };

/* 問題を「n×n 格子 ＋ 線分の列」に開く。 */
export function figureOf(p: Problem): { n: number; segs: Seg[] } {
  if (p.grid.type === "square") {
    const n = p.grid.n;
    return { n, segs: p.edges.map((e) => ({ a: [e[0][0], e[0][1]], b: [e[1][0], e[1][1]] })) };
  }
  const { cols, rows } = p.grid;
  const segs = (p.solidEdges ?? []).map((e) => ({
    a: [e.a.c, e.a.r] as [number, number],
    b: [e.b.c, e.b.r] as [number, number],
    dashed: e.style === "dashed",
  }));
  return { n: Math.max(cols, rows), segs };
}

/* 本番メーカー URL（送客直行先・decisions §5.6/§5.8）。
   ドメイン確定後に差し替え。UTM はここに付与する。 */
export const MAKER_URL = "https://tenzu.jp/maker";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* 格子の座標系（点の位置・点半径・線幅）。正方格子でない solid も同じ枠に
   載せられるよう、drawFigure から切り出して export している。 */
export function lattice(n: number, ox: number, oy: number, size: number) {
  const pad = size * 0.1;
  const span = size - pad * 2;
  return {
    X: (c: number) => ox + pad + (n > 1 ? (span * c) / (n - 1) : span / 2),
    Y: (r: number) => oy + pad + (n > 1 ? (span * r) / (n - 1) : span / 2),
    dotR: Math.max(2, size * 0.013),
    ew: Math.max(2, size * 0.016),
  };
}

/* ---- 格子の点と線分を任意の箱に描く ----
   segs を空にすれば「うつす」側の空欄（点だけ）になる。隠れ線は dashed で出す。 */
export function drawFigure(
  n: number, segs: Seg[], ox: number, oy: number, size: number,
  o: { opacity?: number; dots?: boolean } = {},
): string {
  const { X, Y, dotR, ew } = lattice(n, ox, oy, size);
  let s = "";
  if (o.dots !== false)
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        s += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${INK}"/>`;
  for (const e of segs) {
    const dash = e.dashed ? ` stroke-dasharray="${(ew * 2.2).toFixed(1)} ${(ew * 1.8).toFixed(1)}"` : "";
    s += `<line x1="${X(e.a[0]).toFixed(1)}" y1="${Y(e.a[1]).toFixed(1)}" x2="${X(e.b[0]).toFixed(1)}" y2="${Y(e.b[1]).toFixed(1)}" stroke="${INK}" stroke-width="${ew.toFixed(1)}" stroke-linecap="round"${dash}/>`;
  }
  const op = o.opacity ?? 1;
  return op >= 1 ? s : `<g opacity="${op.toFixed(3)}">${s}</g>`;
}

/* 1 問をそのまま描く（square / solid を問わない）。blank は点だけの空欄。 */
export function figureGroup(
  p: Problem, ox: number, oy: number, size: number, blank = false,
): string {
  const { n, segs } = figureOf(p);
  return drawFigure(n, blank ? [] : segs, ox, oy, size);
}

/* みほん → うつす の間に置く細い矢印（差し色） */
export function arrow(x1: number, x2: number, cy: number): string {
  const headW = 26, headH = 22;
  const tip = x2, base = x2 - headW;
  return (
    `<line x1="${x1}" y1="${cy}" x2="${base}" y2="${cy}" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>` +
    `<polygon points="${tip},${cy} ${base},${cy - headH / 2} ${base},${cy + headH / 2}" fill="${ACCENT}"/>`
  );
}

export function text(
  x: number, y: number, s: string, size: number, fill: string,
  anchor: "start" | "middle" | "end" = "middle", weight = 400,
): string {
  return `<text x="${x}" y="${y}" font-family="${JP}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
}

function wrap(inner: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">` +
    `<rect width="${PIN_W}" height="${PIN_H}" fill="#FFFFFF"/>` +
    inner +
    `</svg>`
  );
}

/* 共通フッター（CTA＋業態識別句） */
function footer(): string {
  return (
    `<line x1="80" y1="1190" x2="${PIN_W - 80}" y2="1190" stroke="#E5E8EC" stroke-width="2"/>` +
    text(PIN_W / 2, 1270, "おうちで、無料で作れます。", 50, INK, "middle", 700) +
    text(PIN_W / 2, 1335, "作るのは画面、練習は紙。", 38, MUTED, "middle", 400) +
    text(PIN_W / 2, 1440, "点描写プリントの専門店　TENZU", 34, MUTED, "middle", 400)
  );
}

function ageOf(vol: Vol): string { return vol.ageLabel; }
function levelOf(vol: Vol): string { return LEVEL_NAMES[vol.lv - 1]; }

/* ---- P1: 一問プレビュー（発見用の主力ピン） ---- */
export function pinP1(task: ProductTask, vol: Vol, p: Problem): string {
  const S = 400, oxL = 70, oxR = 530, oy = 470;
  const cy = oy + S / 2;
  const head =
    text(PIN_W / 2, 150, `TENZU ｜ 点描写（${task.name}）`, 30, MUTED) +
    text(PIN_W / 2, 250, ageOf(vol), 66, INK, "middle", 700) +
    text(PIN_W / 2, 320, `${levelOf(vol)}・${metricsLabel(p.metrics, p.grid)}`, 36, MUTED);
  const pair =
    figureGroup(p, oxL, oy, S) +
    figureGroup(p, oxR, oy, S, true) +
    arrow(oxL + S + 8, oxR - 8, cy);
  return wrap(head + pair + footer());
}

/* ---- P2: 難度ちがい（保存狙い・易→難の3問） ---- */
export type P2Step = { vol: Vol; p: Problem };

/* P2 の「難度ちがい」は 1 巻の中では作れない（同一巻＝同一盤面）。
   同じタスクの published 巻から**盤面が大きくなる順に 3 巻**を拾い、
   各巻の中位問題を 1 問ずつ並べることで、はじめて易→難の階段になる。 */
export function buildP2Ladder(sku: string): P2Step[] {
  const base = PUBLISHED[sku];
  if (!base) return [];
  const mid = (set: typeof base) => set.problems[Math.floor(set.problems.length / 2)];
  /* P2 は「n×n が大きくなる順」で段を組むので正方格子の巻だけを対象にする。
     solid は盤面が cols×rows で n×n ラベルが成立しない（solid のラダーは動画側で出す）。 */
  const sameTask = Object.keys(PUBLISHED)
    .filter((s) => PUBLISHED[s].task === base.task && gn(mid(PUBLISHED[s])) > 0)
    .map((s) => ({ s, hit: volBySku(s), set: PUBLISHED[s] }))
    .filter((x): x is { s: string; hit: NonNullable<ReturnType<typeof volBySku>>; set: typeof base } => !!x.hit)
    .sort((a, b) => a.hit.vol.lv - b.hit.vol.lv || a.hit.vol.volNo - b.hit.vol.volNo);

  const steps: P2Step[] = [];
  const start = Math.max(0, sameTask.findIndex((x) => x.s === sku));
  let lastN = 0;
  for (let i = start; i < sameTask.length && steps.length < 3; i++) {
    const p = mid(sameTask[i].set);
    if (gn(p) > lastN) { steps.push({ vol: sameTask[i].hit.vol, p }); lastN = gn(p); }
  }
  for (let i = start - 1; i >= 0 && steps.length < 3; i--) {   // 上が足りなければ下から補う
    const p = mid(sameTask[i].set);
    if (!steps.some((st) => gn(st.p) === gn(p))) steps.unshift({ vol: sameTask[i].hit.vol, p });
  }
  return steps.slice(0, 3);
}

/* ---- P2: 難度ちがい（易→難の3段・巻をまたぐ） ----
   年齢は**段ごとに**その巻のラベルを出す。ピン全体で 1 本の年齢レンジを名乗ると、
   いちばん易しい盤面のままいちばん上の学年まで含んでしまい、上の学年を軽く見せる。 */
export function pinP2(task: ProductTask, steps: P2Step[]): string {
  const head =
    text(PIN_W / 2, 150, "レベルが上がると、こう変わる。", 50, INK, "middle", 700) +
    text(PIN_W / 2, 215, `${task.name}・むずかしさは自由に調整`, 34, MUTED);
  const ys = [360, 650, 940];
  const S = 220;
  let rows = "";
  steps.slice(0, 3).forEach((st, i) => {
    const oy = ys[i];
    const pn = gn(st.p);
    rows +=
      figureGroup(st.p, 90, oy, S) +
      text(360, oy + S / 2 - 44, `${pn}×${pn}　${levelOf(st.vol)}`, 42, INK, "start", 700) +
      text(360, oy + S / 2 + 8, st.vol.ageLabel, 32, MUTED, "start", 700) +
      text(360, oy + S / 2 + 58, metricsLabel(st.p.metrics, st.p.grid), 26, MUTED, "start");
  });
  return wrap(head + rows + footer());
}

/* ---- P3: まとめ表紙（第三者紹介・カルーセル表紙にも転用） ---- */
export function pinP3(task: ProductTask, vol: Vol, problems: Problem[]): string {
  const picks = sample(problems, 6);
  const head =
    text(PIN_W / 2, 150, `無料で使える 点描写 ${picks.length}選`, 54, INK, "middle", 700) +
    text(PIN_W / 2, 215, `${task.name}・${ageOf(vol)}`, 34, MUTED);
  const S = 260, xs = [70, 370, 670], ys = [300, 640];
  let cells = "";
  picks.forEach((p, i) => {
    const ox = xs[i % 3], oy = ys[Math.floor(i / 3)];
    cells += figureGroup(p, ox, oy, S);
  });
  return wrap(head + cells + footer());
}

/* 配列から等間隔に k 件サンプル（決定的） */
function sample<T>(arr: T[], k: number): T[] {
  if (arr.length <= k) return arr.slice();
  const out: T[] = [];
  for (let i = 0; i < k; i++) out.push(arr[Math.round((i * (arr.length - 1)) / (k - 1))]);
  return out;
}

/* =========================================================================
   キャプション・ハッシュタグ・UTM（煽り語ゼロのテンプレ）
   ========================================================================= */
/* 施策・シーズン（utm_campaign の値・analytics.md §3）。
   季節ピンは季節トラック（sns-operations.md §5）に合わせ 2-3 ヶ月前出しで焼く。 */
export const PIN_CAMPAIGNS = ["launch", "nyugaku-2027", "tsuyu-2027", "natsuyasumi-2027"] as const;

/* UTM（SSOT = engineering/analytics.md §3）
   campaign ＝ 施策・シーズン／content ＝ 個別クリエイティブ識別。
   sku は content 側へ入れる（campaign を sku で潰すとシーズン比較ができなくなる）。 */
export function pinUrl(
  sku: string, template: PinTemplate, campaign: string, seq?: number,
): string {
  const content =
    seq == null
      ? `pin-${template}-${sku}`
      : `pin-${template}-${sku}-${String(seq).padStart(3, "0")}`;
  return `${MAKER_URL}?utm_source=pinterest&utm_medium=pin&utm_campaign=${campaign}&utm_content=${content}`;
}

/* ハッシュタグ（SSOT = acquisition/sns-accounts.md §4.1）
   Pinterest はタグより説明文のキーワードで拾われるため 3-4 個へ絞る。
   先頭 2 つ＝ #点描写 #点図形 固定（表記階層化をタグでも保持）。
   「#空間認識」は名義・媒体を問わず使わない（voice-tone.md §1）。 */
const TAGS: Record<PinTemplate, string[]> = {
  p1: ["#点描写", "#点図形", "#知育プリント", "#おうち学習"],
  p2: ["#点描写", "#点図形", "#知育プリント", "#年長"],
  p3: ["#点描写", "#点図形", "#点つなぎ", "#知育プリント"],
};

export function pinCaption(
  template: PinTemplate, task: ProductTask, vol: Vol, p?: Problem,
): string {
  const age = ageOf(vol);
  if (template === "p1" && p) {
    return `${age}向けの点描写を1枚。${metricsLabel(p.metrics, p.grid)}。\n親が画面で作って、子どもは紙で解けます。おうちで無料・印刷してすぐ使えます。\nこのピンから、同じ問題をその場で作れます。`;
  }
  if (template === "p2") {
    return `${task.name}は、${age}から。今日の手ごたえに合わせて、やさしくも、むずかしくもできます。\n親が画面で作って、子どもは紙で解く点描写。無料で印刷できます。\nこのピンから、むずかしさを選んで作れます。`;
  }
  // p3 はタスクごとに 1 枚出る。タスク名と 1 行説明（TASK_DESC が SSOT）を
  // 入れないと、全タスクのキャプションが同一文になり重複ピン扱いを招く。
  return `「${task.name}」の点描写を、まとめました。${age}向け。\n${TASK_DESC[task.slug as MakerKey]}\n親が画面で作って、子どもは紙で解く。無料・登録不要・印刷してすぐ。\nこのピンから、そのまま作れます。`;
}

export type PinRow = {
  filename: string;
  sku: string;
  template: PinTemplate;
  campaign: string;
  age: string;
  difficulty: string;
  motif: string;
  caption: string;
  hashtags: string;
  url: string;
};

export function pinRow(
  template: PinTemplate, task: ProductTask, vol: Vol, filename: string,
  opts: { campaign: string; p?: Problem; seq?: number },
): PinRow {
  const { campaign, p, seq } = opts;
  return {
    filename,
    sku: vol.sku,
    template,
    campaign,
    age: ageOf(vol),
    difficulty: p ? metricsLabel(p.metrics, p.grid) : "—",
    motif: p?.gen.motif ?? "—",
    caption: pinCaption(template, task, vol, p),
    hashtags: TAGS[template].join(" "),
    url: pinUrl(vol.sku, template, campaign, seq),
  };
}

/* CSV（全フィールド二重引用符クォート・改行はセル内に保持） */
export function buildCsv(rows: PinRow[]): string {
  const head = ["filename", "sku", "template", "campaign", "age", "difficulty", "motif", "caption", "hashtags", "url"];
  const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [head.join(",")];
  for (const r of rows)
    lines.push([r.filename, r.sku, r.template, r.campaign, r.age, r.difficulty, r.motif, r.caption, r.hashtags, r.url].map(q).join(","));
  return "﻿" + lines.join("\r\n"); // BOM 付き（Excel 日本語対策）
}
