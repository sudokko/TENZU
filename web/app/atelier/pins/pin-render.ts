/* =========================================================================
   ピン素材レンダリング（純関数・SSOT）
   Pinterest 用の縦長(2:3 = 1000×1500)ピンを SVG 文字列で組み立てる。
   素材は published 済みの実問題（メーカー出力そのもの）— AI 画像は使わない。
   - 3 テンプレ: P1 一問プレビュー / P2 難度ちがい / P3 まとめ表紙
   - キャプション（煽り語ゼロ）＋ハッシュタグ5個＋UTM 付きメーカー URL
   描画と書き出し（canvas→PNG）は PinsApp.tsx 側。ここは文字列を作るだけ。
   ========================================================================= */
import type { Problem } from "../../products/problems/schema";
import { metricsLabel } from "../../products/problems/schema";
import { LEVEL_NAMES, type ProductTask, type Vol } from "../../products/data";

export const PIN_W = 1000;
export const PIN_H = 1500;

const INK = "#3A424E";       // 画面表示の濃色（atelier と同系）
const MUTED = "#6B7480";     // ラベル等のグレー
const ACCENT = "#2C6E7F";    // 「到達・うつす」のみに使う差し色（design rev.5 規則）
const JP = "'Yu Gothic','Hiragino Sans','Meiryo',sans-serif"; // ラスタライズ確実な系統フォント

export type PinTemplate = "p1" | "p2" | "p3";

/* 正方格子の n（ピンは square タスク専用・solid は PinsApp で除外済み）。 */
function gn(p: Problem): number {
  return p.grid.type === "square" ? p.grid.n : 0;
}

/* 本番メーカー URL（送客直行先・decisions §5.6/§5.8）。
   ドメイン確定後に差し替え。UTM はここに付与する。 */
export const MAKER_URL = "https://tenzu.jp/maker";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---- 1 問の格子（点＋辺）を任意の箱に描く ----
   blank=true は「うつす」側の空欄（点だけ）。 */
function gridGroup(
  n: number, edges: Problem["edges"], ox: number, oy: number, size: number,
  blank = false,
): string {
  const pad = size * 0.1;
  const span = size - pad * 2;
  const X = (c: number) => ox + pad + (n > 1 ? (span * c) / (n - 1) : span / 2);
  const Y = (r: number) => oy + pad + (n > 1 ? (span * r) / (n - 1) : span / 2);
  const dotR = Math.max(2, size * 0.013);
  const ew = Math.max(2, size * 0.016);

  let dots = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      dots += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${INK}"/>`;

  let lines = "";
  if (!blank)
    for (const e of edges)
      lines += `<line x1="${X(e[0][0]).toFixed(1)}" y1="${Y(e[0][1]).toFixed(1)}" x2="${X(e[1][0]).toFixed(1)}" y2="${Y(e[1][1]).toFixed(1)}" stroke="${INK}" stroke-width="${ew.toFixed(1)}" stroke-linecap="round"/>`;

  return dots + lines;
}

/* みほん → うつす の間に置く細い矢印（差し色） */
function arrow(x1: number, x2: number, cy: number): string {
  const headW = 26, headH = 22;
  const tip = x2, base = x2 - headW;
  return (
    `<line x1="${x1}" y1="${cy}" x2="${base}" y2="${cy}" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>` +
    `<polygon points="${tip},${cy} ${base},${cy - headH / 2} ${base},${cy + headH / 2}" fill="${ACCENT}"/>`
  );
}

function text(
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
  const n = gn(p);
  const S = 400, oxL = 70, oxR = 530, oy = 470;
  const cy = oy + S / 2;
  const head =
    text(PIN_W / 2, 150, `TENZU ｜ 点描写（${task.name}）`, 30, MUTED) +
    text(PIN_W / 2, 250, ageOf(vol), 66, INK, "middle", 700) +
    text(PIN_W / 2, 320, `${levelOf(vol)}・${metricsLabel(p.metrics, p.grid)}`, 36, MUTED);
  const pair =
    gridGroup(n, p.edges, oxL, oy, S) +
    gridGroup(n, p.edges, oxR, oy, S, true) +
    arrow(oxL + S + 8, oxR - 8, cy);
  return wrap(head + pair + footer());
}

