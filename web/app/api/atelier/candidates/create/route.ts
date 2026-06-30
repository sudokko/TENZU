/* dev 限定: 白紙からの新規作成（手作り問題を candidates に1問追加）。
   atelier の盤面エディタが「新規作成」モードで保存するとここへ来る。
   provenance=blank（AI 生成と区別）。grid は SKU の巻定義（data.ts）から取り、
   answer は task の解答モードで組む（none=なし / explicit=R / derived(mirror)=軸）。 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../../io";
import { volBySku } from "../../../../products/data";
import {
  normalizeEdges, validateProblem, TASK_ANSWER_MODE,
  type CandidateFile, type EdgeT, type GridSpec, type Problem,
} from "../../../../products/problems/schema";
import { computeMetrics } from "../../../../products/problems/gen/metrics";
import { migrateProblem } from "../../../../products/problems/gen/difficulty";
import { MIRROR_LADDER } from "../../../../products/problems/gen/ladder";

export const dynamic = "force-dynamic";

/* "4×4" → 4（正方のみ）。"3×3 → 5×5"（scale）や "ブロック 2〜5"（solid）は非対応＝null。 */
function squareGridN(grid: string): 3 | 4 | 5 | 6 | 7 | null {
  const m = grid.match(/^(\d+)×(\d+)$/);
  if (!m || m[1] !== m[2]) return null;
  const n = Number(m[1]);
  return n >= 3 && n <= 7 ? (n as 3 | 4 | 5 | 6 | 7) : null;
}

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as {
    sku?: string; edges?: EdgeT[]; answerEdges?: EdgeT[]; title?: string;
    inputB?: EdgeT[];   // 2図目（fold の問題2 等）
  };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const hit = volBySku(sku);
  if (!hit) return Response.json({ error: `未知の sku: ${sku}` }, { status: 400 });
  const n = squareGridN(hit.vol.grid);
  if (!n) {
    return Response.json({ error: `この巻は正方盤面でないため白紙作成に未対応です（${hit.vol.grid}）` }, { status: 400 });
  }

  const edges = normalizeEdges(body.edges ?? []);
  if (edges.length === 0) return Response.json({ error: "線が空です" }, { status: 400 });

  const task = sku.split("-")[0];
  const mode = TASK_ANSWER_MODE[task] ?? "none";

  /* answer 組み立て（解答モード別） */
  let answer: Problem["answer"];
  if (mode === "explicit") {
    const r = normalizeEdges(body.answerEdges ?? []);
    if (r.length === 0) return Response.json({ error: "抜く線（解答）が空です" }, { status: 400 });
    answer = { mode: "explicit", edges: r };
  } else if (mode === "derived") {
    const axis = MIRROR_LADDER[sku]?.axis;
    if (task !== "mirror" || !axis) {
      return Response.json({ error: `${task} の白紙作成は未対応です（AI 生成を使ってください）` }, { status: 400 });
    }
    answer = { mode: "derived", transform: { type: "mirror", axis } };
  }

  const inputB = body.inputB ? normalizeEdges(body.inputB) : undefined;

  const grid: GridSpec = { type: "square", n };
  const today = new Date().toISOString().slice(0, 10);
  const base: Problem = {
    id: "__pending__",
    grid,
    edges,
    ...(inputB && inputB.length > 0 ? { inputB } : {}),
    ...(answer ? { answer } : {}),
    metrics: computeMetrics(edges, n),
    provenance: { source: "blank", createdAt: today, ...(body.title?.trim() ? { label: body.title.trim() } : {}) },
    gen: { kind: "manual" },
  };
  // migrate で difficulty を補完（provenance は blank を維持）
  const problem = migrateProblem(task, base);

  const errs = validateProblem(problem);
  if (errs.length > 0) return Response.json({ error: "問題が不正です", details: errs }, { status: 400 });

  const file: CandidateFile = (await readCandidates(sku)) ?? {
    schemaVersion: 1, sku, task, candidates: [], seedCursor: 0,
  };
  // 手作り問題は m{連番} で採番（生成の s{seed}-NN と衝突しない）
  const maxM = file.candidates.reduce((mx, c) => {
    const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, k);
  }, 0);
  problem.id = `${sku}-m${String(maxM + 1).padStart(2, "0")}`;
  file.candidates.push({ ...problem, status: "pending" });
  await writeCandidates(file);

  return Response.json({ ok: true, id: problem.id, total: file.candidates.length });
}
