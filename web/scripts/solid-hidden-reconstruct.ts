/* 立体の「隠れ線（点線）」を、見えている実線だけから幾何的に復元する
   （npx tsx scripts/solid-hidden-reconstruct.ts [--apply] [--png <png>]）

   ■ なぜ必要か（2026-08-10）
   立体 Lv.5 Vol.2 へ Lv.4 から持ち上げた 13 問は点線を 1 本も持たない。
   Lv.4 は `hidden:"none"` の巻で、gen/solid.ts:894 が生成時に**点線を捨てている**
   （退避ではなく破棄）。しかも該当 13 問は手描き（gen:manual・edited）で
   3D モデルも seed も残っていないため、「ON に戻す」経路が存在しない。
   ＝見えている実線から組み直すしかない。

   ■ 使える手がかり
   投影はキャビネット図で固定（gen/solid.ts:769 `sc2=x+y, su2=z+y`）。
   奥行き 1 マスは画面上で **(右 1, 上 1)**＝(dc,dr) = (+1,-1) の一定ベクトル。
   よって「front の辺を d だけずらすと back の辺」「頂点と v+d を結ぶと奥行き辺」
   という平行四辺形の関係だけで、完全なワイヤーフレームを組み直せる。

   ■ 手順
   1. 見えている実線から、完全ワイヤーフレーム候補を作る
      （W/H 辺の back コピー ＋ 各頂点の奥行き辺）
   2. そのうち実線に無いものが「隠れ線の候補」
   3. 過剰生成を刈る（下記 prune）
   ■ 検証
   Vol.2 には点線を持つ問題が 21 問ある＝**正解データ**。その実線だけを入力に
   復元をかけ、実際の点線と突き合わせて precision / recall を出す。
   十分な精度が出たときだけ --apply で 13 問へ書き込む。 */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile, Problem, SolidEdge, SolidPoint } from "../app/products/problems/schema";
import { normalizeSolidEdges, solidEdgeKey } from "../app/products/problems/schema";
import { computeSolidMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty } from "../app/products/problems/gen/difficulty";

const DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");
const DC = 1, DR = -1;                       // 奥行きベクトル（右1・上1）

type Cand = Problem & { status: string };
const pk = (p: SolidPoint) => `${p.c},${p.r}`;
const ek = (a: SolidPoint, b: SolidPoint) => {
  const [x, y] = [pk(a), pk(b)].sort();
  return `${x}|${y}`;
};
const mv = (p: SolidPoint, k: number): SolidPoint => ({ c: p.c + DC * k, r: p.r + DR * k });

/* 辺の向き。W＝よこ（幅）・H＝たて（高さ）・D＝奥行き（右上45°） */
function dirOf(e: SolidEdge): "W" | "H" | "D" | "?" {
  const dc = e.b.c - e.a.c, dr = e.b.r - e.a.r;
  if (dr === 0 && dc !== 0) return "W";
  if (dc === 0 && dr !== 0) return "H";
  if (dc === -dr && dc !== 0) return "D";
  return "?";
}

/* 実線だけから隠れ線を復元する。
   ①W/H 辺を d だけ奥へずらした「back コピー」
   ②W/H 辺の端点それぞれから伸びる「奥行き辺」
   を候補にし、既に実線としてある分を除く。
   ③prune: 候補の端点が、完全ワイヤーフレーム上で 3 方向以上に接していないものは捨てる。
     ＝浮いたヒゲ（実在しない裏面）を落とす。 */
