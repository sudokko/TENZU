/* 移動 Lv.3 の 2 巻分割マイグレーション（2026-08-01 オーナー指示）
   （npx tsx scripts/migrate-translate-lv3-split.ts [--write] [--png <png>]）

   - Vol.1 ＝ 左右上下 2 マスのみ（dir:hv・moves 2-2）→ 斜め問題を全部抜く
   - Vol.2 ＝ 斜め (±1,±1) の 4 種類（dir:diag・moves 2-2）を新設
     「後から 12 問選べるように」各方向 4 問 × 4 方向 ＝ 16 問を pending で用意。
     既存斜め問題は Vol.2 へ移動（採用済みも含め全部 pending に戻す・ID は -mvNN へ）。
     右1・下1 は既存 8 問 → D 散布の良い 4 問を残し、余りは不採用へ退避（戻せる）。
     不足 5 枠（左下1・右上2・左上2）は手設計で新造（-mNN）。

   検証＝本物の computeMetrics / taskDifficulty / TRANSLATE_LADDER。
   エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type Pt,
} from "../app/products/problems/schema";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature } from "../app/products/problems/gen/dedupe";
import { TRANSLATE_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SRC = "translate-lv3-vol1";
const DST = "translate-lv3-vol2";

/* 右1・下1（既存 8 問）から残す 4 問＝D 散布 10.3 / 11 / 12.1 / 13.6（採用済み 2 問を優先） */
const KEEP_RD = new Set([
  "translate-lv3-vol1-s1-06", // D10.3 採用済み
  "translate-lv3-vol1-s1-09", // D11
  "translate-lv3-vol1-s1-16", // D12.1
  "translate-lv3-vol1-s1-11", // D13.6 採用済み
]);

/* 新造 5 問（3×3 点箱・45°のみ・1 成分）。D 目標帯つき */
type Seed = {
  label: string; vec: [number, number];
  paths: string[]; dBand: [number, number];
};
const SEEDS: Seed[] = [
  { label: "たこ", vec: [-1, 1], dBand: [11.8, 13.5],
    paths: ["0,0 1,0 1,1 0,1 0,0", "1,1 2,2"] },          // しかく＋ななめのしっぽ
  { label: "すべりだい", vec: [1, -1], dBand: [11.5, 13],
    paths: ["2,0 0,0 0,1 1,2 2,2"] },                      // だい＋ななめのすべりめん
  { label: "かいだん", vec: [-1, -1], dBand: [10.5, 12],
    paths: ["0,0 1,0 1,1 2,1 2,2"] },                      // 2だんのかいだん
];

/* 低 D 帯（〜11）の小形は Lv.2（3×3・全 status）がほぼ使い尽くしているため、
   手設計でなく生成プール（copy ライブラリ＋小箱全列挙）から空いている形を検索する。
   ゲートは gen/translate.ts buildPool と同一（1 成分・閉路 1 以上・ヒゲ≤2・非45°なし）。 */
type AutoSlot = { label: string; vec: [number, number]; dBand: [number, number] };
const AUTO_SLOTS: AutoSlot[] = [
  { label: "右上の低D", vec: [1, -1], dBand: [9.8, 11.2] },
  { label: "左上の低D", vec: [-1, -1], dBand: [9.8, 10.6] },
];

const dirLabel = (dc: number, dr: number) =>
  (dc !== 0 ? (dc > 0 ? `右${Math.abs(dc)}` : `左${Math.abs(dc)}`) : "") +
  (dc !== 0 && dr !== 0 ? "・" : "") +
  (dr !== 0 ? (dr > 0 ? `下${Math.abs(dr)}` : `上${Math.abs(dr)}`) : "");

function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

/* F∪F' の union bbox を盤面中央へ（gen/translate.ts placeWithVector と同一規約） */
function place(edges: EdgeT[], vec: [number, number], n: number): EdgeT[] {
  const b = bounds(edges);
  const [dc, dr] = vec;
  const uC = b.cMax - b.cMin + Math.abs(dc), uR = b.rMax - b.rMin + Math.abs(dr);
  const offC = Math.floor((n - 1 - uC) / 2) + (dc < 0 ? -dc : 0);
  const offR = Math.floor((n - 1 - uR) / 2) + (dr < 0 ? -dr : 0);
  return normalizeEdges(edges.map((e) => [
    [e[0][0] - b.cMin + offC, e[0][1] - b.rMin + offR],
    [e[1][0] - b.cMin + offC, e[1][1] - b.rMin + offR],
  ] as EdgeT));
}

function anchorOf(edges: EdgeT[]): Pt {
  let a: Pt = edges[0][0];
  for (const e of edges) for (const p of e) {
    if (p[0] < a[0] || (p[0] === a[0] && p[1] < a[1])) a = p;
  }
  return a;
}

