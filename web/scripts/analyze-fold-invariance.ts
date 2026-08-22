/* =========================================================================
   折り重ね「退化」監査（decisions §3.103）
   実行: npx tsx scripts/analyze-fold-invariance.ts [lv2|lv3|…]

   折り重ねの問題1が折り軸（v）に対してそれ自身対称だと、折り返した線が元と
   同じ場所へ戻る＝**折りを理解しない子が問題1をそのまま写しても正解になる**。
   難易度が低いのではなく、わかっている子とわかっていない子を区別できない
   ＝出題として失敗している。D 側は折り係数で減点するが、係数は退化を教えて
   くれるだけで直してはくれない＝検品で落とす／差し替えるための一覧がこれ。

   回避策（作問側）は motif-craft §6.5＝軸からずらす／傾ける／対称を1本くずす。
   ========================================================================= */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Problem } from "../app/products/problems/schema";
import { foldInvariance } from "../app/products/problems/gen/difficulty";

const base = join(import.meta.dirname, "../app/products/problems");
const filter = process.argv[2];

type Row = { src: string; sku: string; id: string; label: string; status: string; inv: number; d: number };
const rows: Row[] = [];

for (const sub of ["published", "candidates"]) {
  const dir = join(base, sub);
  for (const fn of readdirSync(dir).filter((x) => x.startsWith("fold-") && x.endsWith(".json"))) {
    if (filter && !fn.includes(filter)) continue;
    const f = JSON.parse(readFileSync(join(dir, fn), "utf8"));
    for (const p of (f.problems ?? f.candidates ?? []) as (Problem & { status?: string })[]) {
      if (p.grid.type !== "square") continue;
      rows.push({
        src: sub === "published" ? "公開" : "候補",
        sku: f.sku, id: p.id.split("-").pop()!,
        label: (p.provenance as { label?: string })?.label ?? "",
        status: p.status ?? "published",
        inv: foldInvariance(p.edges, p.grid.n),
        d: p.difficulty?.value ?? 0,
      });
    }
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const bySku = new Map<string, Row[]>();
for (const r of rows) bySku.set(`${r.src} ${r.sku}`, [...(bySku.get(`${r.src} ${r.sku}`) ?? []), r]);

for (const [sku, list] of [...bySku].sort()) {
  const dead = list.filter((r) => r.inv >= 0.999);
  const part = list.filter((r) => r.inv > 0 && r.inv < 0.999);
  console.log(`\n■ ${sku}（${list.length}問） 完全退化 ${dead.length} ／ 部分 ${part.length} ／ 健全 ${list.length - dead.length - part.length}`);
  for (const r of [...dead, ...part].sort((a, b) => b.inv - a.inv || b.d - a.d)) {
    const mark = r.inv >= 0.999 ? "⛔" : "・";
    console.log(`  ${mark} ${r.id.padEnd(4)} 重なり ${pct(r.inv).padStart(4)}  D${String(r.d).padEnd(5)} ${r.status.padEnd(9)} ${r.label}`);
  }
}

const dead = rows.filter((r) => r.inv >= 0.999);
console.log(`\n合計 ${rows.length} 問 / 完全退化 ${dead.length} 問（${pct(dead.length / rows.length)}）`);
console.log("⛔＝折らずに写しても正解になる問題。採用済みなら差し替えを検討すること。");
