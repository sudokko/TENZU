/* Instagram「最初の 9 投稿グリッド」生成（2026-09-01 新設）
   企画表: docs/drafts/sns/ig/2026-09-01-grid9/plan.md
   設計 SSOT: acquisition/sns-accounts.md §4.2 ／ 3 群: product/pack-design.md §13.7

   FONTCONFIG_PATH=C:/dev/TENZU/.fonts npx tsx scripts/export-ig-grid9.ts --post g1 --out <dir>

   描画プリミティブは export-ig-carousel.ts と同形。あちらは 2026-08-26 の
   固定投稿を出力した実績のあるスクリプトで、再生成の必要がないため凍結してある
   （共通化して壊すより、投稿済みの出力を再現できる状態を残すほうを採る）。      */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { PUBLISHED } from "../app/products/problems/published";
import { LEVEL_NAMES } from "../app/products/data";
import { edgeKey, mirrorEdges } from "../app/products/problems/schema";
import type { Problem, SolidEdge, EdgeT } from "../app/products/problems/schema";
/* 変換・合成は商品の解答と一致させる必要があるので、必ず本番のロジックを通す
   （自前計算すると紙面と食い違い、投稿が嘘になる）。 */
import { rotateEdges } from "../app/products/problems/gen/rotate";
import { toRenderProblems, composeTriple } from "../app/products/problems/render";

const W = 1080, H = 1350;
const FG = "#1A1F2A", FG2 = "#424955", FG3 = "#767D89";
const ACCENT = "#2C6E7F", RULE = "#E5E3DC";
const KLEE = "Klee One";
const P = 45, O = 22.5;

const arg = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const outRoot = path.resolve(process.cwd(), arg("--out") ?? "../docs/drafts/sns/ig/2026-09-01-grid9");
const only = (arg("--post") ?? "").toLowerCase();

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* 日本語の行分割（禁則: 行頭に来てはいけない字は前行へ送る） */
const NO_HEAD = "、。，．）」』】〉》〕｝!?！？ゝゞーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ・：；";
function wrapJa(s: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of s) {
    if (line.length >= max && !NO_HEAD.includes(ch)) { out.push(line); line = ""; }
    line += ch;
  }
  if (line) out.push(line);
  return out;
}

function text(x: number, y: number, s: string, size: number, fill = FG, weight = 400,
              anchor: "start" | "middle" = "start", ls = 0) {
  return `<text x="${x}" y="${y}" font-family="${KLEE}" font-size="${size}" font-weight="${weight}"`
       + ` fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
function block(x: number, y: number, lines: string[], size: number, lh: number,
               fill = FG, weight = 400, anchor: "start" | "middle" = "start") {
  return lines.map((l, i) => text(x, y + i * lh, l, size, fill, weight, anchor)).join("");
}

/* 正方格子の 1 問（blank=写す側の空欄） */
function grid(n: number, edges: Problem["edges"], ox: number, oy: number, size: number, blank = false) {
  const pad = size * 0.08, span = size - pad * 2;
  const X = (c: number) => ox + pad + (n > 1 ? (span * c) / (n - 1) : span / 2);
  const Y = (r: number) => oy + pad + (n > 1 ? (span * r) / (n - 1) : span / 2);
  const dotR = Math.max(2.5, size * 0.014), ew = Math.max(2.5, size * 0.017);
  let s = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    s += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${FG}"/>`;
  if (!blank) for (const e of edges)
    s += `<line x1="${X(e[0][0]).toFixed(1)}" y1="${Y(e[0][1]).toFixed(1)}" x2="${X(e[1][0]).toFixed(1)}" y2="${Y(e[1][1]).toFixed(1)}" stroke="${FG}" stroke-width="${ew.toFixed(1)}" stroke-linecap="round"/>`;
  return s;
}

/* 立体の盤面（cols×rows の点格子＋隠れ線 style つき solidEdges） */
function solidGrid(cols: number, rows: number, edges: SolidEdge[],
                   ox: number, oy: number, w: number, h: number, blank = false) {
  const padX = w * 0.06, padY = h * 0.06;
  const spanX = w - padX * 2, spanY = h - padY * 2;
  const X = (c: number) => ox + padX + (cols > 1 ? (spanX * c) / (cols - 1) : spanX / 2);
  const Y = (r: number) => oy + padY + (rows > 1 ? (spanY * r) / (rows - 1) : spanY / 2);
  const dotR = Math.max(2.2, Math.min(w, h) * 0.011), ew = Math.max(2.4, Math.min(w, h) * 0.015);
  let s = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    s += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${FG}"/>`;
  if (!blank) for (const e of edges) {
    /* 隠れ線の style は "dashed"（schema.ts SolidLineStyle）。published で
       隠れ線を持つのは solid-lv5-vol2 のみで、lv3〜lv5-vol1 は 0 本。 */
    const dash = e.style === "dashed" ? ` stroke-dasharray="${(ew * 2.4).toFixed(1)} ${(ew * 2).toFixed(1)}"` : "";
    s += `<line x1="${X(e.a.c).toFixed(1)}" y1="${Y(e.a.r).toFixed(1)}" x2="${X(e.b.c).toFixed(1)}" y2="${Y(e.b.r).toFixed(1)}"`
       + ` stroke="${FG}" stroke-width="${ew.toFixed(1)}" stroke-linecap="round"${dash}/>`;
  }
  return s;
}

