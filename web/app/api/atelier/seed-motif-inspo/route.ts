/* dev 限定: 模写/欠け補完 SKU に「候補（模様）」をシード（idempotent）
   COPY_TO_MOTIF_INSPO / FILL_TO_MOTIF_INSPO のマップで sku → 同盤面の motif-* sku を参照。
   その motif sku の MOTIF_LADDER 帯で 20 個の Problem を生成し、
   呼び出された sku の candidates JSON に gen.generator="motif" 付きで追記する。
   - copy: モチーフ完成図をそのまま模写問題として注入
   - fill: モチーフ完成図 F から欠け R を seeded RNG で抜き（公平性ルール＝R の両端点が
     G=F∖R に残る・本数=その巻の missing 帯）、answer:{explicit,R} を付与して注入
   - 既に gen.generator==="motif" のエントリがあれば何もしない（idempotent）
   - 同 Lv の兄弟巻で生きている motif 変種は除外し重複防止 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../io";
import { generateMotifCandidates } from "../../../products/problems/gen/motif";
import { publishedCopySignatures, shapeSignature } from "../../../products/problems/gen/dedupe";
import { FILL_LADDER } from "../../../products/problems/gen/ladder";
import { seededRng, randInt, type Rng } from "../../../products/problems/gen/rng";
import { refreshMeta } from "../../../products/problems/gen/difficulty";
import {
  edgeKey, normalizeEdges,
  type CandidateFile, type EdgeT, type Problem,
} from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

/* copy 模写 SKU → 同盤面の motif SKU。Lv.2〜Lv.3 対応。
   - Lv.2 vol1 = 3×3
   - Lv.3 vol1 = 4×4（交差帯）/ vol2 = 5×5 */
const COPY_TO_MOTIF_INSPO: Record<string, string> = {
  "copy-lv2-vol1": "motif-lv2-vol1",
  "copy-lv3-vol1": "motif-lv3-vol1",
  "copy-lv3-vol2": "motif-lv3-vol2",
};

/* fill 欠け補完 SKU → 同盤面の motif SKU（2026-07-01 再構成の4巻・decisions §3.58）。
   欠け本数は FILL_LADDER[sku].missing 帯に従う。 */
const FILL_TO_MOTIF_INSPO: Record<string, string> = {
  "fill-lv2-vol1": "motif-lv2-vol1",   // 3×3
  "fill-lv3-vol1": "motif-lv3-vol1",   // 4×4
  "fill-lv4-vol1": "motif-lv4-vol1",   // 5×5（かさ 等）
  "fill-lv5-vol1": "motif-lv4-vol2",   // 6×6
};

const SEED = 1;
const COUNT = 20;

/* F（正規化済み unit edges）から欠け R を選ぶ。
   公平性ルール＝R の各辺の両端点が G=F∖R の端点集合に残る（つなぐ先が見える）。
   seeded shuffle → 貪欲に採用。lo 本に届かなければ null（そのモチーフはスキップ）。 */
function pickMissing(edges: EdgeT[], lo: number, hi: number, rnd: Rng): EdgeT[] | null {
  const cap = Math.min(hi, Math.max(lo, edges.length - 3)); // G が痩せすぎない上限
  const target = randInt(rnd, lo, cap);
  const idx = edges.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = randInt(rnd, 0, i);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const fair = (cand: number[]): boolean => {
    const rSet = new Set(cand.map((i) => edgeKey(edges[i])));
    const pts = new Set<string>();
    for (const e of edges) {
      if (rSet.has(edgeKey(e))) continue;
      pts.add(`${e[0][0]},${e[0][1]}`);
      pts.add(`${e[1][0]},${e[1][1]}`);
    }
    return cand.every((i) => {
      const e = edges[i];
      return pts.has(`${e[0][0]},${e[0][1]}`) && pts.has(`${e[1][0]},${e[1][1]}`);
    });
  };
  const chosen: number[] = [];
  for (const i of idx) {
    if (chosen.length >= target) break;
    const next = [...chosen, i];
    if (fair(next)) chosen.push(i);
  }
  if (chosen.length < lo) return null;
  return chosen.map((i) => edges[i]);
}

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const task = sku.split("-")[0];
  const motifSku = task === "fill" ? FILL_TO_MOTIF_INSPO[sku] : COPY_TO_MOTIF_INSPO[sku];
  if (!motifSku) {
    return Response.json({ error: `この sku は模様候補の対象外: ${sku}` }, { status: 400 });
  }

  const file: CandidateFile = (await readCandidates(sku)) ?? {
    schemaVersion: 1, sku, task, candidates: [], seedCursor: 0,
  };

  /* idempotent: 既にこの sku に motif 由来の候補があれば何もしない */
  if (file.candidates.some((c) => c.gen?.generator === "motif")) {
    return Response.json({ ok: true, added: 0, total: file.candidates.length, alreadySeeded: true });
  }

  /* 兄弟巻（同タスク・他 sku）で生きている motif 変種を除外して採番を分散 */
  const siblingVariants = new Set<string>();
  for (const c of file.candidates) {
    if (c.status !== "rejected" && c.gen?.variant) siblingVariants.add(c.gen.variant);
  }

  let fresh: Problem[] = generateMotifCandidates(motifSku, SEED, COUNT, [], undefined, siblingVariants);

  /* かぶり除外: 模写で公開済みの図形（採用済みモチーフ含む）は他タスクに再出題しない */
  fresh = fresh.filter((p) => !publishedCopySignatures().has(shapeSignature(p.edges)));

  /* fill: モチーフ完成図 F から欠け R を抜いて answer に積む（本数=巻の missing 帯） */
  if (task === "fill") {
    const band = FILL_LADDER[sku]?.missing as [number, number] | undefined;
    const [lo, hi] = band ?? [1, 2];
    const rnd = seededRng(`${sku}#motif-fill#${SEED}`);
    fresh = fresh.flatMap((p) => {
      const r = pickMissing(p.edges, lo, hi, rnd);
      if (!r) return [];
      const out: Problem = { ...p, answer: { mode: "explicit", edges: normalizeEdges(r) } };
      refreshMeta(task, out); // D = base + 2·gaps・provenance 再導出
      return [out];
    });
  }

  /* id を sku に紐づけて採番（衝突回避：既存の最大連番から続ける） */
  const maxN = file.candidates.reduce((mx, c) => {
    const n = parseInt(c.id.match(/-s\d+-(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, n);
  }, 0);
  file.candidates.push(...fresh.map((p, i) => ({
    ...p,
    id: `${sku}-motif-s${SEED}-${String(maxN + i + 1).padStart(2, "0")}`,
    status: "pending" as const,
  })));

  await writeCandidates(file);

  return Response.json({ ok: true, added: fresh.length, total: file.candidates.length });
}
