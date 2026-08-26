/* Instagram カルーセル生成（2026-08-26 新設）
   （FONTCONFIG_PATH=C:/dev/TENZU/.fonts npx tsx scripts/export-ig-carousel.ts --out <dir>）

   1080×1350 の 8 枚を rev.5 準拠で直接描く（Canva を経由しない）。
   - 地: 純白 ＋ body 点格子（visual-identity §1）
   - 書体: 見出し Klee One 600 / 本文 Klee One 400（.fonts を fontconfig 経由で参照）
   - 図: published 済みの実問題。AI 画像・写真・キャラクターは使わない（§6）      */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { PUBLISHED } from "../app/products/problems/published";
import { volBySku } from "../app/products/data";
import type { Problem } from "../app/products/problems/schema";

const W = 1080, H = 1350;
const FG = "#1A1F2A", FG2 = "#424955", FG3 = "#767D89";
const ACCENT = "#2C6E7F";
const KLEE = "Klee One";
const P = 45, O = 22.5;

const outDir = (() => {
  const i = process.argv.indexOf("--out");
  return path.resolve(process.cwd(), i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "../docs/drafts/sns/ig");
})();

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

/* 「うつす」の矢印（到達方向なので accent を使う唯一の場所） */
function arrow(cx: number, cy: number) {
  return `<path d="M ${cx - 25} ${cy} L ${cx + 25} ${cy} M ${cx + 7} ${cy - 13} L ${cx + 25} ${cy} L ${cx + 7} ${cy + 13}"`
       + ` stroke="${ACCENT}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

let lattice = "";
for (let y = O; y < H; y += P) for (let x = O; x < W; x += P)
  lattice += `<circle cx="${x}" cy="${y}" r="1.9"/>`;

function page(inner: string, n: number) {
  const pager = n > 0 ? text(90, H - 58, `${n} / 8`, 26, FG3, 400, "start") : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
       + `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`
       + `<g fill="${FG}" opacity="0.16">${lattice}</g>${inner}${pager}</svg>`;
}

function slide(kicker: string, head: string, body: string, figure: string, n: number) {
  const hl = wrapJa(head, 13);
  let s = text(90, 175, kicker, 28, FG3, 400, "start", 2);
  s += block(90, 275, hl, 66, 92, FG, 600);
  const by = 275 + hl.length * 92 + 40;
  s += block(90, by, wrapJa(body, 21), 36, 64, FG2, 400);
  return page(s + figure, n);
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
const gn = (p: Problem) => (p.grid.type === "square" ? p.grid.n : 0);

async function build() {
  const slides: { name: string; svg: string; logo?: { w: number; h: number; x: number; y: number } }[] = [];

  /* 1: 表紙 */
  {
    const p = pick("copy-lv3-vol1", 6);
    let s = block(W / 2, 300, wrapJa("点図形（点描写）プリントの専門店です", 12), 62, 92, FG, 600, "middle");
    s += block(W / 2, 520, ["見て、考えて、書く力を、", "点描写から。"], 40, 62, FG2, 400, "middle");
    s += grid(gn(p), p.edges, W / 2 - 190, 680, 380);
    s += text(W / 2, 1285, "点描写プリント専門店（てんず）", 26, FG3, 400, "middle");
    slides.push({ name: "s1-hyoshi.png", svg: page(s, 0), logo: { w: 250, h: 173, x: W / 2 - 125, y: 1075 } });
  }

  /* 2: 点描写って、なに？ */
  {
    const p = pick("copy-lv2-vol1", 4);
    const n = gn(p);
    let fig = grid(n, p.edges, 105, 880, 330) + grid(n, p.edges, 645, 880, 330, true);
    fig += arrow(540, 1045);
    fig += text(270, 1265, "みほん", 30, FG3, 400, "middle") + text(810, 1265, "うつす", 30, FG3, 400, "middle");
    slides.push({ name: "s2-nani.png", svg: slide("01", "点描写って、なに？",
      "見本の形を見て、点の位置を数えて、線を引く。手を動かす前に「どこを見るか」を考える練習です。", fig, 2) });
  }

  /* 3: 9つの種類 */
  {
    const tasks: [string, string][] = [
      ["copy-lv2-vol1", "模写"], ["fill-lv2-vol1", "欠け補完"], ["mirror-lv2-vol1", "鏡"],
      ["rotate-lv2-vol1", "回転"], ["translate-lv2-vol1", "移動"], ["overlay-lv2-vol1", "かさね"],
      ["decompose-lv2-vol1", "分解"], ["fold-lv2-vol1", "折り重ね"],
    ];
    const S = 190, xs = [95, 345, 595, 845], ys = [790, 1030];
    let fig = "";
    tasks.forEach(([sku, label], i) => {
      const p = pick(sku, 3);
      const ox = xs[i % 4], oy = ys[Math.floor(i / 4)];
      fig += grid(gn(p), p.edges, ox, oy, S);
      fig += text(ox + S / 2, oy + S + 34, label, 26, FG3, 400, "middle");
    });
    slides.push({ name: "s3-shurui.png", svg: slide("02", "写すだけでは、ありません",
      "動かす・鏡にうつす・回す・重ねる・分ける。同じ点の上で、考えることを少しずつ変えていきます。", fig, 3) });
  }

  /* 4: レベルは5段階 */
  {
    const steps: [string, number, string][] = [
      ["copy-lv1-vol1", 5, "入門編"], ["copy-lv3-vol1", 6, "基礎編"], ["copy-lv5-vol1", 4, "発展編"],
    ];
    const S = 250, xs = [95, 415, 735];
    let fig = "";
    steps.forEach(([sku, idx, name], i) => {
      const p = pick(sku, idx);
      const hit = volBySku(sku)!;
      fig += grid(gn(p), p.edges, xs[i], 860, S);
      fig += text(xs[i] + S / 2, 1155, `${gn(p)}×${gn(p)}　${name}`, 30, FG, 600, "middle");
      fig += text(xs[i] + S / 2, 1195, hit.vol.ageLabel, 25, FG3, 400, "middle");
    });
    slides.push({ name: "s4-level.png", svg: slide("03", "レベルは 5 段階",
      "点の数、線の本数、ななめの向き。むずかしさを式で並べています。合わなければ、一つ下に戻るのが正解です。", fig, 4) });
  }

  /* 5: 中身は買う前に全部 */
  {
    const p = pick("copy-lv3-vol2", 3);
    let fig = grid(gn(p), p.edges, 95, 860, 300);
    fig += text(450, 950, "5×5　基礎編", 40, FG, 600);
    fig += text(450, 1010, "たてよこ8本・45°のななめ4本", 28, FG2, 400);
    fig += text(450, 1058, "4画・左右対称", 28, FG2, 400);
    fig += `<line x1="450" y1="1092" x2="985" y2="1092" stroke="#E5E3DC" stroke-width="2"/>`;
    fig += text(450, 1140, "難易度スコア D も公開しています", 26, FG3, 400);
    slides.push({ name: "s5-konkyo.png", svg: slide("04", "中身は、買う前に全部",
      "どの巻に何問入っていて、どのくらいのむずかしさか。問題そのものも、難易度の根拠も公開しています。", fig, 5) });
  }

  /* 6: まず無料で作れます */
  {
    const p = pick("copy-lv2-vol1", 9);
    let fig = `<rect x="150" y="840" width="780" height="330" rx="6" fill="none" stroke="#E5E3DC" stroke-width="3"/>`;
    fig += `<line x1="150" y1="900" x2="930" y2="900" stroke="#E5E3DC" stroke-width="3"/>`;
    fig += `<circle cx="185" cy="870" r="8" fill="#E5E3DC"/><circle cx="215" cy="870" r="8" fill="#E5E3DC"/><circle cx="245" cy="870" r="8" fill="#E5E3DC"/>`;
    fig += grid(gn(p), p.edges, 340, 925, 230);
    fig += grid(gn(p), p.edges, 610, 925, 230, true);
    fig += text(W / 2, 1245, "tenzu.jp　登録不要・印刷してすぐ", 28, FG3, 400, "middle");
    slides.push({ name: "s6-muryo.png", svg: slide("05", "まず、無料で作れます",
      "ブラウザの模写メーカーで、親が画面で1問つくり、子どもは紙で解く。おうちのプリンタで印刷できます。", fig, 6) });
  }

  /* 7: 紙の上ではこう見える */
  {
    const p = pick("copy-lv1-vol1", 1);
    const n = gn(p);
    let fig = `<rect x="140" y="820" width="800" height="400" rx="4" fill="#FFFFFF" stroke="#E5E3DC" stroke-width="3"/>`;
    fig += grid(n, p.edges, 200, 870, 300) + grid(n, p.edges, 580, 870, 300, true);
    fig += arrow(537, 1020);
    fig += text(W / 2, 1275, "入門編・3×3・たてよこ2本", 27, FG3, 400, "middle");
    slides.push({ name: "s7-kami.png", svg: slide("06", "紙の上では、こう見える",
      "いちばんやさしい入門編は、3×3 の点に線が2本から。物足りなければ、次の巻へ。", fig, 7) });
  }

  /* 8: まとめ */
  {
    let s = block(W / 2, 380, ["見て、考えて、書く。", "その最初の一歩を、", "家庭で無理なく。"], 58, 92, FG, 600, "middle");
    const p = pick("copy-lv3-vol2", 4);
    s += grid(gn(p), p.edges, W / 2 - 160, 630, 320);
    s += text(W / 2, 1030, "保存して、見返してください", 34, FG2, 600, "middle");
    s += text(W / 2, 1082, "くわしくはプロフィールのリンクから", 30, FG3, 400, "middle");
    s += text(W / 2, 1300, "点図形（点描写）プリントの専門店", 25, FG3, 400, "middle");
    slides.push({ name: "s8-matome.png", svg: page(s, 0), logo: { w: 150, h: 104, x: W / 2 - 75, y: 1140 } });
  }

  await fs.mkdir(outDir, { recursive: true });
  for (const s of slides) {
    const img = sharp(Buffer.from(s.svg));
    if (s.logo) {
      const plate = await logoPlate(s.logo.w, s.logo.h, 238, 120, 26);
      img.composite([{ input: plate, left: s.logo.x, top: s.logo.y }]);
    }
    await img.png().toFile(path.join(outDir, s.name));
    console.log("  ", s.name);
  }
  console.log(`\n${slides.length} 枚 → ${outDir}`);
}

build().catch((e) => { console.error(e); process.exit(1); });