/* ---- P2: 難度ちがい（保存狙い・易→難の3問） ---- */
export function pinP2(task: ProductTask, vol: Vol, problems: Problem[]): string {
  const head =
    text(PIN_W / 2, 150, "年中さん〜小2で、ここまで。", 52, INK, "middle", 700) +
    text(PIN_W / 2, 215, `${task.name}・むずかしさは自由に調整`, 34, MUTED);
  const ys = [360, 650, 940];
  const S = 220;
  let rows = "";
  problems.slice(0, 3).forEach((p, i) => {
    const oy = ys[i];
    const pn = gn(p);
    rows +=
      gridGroup(pn, p.edges, 90, oy, S) +
      text(360, oy + S / 2 - 18, `${pn}×${pn}`, 44, INK, "start", 700) +
      text(360, oy + S / 2 + 34, metricsLabel(p.metrics, p.grid), 32, MUTED, "start");
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
    cells += gridGroup(gn(p), p.edges, ox, oy, S);
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
export function pinUrl(sku: string, template: PinTemplate, content = ""): string {
  const c = content ? `${template}-${content}` : template;
  return `${MAKER_URL}?utm_source=pinterest&utm_medium=pin&utm_campaign=${sku}&utm_content=${c}`;
}

const TAGS: Record<PinTemplate, string[]> = {
  p1: ["#点描写", "#知育プリント", "#おうち学習", "#幼児教育", "#知育"],
  p2: ["#点描写", "#知育プリント", "#おうち学習", "#年長", "#小1"],
  p3: ["#点描写", "#点つなぎ", "#知育プリント", "#おうち学習", "#幼児教育"],
};

export function pinCaption(
  template: PinTemplate, task: ProductTask, vol: Vol, p?: Problem,
): string {
  const age = ageOf(vol);
  if (template === "p1" && p) {
    return `${age}向けの点描写を1枚。${gn(p)}×${gn(p)}・${metricsLabel(p.metrics, p.grid)}。\n親が画面で作って、子どもは紙で解けます。おうちで無料・印刷してすぐ使えます。\n作り方はプロフィールのリンクから。`;
  }
  if (template === "p2") {
    return `${task.name}は、${age}ごろから。今日の手ごたえに合わせて、やさしくも、むずかしくもできます。\n親が画面で作って、子どもは紙で解く点描写。無料で印刷できます。\nプロフィールのリンクから。`;
  }
  return `おうちで使える点描写を、まとめました。${age}ごろ向け。\n親が画面で作って、子どもは紙で解けます。無料・登録不要・印刷してすぐ。\nプロフィールのリンクから試せます。`;
}

export type PinRow = {
  filename: string;
  sku: string;
  template: PinTemplate;
  age: string;
  difficulty: string;
  motif: string;
  caption: string;
  hashtags: string;
  url: string;
};

export function pinRow(
  template: PinTemplate, task: ProductTask, vol: Vol, filename: string, p?: Problem,
): PinRow {
  return {
    filename,
    sku: vol.sku,
    template,
    age: ageOf(vol),
    difficulty: p ? metricsLabel(p.metrics, p.grid) : "—",
    motif: p?.gen.motif ?? "—",
    caption: pinCaption(template, task, vol, p),
    hashtags: TAGS[template].join(" "),
    url: pinUrl(vol.sku, template, p?.id),
  };
}

/* CSV（全フィールド二重引用符クォート・改行はセル内に保持） */
export function buildCsv(rows: PinRow[]): string {
  const head = ["filename", "sku", "template", "age", "difficulty", "motif", "caption", "hashtags", "url"];
  const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [head.join(",")];
  for (const r of rows)
    lines.push([r.filename, r.sku, r.template, r.age, r.difficulty, r.motif, r.caption, r.hashtags, r.url].map(q).join(","));
  return "﻿" + lines.join("\r\n"); // BOM 付き（Excel 日本語対策）
}
