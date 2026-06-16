/* copy 候補ファイルの id 重複を解消する一回限りの migration（npx tsx scripts/fix-candidate-ids.ts）。
   原因: generate ルートが loadAll（copy・seed 固定）で押すたび s1-01.. と採番し直して追記するため、
   別変種が同 id を持ってしまう（adopt/save が id マッチ＝双子に誤適用）。
   対処: 各ファイルで出現順に s1-01.. を一意に振り直す（gen.variant が真の同一性なので問題本体は不変）。 */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile } from "../app/products/problems/schema";

const DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");

async function main() {
  const files = (await fs.readdir(DIR)).filter((f) => f.startsWith("copy-") && f.endsWith(".json"));
  for (const f of files) {
    const fp = path.join(DIR, f);
    const file = JSON.parse(await fs.readFile(fp, "utf8")) as CandidateFile;
    const before = new Set(file.candidates.map((c) => c.id)).size;
    const seed = file.candidates[0]?.id.match(/-s(\d+)-/)?.[1] ?? "1";
    file.candidates.forEach((c, i) => {
      c.id = `${file.sku}-s${seed}-${String(i + 1).padStart(2, "0")}`;
    });
    const after = new Set(file.candidates.map((c) => c.id)).size;
    const dup = file.candidates.length - before;
    if (dup > 0) {
      await fs.writeFile(fp, JSON.stringify(file, null, 1), "utf8");
      console.log(`${f.padEnd(22)} ${file.candidates.length}件 重複${dup} → 一意${after} ✅修正`);
    } else {
      console.log(`${f.padEnd(22)} ${file.candidates.length}件 重複なし（変更なし）`);
    }
  }
}
main();
