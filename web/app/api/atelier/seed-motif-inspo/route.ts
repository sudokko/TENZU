/* dev 限定: 模写 SKU に「候補（模様）」をシード（idempotent）
   COPY_TO_MOTIF_INSPO のマップで copy-* sku → 同盤面の motif-* sku を参照。
   その motif sku の MOTIF_LADDER 帯で 20 個の Problem を生成し、
   呼び出された copy sku の candidates JSON に gen.generator="motif" 付きで追記する。
   - 既に gen.generator==="motif" のエントリがあれば何もしない（idempotent）
   - 兄弟巻（copy-lv2-vol1 と copy-lv2-vol2）で生きている motif 変種は除外し重複防止 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../io";
import { generateMotifCandidates } from "../../../products/problems/gen/motif";
import type { CandidateFile } from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

/* copy 模写 SKU → 同盤面の motif SKU。Lv.2〜Lv.3 対応。
   - Lv.2 vol1 = 3×3 / vol2 = 4×4
   - Lv.3 vol1 = 4×4（濃いめ帯）/ vol2 = 5×5 */
const COPY_TO_MOTIF_INSPO: Record<string, string> = {
  "copy-lv2-vol1": "motif-lv2-vol1",
  "copy-lv2-vol2": "motif-lv2-vol2",
  "copy-lv3-vol1": "motif-lv3-vol1",
  "copy-lv3-vol2": "motif-lv3-vol2",
};

const SEED = 1;
const COUNT = 20;

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const motifSku = COPY_TO_MOTIF_INSPO[sku];
  if (!motifSku) {
    return Response.json({ error: `この sku は模様候補の対象外: ${sku}` }, { status: 400 });
  }

  const task = sku.split("-")[0];
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

  const fresh = generateMotifCandidates(motifSku, SEED, COUNT, [], undefined, siblingVariants);

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
