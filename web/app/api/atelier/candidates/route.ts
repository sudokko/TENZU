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
      /* 移動(translate)の移動ベクトル手直し。derived answer の transform を差し替える */
      transform?: { dc: number; dr: number };
      /* 回転(rotate)の角度手直し（混在巻＝1 問 1 角度・decisions §3.87） */
      rotateDeg?: 90 | -90 | 180;
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
    // 移動ベクトルの手直し（translate のみ）: 移動なし・はみ出しはサーバでも弾く
    let transformEdited = false;
    if (u.transform && c.grid.type === "square"
      && c.answer?.mode === "derived" && c.answer.transform.type === "translate") {
      const dc = Math.trunc(Number(u.transform.dc)), dr = Math.trunc(Number(u.transform.dr));
      const gn = c.grid.n;
      const fits = c.edges.every((e) => e.every((p) =>
        p[0] + dc >= 0 && p[0] + dc <= gn - 1 && p[1] + dr >= 0 && p[1] + dr <= gn - 1));
      if ((dc === 0 && dr === 0) || !fits || Number.isNaN(dc) || Number.isNaN(dr)) {
        return Response.json({ error: "移動先が不正です（移動なし／枠からはみ出し）" }, { status: 400 });
      }
      c.answer = { mode: "derived", transform: { type: "translate", dc, dr } };
      c.edited = true;
      transformEdited = true;
    }
    /* 回転角の手直し（rotate のみ）。混在巻は 1 問 1 角度なので候補ごとに差し替える
       （decisions §3.87）。盤面中心まわり＝解答は常に盤内なので収まり検証は不要。 */
    if (u.rotateDeg !== undefined
      && c.answer?.mode === "derived" && c.answer.transform.type === "rotate") {
      const d = Number(u.rotateDeg);
      if (d !== 90 && d !== -90 && d !== 180) {
        return Response.json({ error: "回転角が不正です（90 / -90 / 180）" }, { status: 400 });
      }
      c.answer = { mode: "derived", transform: { type: "rotate", deg: d } };
      c.edited = true;
      transformEdited = true;
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
    if (u.edges || answerEdited || solidEdited || transformEdited) refreshMeta(file.task, c);
  }
  await writeCandidates(file);
  return Response.json({ ok: true });
}