function svgPair(edges: EdgeT[], vec: [number, number], n: number): string {
  const cell = 30, pad = 14, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.4" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number, dash = "") =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash}/>`;
  const a = anchorOf(edges);
  const star = `<circle cx="${px(a[0])}" cy="${px(a[1])}" r="5" fill="none" stroke="#c2452d" stroke-width="2"/>`;
  const dest: Pt = [a[0] + vec[0], a[1] + vec[1]];
  const dot = `<circle cx="${px(dest[0])}" cy="${px(dest[1])}" r="5" fill="#c2452d"/>`;
  const moved = edges.map((e) => [
    [e[0][0] + vec[0], e[0][1] + vec[1]], [e[1][0] + vec[0], e[1][1] + vec[1]],
  ] as EdgeT);
  const left = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + edges.map((e) => line(e, "#2b2925", 2.6)).join("") + star + "</svg>";
  const right = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + moved.map((e) => line(e, "#c9c2b6", 2, ' stroke-dasharray="4 3"')).join("") + dot + "</svg>";
  return `${left}${right}`;
}

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

async function main() {
  const write = process.argv.includes("--write");
  const errs: string[] = [];

  const n = TRANSLATE_LADDER[DST]?.grid;
  if (n !== 4) errs.push(`TRANSLATE_LADDER[${DST}] が未定義または grid≠4（ladder.json を先に直すこと）`);
  if (TRANSLATE_LADDER[SRC]?.dir !== "hv") errs.push(`TRANSLATE_LADDER[${SRC}].dir が hv でない`);
  if (TRANSLATE_LADDER[DST]?.dir !== "diag") errs.push(`TRANSLATE_LADDER[${DST}].dir が diag でない`);

  const srcFile = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, `${SRC}.json`), "utf8"))) as CandidateFile;

  /* ---- 1. 分割 ---- */
  const straight = srcFile.candidates.filter((c) => {
    const a = c.answer;
    const t = a?.mode === "derived" && a.transform.type === "translate" ? a.transform : null;
    return t !== null && (t.dc === 0 || t.dr === 0);
  });
  const diag = srcFile.candidates.filter((c) => !straight.includes(c));
  console.log(`Vol.1 ${srcFile.candidates.length} 問 → 直進 ${straight.length}（残留）／斜め ${diag.length}（移動）`);

  /* ---- 2. Vol.1 残留分の order 振り直し ---- */
  const adoptedStraight = straight
    .filter((c) => c.status === "adopted")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  adoptedStraight.forEach((c, i) => { c.order = i; });

  /* ---- 3. Vol.2 へ移動（re-ID・status 再編） ---- */
  type Moved = Problem & { status: string; order?: number };
  let mvN = 0, newN = 0;
  const moved: Moved[] = diag.map((c) => {
    const a = c.answer;
    const t = a?.mode === "derived" && a.transform.type === "translate" ? a.transform : { dc: 0, dr: 0 };
    const wasRejected = c.status === "rejected";
    const isRD = t.dc === 1 && t.dr === 1;
    const keep = !wasRejected && (!isRD || KEEP_RD.has(c.id));
    const out: Moved = {
      ...c,
      id: `${DST}-mv${String(++mvN).padStart(2, "0")}`,
      status: keep ? "pending" : "rejected",
      // movedFrom は Provenance 型に無い移行専用の履歴フィールド（型を通すため unknown 経由）
      provenance: { ...(c.provenance ?? { source: "blank" }), movedFrom: c.id } as unknown as Problem["provenance"],
    };
    delete out.order; // 採用順は Vol.2 で選び直す
    return out;
  });

  /* ---- 4. 新造 5 問 ---- */
  const known = new Map<string, string>();
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!(sku.startsWith("copy-") || sku.startsWith("translate-"))) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      known.set(shapeSignature(p.edges), `published:${p.id}`);
    }
  }
  const candFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.startsWith("translate-") && f.endsWith(".json"));
  for (const f of candFiles) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
  }
  const librarySigs = new Map<string, string>();
  for (const v of [...allVariants(), ...microShapes()]) {
    const sig = shapeSignature(v.edges);
    if (!librarySigs.has(sig)) librarySigs.set(sig, v.key);
  }

  const today = new Date().toISOString().slice(0, 10);
  const created: Moved[] = [];
  for (const seed of SEEDS) {
    const edges = place(normalizeEdges(parsePaths(seed.paths)), seed.vec, 4);
    const m = computeMetrics(edges, 4);
    const base: Problem = {
      id: `${DST}-m${String(++newN).padStart(2, "0")}`,
      grid: { type: "square", n: 4 },
      edges,
      answer: { mode: "derived", transform: { type: "translate", dc: seed.vec[0], dr: seed.vec[1] } },
      metrics: m,
      provenance: { source: "blank", createdAt: today, label: seed.label },
      gen: { kind: "manual" },
    };
    const D = taskDifficulty("translate", base).value;
    const vErrs = validateProblem(base);
    if (vErrs.length) errs.push(`${seed.label}: ${vErrs.join(" / ")}`);
    if (m.components !== 1) errs.push(`${seed.label}: かたちが ${m.components} つ`);
    if (m.non45 > 0) errs.push(`${seed.label}: 非45°あり（4×4 は 45°まで）`);
    const b = bounds(edges);
    if (b.cMin + seed.vec[0] < 0 || b.cMax + seed.vec[0] > 3 || b.rMin + seed.vec[1] < 0 || b.rMax + seed.vec[1] > 3)
      errs.push(`${seed.label}: いどう先が盤面外`);
    if (D < seed.dBand[0] || D > seed.dBand[1])
      errs.push(`${seed.label}: D=${D} が目標帯 [${seed.dBand[0]}, ${seed.dBand[1]}] の外`);
    const sig = shapeSignature(edges);
    const dup = known.get(sig);
    if (dup && !dup.includes("(rejected)")) errs.push(`${seed.label}: 形かぶり → ${dup}`);
    else if (dup) console.log(`   ⚠ ${seed.label}: 不採用済み候補と同形（${dup}）— 許容`);
    else known.set(sig, `new:${seed.label}`);
    const lib = librarySigs.get(sig);
    if (lib) console.log(`   ⚠ ${seed.label}: 生成ライブラリと同形（${lib}）— 追加生成は既存候補を除外するため実害なし`);
    console.log(`   ${dirLabel(seed.vec[0], seed.vec[1])} ${seed.label}  D=${D} lines=${m.lines} sym=${m.symAxis}`);
    created.push({ ...migrateProblem("translate", base), status: "pending" });
  }

  /* ---- 4b. 自動検索スロット（生成プールから空いている形を拾う） ---- */
  for (const slot of AUTO_SLOTS) {
    type Hit = { edges: EdgeT[]; D: number; lines: number; sym: string; key: string; q: number };
    const hits: Hit[] = [];
    for (const v of [...allVariants(), ...microShapes()]) {
      if (v.spanC > 2 || v.spanR > 2) continue;
      const edges = place(v.edges, slot.vec, 4);
      const m = computeMetrics(edges, 4);
      if (m.components !== 1 || m.non45 > 0) continue;
      if (closedLoops(edges, m.components) < 1) continue;
      if (danglingCount(edges) > 2) continue;
      if (m.lines < 3 || m.lines > 6) continue;
      const sig = shapeSignature(edges);
      const dup = known.get(sig);
      if (dup && !dup.includes("(rejected)")) continue;
      const probe: Problem = {
        id: `${DST}-probe`, grid: { type: "square", n: 4 }, edges, metrics: m,
        answer: { mode: "derived", transform: { type: "translate", dc: slot.vec[0], dr: slot.vec[1] } },
        gen: { kind: "auto" },
      };
      if (validateProblem(probe).length) continue;
      const D = taskDifficulty("translate", probe).value;
      if (D < slot.dBand[0] || D > slot.dBand[1]) continue;
      const q = closedLoops(edges, m.components) * 2 - danglingCount(edges) + (m.symAxis !== "none" ? 1 : 0);
      hits.push({ edges, D, lines: m.lines, sym: m.symAxis ?? "none", key: v.key, q });
    }
    hits.sort((a, b) => b.q - a.q || a.D - b.D);
    if (hits.length === 0) { errs.push(`${slot.label}: D帯 [${slot.dBand[0]}, ${slot.dBand[1]}] で空いている形が見つからない`); continue; }
    const h = hits[0];
    known.set(shapeSignature(h.edges), `new:${slot.label}`);
    console.log(`   ${dirLabel(slot.vec[0], slot.vec[1])} ${slot.label} → ${h.key}  D=${h.D} lines=${h.lines} sym=${h.sym}（空き候補 ${hits.length} 件から選抜）`);
    const base: Problem = {
      id: `${DST}-m${String(++newN).padStart(2, "0")}`,
      grid: { type: "square", n: 4 },
      edges: h.edges,
      answer: { mode: "derived", transform: { type: "translate", dc: slot.vec[0], dr: slot.vec[1] } },
      metrics: computeMetrics(h.edges, 4),
      provenance: { source: "blank", createdAt: today, label: slot.label },
      gen: { kind: "auto", generator: "translate", version: "1", seed: 0, variant: `${h.key}@${slot.vec[0]},${slot.vec[1]}` },
    };
    created.push({ ...migrateProblem("translate", base), status: "pending" });
  }

  /* ---- 5. 方向別 4 問の検算 ---- */
  const all = [...moved, ...created];
  const byDir = new Map<string, { id: string; D: number; st: string }[]>();
  for (const c of all) {
    const a = c.answer;
    const t = a?.mode === "derived" && a.transform.type === "translate" ? a.transform : { dc: 0, dr: 0 };
    const key = dirLabel(t.dc, t.dr);
    const arr = byDir.get(key) ?? [];
    arr.push({ id: c.id, D: (c as Problem).difficulty?.value ?? taskDifficulty("translate", c).value, st: c.status });
    byDir.set(key, arr);
  }
  console.log("\n---- Vol.2 方向別 ----");
  for (const [key, arr] of byDir) {
    const pend = arr.filter((x) => x.st === "pending").sort((a, b) => a.D - b.D);
    const rej = arr.filter((x) => x.st === "rejected");
    console.log(`${key}: pending ${pend.length} 問  D={${pend.map((x) => x.D).join(", ")}}  不採用 ${rej.length}`);
    if (pend.length !== 4) errs.push(`${key} の pending が ${pend.length} 問（4 問でない）`);
  }
  const totalPending = all.filter((c) => c.status === "pending").length;
  console.log(`Vol.2 合計: pending ${totalPending}／不採用 ${all.length - totalPending}`);
  console.log(`Vol.1 残留: 採用 ${adoptedStraight.length}／候補 ${straight.filter((c) => c.status === "pending").length}／計 ${straight.length}`);

  if (errs.length) {
    console.error("\n検証 NG:");
    for (const e of errs) console.error(` ✗ ${e}`);
    process.exitCode = 1;
    return;
  }

  /* ---- PNG コンタクトシート（pending 16 問・方向別） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cell = 30, pad = 14, board = (4 - 1) * cell + pad * 2;
    const cols = 4, cellW = board * 2 + 50, cellH = board + 56;
    const pend = all.filter((c) => c.status === "pending");
    const order = ["右1・下1", "左1・下1", "右1・上1", "左1・上1"];
    pend.sort((a, b) => {
      const ta = (a.answer as { transform: { dc: number; dr: number } }).transform;
      const tb = (b.answer as { transform: { dc: number; dr: number } }).transform;
      const ka = order.indexOf(dirLabel(ta.dc, ta.dr)), kb = order.indexOf(dirLabel(tb.dc, tb.dr));
      if (ka !== kb) return ka - kb;
      return ((a as Problem).difficulty?.value ?? 0) - ((b as Problem).difficulty?.value ?? 0);
    });
    const rowsN = Math.ceil(pend.length / cols);
    const cells = pend.map((c, i) => {
      const t = (c.answer as { transform: { dc: number; dr: number } }).transform;
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgPair(c.edges, [t.dc, t.dr], 4);
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 10)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("");
      const D = (c as Problem).difficulty?.value ?? "?";
      const lab = (c.provenance as { label?: string } | undefined)?.label ?? c.id.replace(`${DST}-`, "");
      return `<g transform="translate(${x},${y})">
<text x="8" y="20" font-size="14" font-family="sans-serif">${dirLabel(t.dc, t.dr)}  ${lab}  D=${D}</text>
<g transform="translate(8,28)">${g}</g>
</g>`;
    }).join("\n");
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${rowsN * cellH}" viewBox="0 0 ${cols * cellW} ${rowsN * cellH}"><rect width="100%" height="100%" fill="#faf8f4"/>${cells}</svg>`;
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(sheet), { density: 110 }).png().toFile(pngPath);
    console.log(`png → ${pngPath}`);
  }

  /* ---- 6. 書き込み ---- */
  if (!write) { console.log("\n（dry-run。--write で書き込み）"); return; }
  const vol1: CandidateFile = { ...srcFile, candidates: straight };
  const vol2: CandidateFile = {
    schemaVersion: 1, sku: DST, task: "translate",
    candidates: all as CandidateFile["candidates"], seedCursor: 0,
  };
  await fs.writeFile(path.join(CAND_DIR, `${SRC}.json`), JSON.stringify(vol1, null, 1), "utf8");
  await fs.writeFile(path.join(CAND_DIR, `${DST}.json`), JSON.stringify(vol2, null, 1), "utf8");
  console.log(`\n書き込み完了: ${SRC}.json（${vol1.candidates.length} 問）／${DST}.json（${vol2.candidates.length} 問）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
