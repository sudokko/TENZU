/* 記事の published_at 一括スタンプ（開店ゲート運用・2026-08-05）
   使い方: node scripts/stamp-published-at.mjs --date 2026-08-16 [--write]

   段階公開の3点セット（content/article-revision-publish.md §7.5）のうち
   published_at は「実際の公開日」を書く決まり。第1弾14本（status なし＝公開）は
   tenzu.jp 接続日が実際の公開日になるため、接続当日にこれを 1 回流す。
   - 対象: web/content/articles/*.mdx のうち status: draft でなく published_at 未設定のもの
   - --write なしはドライラン（対象一覧だけ出す）
   - 既に published_at がある記事・draft は触らない（ドリップ昇格は §7.5 の手作業） */
import { promises as fs } from "fs";
import path from "path";

const args = process.argv.slice(2);
const di = args.indexOf("--date");
const date = di >= 0 ? args[di + 1] : null;
const write = args.includes("--write");
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("--date YYYY-MM-DD を指定して");
  process.exit(1);
}

const dir = path.join(process.cwd(), "content", "articles");
const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".mdx"));
let hit = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const src = await fs.readFile(p, "utf8");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { console.warn(`frontmatter なし: ${f}`); continue; }
  const fm = m[1];
  if (/^status:\s*draft/m.test(fm)) continue;          // ドリップ枠は昇格時に手で
  if (/^published_at:/m.test(fm)) continue;            // 既設定は尊重
  hit++;
  console.log(`${write ? "stamp" : "dry"}  ${f}`);
  if (write) {
    // updated_at の直後に入れる（無ければ frontmatter 末尾）
    const nl = src.includes("\r\n") ? "\r\n" : "\n";
    const inserted = /^updated_at:.*$/m.test(fm)
      ? fm.replace(/^(updated_at:.*)$/m, `$1${nl}published_at: ${date}`)
      : `${fm}${nl}published_at: ${date}`;
    await fs.writeFile(p, src.replace(m[1], inserted), "utf8");
  }
}
console.log(`${hit} 本${write ? "に付与" : "が対象（--write で実行）"}`);
