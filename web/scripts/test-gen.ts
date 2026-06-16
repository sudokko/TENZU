/* 生成エンジンの簡易検証スクリプト（npx tsx scripts/test-gen.ts）
   copy はライブラリ方式（2026-06-14〜）。
   - 各巻でライブラリ全件をロードできるか（候補数）
   - 同 (sku, seed) の決定性
   - 制約違反ゼロ（validateProblem）＋難易度昇順
   - 線数バケツの充足（bucketReport） */
import {
  generateCopyCandidates, COPY_LADDER, bucketReport, copyDifficulty,
} from "../app/products/problems/gen/copy";
import { validateProblem, metricsLabel } from "../app/products/problems/schema";

let fail = 0;
for (const sku of Object.keys(COPY_LADDER)) {
  const t0 = Date.now();
  const a = generateCopyCandidates(sku, 1);
  const ms = Date.now() - t0;
  const b = generateCopyCandidates(sku, 1);
  const deterministic = JSON.stringify(a) === JSON.stringify(b);

  let violations = 0;
  for (const p of a) violations += validateProblem(p).length;

  const scores = a.map((p) => copyDifficulty(p.metrics));
  const sorted = scores.every((s, i) => i === 0 || s >= scores[i - 1]);

  const ok = a.length > 0 && deterministic && violations === 0 && sorted;
  if (!ok) fail++;
  console.log(
    `${ok ? "OK " : "NG "} ${sku.padEnd(14)} n=${a.length} det=${deterministic} viol=${violations} sorted=${sorted} ${ms}ms`,
  );
  const bucket = bucketReport(sku);
  console.log(`     線数バケツ: ${JSON.stringify(bucket)}`);
  // エンジン別カウント（variant prefix 分類・Lv3+ の供給バランス確認）
  const eng = { sym: 0, rand: 0, blob: 0, hybrid: 0, other: 0 };
  for (const p of a) {
    const v = (p as { gen?: { variant?: string } }).gen?.variant ?? "";
    if (v.startsWith("rand#")) eng.rand++;
    else if (v.startsWith("blob#")) eng.blob++;
    else if (v.startsWith("hybrid#")) eng.hybrid++;
    else if (v.startsWith("sym#")) eng.sym++;
    else eng.other++;
  }
  console.log(`     エンジン別: ${JSON.stringify(eng)}`);
  if (a.length > 0) {
    console.log(`     ex: ${metricsLabel(a[0].metrics, a[0].grid)}  …  ${metricsLabel(a[a.length - 1].metrics, a[a.length - 1].grid)}`);
  }
}
process.exit(fail ? 1 : 0);
