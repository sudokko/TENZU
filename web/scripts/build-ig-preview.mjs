/* IG グリッドのプレビュー HTML を組み立てる（Artifact 公開用）
   node scripts/build-ig-preview.mjs <template.html> <out.html>

   captions.md を SSOT としてパースし、画像は 720px / 16 色 PNG の data URI で
   埋め込む（Artifact の CSP は外部ホストを通さない）。線画なので 1 枚 10KB 前後。 */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const [tpl, out] = process.argv.slice(2);
const ROOT = path.resolve("../docs/drafts/sns/ig");
const DIR9 = path.join(ROOT, "2026-09-01-grid9");

const CATEGORY = {
  g1: "見て写す", g2: "かたちを動かす", g3: "重ねる・分ける",
  g4: "選び方", g5: "選び方", g6: "選び方",
  g7: "制作の裏側", g8: "制作の裏側", g9: "制作の裏側",
};

async function encode(file) {
  const buf = await sharp(file).resize(720)
    .png({ palette: true, colors: 16, compressionLevel: 9 }).toBuffer();
  return "data:image/png;base64," + buf.toString("base64");
}

async function slidesOf(dir) {
  const names = (await fs.readdir(dir)).filter(f => /^s\d+-.*\.png$/.test(f))
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  return Promise.all(names.map(n => encode(path.join(dir, n))));
}

/* captions.md: "## N 本目｜GX タイトル" → ```本文``` → **ハッシュタグ**: `..` → **alt**: .. */
function parseCaptions(md) {
  const posts = [];
  const blocks = md.split(/^## /m).slice(1);
  for (const b of blocks) {
    const head = b.match(/^(\d+)\s*本目｜(g\d)\s*(.+)$/im);
    if (!head) continue;
    const body = b.match(/```\n([\s\S]*?)\n```/);
    const tags = b.match(/\*\*ハッシュタグ\*\*:\s*`(.+?)`/);
    const alt = b.match(/\*\*alt\*\*:\s*(.+)/);
    posts.push({
      id: head[2].toLowerCase(),
      order: Number(head[1]),
      title: head[3].trim(),
      caption: body ? body[1].trim() : "",
      tags: tags ? tags[1].trim() : "",
      alt: alt ? alt[1].replace(/[「」]/g, "").trim() : "",
    });
  }
  return posts;
}

const DIRS = {
  g1: "g1-mite-utsusu", g2: "g2-katachi-ugokasu", g3: "g3-kasaneru-wakeru",
  g4: "g4-nansai-kara", g5: "g5-awanakattara", g6: "g6-tentsunagi-no-tsugi",
  g7: "g7-hazushita-hi", g8: "g8-nanido-score", g9: "g9-200en",
};

async function main() {
  const md = await fs.readFile(path.join(DIR9, "captions.md"), "utf8");
  const parsed = parseCaptions(md);

  const posts = [];

  /* 固定投稿（2026-08-26）— 9 本とは別枠なので先頭に置く */
  const pinDir = path.join(ROOT, "2026-08-26-hajimete");
  const pinMd = await fs.readFile(path.join(pinDir, "caption.md"), "utf8");
  const pinBody = pinMd.match(/```\n([\s\S]*?)\n```/);
  const pinCap = pinBody ? pinBody[1].trim() : "";
  posts.push({
    id: "pin", pinned: true, order: 0, category: "固定投稿",
    title: "はじめての方へ", dir: "2026-08-26-hajimete",
    slides: await slidesOf(pinDir),
    caption: pinCap.replace(/\n?※ ストアの正式オープン.*\n?/, "\n"),
    tags: "#点描写 #点図形 #知育プリント #年長 #おうち学習",
    alt: "（投稿済み・8/30 の告知行は削除予定）",
  });

  for (const p of parsed) {
    const dir = path.join(DIR9, DIRS[p.id]);
    posts.push({
      ...p, pinned: false, category: CATEGORY[p.id], dir: DIRS[p.id],
      slides: await slidesOf(dir),
    });
    console.log("  ", p.order, p.id, p.title);
  }

  const html = (await fs.readFile(tpl, "utf8"))
    .replace("/*__DATA__*/ null", JSON.stringify({ posts }));
  await fs.writeFile(out, html, "utf8");
  const kb = Math.round((await fs.stat(out)).size / 1024);
  console.log(`\n${posts.length} 投稿 / ${posts.reduce((n, p) => n + p.slides.length, 0)} 枚 → ${out}（${kb}KB）`);
}

main().catch(e => { console.error(e); process.exit(1); });
