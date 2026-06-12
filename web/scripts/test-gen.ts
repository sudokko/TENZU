/* 生成エンジンの簡易検証スクリプト（npx tsx scripts/test-gen.ts）
   - ラダー 8 段すべてで 20 問生成できるか（歩留まり）
   - 同 (sku, seed) の決定性
   - 制約違反ゼロ（paramsOk 再判定＋validateProblem） */
import { generateCandidates } from "../app/products/problems/gen/copy";
import { COPY_LADDER } from "../app/products/problems/gen/ladder";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { paramsOk } from "../app/products/problems/gen/filters";
import { validateProblem, difficultyScore, metricsLabel } from "../app/products/problems/schema";

let fail = 0;
for (const sku of Object.keys(COPY_LADDER)) {
  const t0 = Date.now();
  const a = generateCandidates(sku, 1, 20);
  const ms = Date.now() - t0;
  const b = generateCandidates(sku, 1, 20);
  const deterministic = JSON.stringify(a) === JSON.stringify(b);

  const params = COPY_LADDER[sku];
  let violations = 0;
  for (const p of a) {
    const m = computeMetrics(p.edges, params.grid);
    if (!paramsOk(p.edges, m, params)) violations++;
    violations += validateProblem(p).length;
  }
  const scores = a.map((p) => difficultyScore(p.metrics));
  const sorted = scores.every((s, i) => i === 0 || s >= scores[i - 1]);

  const ok = a.length === 20 && deterministic && violations === 0 && sorted;
  if (!ok) fail++;
  console.log(
    `${ok ? "OK " : "NG "} ${sku.padEnd(14)} n=${a.length} det=${deterministic} viol=${violations} sorted=${sorted} ${ms}ms`,
  );
  if (a.length > 0) {
    console.log(`     ex: ${metricsLabel(a[0].metrics, a[0].grid)}  …  ${metricsLabel(a[a.length - 1].metrics, a[a.length - 1].grid)}`);
  }
}
process.exit(fail ? 1 : 0);
