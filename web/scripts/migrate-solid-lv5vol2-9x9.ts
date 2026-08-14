/* 立体 Lv.5 Vol.2 を 9×9 に統一し、Lv.4 の未採用をコピーで補充する
   （npx tsx scripts/migrate-solid-lv5vol2-9x9.ts [--write]）

   ■ やること（2026-08-10・オーナー指示）
   1. solid-lv5-vol2 の候補を **盤面 9×9 に統一**。
      図形の広がり（bbox）が 9×9 に収まらないものは削除（「そぐわない図形は削除でいい」）。
      収まるものは 9×9 の中央へ寄せ直し、grid を 9×9 に書き換える。
   2. solid-lv4-vol1 の **未採用**（採用されなかった図形）のうち 9×9 に収まるものを
      Vol.2 へ pending でコピーする。
   3. **点線（隠れ線）の ON/OFF は一切さわらない**（style をそのまま持ち越す）。

   ■ 盤面の意味
   solid の grid は「点の格子の大きさ」で、座標は 0..cols-1 / 0..rows-1。
   図形は 1 マス内側に置かれていることが多い（例: 9×9 で c 1..7）。
   ここでは図形を格子の中央へ寄せる＝左右上下の余白差が 1 以内になるよう平行移動する。

   ■ 難易度
   solid の D ＝ 線の重み ＋ 盤面項 ＋ 3×隠れ辺（gen/difficulty.ts）。
   盤面項は図形の bbox から出るので、平行移動では動かない。grid を縮めても
   solid は boardN を使わない（bbox が材料）ため D は基本そのまま。
   それでも保存値と式のズレを残さないよう、全問 taskDifficulty で引き直す。 */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile, Problem, SolidEdge } from "../app/products/problems/schema";
import { computeSolidMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty } from "../app/products/problems/gen/difficulty";

const N = 9;
const DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

type Cand = Problem & { status: string; order?: number };

function extent(es: SolidEdge[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const s of es) for (const p of [s.a, s.b]) {
    cMin = Math.min(cMin, p.c); cMax = Math.max(cMax, p.c);
    rMin = Math.min(rMin, p.r); rMax = Math.max(rMax, p.r);
  }
  return { cMin, cMax, rMin, rMax, w: cMax - cMin + 1, h: rMax - rMin + 1 };
}

/* 図形を 9×9 の中央へ寄せる。style（実線／点線）は触らない＝隠れ線の ON/OFF 保存。 */
function recenter(es: SolidEdge[]): SolidEdge[] {
  const e = extent(es);
  const dc = Math.floor((N - e.w) / 2) - e.cMin;
  const dr = Math.floor((N - e.h) / 2) - e.rMin;
  return es.map((s) => ({
    ...s,
    a: { c: s.a.c + dc, r: s.a.r + dr },
    b: { c: s.b.c + dc, r: s.b.r + dr },
  }));
}

/* 9×9 化して metrics / difficulty を引き直す（manual override は保全） */
function to9x9(c: Cand): Cand {
  const solidEdges = recenter(c.solidEdges ?? []);
  const metrics = computeSolidMetrics(solidEdges);
  const next: Cand = { ...c, grid: { type: "solid", cols: N, rows: N }, solidEdges, metrics };
  const d = taskDifficulty("solid", next);
  next.difficulty = {
    task: "solid", auto: d.value, value: c.difficulty?.manual ?? d.value, parts: d.parts,
    ...(c.difficulty?.manual !== undefined && { manual: c.difficulty.manual }),
    ...(c.difficulty?.manualNote !== undefined && { manualNote: c.difficulty.manualNote }),
  };
  return next;
}

