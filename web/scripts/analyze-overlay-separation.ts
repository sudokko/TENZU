/* =========================================================================
   「ばらけの項」監査（かさね・分解・折り重ね）
   実行: npx tsx scripts/analyze-overlay-separation.ts

   D 式 v3 の overlay 系は E が線ごとの加算のため、同じ完成図をどう A/B に
   配分しても E(A)+E(B) が不変＝「分け方の難しさ」を見られなかった
   （絡み 0 の分割で同点・decisions §3.97 の動機）。ばらけの項の導入後、
   このスクリプトは「どの問題で発動しているか」を一覧する監査ビュー。
   ========================================================================= */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { EdgeT, Problem } from "../app/products/problems/schema";
import { edgeKey } from "../app/products/problems/schema";
import { taskDifficulty } from "../app/products/problems/gen/difficulty";

const base = join(import.meta.dirname, "../app/products/problems");
let total = 0;
const rows: string[] = [];

for (const [dir, listKey] of [["published", "problems"], ["candidates", "candidates"]] as const) {
  const d = join(base, dir);
  for (const f of readdirSync(d).filter((x) => /^(overlay|decompose|fold)-/.test(x) && x.endsWith(".json"))) {
    const set = JSON.parse(readFileSync(join(d, f), "utf8")) as { task: string; [k: string]: unknown };
    const list = set[listKey] as (Problem & { status?: string })[] | undefined;
    if (!list) continue;
    for (const p of list) {
      total++;
      const { value, parts } = taskDifficulty(set.task, p);
      const sep = parts["ばらけ"];
      if (!sep) continue;
      rows.push(
        `${`${dir}/${f}`.padEnd(42)} ${p.id.padEnd(26)} ` +
        `${String(p.provenance?.label ?? "").padEnd(12)} ${String(p.status ?? "published").padEnd(9)} ` +
        `ばらけ +${sep}  D=${value}`,
      );
    }
  }
}

console.log(`対象 ${total} 問中、ばらけの項が発動: ${rows.length} 問\n`);
for (const r of rows) console.log(r);

/* ---- でんしゃ（とっきゅう）の 2 変種対比（項の存在理由のデモ） ----
   保存版＝B にパンタグラフ＋足回り（2 かたまり）。パンタグラフを A 側へ
   寄せた変種は同じ完成図・同じ E 合計だが、ばらけの項だけが分かれる。 */
console.log("\n== でんしゃ（とっきゅう）2 変種の対比 ==");
const lv4 = JSON.parse(
  readFileSync(join(base, "candidates/overlay-lv4-vol1.json"), "utf8"),
) as { candidates: Problem[] };
const m14 = lv4.candidates.find((c) => c.id === "overlay-lv4-vol1-m14");
if (m14 && m14.answer?.mode === "explicit") {
  const hook: EdgeT[] = [[[2, 0], [2, 1]], [[2, 0], [3, 0]]];
  const hookKeys = new Set(hook.map(edgeKey));
  const v1: Problem = {
    ...m14,
    answer: { mode: "explicit", edges: m14.answer.edges.filter((e) => !hookKeys.has(edgeKey(e))) },
  };
  for (const [name, v] of [["フックを A 側へ（1 かたまりずつ）", v1], ["保存版（B が 2 かたまり）", m14]] as const) {
    const { value, parts } = taskDifficulty("overlay", v);
    console.log(`${name}: D=${value}（ばらけ ${parts["ばらけ"] ?? 0}）`);
  }
}