/* 「うつす」の矢印（到達方向なので accent を使う唯一の場所） */
function arrow(cx: number, cy: number) {
  return `<path d="M ${cx - 25} ${cy} L ${cx + 25} ${cy} M ${cx + 7} ${cy - 13} L ${cx + 25} ${cy} L ${cx + 7} ${cy + 13}"`
       + ` stroke="${ACCENT}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

let lattice = "";
for (let y = O; y < H; y += P) for (let x = O; x < W; x += P)
  lattice += `<circle cx="${x}" cy="${y}" r="1.9"/>`;

function page(inner: string, n: number, total: number) {
  const pager = n > 0 ? text(90, H - 58, `${n} / ${total}`, 26, FG3, 400, "start") : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
       + `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`
       + `<g fill="${FG}" opacity="0.16">${lattice}</g>${inner}${pager}</svg>`;
}

/* ── 1 枚目テンプレ（9 投稿で共通）──
   上: カテゴリラベル（＋罫）／中: フック（Klee 600・最大）／サブ 1-2 行／
   下: 実問題 1 点／最下: 業態識別句

   カテゴリを頭に置くのは、固定投稿（店の名乗りが中央に来る名刺）とグリッドの
   サムネで見分けるため。毎回同じ識別句を頭に置くと固定投稿と同質化する。      */
function cover(category: string, hook: string, sub: string[], figure: string) {
  let s = text(W / 2, 150, category, 29, FG3, 400, "middle", 4);
  s += `<line x1="${W / 2 - 60}" y1="188" x2="${W / 2 + 60}" y2="188" stroke="${RULE}" stroke-width="2"/>`;
  /* 13 字 × 68px ≒ 884px で本文幅（1080 − 余白 90×2）に収まる。11 字だと
     「1 巻 ¥200 の理由。」が「理 / 由。」で割れる。 */
  const hl = wrapJa(hook, 13);
  s += block(W / 2, 300, hl, 68, 96, FG, 600, "middle");
  s += block(W / 2, 300 + hl.length * 96 + 26, sub, 34, 54, FG2, 400, "middle");
  s += figure;
  s += text(W / 2, H - 78, "点図形（点描写）プリントの専門店", 25, FG3, 400, "middle");
  return page(s, 0, 0);
}

/* 中面（kicker 番号＋見出し＋本文＋図） */
function slide(kicker: string, head: string, body: string, figure: string, n: number, total: number) {
  const hl = wrapJa(head, 13);
  let s = text(90, 175, kicker, 28, FG3, 400, "start", 2);
  s += block(90, 275, hl, 66, 92, FG, 600);
  const by = 275 + hl.length * 92 + 40;
  s += block(90, by, wrapJa(body, 21), 36, 64, FG2, 400);
  return page(s + figure, n, total);
}

/* まとめ（末尾・CTA）
   固定投稿の締め（s8-matome）は「文→図」の順。こちらは図を先に大きく置いて
   上下を入れ替える。CTA の 2 行だけは §4.2 が固定を要求するので統一する。   */
function outro(lines: string[], figure: string) {
  let s = figure;
  s += block(W / 2, 730, lines, 56, 88, FG, 600, "middle");
  const cy = 730 + lines.length * 88 + 56;
  s += text(W / 2, cy, "保存して、見返してください", 34, FG2, 600, "middle");
  s += text(W / 2, cy + 52, "くわしくはプロフィールのリンクから", 30, FG3, 400, "middle");
  s += text(W / 2, H - 40, "点図形（点描写）プリントの専門店", 25, FG3, 400, "middle");
  return page(s, 0, 0);
}

/* ロゴは原本 PNG に焼かれた版から線だけをアルファ抽出して使う
   （Klee One で "TENZU" と打つのはロゴではない・visual-identity §5.3）。 */
const LOGO_SRC = "C:/dev/TENZU/logodesign/SNS_background.png";
async function logoPlate(w: number, h: number, paper: number, solid: number, floor: number) {
  const { data, info } = await sharp(LOGO_SRC)
    .extract({ left: 1650, top: 30, width: 333, height: 230 }).resize(w, h).greyscale()
    .raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height, ch = info.channels;
  const alpha = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    const a = ((paper - data[i * ch]) / (paper - solid)) * 255;
    alpha[i] = a < floor ? 0 : a > 255 ? 255 : a;
  }
  const ink = await sharp({ create: { width: w, height: h, channels: 3, background: FG } }).png().toBuffer();
  return sharp(ink).joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer();
}

const pick = (sku: string, i: number) => PUBLISHED[sku].problems[i];

/* 欠け補完（fill）の出題図 = edges − answer.edges。
   render.ts のとおり fill の answer は「抜く線 R」で、published の edges は
   完成形。edges をそのまま描くと解答図になり、欠けが見えない。 */
function fillShown(p: Problem): EdgeT[] {
  if (p.answer?.mode !== "explicit") return p.edges;
  const gone = new Set(p.answer.edges.map(edgeKey));
  return p.edges.filter((e) => !gone.has(edgeKey(e)));
}
const gn = (p: Problem) => (p.grid.type === "square" ? p.grid.n : 0);
const sg = (p: Problem) => (p.grid.type === "solid" ? p.grid : { cols: 9, rows: 9 });

type Slide = { name: string; svg: string; logo?: { w: number; h: number; x: number; y: number } };

/* 固定投稿 2026-08-26-hajimete が使っている問題（重複を避ける）
   s1/s4: copy-lv3-vol1[6] ／ s2: copy-lv2-vol1[4] ／ s3: 各タスク[3] ／
   s4: copy-lv1-vol1[5]・copy-lv5-vol1[4] ／ s5: copy-lv3-vol2[3] ／
   s6: copy-lv2-vol1[9] ／ s7: copy-lv1-vol1[1] ／ s8: copy-lv3-vol2[4]
   グリッドに並ぶ以上、同じ図を使うと「同じ投稿が 2 つある」ように見える。 */

/* ══ G1: タスク紹介 A「見て写す」（pack-design §13.7 A 群）══ */
function g1(): Slide[] {
  const out: Slide[] = [];
  const T = 6;

  /* 1 表紙 */
  {
    const p = pick("copy-lv3-vol1", 4);
    const fig = grid(gn(p), p.edges, W / 2 - 175, 700, 350);
    out.push({ name: "s1-hyoshi.png", svg: cover("見て写す", "見て、写す。",
      ["形をそのまま読み取る、いちばんの基礎。", "立体に起こすところまで。"], fig) });
  }

  /* 2 模写 */
  {
    const p = pick("copy-lv2-vol1", 11);
    const n = gn(p);
    let fig = grid(n, p.edges, 105, 880, 330) + grid(n, p.edges, 645, 880, 330, true);
    fig += arrow(540, 1045);
    fig += text(270, 1265, "みほん", 30, FG3, 400, "middle") + text(810, 1265, "うつす", 30, FG3, 400, "middle");
    out.push({ name: "s2-mosha.png", svg: slide("01", "模写",
      "見本のとおりに、点をつないで写す。どこから書き始めるかを、自分で決めるところから始まります。", fig, 2, T) });
  }

  /* 3 立体模写 */
  {
    const p = pick("solid-lv3-vol1", 0);
    const g = sg(p);
    const se = p.solidEdges ?? [];
    /* 立体は 9×9＝81 点あり、正方格子（4×4 等）と並べると点が細かく見える。
       「みほん→うつす」の対比は s2 で見せているので、ここは 1 点を大きく置く。 */
    let fig = solidGrid(g.cols, g.rows, se, 285, 800, 510, 450);
    fig += text(W / 2, 1290, "9×9 の点で、立体を起こす", 30, FG3, 400, "middle");
    /* この巻（lv3）は隠れ線 0 本なので、点線の話はしない（文と図が食い違う）。
       隠れ線は solid-lv5-vol2 の特徴で、商品ページ側の仕事にする。 */
    out.push({ name: "s3-solid.png", svg: slide("02", "模写（立体）",
      "平面の点から、立体を起こして写す。同じ点の上で、奥行きのある形として見る練習です。", fig, 3, T) });
  }

  /* 4 欠け補完 */
  {
    const p = pick("fill-lv2-vol1", 8);
    const n = gn(p);
    /* 左＝出題図（欠けたまま）／右＝閉じた形。1 図では「欠けている」が伝わらない。 */
    let fig = grid(n, fillShown(p), 105, 880, 330) + grid(n, p.edges, 645, 880, 330);
    fig += arrow(540, 1045);
    fig += text(270, 1265, "かけている", 30, FG3, 400, "middle") + text(810, 1265, "とじる", 30, FG3, 400, "middle");
    out.push({ name: "s4-fill.png", svg: slide("03", "欠け補完",
      "足りない辺を補って、形を閉じる。写すのではなく、何が足りないかを先に見つける練習です。", fig, 4, T) });
  }

  /* 5 レベルの幅 */
  {
    const steps: [string, number][] = [["copy-lv1-vol1", 11], ["copy-lv3-vol1", 1], ["copy-lv5-vol1", 1]];
    const S = 250, xs = [95, 415, 735];
    let fig = "";
    steps.forEach(([sku, idx], i) => {
      const p = pick(sku, idx);
      fig += grid(gn(p), p.edges, xs[i], 880, S);
      fig += text(xs[i] + S / 2, 1180, `${gn(p)}×${gn(p)}`, 32, FG, 600, "middle");
    });
    out.push({ name: "s5-level.png", svg: slide("04", "同じ「写す」でも",
      "点の数が増えると、見るべきところも増えます。3 つのタスクは、それぞれレベル別に分かれています。", fig, 5, T) });
  }

  /* 6 まとめ */
  {
    const p = pick("copy-lv3-vol2", 1);
    const fig = grid(gn(p), p.edges, W / 2 - 200, 195, 400);
    out.push({ name: "s6-matome.png", svg: outro(["見て写すは、", "図形を読みとる", "いちばんの入口。"], fig),
      /* ロゴ下部の「ー・ー」まで含めて Lockup（visual-identity §5.3）。
         150px 幅だとこの部分が潰れるため、締めのロゴは 190px で置く。 */
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } });
  }
  return out;
}

/* 移動は dc/dr を足すだけ（rotate/mirror と違い専用ロジックを持たない） */
const moveEdges = (edges: EdgeT[], dc: number, dr: number): EdgeT[] =>
  edges.map((e) => [[e[0][0] + dc, e[0][1] + dr], [e[1][0] + dc, e[1][1] + dr]] as EdgeT);

/* 3 図を横に並べる（かさね・分解・折り重ねの 3 ペイン） */
function triptych(n: number, a: EdgeT[], b: EdgeT[], r: EdgeT[], op: string,
                  labels: [string, string, string], y = 850) {
  const S = 280, xs = [45, 400, 755];
  let s = grid(n, a, xs[0], y, S) + grid(n, b, xs[1], y, S) + grid(n, r, xs[2], y, S);
  const oy = y + S / 2 + 8;
  s += text(388, oy, op, 44, FG2, 400, "middle");
  s += text(743, oy, "=", 44, FG2, 400, "middle");
  labels.forEach((l, i) => { s += text(xs[i] + S / 2, y + S + 62, l, 27, FG3, 400, "middle"); });
  return s;
}

/* ══ G2: タスク紹介 B「かたちを動かす」（鏡・移動・回転）══ */
function g2(): Slide[] {
  const out: Slide[] = [];
  const T = 6;

  /* 1 表紙 */
  {
    const p = pick("rotate-lv3-vol1", 2);
    const fig = grid(gn(p), p.edges, W / 2 - 175, 700, 350);
    out.push({ name: "s1-hyoshi.png", svg: cover("かたちを動かす", "頭の中で、動かす。",
      ["向きを変える、動かす、裏返す。", "頭の中で形を操る力。"], fig) });
  }

  /* 2 鏡 */
  {
    const p = pick("mirror-lv2-vol1", 5);
    const n = gn(p);
    const axis = p.answer?.mode === "derived" && p.answer.transform.type === "mirror"
      ? p.answer.transform.axis : "v";
    let fig = grid(n, p.edges, 105, 880, 330) + grid(n, mirrorEdges(p.edges, n, axis), 645, 880, 330);
    /* 折り目（軸）を 2 図の間に立てる */
    fig += `<line x1="540" y1="885" x2="540" y2="1205" stroke="${ACCENT}" stroke-width="3" stroke-dasharray="10 8"/>`;
    fig += text(270, 1265, "もとの形", 30, FG3, 400, "middle") + text(810, 1265, "うつした形", 30, FG3, 400, "middle");
    out.push({ name: "s2-mirror.png", svg: slide("01", "鏡",
      "線を折り目にして、裏返した形を書く。左右が入れかわるので、写すのとは頭の使い方が変わります。", fig, 2, T) });
  }

  /* 3 移動 */
  {
    const p = pick("translate-lv2-vol1", 6);
    const n = gn(p);
    const v = p.answer?.mode === "derived" && p.answer.transform.type === "translate"
      ? p.answer.transform : { dc: 1, dr: 0 };
    let fig = grid(n, p.edges, 105, 880, 330) + grid(n, moveEdges(p.edges, v.dc, v.dr), 645, 880, 330);
    fig += arrow(540, 1045);
    /* 方向を言わない「N マスずらす」は指示として不正確（縦横斜めが区別できない） */
    const dir = `${v.dr > 0 ? "下" : v.dr < 0 ? "上" : ""}${v.dc > 0 ? "右" : v.dc < 0 ? "左" : ""}`;
    const dist = Math.max(Math.abs(v.dc), Math.abs(v.dr));
    fig += text(270, 1265, "もとの形", 30, FG3, 400, "middle")
         + text(810, 1265, `${dir}へ ${dist} マス`, 30, FG3, 400, "middle");
    out.push({ name: "s3-translate.png", svg: slide("02", "移動",
      "形をくずさずに、指示された数だけずらして書く。同じ形のまま位置だけを変える練習です。", fig, 3, T) });
  }

  /* 4 回転 */
  {
    const p = pick("rotate-lv2-vol1", 7);
    const n = gn(p);
    const deg = p.answer?.mode === "derived" && p.answer.transform.type === "rotate"
      ? p.answer.transform.deg : 90;
    let fig = grid(n, p.edges, 105, 880, 330) + grid(n, rotateEdges(p.edges, n, deg), 645, 880, 330);
    fig += arrow(540, 1045);
    const label = deg === 180 ? "180° まわす" : deg === 90 ? "右へ 90° まわす" : "左へ 90° まわす";
    fig += text(270, 1265, "もとの形", 30, FG3, 400, "middle") + text(810, 1265, label, 30, FG3, 400, "middle");
    out.push({ name: "s4-rotate.png", svg: slide("03", "回転",
      "盤面ごと回した形を書く。紙を回さずに、頭の中で向きを変えて考えます。", fig, 4, T) });
  }

  /* 5 同じ形を 3 通りに */
  {
    const p = pick("mirror-lv2-vol1", 9);
    const n = gn(p);
    /* 元の形を置かずに 3 変換だけ並べると「同じ形」が伝わらない（別々の形に見える）。
       上に元図、下に 3 通りの 2 段構成にする。 */
    const S = 185, xs = [125, 447, 769];
    let fig = grid(n, p.edges, W / 2 - S / 2, 770, S);
    fig += text(W / 2, 770 + S + 40, "もとの形", 29, FG, 600, "middle");
    /* 移動先は盤面に収まる向きを選ぶ（固定で +1 すると図が盤面外へ出る） */
    const cs = p.edges.flatMap((e) => [e[0][0], e[1][0]]);
    const dc = Math.max(...cs) < n - 1 ? 1 : Math.min(...cs) > 0 ? -1 : 0;
    [mirrorEdges(p.edges, n, "v"), rotateEdges(p.edges, n, 90), moveEdges(p.edges, dc, 0)]
      .forEach((e, i) => { fig += grid(n, e, xs[i], 1040, S); });
    ["裏返す", "まわす", "ずらす"].forEach((l, i) => {
      fig += text(xs[i] + S / 2, 1262, l, 28, FG3, 400, "middle");
    });
    out.push({ name: "s5-three.png", svg: slide("04", "同じ形でも",
      "ひとつの形から、裏返す・まわす・ずらすで別の見え方が生まれます。動かし方ごとに巻が分かれています。", fig, 5, T) });
  }

  /* 6 まとめ */
  {
    const p = pick("rotate-lv3-vol2", 3);
    const fig = grid(gn(p), p.edges, W / 2 - 200, 195, 400);
    out.push({ name: "s6-matome.png", svg: outro(["形を動かす力は、", "紙の上ではなく", "頭の中で育つ。"], fig),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } });
  }
  return out;
}

/* ══ G3: タスク紹介 C「重ねる・分ける」（かさね・分解・折り重ね）══ */
function g3(): Slide[] {
  const out: Slide[] = [];
  const T = 6;
  const tri = (sku: string, i: number) => {
    const rp = toRenderProblems(PUBLISHED[sku])[i];
    return { rp, t: composeTriple(rp, "horizontal")! };
  };

  /* 1 表紙 */
  {
    const p = pick("overlay-lv3-vol1", 2);
    const fig = grid(gn(p), p.edges, W / 2 - 175, 700, 350);
    out.push({ name: "s1-hyoshi.png", svg: cover("重ねる・分ける", "重ねる。分ける。",
      ["複数の形を組み立てたり、", "分けたりして読みとく力。"], fig) });
  }

  /* 2 かさね */
  {
    const { rp, t } = tri("overlay-lv2-vol1", 5);
    const fig = triptych(rp.n, t.a, t.b, t.result, "+", ["ひとつめ", "ふたつめ", "かさねた形"]);
    out.push({ name: "s2-overlay.png", svg: slide("01", "かさね",
      "2 つの形を重ねると、どんな形になるか。頭の中で 2 枚を合わせて 1 枚にします。", fig, 2, T) });
  }

  /* 3 分解 */
  {
    const { rp, t } = tri("decompose-lv2-vol1", 4);
    const fig = triptych(rp.n, t.a, t.b, t.result, "−", ["ぜんたい", "とりのぞく", "のこる形"]);
    out.push({ name: "s3-decompose.png", svg: slide("02", "分解",
      "重なった形から、片方を取りのぞくと何が残るか。かさねの逆をたどります。", fig, 3, T) });
  }

  /* 4 折り重ね */
  {
    const { rp, t } = tri("fold-lv2-vol1", 6);
    const fig = triptych(rp.n, t.a, t.b, t.result, "+", ["おもて", "うら", "折り重ねた形"]);
    out.push({ name: "s4-fold.png", svg: slide("03", "折り重ね",
      "折り目で重ねたとき、線がどう合わさるか。裏返しと重ねを同時に考えます。", fig, 4, T) });
  }

  /* 5 レベルの幅 */
  {
    const steps: [string, number][] = [["overlay-lv3-vol1", 5], ["overlay-lv4-vol1", 4], ["overlay-lv5-vol1", 2]];
    const S = 250, xs = [95, 415, 735];
    let fig = "";
    steps.forEach(([sku, idx], i) => {
      const p = pick(sku, idx);
      fig += grid(gn(p), p.edges, xs[i], 880, S);
      fig += text(xs[i] + S / 2, 1185, `${gn(p)}×${gn(p)}`, 32, FG, 600, "middle");
    });
    out.push({ name: "s5-level.png", svg: slide("04", "重なりが増えると",
      "盤面が広がるほど、2 つの形の重なり方も複雑になります。3 つのタスクは、それぞれレベル別に分かれています。", fig, 5, T) });
  }

  /* 6 まとめ */
  {
    const p = pick("decompose-lv3-vol1", 2);
    const fig = grid(gn(p), p.edges, W / 2 - 200, 195, 400);
    out.push({ name: "s6-matome.png", svg: outro(["2 つの形を、", "1 つとして読む。", "その練習。"], fig),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } });
  }
  return out;
}

/* ══ 図解プリミティブ（G4 以降）══
   選び方・裏側の投稿に実問題を貼っても、図がその頁の主張を説明しない。
   言っていることをそのまま図にする。素材は幾何グラフィックのみ（§6）。 */

/* 点だけの盤面（線を引く前の「見るところの数」を見せる） */
function dotField(n: number, ox: number, oy: number, size: number) {
  const pad = size * 0.08, span = size - pad * 2;
  const P = (i: number) => pad + (n > 1 ? (span * i) / (n - 1) : span / 2);
  const r = Math.max(3, size * 0.016);
  let s = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
    s += `<circle cx="${(ox + P(x)).toFixed(1)}" cy="${(oy + P(y)).toFixed(1)}" r="${r.toFixed(1)}" fill="${FG}"/>`;
  return s;
}

/* レベル別の対象年齢バンド（data.ts の LEVEL_NAMES / LEVEL_AGES が正）
   帯が重なって伸びること自体が「年齢は目安」の説明になる。 */
function ageBands(ox: number, oy: number, w: number, rowH = 52) {
  const A0 = 3, A1 = 10;
  const X = (a: number) => ox + 150 + ((w - 150) * (a - A0)) / (A1 - A0);
  const spans: [number, number][] = [[3, 6], [4, 7], [5, 8], [6, 9], [7, 10]];
  let s = "";
  for (let a = A0; a <= A1; a++) {
    s += `<line x1="${X(a).toFixed(1)}" y1="${oy - 6}" x2="${X(a).toFixed(1)}" y2="${oy + rowH * 5 + 6}" stroke="${RULE}" stroke-width="1.5"/>`;
    s += text(X(a), oy + rowH * 5 + 40, a === 10 ? "" : String(a), 24, FG3, 400, "middle");
  }
  spans.forEach(([a, b], i) => {
    const y = oy + rowH * i + rowH / 2;
    s += `<rect x="${X(a).toFixed(1)}" y="${(y - 13).toFixed(1)}" width="${(X(b) - X(a)).toFixed(1)}" height="26" rx="13" fill="${ACCENT}" opacity="${0.28 + i * 0.13}"/>`;
    s += text(ox + 138, y + 9, LEVEL_NAMES[i], 27, FG, 400, "end");
  });
  s += text(ox + 150 + (w - 150) / 2, oy + rowH * 5 + 76, "対象年齢のめやす（才）", 24, FG3, 400, "middle");
  return s;
}

/* 線 1 本の重み（difficulty.ts の E＝たてよこ1 / 45°1.5 / ゆるい非45°4 / 急5） */
function weightRows(ox: number, oy: number) {
  /* 傾きは実物どおりに描く（1:1＝45°／2:1＝ゆるい／1:2＝急）。
     見た目が同じ角度だと「向きで点数が違う」の説明にならない。 */
  const rows: [string, string, string][] = [
    ["M0 38 L112 38", "たてよこ", "1"],
    ["M0 72 L72 0", "45°のななめ（1:1）", "1.5"],
    ["M0 62 L124 0", "ゆるいななめ（2:1）", "4"],
    ["M0 76 L38 0", "急なななめ（1:2）", "5"],
  ];
  let s = "";
  rows.forEach(([d, label, wgt], i) => {
    const y = oy + i * 96;
    s += `<g transform="translate(${ox} ${y})"><path d="${d}" stroke="${FG}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
    s += text(ox + 168, y + 44, label, 28, FG2, 400);
    s += text(ox + 556, y + 46, wgt, 34, FG, 600, "end");
    s += text(ox + 566, y + 46, "点", 24, FG3, 400);
    if (i < 3) s += `<line x1="${ox}" y1="${y + 80}" x2="${ox + 600}" y2="${y + 80}" stroke="${RULE}" stroke-width="1.5"/>`;
  });
  return s;
}