async function main() {
  const write = process.argv.includes("--write");
  const vol2Path = path.join(DIR, "solid-lv5-vol2.json");
  const lv4Path = path.join(DIR, "solid-lv4-vol1.json");
  const vol2 = JSON.parse(stripBom(await fs.readFile(vol2Path, "utf8"))) as CandidateFile;
  const lv4 = JSON.parse(stripBom(await fs.readFile(lv4Path, "utf8"))) as CandidateFile;

  /* ---- 1. Vol.2 を 9×9 で選別 ---- */
  const keep: Cand[] = [];
  const drop: Cand[] = [];
  for (const c of vol2.candidates as Cand[]) {
    const e = extent(c.solidEdges ?? []);
    (e.w <= N && e.h <= N ? keep : drop).push(c);
  }
  console.log(`== Vol.2 の選別（${vol2.candidates.length} 問）==`);
  console.log(`  9×9 に収まる: ${keep.length}（採用 ${keep.filter((c) => c.status === "adopted").length}）`);
  console.log(`  削除: ${drop.length}（採用 ${drop.filter((c) => c.status === "adopted").length}）`);
  for (const c of drop.filter((x) => x.status === "adopted")) {
    const e = extent(c.solidEdges ?? []);
    console.log(`    削除(採用済) ${c.id} ${e.w}×${e.h} D${c.difficulty?.value} ${(c.provenance as { label?: string })?.label ?? ""}`);
  }
  const kept = keep.map(to9x9);

  /* ---- 2. Lv.4 の未採用をコピー ---- */
  const lv4Un = (lv4.candidates as Cand[]).filter((c) => c.status !== "adopted");
  const lv4Fit = lv4Un.filter((c) => {
    const e = extent(c.solidEdges ?? []);
    return e.w <= N && e.h <= N;
  });
  console.log(`\n== Lv.4 未採用のコピー（${lv4Un.length} 問中）==`);
  console.log(`  9×9 に収まる: ${lv4Fit.length}／収まらず見送り: ${lv4Un.length - lv4Fit.length}`);

  let maxM = kept.reduce((mx, c) => Math.max(mx, parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10)), 0);
  const today = new Date().toISOString().slice(0, 10);
  const copied = lv4Fit.map((c) => {
    const base: Cand = {
      ...to9x9(c),
      id: `solid-lv5-vol2-m${String(++maxM).padStart(2, "0")}`,
      status: "pending",
      provenance: {
        source: "blank", createdAt: today,
        // どこから来たかを残す（検品で「Lv.4 から上げた図」と分かるように）
        label: `${(c.provenance as { label?: string })?.label ?? "Lv.4 の形"}（Lv.4より）`,
      },
    };
    delete (base as { order?: number }).order;
    return base;
  });
  const ds = copied.map((c) => c.difficulty!.value).sort((a, b) => a - b);
  if (ds.length) console.log(`  コピー後の D: ${ds[0]}〜${ds[ds.length - 1]}`);

  /* ---- 結果 ---- */
  const out = [...kept, ...copied];
  const keptD = kept.map((c) => c.difficulty!.value).sort((a, b) => a - b);
  console.log(`\n== 結果 ==`);
  console.log(`  Vol.2 候補: ${out.length} 問（採用 ${out.filter((c) => c.status === "adopted").length}／pending ${out.filter((c) => c.status === "pending").length}）`);
  console.log(`  盤面: ${[...new Set(out.map((c) => `${(c.grid as { cols: number; rows: number }).cols}×${(c.grid as { cols: number; rows: number }).rows}`))].join(", ")}`);
  console.log(`  残した分の D: ${keptD[0]}〜${keptD[keptD.length - 1]}（巻の D 窓は 50〜120）`);
  const hid = out.filter((c) => (c.metrics.hiddenLines ?? 0) > 0).length;
  console.log(`  隠れ辺あり ${hid} 問／なし ${out.length - hid} 問（ON/OFF は一切さわっていない）`);

  if (!write) { console.log("\n（--write なしのため保存していない）"); return; }
  await fs.writeFile(vol2Path, JSON.stringify({ ...vol2, candidates: out }, null, 1), "utf8");
  console.log(`\n書き込み完了 → solid-lv5-vol2.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
