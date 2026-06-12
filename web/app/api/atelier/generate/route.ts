/* dev 限定: 候補の追加生成（seedCursor インクリメント・既存候補と多様性比較） */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../io";
import { generateCandidates } from "../../../products/problems/gen/copy";
import { COPY_LADDER } from "../../../products/problems/gen/ladder";
import type { CandidateFile } from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string; count?: number; lines?: number };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });
  const ladder = COPY_LADDER[sku];
  if (!ladder) {
    return Response.json({ error: `ジェネレータ未対応の sku: ${sku}（手設計は candidates JSON へ直接追記）` }, { status: 400 });
  }

  // 線本数の指定生成（省略時はラダー全帯域からクォータ生成）
  let lines: number | undefined;
  if (body.lines !== undefined) {
    if (!Number.isInteger(body.lines) || body.lines < ladder.lines[0] || body.lines > ladder.lines[1]) {
      return Response.json(
        { error: `線本数は ${ladder.lines[0]}〜${ladder.lines[1]} の範囲で指定してください` },
        { status: 400 },
      );
    }
    lines = body.lines;
  }

  const file: CandidateFile = (await readCandidates(sku)) ?? {
    schemaVersion: 1, sku, task: sku.split("-")[0], candidates: [], seedCursor: 0,
  };

  const seed = file.seedCursor + 1;
  const existingEdges = file.candidates
    .filter((c) => c.status !== "rejected")
    .map((c) => c.edges);
  const fresh = generateCandidates(sku, seed, body.count ?? 5, existingEdges, lines);

  file.candidates.push(...fresh.map((p) => ({ ...p, status: "pending" as const })));
  file.seedCursor = seed;
  await writeCandidates(file);

  return Response.json({ ok: true, added: fresh.length, seed, total: file.candidates.length });
}
