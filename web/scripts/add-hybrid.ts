/* lv4-vol1 にハイブリッド候補を N 個追加する（npx tsx scripts/add-hybrid.ts [N]）。
   生成パイプライン（generateCopyCandidates）で既存候補と被らない hybrid を選び、
   一意 id・status:pending で candidates JSON へ追記する。 */
import { promises as fs } from "fs";
import path from "path";
import { generateCopyCandidates } from "../app/products/problems/gen/copy";
import type { CandidateFile } from "../app/products/problems/schema";

const SKU = "copy-lv4-vol1";
const N = Number(process.argv[2] ?? 5);

async function main() {
  const fp = path.join(process.cwd(), "app", "products", "problems", "candidates", `${SKU}.json`);
  const file = JSON.parse(await fs.readFile(fp, "utf8")) as CandidateFile;

  // 既存候補を踏まえて生成（変種重複・jaccard 類似を除外）→ hybrid だけ N 個
  const out = generateCopyCandidates(SKU, 1, 9999, file.candidates);
  const hybrids = out.filter((p) => p.gen.variant?.startsWith("hybrid#")).slice(0, N);
  if (hybrids.length < N) {
    console.log(`⚠ hybrid 候補が ${hybrids.length} 個しか作れなかった（要求 ${N}）`);
  }

  const maxN = file.candidates.reduce((mx, c) => {
    const n = parseInt(c.id.match(/-s\d+-(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, n);
  }, 0);
  hybrids.forEach((p, i) => {
    file.candidates.push({
      ...p,
      id: `${SKU}-s1-${String(maxN + i + 1).padStart(2, "0")}`,
      status: "pending",
    });
  });
  await fs.writeFile(fp, JSON.stringify(file, null, 1), "utf8");

  console.log(`${SKU}: hybrid ${hybrids.length} 個追加 → 合計 ${file.candidates.length} 件`);
  hybrids.forEach((p) => console.log(`  ${p.gen.variant}  metrics:`, JSON.stringify(p.metrics)));
}
main();