/* 12 問＝1 巻。miss を渡すとその 1 マスだけ空にする（「12 分の 1 の重さ」） */
function twelve(ox: number, oy: number, cell = 118, gap = 14, miss = -1) {
  let s = "";
  for (let i = 0; i < 12; i++) {
    const x = ox + (i % 4) * (cell + gap), y = oy + Math.floor(i / 4) * (cell + gap);
    const off = i === miss;
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" fill="none"`
       + ` stroke="${off ? FG3 : FG}" stroke-width="${off ? 2 : 2.5}"${off ? ' stroke-dasharray="7 6"' : ""}/>`;
    if (!off) {
      const n = 3, pad = cell * 0.24, span = cell - pad * 2;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
        s += `<circle cx="${(x + pad + (span * c) / 2).toFixed(1)}" cy="${(y + pad + (span * r) / 2).toFixed(1)}" r="2.6" fill="${FG3}"/>`;
    }
  }
  return s;
}

/* 点つなぎ（番号をたどる）と点描写（番号がない）の対比用。
   同じ点配置・同じ形で、番号の有無だけを変えられるようにする。 */
function numbered(path: [number, number][], n: number, ox: number, oy: number,
                  size: number, opts: { nums?: boolean; line?: boolean } = {}) {
  const { nums = true, line = true } = opts;
  const pad = size * 0.14, span = size - pad * 2;
  const X = (c: number) => ox + pad + (span * c) / (n - 1);
  const Y = (r: number) => oy + pad + (span * r) / (n - 1);
  let s = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    s += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="4" fill="${FG3}"/>`;
  if (line) {
    const d = path.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
    s += `<path d="${d}" stroke="${FG}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  path.forEach((p, i) => {
    s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="6" fill="${FG}"/>`;
    if (nums) s += text(X(p[0]) + 15, Y(p[1]) - 12, String(i + 1), 25, ACCENT, 600);
  });
  return s;
}

/* レベルの階段（hi の段だけ塗る） */
function stairs(ox: number, oy: number, w: number, h: number, hi: number) {
  const step = w / 5, rise = h / 5;
  let s = "";
  for (let i = 0; i < 5; i++) {
    const x = ox + step * i, hh = rise * (i + 1), y = oy + h - hh;
    s += `<rect x="${x + 4}" y="${y}" width="${step - 8}" height="${hh}" rx="3"`
       + ` fill="${i === hi ? ACCENT : "none"}" opacity="${i === hi ? 0.9 : 1}" stroke="${i === hi ? "none" : RULE}" stroke-width="2.5"/>`;
    s += text(x + step / 2, oy + h + 38, "Lv." + (i + 1), 25, i === hi ? FG : FG3, i === hi ? 600 : 400, "middle");
  }
  return s;
}

/* ── 図のレイアウト（実問題を素直に見せたい頁だけで使う）── */
function figOne(sku: string, i: number, caption?: string, size = 340) {
  const p = pick(sku, i);
  let s = grid(gn(p), p.edges, W / 2 - size / 2, 880, size);
  if (caption) s += text(W / 2, 880 + size + 50, caption, 29, FG3, 400, "middle");
  return s;
}
function figTwo(a: [string, number], b: [string, number], la: string, lb: string, size = 310) {
  const pa = pick(a[0], a[1]), pb = pick(b[0], b[1]);
  let s = grid(gn(pa), pa.edges, 130, 890, size) + grid(gn(pb), pb.edges, 640, 890, size);
  s += text(130 + size / 2, 890 + size + 52, la, 29, FG3, 400, "middle");
  s += text(640 + size / 2, 890 + size + 52, lb, 29, FG3, 400, "middle");
  return s;
}

/* ══ G4: 選び方「何歳から？」══ */
function g4(): Slide[] {
  const T = 6;
  const p0 = pick("copy-lv1-vol1", 3);
  return [
    { name: "s1-hyoshi.png", svg: cover("選び方", "何歳から、はじめる？",
      ["年齢よりも、点の数で選ぶ。", "それが、合わせ方のこつです。"], grid(gn(p0), p0.edges, W / 2 - 175, 700, 350)) },
    { name: "s2-3x3.png", svg: slide("01", "3×3 から",
      "いちばんやさしい入門編は、3×3 の点に線が 2 本から。まず「点を数えて書く」に慣れるところです。",
      figOne("copy-lv1-vol1", 4, "入門編・3×3・線 2 本"), 2, T) },
    { name: "s3-fueru.png", svg: slide("02", "点が増えると",
      "選ぶときに見るのは、絵のむずかしさより点の数です。3×3 は 9 点、5×5 は 25 点。目で追う場所が 3 倍近くになります。",
      (() => {
        /* 実問題ではなく「点の数」そのものを見せる。この頁の主張は点の数だから。 */
        let s = dotField(3, 175, 900, 250) + dotField(5, 655, 900, 250);
        s += text(300, 1215, "3×3 ＝ 9 点", 32, FG, 600, "middle");
        s += text(780, 1215, "5×5 ＝ 25 点", 32, FG, 600, "middle");
        return s;
      })(), 3, T) },
    { name: "s4-nenrei.png", svg: slide("03", "年齢は、めやす",
      "レベルごとの対象年齢は、わざと広く重ねています。同じ年でも、ちょうどいい点の数は違うからです。",
      ageBands(60, 830, 960), 4, T) },
    { name: "s5-yasashii.png", svg: slide("04", "迷ったら、下から",
      "むずかしい方から始めて手が止まるより、やさしい方から始めて物足りないほうが、次につながります。",
      stairs(190, 880, 700, 300, 0) + text(W / 2, 1290, "ここから始めて、上がっていく", 29, FG3, 400, "middle"), 5, T) },
    { name: "s6-matome.png", svg: outro(["年齢ではなく、", "いまの手に合う", "点の数を。"],
      (() => { const p = pick("copy-lv2-vol1", 7); return grid(gn(p), p.edges, W / 2 - 200, 195, 400); })()),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } },
  ];
}

/* ══ G5: 選び方「合わなかったら？」══ */
function g5(): Slide[] {
  const T = 6;
  const p0 = pick("copy-lv3-vol1", 3);
  return [
    { name: "s1-hyoshi.png", svg: cover("選び方", "合わなかったら？",
      ["一つ下に戻るのが、正解。", "やり直しでは、ありません。"], grid(gn(p0), p0.edges, W / 2 - 175, 700, 350)) },
    { name: "s2-tomaru.png", svg: slide("01", "3 つの合図",
      "むずかしすぎるかどうかは、出来ばえではなく手の動きに出ます。次のどれかが続いたら、一段下げどきです。",
      (() => {
        /* 「合図」は図形では描けない。読み手が自分で照合できるチェックの形にする。 */
        const items = ["線が引けずに、手が止まる", "同じ点を、何度も数え直す", "書き終わっても、見本と違う"];
        let s = "";
        items.forEach((t, i) => {
          const y = 900 + i * 108;
          s += `<rect x="120" y="${y - 34}" width="46" height="46" rx="6" fill="none" stroke="${ACCENT}" stroke-width="3"/>`;
          s += `<path d="M131 ${y - 12} l10 11 l16 -20" stroke="${ACCENT}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
          s += text(190, y, t, 33, FG2, 400);
        });
        return s;
      })(), 2, T) },
    { name: "s3-modoru.png", svg: slide("02", "戻るのは、前進",
      "一段下げると、点の数も線の数も減ります。書けるところから積み直すほうが、結局は早く進みます。",
      (() => {
        let s = stairs(190, 870, 700, 290, 1);
        /* 上の段から下の段へ戻る矢印。ここでの主張は「1 段下がる」こと。 */
        s += `<path d="M700 900 C 700 855, 480 855, 480 898" stroke="${ACCENT}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        s += `<path d="M470 880 L480 900 L494 883" stroke="${ACCENT}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        s += text(W / 2, 1285, "やり直しではなく、積み直し", 29, FG3, 400, "middle");
        return s;
      })(), 3, T) },
    { name: "s4-yoko.png", svg: slide("03", "横に移る手も",
      "同じレベルの中にも巻が複数あります。盤面や線の向きが変わるので、下げる前に隣を試す手もあります。",
      (() => {
        /* 同レベルに巻が並ぶ「棚」。縦の上下ではなく横移動が主張。 */
        let s = "";
        const labels = ["Vol.1", "Vol.2", "Vol.3"];
        labels.forEach((l, i) => {
          const x = 175 + i * 250;
          s += `<rect x="${x}" y="900" width="200" height="250" rx="5" fill="none" stroke="${i === 1 ? ACCENT : RULE}" stroke-width="${i === 1 ? 3.5 : 2.5}"/>`;
          s += text(x + 100, 1035, l, 34, i === 1 ? FG : FG3, i === 1 ? 600 : 400, "middle");
        });
        s += `<path d="M395 1180 L455 1180 M441 1170 L455 1180 L441 1190" stroke="${ACCENT}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        s += text(W / 2, 1268, "同じ Lv.3 の中で、隣の巻へ", 29, FG3, 400, "middle");
        return s;
      })(), 4, T) },
    { name: "s5-monotarinai.png", svg: slide("04", "物足りないときは",
      "すらすら書けて時間が余るなら、次のレベルへ。巻の中身は 12 問すべて、買う前に見られます。",
      (() => {
        let s = stairs(190, 870, 700, 290, 3);
        s += `<path d="M480 898 C 480 855, 700 855, 700 896" stroke="${ACCENT}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        s += `<path d="M690 878 L700 898 L714 881" stroke="${ACCENT}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        s += text(W / 2, 1285, "上げるときも、一段ずつ", 29, FG3, 400, "middle");
        return s;
      })(), 5, T) },
    { name: "s6-matome.png", svg: outro(["合う一冊は、", "戻り道の先にも", "あります。"],
      (() => { const p = pick("copy-lv3-vol2", 7); return grid(gn(p), p.edges, W / 2 - 200, 195, 400); })()),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } },
  ];
}

