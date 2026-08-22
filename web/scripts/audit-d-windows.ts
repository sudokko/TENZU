/* published の D 窓はみ出し監査（npx tsx scripts/audit-d-windows.ts [--fix]）

   ladder.json の D 窓は「巻内を散らす物差し」であると同時に、生成器のゲートと
   手設計モチーフ投入スクリプトの合否判定でもある。**published が窓からはみ出した
   瞬間、その巻は「自分の中身を通せない窓」を持つ**ことになり、次に候補を足すとき
   の判定が壊れる。atelier で問題を差し替える／手直しすると静かにこれが起きるので、
   検品〜publish のあとに必ず 1 回まわすこと。

   較正の規則（decisions §3.105 で確定・ここが実装）:
     下限 ＝ min(旧下限, published 実測 min)
     上限 ＝ max(旧上限, published 実測 max)
   **--fix は窓を広げる方向にしか動かさない**。実測が窓の内側に寄っても窓は詰めない
   ——窓は「今の 12 問の範囲」ではなく「この巻に入れてよい難易度の範囲」であり、
   詰めると生成器と `/motif-seed` の候補プールを黙って狭めてしまう。狭めたいときは
   巻の定義を変える意思決定として ladder.json を手で編集すること。

   対象は D 窓を持つタスク＝模写（copy）と立体模写（solid）。他タスクの ladder は
   種類ゲートだけで D 窓を持たない。 */
import { promises as fs } from "fs";
import path from "path";
import { PUBLISHED } from "../app/products/problems/published";
import { COPY_LADDER, SOLID_LADDER_JSON } from "../app/products/problems/gen/ladder";

type Win = [number, number];
const windowOf = (sku: string): Win | undefined =>
  (COPY_LADDER[sku] as { D?: Win } | undefined)?.D
  ?? (SOLID_LADDER_JSON[sku] as unknown as { D?: Win } | undefined)?.D;

/* 窓は小数第1位まで（D の丸めと同じ粒度）。浮動小数のゴミを窓に持ち込まない。 */
const r1 = (x: number) => Math.round(x * 10) / 10;

async function main() {
  const fix = process.argv.includes("--fix");
  const rows: { sku: string; task: string; win: Win; min: number; max: number; out: string[] }[] = [];

  for (const [sku, set] of Object.entries(PUBLISHED)) {
    const win = windowOf(sku);
    if (!win) continue;
    const ds = set.problems.map((q) => q.difficulty?.value ?? 0);
    const out = set.problems
      .filter((q) => (q.difficulty?.value ?? 0) < win[0] || (q.difficulty?.value ?? 0) > win[1])
      .map((q) => `${q.provenance?.label ?? q.id}=${q.difficulty?.value}`);
    rows.push({ sku, task: set.task, win, min: r1(Math.min(...ds)), max: r1(Math.max(...ds)), out });
  }

  let bad = 0;
  for (const r of rows) {
    if (r.out.length) bad++;
    console.log(
      `${r.out.length ? "⚠ " : "  "}${r.sku} 窓[${r.win[0]}, ${r.win[1]}] 実測[${r.min}, ${r.max}]`
      + (r.out.length ? `  はみ出し ${r.out.length}: ${r.out.join(" / ")}` : ""),
    );
  }
  console.log(bad ? `\nはみ出しのある巻: ${bad} / ${rows.length}` : `\nはみ出しなし（${rows.length} 巻）`);

  if (!fix) {
    if (bad) console.log("→ 窓を実測へ合わせるなら --fix");
    process.exitCode = bad ? 1 : 0;
    return;
  }

  /* ---- --fix: ladder.json を規則どおり書き換える ---- */
  const p = path.join(process.cwd(), "app", "products", "problems", "ladder.json");
  const raw = (await fs.readFile(p, "utf8")).replace(/^﻿/, "");
  const data = JSON.parse(raw) as Record<string, Record<string, { D?: Win }>>;
  let changed = 0;
  for (const r of rows) {
    const entry = data[r.task]?.[r.sku];
    if (!entry?.D) continue;
    const lo = r1(Math.min(entry.D[0], r.min)); // 下限＝min(旧下限, 実測 min)＝広げるだけ
    const hi = r1(Math.max(entry.D[1], r.max)); // 上限＝max(旧上限, 実測 max)＝広げるだけ
    if (entry.D[0] === lo && entry.D[1] === hi) continue;
    console.log(`fix ${r.sku}: [${entry.D[0]}, ${entry.D[1]}] → [${lo}, ${hi}]`);
    entry.D = [lo, hi];
    changed++;
  }
  if (!changed) {
    console.log("書き換えなし");
    return;
  }
  await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`ladder.json を更新（${changed} 巻）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
