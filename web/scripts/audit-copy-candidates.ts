/* 既存 copy 候補が新基準（variantFits＝種類ゲート＋D窓）に合うか監査する。
   --apply を付けると不適合を candidates/*.json から削除して書き戻す。
   付けなければ dry-run（判定の棚卸しだけ・無削除）。 */
import { promises as fs } from "fs";
import path from "path";
import { COPY_LADDER, variantFits, copyDifficulty, type ShapeVariant } from "../app/products/problems/gen/copy";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import type { Candidate, CandidateFile, EdgeT } from "../app/products/problems/schema";

const APPLY = process.argv.includes("--apply");
const DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");

function spanOf(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { spanC: cMax - cMin, spanR: rMax - rMin };
}

/* 候補 → 疑似 ShapeVariant（variantFits が見るフィールドだけ詰める） */
function asVariant(c: Candidate): ShapeVariant {
  const variant = c.gen?.variant ?? "static#";
  const { spanC, spanR } = spanOf(c.edges);
  return { key: variant, name: c.gen?.motif ?? "", family: variant.split("#")[0], edges: c.edges, spanC, spanR };
}

async function main() {
let grandFail = 0, grandTotal = 0, adoptedFail = 0;
console.log(`${APPLY ? "★APPLY（削除実行）" : "dry-run（無削除）"}  対象: candidates/copy-*.json\n`);
console.log("sku            total  pass  fail   fail内訳(status)         例: 落ちた理由");

for (const sku of Object.keys(COPY_LADDER)) {
  const fp = path.join(DIR, `${sku}.json`);
  let raw: string;
  try { raw = await fs.readFile(fp, "utf8"); } catch { console.log(`${sku.padEnd(14)} （ファイルなし）`); continue; }
  const file = JSON.parse(raw) as CandidateFile;
  const p = COPY_LADDER[sku];

  const keep: Candidate[] = [];
  const failStatus: Record<string, number> = {};
  let sample = "";
  for (const c of file.candidates) {
    const ok = variantFits(asVariant(c), p);
    if (ok) { keep.push(c); continue; }
    failStatus[c.status] = (failStatus[c.status] ?? 0) + 1;
    if (c.status === "adopted") adoptedFail++;
    if (!sample) {
      const m = computeMetrics(c.edges, p.grid);
      const D = copyDifficulty(m);
      const reasons: string[] = [];
      if (p.slopes !== "any" && m.hasNon45) reasons.push("非45°混入");
      if (p.requireNon45 && !m.hasNon45) reasons.push("非45°なし");
      if (p.requireDiag45 && m.diagonals < 1) reasons.push("斜めなし");
      if (p.cross === "zero" && m.crossings !== 0) reasons.push("交差あり");
      if (p.cross === "some" && m.crossings < 1) reasons.push("交差なし");
      if (D < p.D[0] || D > p.D[1]) reasons.push(`D=${D}∉[${p.D[0]},${p.D[1]}]`);
      sample = `D=${D} ${reasons.join("/") || "span/その他"}`;
    }
  }
  const fail = file.candidates.length - keep.length;
  grandTotal += file.candidates.length; grandFail += fail;
  console.log(
    `${sku.padEnd(14)} ${String(file.candidates.length).padStart(5)} ${String(keep.length).padStart(5)} ${String(fail).padStart(5)}   ` +
    `${JSON.stringify(failStatus).padEnd(24)} ${sample}`,
  );

  if (APPLY && fail > 0) {
    file.candidates = keep;
    await fs.writeFile(fp, JSON.stringify(file, null, 1), "utf8");
  }
}
console.log(`\n合計 ${grandTotal} 問中 ${grandFail} 問が不適合（うち adopted=${adoptedFail}）。${APPLY ? "→ 削除して書き戻した。" : "→ --apply で削除。"}`);
}
main();