/* ══ G6: 選び方「点つなぎの次に」══
   全頁で同じ形を使い、番号の有無と線の本数だけを変える（対比が主題）。 */
const PATH: [number, number][] = [[0, 3], [0, 1], [1, 0], [2, 0], [3, 1], [3, 3], [0, 3]];

function g6(): Slide[] {
  const T = 6;
  return [
    /* 表紙も同じ形（番号なし＝点描写の側）。投稿内で形が変わると対比が読めない。 */
    { name: "s1-hyoshi.png", svg: cover("選び方", "点つなぎの、次に。",
      ["番号をたどるのは、もう十分。", "次は、見て考えて書く。"],
      numbered(PATH, 4, W / 2 - 175, 700, 350, { nums: false })) },
    { name: "s2-tadoru.png", svg: slide("01", "点つなぎは、たどる",
      "番号の順に線を引くと形ができる。次にどこへ向かうかは、紙のほうが教えてくれます。",
      numbered(PATH, 4, W / 2 - 190, 870, 380) + text(W / 2, 1290, "番号が、順番を決めてくれる", 29, FG3, 400, "middle"), 2, T) },
    { name: "s3-kimeru.png", svg: slide("02", "点描写は、決める",
      "点描写に番号はありません。どこから書くか、どの点とどの点を結ぶかを、自分で決めます。",
      numbered(PATH, 4, W / 2 - 190, 870, 380, { nums: false })
      + text(W / 2, 1290, "同じ形。でも、順番は自分で決める", 29, FG3, 400, "middle"), 3, T) },
    { name: "s4-sa.png", svg: slide("03", "その差は、大きい",
      "たどるから、決めるへ。同じ点と線でも、頭の使い方が変わります。だから入門編は線 2 本から始まります。",
      (() => {
        let s = numbered(PATH, 4, 105, 880, 330) + numbered(PATH, 4, 645, 880, 330, { nums: false });
        s += text(270, 1265, "たどる", 30, FG3, 400, "middle") + text(810, 1265, "決める", 30, FG, 600, "middle");
        return s;
      })(), 4, T) },
    { name: "s5-tsumazuki.png", svg: slide("04", "線の数から",
      "いきなり写せなくても大丈夫です。線が 2 本の問題から、少しずつ増やしていけます。",
      (() => {
        /* 「少しずつ増やせる」を、同じ形が育つ過程で見せる */
        const S = 250, xs = [95, 415, 735];
        const steps: [number, string][] = [[2, "線 2 本"], [4, "4 本"], [PATH.length - 1, `${PATH.length - 1} 本`]];
        let s = "";
        steps.forEach(([k, label], i) => {
          s += numbered(PATH.slice(0, k + 1), 4, xs[i], 880, S, { nums: false });
          s += text(xs[i] + S / 2, 1180, label, 30, i === 2 ? FG : FG3, i === 2 ? 600 : 400, "middle");
        });
        return s;
      })(), 5, T) },
    { name: "s6-matome.png", svg: outro(["たどるから、", "考えて書くへ。", "その一段を。"],
      (() => { const p = pick("copy-lv2-vol1", 2); return grid(gn(p), p.edges, W / 2 - 200, 195, 400); })()),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } },
  ];
}

