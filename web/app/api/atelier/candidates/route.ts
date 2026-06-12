/* dev 限定: 候補ファイルの読み出し＋検品状態（status/order）の書き戻し */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../io";
import type { CandidateStatus } from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const sku = safeSku(req.nextUrl.searchParams.get("sku"));
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const file = await readCandidates(sku);
  return Response.json(file ?? { schemaVersion: 1, sku, task: sku.split("-")[0], candidates: [], seedCursor: 0 });
}

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as {
    sku?: string;
    updates?: { id: string; status?: CandidateStatus; order?: number | null }[];
  };
  const sku = safeSku(body.sku);
  if (!sku || !Array.isArray(body.updates)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const file = await readCandidates(sku);
  if (!file) return Response.json({ error: "no candidates file" }, { status: 404 });

  const byId = new Map(body.updates.map((u) => [u.id, u]));
  for (const c of file.candidates) {
    const u = byId.get(c.id);
    if (!u) continue;
    if (u.status) c.status = u.status;
    if (u.order === null) delete c.order;
    else if (typeof u.order === "number") c.order = u.order;
  }
  await writeCandidates(file);
  return Response.json({ ok: true });
}
