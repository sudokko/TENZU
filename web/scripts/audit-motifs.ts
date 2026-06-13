/* 絵柄モチーフ・ライブラリの監査（npx tsx scripts/audit-motifs.ts [-v]）
   - 全変種の整合: 座標が単位格子か・長さ0/重複なし・metrics 算出可能か
   - 各変種がどの SKU 帯に入るか（どこにも入らない変種＝設計ミスの検出）
   - SKU ごとの適格変種数（12 問採用に足る母数があるか）
   - generateMotifCandidates の歩留まり・決定性・validateProblem ゼロ */
import {
  allVariants, eligibleVariants, generateMotifCandidates, MOTIF_LADDER, variantFits,
} from "../app/products/problems/gen/motif";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { hasNon45 } from "../app/products/problems/gen/filters";
import { metricsLabel, validateProblem } from "../app/products/problems/schema";

const verbose = process.argv.includes("-v");
let fail = 0;

/* ---- 1. 変種ごとの帯適合 ---- */
const skus = Object.keys(MOTIF_LADDER);
const orphans: string[] = [];
console.log("== 変種一覧（span / lines / 帯） ==");
for (const v of allVariants()) {
  const grid = Math.max(v.spanC, v.spanR) + 1;
  const m = computeMetrics(v.edges, grid);
  const fits = skus.filter((sku) => variantFits(v, MOTIF_LADDER[sku]));
  if (fits.length === 0) {
    orphans.push(
      `${v.key} span=${v.spanC}x${v.spanR} lines=${m.lines} cross=${m.crossings} comp=${m.components} non45=${hasNon45(v.edges)}`,
    );
  }
  if (verbose) {
    console.log(
      `  ${v.key.padEnd(18)} span=${v.spanC}x${v.spanR} ${metricsLabel(m, { type: "square", n: grid as 3 })}` +
      ` → ${fits.join(", ") || "（どの帯にも入らない）"}`,
    );
  }
}
if (orphans.length > 0) {
  console.log(`\nNG どの帯にも入らない変種 ${orphans.length} 件:`);
  for (const o of orphans) console.log(`  ${o}`);
  fail++;
} else {
  console.log("OK 全変種がいずれかの帯に適合");
}

/* ---- 2. SKU ごとの母数と生成歩留まり ---- */
console.log("\n== SKU 別: 適格変種数と生成結果 ==");
for (const sku of skus) {
  const pool = eligibleVariants(sku);
  const families = new Set(pool.map((v) => v.motif.key));
  // MAX_PER_MOTIF=2 を踏まえた実効上限
  const capacity = [...families].reduce(
    (acc, k) => acc + Math.min(2, pool.filter((v) => v.motif.key === k).length), 0,
  );

  const a = generateMotifCandidates(sku, 1, 99);
  const b = generateMotifCandidates(sku, 1, 99);
  const deterministic = JSON.stringify(a) === JSON.stringify(b);
  let violations = 0;
  for (const p of a) violations += validateProblem(p).length;
  const motifNames = new Set(a.map((p) => p.gen.motif));
  const linesDist = a.map((p) => p.metrics.lines).join(",");

  const ok = a.length >= 14 && deterministic && violations === 0;
  if (!ok) fail++;
  console.log(
    `${ok ? "OK " : "NG "} ${sku.padEnd(14)} 変種pool=${pool.length}（${families.size}族・実効上限${capacity}）` +
    ` 生成=${a.length} det=${deterministic} viol=${violations}`,
  );
  console.log(`     モチーフ: ${[...motifNames].join("・")}`);
  console.log(`     lines昇順: ${linesDist}`);
}

process.exit(fail ? 1 : 0);