/* ══ G7: 裏側「一問を商品から外した日」══ */
function g7(): Slide[] {
  const T = 6;
  const p0 = pick("copy-lv3-vol1", 8);
  return [
    { name: "s1-hyoshi.png", svg: cover("制作の裏側", "一問を、外した日。",
      ["見た目は、きれいだった。", "でも、説明できなかった。"], grid(gn(p0), p0.edges, W / 2 - 175, 700, 350)) },
    /* ここは実問題そのものが主題なので図は問題図でよい（他の裏側 2 本とは違う） */
    { name: "s2-kirei.png", svg: slide("01", "条件は、通っていた",
      "対称で、線の数もちょうどよく、難易度も巻の窓に収まっている。数値の条件は、全部通っていました。",
      (() => {
        const p = pick("copy-lv3-vol1", 9);
        let s = grid(gn(p), p.edges, W / 2 - 165, 850, 330);
        const oks = ["盤面 4×4", "D は巻の窓の中", "かぶりなし"];
        oks.forEach((t, i) => {
          const x = 150 + i * 300;
          s += `<path d="M${x} 1246 l11 12 l18 -22" stroke="${ACCENT}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
          s += text(x + 42, 1256, t, 26, FG3, 400);
        });
        return s;
      })(), 2, T) },
    { name: "s3-kotae.png", svg: slide("02", "でも、答えられない",
      "残った問いは一つだけでした。ここに一言で答えられなかったので、商品から外しました。",
      (() => {
        /* この頁の主張は「答えられなかった問い」そのもの。図形は主役ではない。 */
        let s = `<rect x="110" y="900" width="860" height="230" rx="8" fill="none" stroke="${RULE}" stroke-width="2.5"/>`;
        s += block(W / 2, 990, ["この問題は、", "何を練習するのか？"], 46, 70, FG, 600, "middle");
        s += text(W / 2, 1230, "答えは、出なかった", 30, FG3, 400, "middle");
        return s;
      })(), 3, T) },
    { name: "s4-12mon.png", svg: slide("03", "12 分の 1 の重さ",
      "1 巻は 12 問。1 問が全体の 12 分の 1 を占めます。埋めるためだけの一問は、入れません。",
      twelve(215, 880, 118, 14, 7) + text(W / 2, 1290, "外した 1 問は、埋め合わせない", 29, FG3, 400, "middle"), 4, T) },
    { name: "s5-suchi.png", svg: slide("04", "数値では決まらない",
      "むずかしさは式で測れます。でも「何を練習する問題か」は、式では出ません。そこは人が見て決めています。",
      (() => {
        /* 左右で「決め方」を対置する。線を引くと意味のない装飾になるので、
           何が決めているのかを名前で書く。 */
        let s = `<line x1="${W / 2}" y1="905" x2="${W / 2}" y2="1175" stroke="${RULE}" stroke-width="2"/>`;
        s += text(285, 960, "むずかしさ", 29, FG3, 400, "middle");
        s += text(285, 1020, "式で出る", 38, FG, 600, "middle");
        s += text(285, 1105, "難易度スコア D", 26, ACCENT, 400, "middle");
        s += text(795, 960, "何を練習するか", 29, FG3, 400, "middle");
        s += text(795, 1020, "式では出ない", 38, FG, 600, "middle");
        s += text(795, 1105, "人が見て決める", 26, ACCENT, 400, "middle");
        s += text(W / 2, 1270, "式が通っても、棚に並ぶとは限らない", 29, FG3, 400, "middle");
        return s;
      })(), 5, T) },
    { name: "s6-matome.png", svg: outro(["外した一問は、", "棚に並ばない。", "それだけの話。"],
      (() => { const p = pick("copy-lv3-vol2", 9); return grid(gn(p), p.edges, W / 2 - 200, 195, 400); })()),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } },
  ];
}

/* ══ G8: 裏側「難易度スコア D の中身」══ */
function g8(): Slide[] {
  const T = 6;
  const p0 = pick("copy-lv4-vol1", 8);
  return [
    { name: "s1-hyoshi.png", svg: cover("制作の裏側", "難易度スコアの中身。",
      ["感覚で並べていません。", "式で並べています。"], grid(gn(p0), p0.edges, W / 2 - 175, 700, 350)) },
    { name: "s2-mukisa.png", svg: slide("01", "線 1 本の、点数",
      "同じ 1 本でも、向きによって点数が違います。見なれない傾きほど、どの点へ向かうか確かめる手間が増えるからです。",
      weightRows(240, 855), 2, T) },
    { name: "s3-kakusu.png", svg: slide("02", "鉛筆を、何回置くか",
      "全部の線をなぞるのに筆を何回置くか。2 画目からは 1 画につき 0.7 点を足します。",
      (() => {
        /* 同じ線の本数でも画数が違う 2 例。主張は「本数ではなく置く回数」。 */
        /* 左＝一筆で閉じる正方形（4 本 1 画）／右＝同じ 4 本がすべて離れている（4 画）。
           本数を揃えないと「本数ではなく置く回数」の対比にならない。 */
        const one: [number, number][] = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
        let s = numbered(one, 3, 130, 890, 300, { nums: false });
        s += numbered([], 3, 640, 890, 300, { nums: false, line: false });
        const P = (c: number) => 640 + 42 + (216 * c) / 2, Q = (r: number) => 890 + 42 + (216 * r) / 2;
        const seg = (a: [number, number], b: [number, number]) =>
          `<path d="M${P(a[0])} ${Q(a[1])} L${P(b[0])} ${Q(b[1])}" stroke="${FG}" stroke-width="4.5" stroke-linecap="round"/>`;
        s += seg([0, 0], [2, 0]) + seg([0, 2], [2, 2]) + seg([0, 1], [0, 2]) + seg([2, 0], [2, 1]);
        s += text(280, 1250, "4 本 ・ 1 画", 30, FG3, 400, "middle");
        s += text(790, 1250, "4 本 ・ 4 画", 30, FG, 600, "middle");
        return s;
      })(), 3, T) },
    { name: "s4-taisho.png", svg: slide("03", "対称は、割り引く",
      "左右対称なら ×0.70、上下対称なら ×0.75、ななめ対称なら ×0.85。半分を見れば残り半分がわかるぶん、軽く見ます。",
      (() => {
        const p = pick("copy-lv3-vol2", 11);
        const n = gn(p);
        let s = grid(n, p.edges, W / 2 - 165, 855, 330);
        /* 対称軸と、読まなくて済む側。ここが割引の理由そのもの。 */
        s += `<rect x="${W / 2}" y="855" width="165" height="330" fill="${ACCENT}" opacity="0.10"/>`;
        s += `<line x1="${W / 2}" y1="860" x2="${W / 2}" y2="1180" stroke="${ACCENT}" stroke-width="3" stroke-dasharray="10 8"/>`;
        s += text(W / 2 + 82, 1240, "こちらは読まずに済む", 26, FG3, 400, "middle");
        s += text(W / 2, 1290, "左右対称 → 線の重みを ×0.70", 30, FG, 600, "middle");
        return s;
      })(), 4, T) },
    { name: "s5-narabu.png", svg: slide("04", "だから、巻が並ぶ",
      "同じ式で全部の問題を測っているので、巻の順番に根拠があります。スコアは商品ページで 1 問ずつ公開しています。",
      (() => {
        /* 巻が D の昇順に並ぶこと自体を棒で見せる（数値は公開値の水準） */
        const bars: [string, number][] = [["Lv.1", 12], ["Lv.2", 27], ["Lv.3", 45], ["Lv.4", 68], ["Lv.5", 92]];
        const bx = 175, by = 880, bw = 145, bh = 260;
        let s = "";
        bars.forEach(([l, v], i) => {
          const h = (bh * v) / 100, x = bx + i * bw;
          s += `<rect x="${x}" y="${by + bh - h}" width="${bw - 26}" height="${h}" rx="3" fill="${ACCENT}" opacity="${0.3 + i * 0.16}"/>`;
          s += text(x + (bw - 26) / 2, by + bh + 40, l, 26, FG3, 400, "middle");
        });
        s += `<line x1="${bx - 10}" y1="${by + bh}" x2="${bx + bw * 5 - 16}" y2="${by + bh}" stroke="${RULE}" stroke-width="2"/>`;
        s += text(W / 2, 1290, "むずかしさの順に、巻が積み上がる", 29, FG3, 400, "middle");
        return s;
      })(), 5, T) },
    { name: "s6-matome.png", svg: outro(["むずかしさを、", "測れるものにする。", "その仕事。"],
      (() => { const p = pick("copy-lv4-vol1", 10); return grid(gn(p), p.edges, W / 2 - 200, 195, 400); })()),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } },
  ];
}

/* ══ G9: 裏側「1 巻 ¥200 の理由」══ */
function g9(): Slide[] {
  const T = 6;
  const p0 = pick("copy-lv2-vol1", 10);
  return [
    { name: "s1-hyoshi.png", svg: cover("制作の裏側", "1 巻 ¥200 の理由。",
      ["12 問で、ひとまとまり。", "中身は、買う前に全部。"], grid(gn(p0), p0.edges, W / 2 - 175, 700, 350)) },
    { name: "s2-12mon.png", svg: slide("01", "12 問で 1 巻",
      "1 巻は 12 問。多すぎず、続けられる量にしています。1 問あたり、およそ 17 円の計算です。",
      (() => {
        let s = twelve(215, 845, 118, 14);
        s += text(W / 2, 1285, "¥200 ÷ 12 問 ＝ 約 17 円", 34, FG, 600, "middle");
        return s;
      })(), 2, T) },
    { name: "s3-zenbu.png", svg: slide("02", "中身を、全部見せる",
      "表紙だけでは売りません。12 問すべてと、それぞれの難易度を並べてから買ってもらいます。",
      (() => {
        /* 「全部見える」を、伏せられた表紙との対比で見せる */
        let s = `<rect x="120" y="880" width="300" height="290" rx="5" fill="none" stroke="${RULE}" stroke-width="2.5"/>`;
        s += text(270, 1030, "表紙だけ", 32, FG3, 400, "middle");
        s += `<path d="M215 1075 l110 0" stroke="${RULE}" stroke-width="2.5"/>`;
        s += `<path d="M455 1025 L520 1025 M506 1013 L520 1025 L506 1037" stroke="${ACCENT}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        s += twelve(560, 880, 88, 10);
        s += text(270, 1225, "よくある売り方", 27, FG3, 400, "middle");
        s += text(755, 1225, "TENZU", 27, FG, 600, "middle");
        return s;
      })(), 3, T) },
    { name: "s4-surikata.png", svg: slide("03", "刷り方を、選べる",
      "同じ 1 巻を、大きく 1 問にも、ぎっしり 12 問にも刷り分けられます。用紙も点の大きさも選べます。",
      (() => {
        /* 同じ図を 2 つ並べても刷り分けにならない。左＝大きく 1 問、
           右＝その巻の 12 問を実寸比で敷き詰める（print の 2 型・§3.99）。 */
        const set = PUBLISHED["copy-lv2-vol1"];
        const p = set.problems[2];
        let s = grid(gn(p), p.edges, 120, 890, 300);
        set.problems.slice(0, 12).forEach((q, k) => {
          if (q.grid.type !== "square") return;
          s += grid(q.grid.n, q.edges, 620 + (k % 3) * 108, 880 + Math.floor(k / 3) * 82, 100);
        });
        s += text(270, 1252, "大きく 1 問", 29, FG3, 400, "middle");
        s += text(782, 1252, "ぎっしり 12 問", 29, FG3, 400, "middle");
        return s;
      })(), 4, T) },
    { name: "s5-kokoku.png", svg: slide("04", "広告を、入れない",
      "無料のプリントは、たいてい紙面のどこかに広告が入ります。TENZU の紙面には入れません。有料にしているのは、そのためでもあります。",
      (() => {
        /* 紙面の下部に広告帯が入る／入らない の対比。主張は紙面の使われ方。 */
        const draw = (x: number, ad: boolean) => {
          let g = `<rect x="${x}" y="890" width="300" height="300" rx="4" fill="none" stroke="${RULE}" stroke-width="2.5"/>`;
          const p = pick("copy-lv2-vol1", 3);
          g += grid(gn(p), p.edges, x + 60, 905, 180);
          if (ad) {
            g += `<rect x="${x + 14}" y="${1108}" width="272" height="68" rx="3" fill="${FG3}" opacity="0.22"/>`;
            g += text(x + 150, 1150, "広告", 30, FG2, 400, "middle");
          }
          return g;
        };
        let s = draw(120, true) + draw(660, false);
        s += text(270, 1258, "無料のプリント", 28, FG3, 400, "middle");
        s += text(810, 1258, "TENZU", 28, FG, 600, "middle");
        return s;
      })(), 5, T) },
    { name: "s6-matome.png", svg: outro(["手間の分だけ、", "有料に。", "そのかわり、全部。"],
      (() => { const p = pick("copy-lv5-vol1", 5); return grid(gn(p), p.edges, W / 2 - 200, 195, 400); })()),
      logo: { w: 190, h: 131, x: W / 2 - 95, y: 1125 } },
  ];
}

const POSTS: Record<string, { dir: string; build: () => Slide[] }> = {
  g1: { dir: "g1-mite-utsusu", build: g1 },
  g2: { dir: "g2-katachi-ugokasu", build: g2 },
  g3: { dir: "g3-kasaneru-wakeru", build: g3 },
  g4: { dir: "g4-nansai-kara", build: g4 },
  g5: { dir: "g5-awanakattara", build: g5 },
  g6: { dir: "g6-tentsunagi-no-tsugi", build: g6 },
  g7: { dir: "g7-hazushita-hi", build: g7 },
  g8: { dir: "g8-nanido-score", build: g8 },
  g9: { dir: "g9-200en", build: g9 },
};

/* プロフィールのグリッド見え方を再現する（1 枚目だけを投稿順に並べる）。
   ピン留めの固定投稿が左上 1 マスを占めるため 10 マスになる。
   投稿順は plan.md のとおり 裏側 → 選び方 → タスク紹介 で、新しいものが先頭。 */
async function gridSim() {
  const order = ["g3", "g2", "g1", "g6", "g5", "g4", "g9", "g8", "g7"];
  const pinned = path.resolve(outRoot, "../2026-08-26-hajimete/s1-hyoshi.png");
  const cells = [pinned, ...order.map((k) => path.join(outRoot, POSTS[k].dir, "s1-hyoshi.png"))];
  const TW = 300, TH = 375, g = 6, cols = 3;
  const rows = Math.ceil(cells.length / cols);
  const tiles = await Promise.all(cells.map((f) => sharp(f).resize(TW, TH).toBuffer()));
  await sharp({ create: { width: cols * TW + (cols + 1) * g, height: rows * TH + (rows + 1) * g, channels: 3, background: "#B9B5AC" } })
    .composite(tiles.map((input, i) => ({ input, left: g + (i % cols) * (TW + g), top: g + Math.floor(i / cols) * (TH + g) })))
    .png().toFile(path.join(outRoot, "_grid-sim.png"));
  console.log(`\nグリッド再現（ピン留め＋9 本） → ${path.join(outRoot, "_grid-sim.png")}`);
}

async function main() {
  const keys = only ? [only] : Object.keys(POSTS);
  for (const k of keys) {
    const post = POSTS[k];
    if (!post) { console.error(`unknown post: ${k}`); process.exit(1); }
    const dir = path.join(outRoot, post.dir);
    await fs.mkdir(dir, { recursive: true });
    const slides = post.build();
    for (const s of slides) {
      const img = sharp(Buffer.from(s.svg));
      if (s.logo) {
        const plate = await logoPlate(s.logo.w, s.logo.h, 238, 120, 26);
        img.composite([{ input: plate, left: s.logo.x, top: s.logo.y }]);
      }
      await img.png().toFile(path.join(dir, s.name));
      console.log("  ", path.join(post.dir, s.name));
    }
    /* コンタクトシート（検品用・投稿には使わない） */
    const cols = 4, tw = 355, th = Math.round((th0 => th0)(444));
    const tiles = await Promise.all(slides.map(s => sharp(path.join(dir, s.name)).resize(tw, th).toBuffer()));
    const rows = Math.ceil(tiles.length / cols);
    await sharp({ create: { width: cols * tw + (cols + 1) * 12, height: rows * th + (rows + 1) * 12, channels: 3, background: "#D9D6CE" } })
      .composite(tiles.map((input, i) => ({ input, left: 12 + (i % cols) * (tw + 12), top: 12 + Math.floor(i / cols) * (th + 12) })))
      .png().toFile(path.join(dir, "_sheet.png"));
    console.log(`\n${slides.length} 枚 → ${dir}`);
  }
  if (!only) await gridSim();
}

main().catch((e) => { console.error(e); process.exit(1); });
