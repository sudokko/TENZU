/* 回転 Lv.4 の巻番号付け替え＋候補プール拡充（2026-08-02 オーナー指示）
   （npx tsx scripts/migrate-rotate-lv4-rename.ts [--write]）

   1. rename: rotate-lv4-vol2 → rotate-lv4-vol1
      3×3 の旧 Vol.1 は §3.86 で廃止済み。生き残った 4×4・180° 巻が唯一の Lv.4 なので
      巻番号を 1 へ戻す（candidates / published / ladder.json / ids）。
      data.ts・published/index.ts・skus.ts は手編集（本スクリプトの対象外）。
   2. audit: 右回り（lv3-vol1）・左回り（lv3-vol2）ほか兄弟巻の公開中・生存候補と
      「同じ形」（変種キー・形シグネチャ・解答側の形）で被っていないかを照合して報告。
   3. generate: D10〜30 を 4 帯（10-15/15-20/20-25/25-30）×5 問でバランスさせた
      新規 20 問を pending で追記。除外は atelier の generate ルートと同一
      （兄弟巻の変種キー＋形シグネチャ＋既存候補）。

   検証＝本物の generateRotateCandidates / taskDifficulty。--write なしはドライラン。 */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile, EdgeT } from "../app/products/problems/schema";
import { generateRotateCandidates, rotateEdges, degOf, ROTATE_LADDER } from "../app/products/problems/gen/rotate";
import { taskDifficulty, migrateCandidateFile } from "../app/products/problems/gen/difficulty";
import { shapeSignature } from "../app/products/problems/gen/dedupe";

const ROOT = path.join(__dirname, "..", "app", "products", "problems");
const CAND = (sku: string) => path.join(ROOT, "candidates", `${sku}.json`);
const PUB = (sku: string) => path.join(ROOT, "published", `${sku}.json`);
const LADDER = path.join(ROOT, "ladder.json");

const OLD = "rotate-lv4-vol2";
const NEW = "rotate-lv4-vol1";
const SIBLINGS = ["rotate-lv2-vol1", "rotate-lv3-vol1", "rotate-lv3-vol2", "rotate-lv5-vol1"];

const WRITE = process.argv.includes("--write");

type AnyProblem = {
  id: string; edges: EdgeT[]; status?: string;
  grid: { n: number };
  answer?: { transform?: { deg?: number } };
  gen?: { variant?: string };
};

