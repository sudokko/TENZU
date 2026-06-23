/* dev 限定: 候補ファイルの読み出し＋検品状態（status/order）の書き戻し
   ＋ 線の手直し（edges 編集）。edges が来た update は正規化・検証して
   metrics をサーバ権威で再算出し edited 印を付ける。 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../io";
import {
  normalizeEdges, validateProblem,
  type CandidateStatus, type EdgeT,
} from "../../../products/problems/schema";
import { computeMetrics } from "../../../products/problems/gen/metrics";

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
    updates?: {
      id: string; status?: CandidateStatus; order?: number | null;
      edges?: EdgeT[]; motif?: string;
      /* 欠け補完(fill)の R 手直し。answer.mode は変えず edges だけ差し替える */
      answerEdges?: EdgeT[];
    }[];
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
    if (typeof u.motif === "string") {
      // タイトル（表示名）の手直し。全タスク共通（空文字で削除）
      const t = u.motif.trim();
      if (t) c.gen.motif = t;
      else delete c.gen.motif;
    }
    if (u.edges) {
      // 線の手直し: 正規化 → 検証 → metrics 再算出 → edited 印
      const normalized = normalizeEdges(u.edges);
      const errs = validateProblem({ ...c, edges: normalized });
      if (errs.length > 0) {
        return Response.json({ error: "編集が不正です", details: errs }, { status: 400 });
      }
      c.edges = normalized;
      c.metrics = computeMetrics(normalized, c.grid.n);
      c.edited = true;
    }
    if (u.answerEdges && c.answer?.mode === "explicit") {
      // R の手直し: 正規化のみ（R は F の部分集合という制約は検品者が目視で担保）
      c.answer = { mode: "explicit", edges: normalizeEdges(u.answerEdges) };
      c.edited = true;
    }
  }
  await writeCandidates(file);
  return Response.json({ ok: true });
}
