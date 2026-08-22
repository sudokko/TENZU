/* =========================================================================
   published/*.json の metrics・difficulty を現行の式で再計算する
   実行: npx tsx scripts/backfill-difficulty.ts

   D 式を改訂したら必ず流すこと（difficulty.auto は保存値なので、式を変えても
   ここを流すまで published は旧スケールのまま）。
   - metrics: edges から全問引き直す（computeMetrics は純粋・決定的）
   - difficulty.auto: taskDifficulty で再算出。manual override と manualNote は保全
     （実効値 value = manual ?? auto の規約どおり value も更新）
   - 出力は既存と同じ 1 スペースインデント・BOM なし
   candidates/ は対象外（検品前データ。atelier の再生成・再検品で新式に切り替わる）
   ========================================================================= */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { metricsEdges, taskDifficulty } from "../app/products/problems/gen/difficulty";
import { computeMetrics, computeSolidMetrics } from "../app/products/problems/gen/metrics";
import type { Problem } from "../app/products/problems/schema";

/* 1 問を現行式で引き直す（status/order 等の余分なフィールドは spread で保全）。
   metrics の材料は metricsEdges 経由＝折り重ねは完成図で測る（difficulty.ts 参照）。 */
function recalc<T extends Problem>(task: string, p: T): T {
  const metrics = p.grid.type === "solid"
    ? computeSolidMetrics(p.solidEdges ?? [])
    : computeMetrics(metricsEdges(task, p), p.grid.n);
  const withM = { ...p, metrics };
  const d = taskDifficulty(task, withM);
  return {
    ...withM,
    difficulty: {
      task,
      auto: d.value,
      value: p.difficulty?.manual ?? d.value,
      parts: d.parts,
      ...(p.difficulty?.manual !== undefined && { manual: p.difficulty.manual }),
      ...(p.difficulty?.manualNote !== undefined && { manualNote: p.difficulty.manualNote }),
    },
  };
}

/* published は problems・candidates は candidates が問題配列（他キーはそのまま書き戻す） */
function processDir(dir: string, listKey: "problems" | "candidates") {
  let touched = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const path = join(dir, f);
    const before = readFileSync(path, "utf8");
    const set = JSON.parse(before) as Record<string, unknown> & { task: string; sku: string };
    const list = set[listKey] as Problem[] | undefined;
    if (!list) { console.log(`${f}: ${listKey} なし・スキップ`); continue; }

    const next = list.map((p) => recalc(set.task, p));
    const after = JSON.stringify({ ...set, [listKey]: next }, null, 1);
    if (after === before) continue;
    writeFileSync(path, after, "utf8");
    touched++;

    const ds = next.map((p) => p.difficulty!.value);
    const olds = list.map((p) => p.difficulty?.value).filter((v): v is number => v !== undefined);
    const oldTxt = olds.length ? `${Math.min(...olds)}〜${Math.max(...olds)}` : "未算出";
    console.log(`${String(set.sku).padEnd(22)} D ${oldTxt} → ${Math.min(...ds)}〜${Math.max(...ds)}`);
  }
  return touched;
}

const base = join(import.meta.dirname, "../app/products/problems");
console.log("== published ==");
const a = processDir(join(base, "published"), "problems");
console.log("== candidates（検品前・表示スケールを揃えるため同時に引き直す） ==");
const b = processDir(join(base, "candidates"), "candidates");
console.log(`published ${a} / candidates ${b} ファイル更新`);