export function reconstructHidden(solid: SolidEdge[]): SolidEdge[] {
  const have = new Set(solid.map((e) => ek(e.a, e.b)));
  const cand = new Map<string, SolidEdge>();
  const add = (a: SolidPoint, b: SolidPoint) => {
    const k = ek(a, b);
    if (!have.has(k) && !cand.has(k)) cand.set(k, { a, b, style: "dashed" });
  };
  for (const e of solid) {
    const d = dirOf(e);
    if (d !== "W" && d !== "H") continue;
    add(mv(e.a, 1), mv(e.b, 1));            // ① back コピー
    add(e.a, mv(e.a, 1));                   // ② 奥行き辺
    add(e.b, mv(e.b, 1));
  }
  // ③ prune: 完全ワイヤーフレーム上の次数で判定
  const deg = new Map<string, number>();
  const bump = (p: SolidPoint) => deg.set(pk(p), (deg.get(pk(p)) ?? 0) + 1);
  for (const e of solid) { bump(e.a); bump(e.b); }
  for (const e of cand.values()) { bump(e.a); bump(e.b); }
  const out: SolidEdge[] = [];
  for (const e of cand.values()) {
    if ((deg.get(pk(e.a)) ?? 0) >= 3 && (deg.get(pk(e.b)) ?? 0) >= 3) out.push(e);
  }
  return normalizeSolidEdges(out);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const p2 = path.join(DIR, "solid-lv5-vol2.json");
  const file = JSON.parse(stripBom(await fs.readFile(p2, "utf8"))) as CandidateFile;
  const cands = file.candidates as Cand[];

  /* ---- 検証: 点線を持つ問題を正解データにする ---- */
  const truth = cands.filter((c) => (c.solidEdges ?? []).some((e) => e.style === "dashed"));
  console.log(`== 復元の精度検証（正解データ ${truth.length} 問）==`);
  let tp = 0, fp = 0, fn = 0, perfect = 0;
  for (const c of truth) {
    const all = c.solidEdges ?? [];
    const vis = all.filter((e) => e.style !== "dashed");
    const want = new Set(all.filter((e) => e.style === "dashed").map((e) => ek(e.a, e.b)));
    const got = new Set(reconstructHidden(vis).map((e) => ek(e.a, e.b)));
    let a = 0, b = 0, d = 0;
    for (const k of got) (want.has(k) ? a++ : b++);
    for (const k of want) if (!got.has(k)) d++;
    tp += a; fp += b; fn += d;
    if (b === 0 && d === 0) perfect++;
    console.log(`  ${c.id.padEnd(22)} 正解${want.size}本 復元${got.size}本 → 的中${a} 余分${b} 取りこぼし${d}`
      + (b === 0 && d === 0 ? "  ★完全一致" : ""));
  }
  const prec = tp + fp ? (100 * tp / (tp + fp)).toFixed(0) : "-";
  const rec = tp + fn ? (100 * tp / (tp + fn)).toFixed(0) : "-";
  console.log(`\n  的中率(precision) ${prec}%／取りこぼしなし率(recall) ${rec}%／完全一致 ${perfect}/${truth.length} 問`);

  /* ---- 適用対象: 点線 0 本の問題（＝Lv.4 から持ち上げた分）---- */
  const target = cands.filter((c) => !(c.solidEdges ?? []).some((e) => e.style === "dashed"));
  console.log(`\n== 適用対象（点線 0 本）${target.length} 問 ==`);
  for (const c of target) {
    const add = reconstructHidden(c.solidEdges ?? []);
    console.log(`  ${c.id.padEnd(22)} 実線${(c.solidEdges ?? []).length}本 → 隠れ線 ${add.length} 本を復元`
      + `  ${(c.provenance as { label?: string })?.label ?? ""}`);
  }

  if (!apply) { console.log("\n（--apply なしのため保存していない）"); return; }
  let changed = 0;
  for (const c of cands) {
    if ((c.solidEdges ?? []).some((e) => e.style === "dashed")) continue;
    const add = reconstructHidden(c.solidEdges ?? []);
    if (add.length === 0) continue;
    c.solidEdges = normalizeSolidEdges([...(c.solidEdges ?? []), ...add]);
    c.metrics = computeSolidMetrics(c.solidEdges);
    const d = taskDifficulty("solid", c);
    c.difficulty = { task: "solid", auto: d.value, value: d.value, parts: d.parts };
    changed++;
  }
  await fs.writeFile(p2, JSON.stringify(file, null, 1), "utf8");
  console.log(`\n書き込み完了 → solid-lv5-vol2.json（${changed} 問へ隠れ線を追加）`);
}

if (process.argv[1]?.includes("solid-hidden-reconstruct")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
void solidEdgeKey;
