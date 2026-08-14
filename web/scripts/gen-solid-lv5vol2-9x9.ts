/* 立体 Lv.5 Vol.2 の候補を、生成器で 9×9・隠れ辺フルで作り直す
   （npx tsx scripts/gen-solid-lv5vol2-9x9.ts [--count N] [--write]）

   ■ 経緯（2026-08-10）
   Lv.4 から持ち上げた 13 問は点線を 1 本も持たない（Lv.4 は hidden:"none" の巻で
   生成時に点線を破棄している）。見えている実線から幾何的に復元を試みたが、
   正解データ 21 問に対し **的中率 13%／完全一致 0 問** で不採用にした
   （立体が箱の集合ではなく錐・くさびを含む任意多面体で、単位辺モデルが当たらない）。

   ■ 方針 A（オーナー判断）
   Lv.4 由来にこだわらず、**Vol.2 の生成器で作り直す**。generateSolidCandidates は
   3D ボクセルから isHiddenPoint で隠れ辺を判定する（gen/solid.ts:770）ので、
   点線が最初から正しく付く。狙いだった「候補の補充」はこれで満たせる。

   ■ やること
   1. 「（Lv.4より）」の 13 問を撤去（隠れ線を持てないため）
   2. 生成器を回し、図形の広がりが 9×9 に収まるものだけ採る
   3. 9×9 の中央へ寄せ、grid を 9×9 に固定して metrics / D を引き直す
   4. 隠れ辺 0 本のものは捨てる（この巻は隠れ辺フル）
   5. status=pending で追記（既存の採用済み・pending はそのまま） */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile, Problem, SolidEdge, SolidPoint } from "../app/products/problems/schema";
import { generateSolidCandidates } from "../app/products/problems/gen/solid";
import { computeSolidMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty } from "../app/products/problems/gen/difficulty";

const SKU = "solid-lv5-vol2";
const N = 9;
const D_WIN: [number, number] = [50, 120];
const DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");
type Cand = Problem & { status: string };

function extent(es: SolidEdge[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const s of es) for (const p of [s.a, s.b]) {
    cMin = Math.min(cMin, p.c); cMax = Math.max(cMax, p.c);
    rMin = Math.min(rMin, p.r); rMax = Math.max(rMax, p.r);
  }
  return { cMin, rMin, w: cMax - cMin + 1, h: rMax - rMin + 1 };
}

/* 9×9 の中央へ寄せる。style（実線／点線）はそのまま＝隠れ線を壊さない。 */
function recenter(es: SolidEdge[]): SolidEdge[] {
  const e = extent(es);
  const dc = Math.floor((N - e.w) / 2) - e.cMin;
  const dr = Math.floor((N - e.h) / 2) - e.rMin;
  const mv = (p: SolidPoint): SolidPoint => ({ c: p.c + dc, r: p.r + dr });
  return es.map((s) => ({ ...s, a: mv(s.a), b: mv(s.b) }));
}

async function main() {
  const write = process.argv.includes("--write");
  const ci = process.argv.indexOf("--count");
  const want = ci >= 0 ? Number(process.argv[ci + 1]) : 20;
  const p2 = path.join(DIR, `${SKU}.json`);
  const file = JSON.parse(stripBom(await fs.readFile(p2, "utf8"))) as CandidateFile;
  const cands = file.candidates as Cand[];

  /* ---- 1. Lv.4 由来を撤去 ---- */
  const isLv4 = (c: Cand) => /（Lv\.4より）$/.test((c.provenance as { label?: string })?.label ?? "");
  const kept = cands.filter((c) => !isLv4(c));
  console.log(`Lv.4 由来を撤去: ${cands.length - kept.length} 問 → 残り ${kept.length} 問`);

  /* ---- 2〜4. 生成して 9×9 に収まるものだけ採る ---- */
  const out: Cand[] = [];
  let maxM = kept.reduce((mx, c) => Math.max(mx, parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10)), 0);
  const today = new Date().toISOString().slice(0, 10);
  let tried = 0, tooBig = 0, noHidden = 0, offD = 0;
  for (let seed = 1; seed <= 60 && out.length < want; seed++) {
    for (const g of generateSolidCandidates(SKU, seed, 8, [...kept, ...out])) {
      tried++;
      if (out.length >= want) break;
      const e = extent(g.solidEdges ?? []);
      if (e.w > N || e.h > N) { tooBig++; continue; }
      const solidEdges = recenter(g.solidEdges ?? []);
      const metrics = computeSolidMetrics(solidEdges);
      if ((metrics.hiddenLines ?? 0) === 0) { noHidden++; continue; }
      const next: Cand = {
        ...g, id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
        grid: { type: "solid", cols: N, rows: N }, solidEdges, metrics,
        provenance: { source: "blank", createdAt: today, label: `9×9（生成 s${seed}）` },
        status: "pending",
      };
      const d = taskDifficulty("solid", next);
      if (d.value < D_WIN[0] || d.value > D_WIN[1]) { offD++; maxM--; continue; }
      next.difficulty = { task: "solid", auto: d.value, value: d.value, parts: d.parts };
      out.push(next);
    }
  }
  console.log(`生成 ${tried} 問を検討 → 採取 ${out.length}`);
  console.log(`  ふるい落とし: 9×9 に入らない ${tooBig}／隠れ辺 0 本 ${noHidden}／D 窓外 ${offD}`);
  if (out.length) {
    const ds = out.map((c) => c.difficulty!.value).sort((a, b) => a - b);
    const hs = out.map((c) => c.metrics.hiddenLines ?? 0);
    console.log(`  D ${ds[0]}〜${ds[ds.length - 1]}（窓 ${D_WIN[0]}〜${D_WIN[1]}）`
      + `／隠れ辺 ${Math.min(...hs)}〜${Math.max(...hs)} 本`);
  }

  const all = [...kept, ...out];
  console.log(`\n結果: ${all.length} 問（採用 ${all.filter((c) => c.status === "adopted").length}`
    + `／pending ${all.filter((c) => c.status === "pending").length}）`);
  console.log(`  盤面: ${[...new Set(all.map((c) => `${(c.grid as { cols: number; rows: number }).cols}×${(c.grid as { cols: number; rows: number }).rows}`))].join(", ")}`);
  console.log(`  隠れ辺 0 本の問題: ${all.filter((c) => (c.metrics.hiddenLines ?? 0) === 0).length} 問`);

  if (!write) { console.log("\n（--write なしのため保存していない）"); return; }
  await fs.writeFile(p2, JSON.stringify({ ...file, candidates: all }, null, 1), "utf8");
  console.log(`\n書き込み完了 → ${SKU}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
