/* dev 限定: 候補ファイルの読み出し＋検品状態（status/order）の書き戻し
   ＋ 線の手直し（edges 編集）。edges が来た update は正規化・検証して
   metrics をサーバ権威で再算出し edited 印を付ける。 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../io";
import {
  normalizeEdges, normalizeSolidEdges, validateProblem,
  type CandidateStatus, type EdgeT, type SolidEdge,
} from "../../../products/problems/schema";
import { computeMetrics, computeSolidMetrics } from "../../../products/problems/gen/metrics";
import { refreshMeta } from "../../../products/problems/gen/difficulty";

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
      /* 立体(solid)の手直し。solidEdges を差し替える（grid は不変） */
      solidEdges?: SolidEdge[];
      /* 欠け補完(fill)の R 手直し。answer.mode は変えず edges だけ差し替える */
      answerEdges?: EdgeT[];
      /* 難易度の人手 override（手動ティア付け）。number=固定 / null=自動へ戻す */
      manual?: number | null; manualNote?: string;
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
      // タイトル（表示名）の手直し。全タスク共通（空文字で削除）。
      // 旧 gen.motif と v2 provenance.label の両方を同期（カードは label 優先で読む）。
      const t = u.motif.trim();
      if (t) c.gen.motif = t;
      else delete c.gen.motif;
      if (c.provenance) {
        if (t) c.provenance.label = t;
        else delete c.provenance.label;
      }
    }
    if (u.solidEdges && c.grid.type === "solid") {
      // 立体の手直し: 正規化 → 検証 → metrics 再算出 → edited 印
      const normalized = normalizeSolidEdges(u.solidEdges);
      const errs = validateProblem({ ...c, edges: [], solidEdges: normalized });
      if (errs.length > 0) {
        return Response.json({ error: "編集が不正です", details: errs }, { status: 400 });
      }
      c.solidEdges = normalized;
      c.metrics = computeSolidMetrics(normalized);
      c.edited = true;
    } else if (u.edges && c.grid.type === "square") {
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
    const solidEdited = !!(u.solidEdges && c.grid.type === "solid");
    const answerEdited = !!(u.answerEdges && c.answer?.mode === "explicit");
    if (answerEdited) {
      // R の手直し: 正規化のみ（R は F の部分集合という制約は検品者が目視で担保）
      c.answer = { mode: "explicit", edges: normalizeEdges(u.answerEdges!) };
      c.edited = true;
    }
    // 難易度の人手 override（手動ティア付け・自動値は auto に保全）
    if (u.manual !== undefined && c.difficulty) {
      if (u.manual === null) {
        delete c.difficulty.manual; delete c.difficulty.manualNote;
        c.difficulty.value = c.difficulty.auto;
      } else {
        c.difficulty.manual = u.manual;
        c.difficulty.value = u.manual;
        if (typeof u.manualNote === "string") c.difficulty.manualNote = u.manualNote;
      }
    }
    // edges/解答/立体辺を変えたら difficulty.auto と provenance を引き直す（manual は保全）
    if (u.edges || answerEdited || solidEdited) refreshMeta(file.task, c);
  }
  await writeCandidates(file);
  return Response.json({ ok: true });
}