async function readJson(p: string): Promise<Record<string, unknown> | null> {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function main() {
  /* ---- 1. rename ---- */
  const candFile = (await readJson(CAND(OLD))) as unknown as CandidateFile | null;
  const pubFile = await readJson(PUB(OLD));
  const ladder = (await readJson(LADDER)) as Record<string, Record<string, unknown>>;
  if (!candFile || !pubFile) throw new Error(`${OLD} の candidates / published が見つからない`);
  if (!ladder.rotate?.[OLD]) throw new Error(`ladder.json に ${OLD} が無い`);
  if (ladder.rotate[NEW]) throw new Error(`ladder.json に ${NEW} が既にある（二重実行？）`);

  const renameIds = <T extends { id: string }>(items: T[]): T[] =>
    items.map((p) => ({ ...p, id: p.id.replace(`${OLD}-`, `${NEW}-`) }));

  candFile.sku = NEW;
  candFile.candidates = renameIds(candFile.candidates as { id: string }[]) as typeof candFile.candidates;
  (pubFile as { sku: string }).sku = NEW;
  (pubFile as { problems: { id: string }[] }).problems =
    renameIds((pubFile as { problems: { id: string }[] }).problems);

  // ladder.json はキー順を保ったまま vol2 → vol1 に差し替える
  const rotateLadder: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ladder.rotate)) rotateLadder[k === OLD ? NEW : k] = v;
  ladder.rotate = rotateLadder as Record<string, Record<string, unknown>>;

  console.log(`[rename] ${OLD} → ${NEW}: candidates ${candFile.candidates.length} 問・published ${(pubFile as { problems: unknown[] }).problems.length} 問・ladder キー更新`);

  /* ---- 2. audit: 兄弟巻とのかぶり照合 ---- */
  const sibSigs = new Map<string, string>();   // sig → 由来（sku/id）
  const sibVariants = new Map<string, string>();
  for (const sku of SIBLINGS) {
    for (const [file, kind] of [[await readJson(CAND(sku)), "cand"], [await readJson(PUB(sku)), "pub"]] as const) {
      if (!file) continue;
      const items = ((file.candidates ?? file.problems) ?? []) as AnyProblem[];
      for (const p of items) {
        if (p.status === "rejected") continue;
        const label = `${kind}:${p.id}`;
        sibSigs.set(shapeSignature(p.edges), label);
        // 解答側（回した後の形）も「紙面に現れる形」なのでかぶり対象に足す
        const deg = p.answer?.transform?.deg as 90 | -90 | 180 | undefined;
        if (deg) sibSigs.set(shapeSignature(rotateEdges(p.edges, p.grid.n, deg)), `${label}(答)`);
        if (p.gen?.variant) sibVariants.set(p.gen.variant, label);
      }
    }
  }

  const hits: string[] = [];
  const ours = [
    ...(candFile.candidates as unknown as AnyProblem[]).filter((c) => c.status !== "rejected"),
    // published は candidates の adopted と同一だが、独立に照合して取りこぼしを防ぐ
    ...((pubFile as { problems: AnyProblem[] }).problems),
  ];
  const seen = new Set<string>();
  for (const p of ours) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const n = p.grid.n;
    const sigF = shapeSignature(p.edges);
    const sigR = shapeSignature(rotateEdges(p.edges, n, 180));
    if (sibSigs.has(sigF)) hits.push(`${p.id}: みほんが ${sibSigs.get(sigF)} と同形`);
    if (sibSigs.has(sigR)) hits.push(`${p.id}: 解答(180°)が ${sibSigs.get(sigR)} と同形`);
    if (p.gen?.variant && sibVariants.has(p.gen.variant))
      hits.push(`${p.id}: 変種キー ${p.gen.variant} が ${sibVariants.get(p.gen.variant)} と同じ`);
  }
  console.log(`[audit] 兄弟巻（右回り lv3-vol1・左回り lv3-vol2 ほか）との照合: ${hits.length === 0 ? "かぶりなし ✅" : `${hits.length} 件`}`);
  for (const h of hits) console.log(`  ⚠ ${h}`);

  /* ---- 2.5 かぶり解消（2026-08-02 監査結果に基づく固定リスト）----
     - こちらが pending のものは、こちらを rejected へ（s1-02・s1-03・s2-22）
     - こちらが published の s1-08 は残し、衝突相手＝lv3-vol1 の pending s1-13 を
       rejected へ（採用されると公開同士のかぶりが実体化するため先に塞ぐ） */
  const REJECT_OURS = new Set([`${NEW}-s1-02`, `${NEW}-s1-03`, `${NEW}-s2-22`]);
  let rejected = 0;
  for (const c of candFile.candidates as unknown as AnyProblem[]) {
    if (REJECT_OURS.has(c.id) && c.status === "pending") { c.status = "rejected"; rejected++; }
  }
  const lv3v1 = (await readJson(CAND("rotate-lv3-vol1"))) as unknown as CandidateFile | null;
  let rejectedSib = 0;
  if (lv3v1) {
    for (const c of lv3v1.candidates as unknown as AnyProblem[]) {
      if (c.id === "rotate-lv3-vol1-s1-13" && c.status === "pending") { c.status = "rejected"; rejectedSib++; }
    }
  }
  console.log(`[resolve] 当巻 pending ${rejected} 問・lv3-vol1 pending ${rejectedSib} 問を rejected へ`);

  /* ---- 3. generate: D10〜30 バランス 20 問 ---- */
  const BANDS: [number, number][] = [[10, 15], [15, 20], [20, 25], [25, 30.01]];
  const PER_BAND = 5;

  // 生成器はモジュール読み込み時の ladder.json（旧キー）を見るため、新キーを登録する
  ROTATE_LADDER[NEW] = ROTATE_LADDER[OLD];

  // 除外集合（atelier generate ルートと同一の考え方）
  const excludeVariants = new Set(sibVariants.keys());
  const excludeShapeSigs = new Set(sibSigs.keys());
  const existingEdges = (candFile.candidates as unknown as AnyProblem[])
    .filter((c) => c.status !== "rejected")
    .map((c) => c.edges);

  // lines を振って広めに生成し、D で帯に振り分ける
  const seedBase = (candFile.seedCursor ?? 0) + 1;
  const pool: { problem: AnyProblem & { metrics: unknown }; d: number }[] = [];
  const pooledSigs = new Set<string>();
  const [linesLo, linesHi] = ROTATE_LADDER[NEW]?.lines ?? ROTATE_LADDER[OLD].lines;
  let seed = seedBase;
  for (let lines = linesLo; lines <= linesHi; lines++) {
    const fresh = generateRotateCandidates(
      NEW, seed, 30,
      [...existingEdges, ...pool.map((x) => x.problem.edges)],
      lines, excludeVariants, excludeShapeSigs,
    ) as unknown as (AnyProblem & { metrics: unknown })[];
    for (const p of fresh) {
      const sig = shapeSignature(p.edges);
      if (pooledSigs.has(sig)) continue;
      // 生成器はみほん側しか兄弟照合しないため、解答(180°)側のかぶりをここで塞ぐ
      if (sibSigs.has(shapeSignature(rotateEdges(p.edges, p.grid.n, 180)))) continue;
      pooledSigs.add(sig);
      const d = taskDifficulty("rotate", p as never).value;
      pool.push({ problem: p, d });
    }
    seed++;
  }
  console.log(`[generate] プール ${pool.length} 問（lines ${linesLo}〜${linesHi} を走査・D ${Math.min(...pool.map((x) => x.d))}〜${Math.max(...pool.map((x) => x.d))}）`);

  // 帯ごとに D の散らばりが均等になるよう選抜（帯内は D 昇順で等間隔サンプル）
  const chosen: { problem: AnyProblem & { metrics: unknown }; d: number }[] = [];
  const shortfall: string[] = [];
  for (const [lo, hi] of BANDS) {
    const inBand = pool
      .filter((x) => x.d >= lo && x.d < hi && !chosen.includes(x))
      .sort((a, b) => a.d - b.d);
    if (inBand.length <= PER_BAND) {
      chosen.push(...inBand);
      if (inBand.length < PER_BAND) shortfall.push(`D${lo}〜${hi}: ${inBand.length}/${PER_BAND} 問`);
    } else {
      for (let i = 0; i < PER_BAND; i++) {
        chosen.push(inBand[Math.round((i * (inBand.length - 1)) / (PER_BAND - 1))]);
      }
    }
  }
  // 不足帯は近い D から補充して合計 20 を満たす
  const TARGET = BANDS.length * PER_BAND;
  if (chosen.length < TARGET) {
    const rest = pool
      .filter((x) => !chosen.includes(x) && x.d >= 10)
      .sort((a, b) => b.d - a.d); // 高 D 側が薄いはずなので高い順に足す
    chosen.push(...rest.slice(0, TARGET - chosen.length));
  }
  chosen.sort((a, b) => a.d - b.d);

  console.log(`[select] ${chosen.length} 問選抜: D=${chosen.map((x) => x.d).join(", ")}`);
  if (shortfall.length) console.log(`  ⚠ 帯の不足（プールの上限）: ${shortfall.join(" / ")}（近傍 D で補充済み）`);

  /* id 採番＝atelier ルートと同じ「既存最大連番の続き」 */
  const maxN = (candFile.candidates as unknown as AnyProblem[]).reduce((mx, c) => {
    const m = parseInt(c.id.match(/-s\d+-(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, m);
  }, 0);
  const newCands = chosen.map((x, i) => ({
    ...x.problem,
    id: `${NEW}-s${seedBase}-${String(maxN + i + 1).padStart(2, "0")}`,
    status: "pending" as const,
  }));
  candFile.candidates.push(...(newCands as never[]));
  candFile.seedCursor = seed - 1;

  if (!WRITE) {
    console.log("\n[dry-run] --write を付けると書き込みます");
    return;
  }

  const migrated = migrateCandidateFile(candFile);
  await fs.writeFile(CAND(NEW), JSON.stringify(migrated, null, 1) + "\n", "utf8");
  await fs.writeFile(PUB(NEW), JSON.stringify(pubFile, null, 1) + "\n", "utf8");
  await fs.writeFile(LADDER, JSON.stringify(ladder, null, 1) + "\n", "utf8");
  if (lv3v1 && rejectedSib > 0) {
    await fs.writeFile(CAND("rotate-lv3-vol1"), JSON.stringify(lv3v1, null, 1) + "\n", "utf8");
  }
  await fs.unlink(CAND(OLD));
  await fs.unlink(PUB(OLD));
  console.log(`\n[write] 完了: candidates ${migrated.candidates.length} 問（+${newCands.length} pending）・旧 ${OLD}.json 削除`);
}

main().catch((e) => { console.error(e); process.exit(1); });
