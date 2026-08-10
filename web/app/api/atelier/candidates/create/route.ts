/* dev 限定: 白紙からの新規作成（手作り問題を candidates に1問追加）。
   atelier の盤面エディタが「新規作成」モードで保存するとここへ来る。
   provenance=blank（AI 生成と区別）。grid は SKU の巻定義（data.ts）から取り、
   answer は task の解答モードで組む（none=なし / explicit=R / derived(mirror)=軸）。 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, safeSku, writeCandidates } from "../../io";
import { volBySku } from "../../../../products/data";
import {
  normalizeEdges, normalizeSolidEdges, validateProblem, TASK_ANSWER_MODE,
  type CandidateFile, type EdgeT, type GridSpec, type Problem, type SolidEdge,
} from "../../../../products/problems/schema";
import { computeMetrics, computeSolidMetrics } from "../../../../products/problems/gen/metrics";
import { metricsEdges, migrateProblem } from "../../../../products/problems/gen/difficulty";

/* 既存候補から手作り採番 m{連番} の次番号を返す（s{seed}-NN と衝突しない） */
function nextManualId(file: CandidateFile, sku: string): string {
  const maxM = file.candidates.reduce((mx, c) => {
    const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, k);
  }, 0);
  return `${sku}-m${String(maxM + 1).padStart(2, "0")}`;
}

export const dynamic = "force-dynamic";

/* "4×4" → 4（正方のみ）。"3×3 → 5×5"（scale）や "ブロック 2〜5"（solid）は非対応＝null。 */
function squareGridN(grid: string): 3 | 4 | 5 | 6 | 7 | 8 | null {
  const m = grid.match(/^(\d+)×(\d+)$/);
  if (!m || m[1] !== m[2]) return null;
  const n = Number(m[1]);
  return n >= 3 && n <= 8 ? (n as 3 | 4 | 5 | 6 | 7 | 8) : null;
}

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as {
    sku?: string; edges?: EdgeT[]; answerEdges?: EdgeT[]; title?: string;
    inputB?: EdgeT[];   // 2図目（fold の問題2 等）
    transform?: { dc: number; dr: number };   // 移動（translate）: 編集画面で選んだ移動先
    rotateDeg?: 90 | -90 | 180;               // 回転（rotate）: 編集画面で選んだ角度（混在巻）
    cols?: number; rows?: number; solidEdges?: SolidEdge[];   // 立体（solid）専用
  };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const hit = volBySku(sku);
  if (!hit) return Response.json({ error: `未知の sku: ${sku}` }, { status: 400 });

  const task = sku.split("-")[0];

  /* ---- 立体（solid）: cols×rows の矩形点格子＋隠れ線付き solidEdges で作問 ---- */
  if (task === "solid") {
    const cols = Number(body.cols), rows = Number(body.rows);
    if (![cols, rows].every((x) => Number.isInteger(x) && x >= 3 && x <= 20)) {
      return Response.json({ error: "盤面サイズが不正です（3〜20）" }, { status: 400 });
    }
    const solidEdges = normalizeSolidEdges(body.solidEdges ?? []);
    if (solidEdges.length === 0) return Response.json({ error: "線が空です" }, { status: 400 });
    const today = new Date().toISOString().slice(0, 10);
    const base: Problem = {
      id: "__pending__",
      grid: { type: "solid", cols, rows },
      edges: [],
      solidEdges,
      metrics: computeSolidMetrics(solidEdges),
      provenance: { source: "blank", createdAt: today, ...(body.title?.trim() ? { label: body.title.trim() } : {}) },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem(task, base);
    const errs = validateProblem(problem);
    if (errs.length > 0) return Response.json({ error: "問題が不正です", details: errs }, { status: 400 });
    const file: CandidateFile = (await readCandidates(sku)) ?? {
      schemaVersion: 1, sku, task, candidates: [], seedCursor: 0,
    };
    problem.id = nextManualId(file, sku);
    file.candidates.push({ ...problem, status: "pending" });
    await writeCandidates(file);
    return Response.json({ ok: true, id: problem.id, total: file.candidates.length });
  }

  const n = squareGridN(hit.vol.grid);
  if (!n) {
    return Response.json({ error: `この巻は正方盤面でないため白紙作成に未対応です（${hit.vol.grid}）` }, { status: 400 });
  }

  const edges = normalizeEdges(body.edges ?? []);
  if (edges.length === 0) return Response.json({ error: "線が空です" }, { status: 400 });

  const mode = TASK_ANSWER_MODE[task] ?? "none";

  /* answer 組み立て（解答モード別） */
  let answer: Problem["answer"];
  if (mode === "explicit") {
    const r = normalizeEdges(body.answerEdges ?? []);
    if (r.length === 0) return Response.json({ error: "抜く線（解答）が空です" }, { status: 400 });
    answer = { mode: "explicit", edges: r };
  } else if (mode === "derived") {
    if (task === "mirror") {
      // 鏡は軸レス（軸＝印刷時の並び選択・decisions §3.59）。代表値 v を焼く
      answer = { mode: "derived", transform: { type: "mirror", axis: "v" } };
    } else if (task === "rotate") {
      // 回転角は編集画面で選んだ deg を優先（混在巻＝1 問 1 角度・decisions §3.87）。
      // 未指定なら巻定義（data.ts variant「90°右回り/90°左回り/180°」）から既定値を取る。
      // 盤面中心まわりの回転＝解答は常に盤内（収まり検証不要）
      const v = hit.vol.variant ?? "";
      const picked = body.rotateDeg;
      const deg: 90 | -90 | 180 = picked === 90 || picked === -90 || picked === 180
        ? picked
        : v.includes("左") ? -90 : v.includes("180") ? 180 : 90;
      answer = { mode: "derived", transform: { type: "rotate", deg } };
    } else if (task === "translate") {
      // 移動先は編集画面（回答ペインの●）で選んだ transform を優先。未指定なら
      // 巻の方向（variant「横/縦/左右上下/斜め/複合」）から既定ベクトルを組む
      const t = body.transform;
      const v = hit.vol.variant ?? "";
      const vec = t && Number.isInteger(t.dc) && Number.isInteger(t.dr) && !(t.dc === 0 && t.dr === 0)
        ? { dc: t.dc, dr: t.dr }
        : v.includes("縦") ? { dc: 0, dr: 1 }
          : v.includes("斜") ? { dc: 1, dr: 1 }
            : v.includes("複合") ? { dc: 2, dr: 1 }
              : { dc: 1, dr: 0 };
      // 収まり検証（F+(dc,dr) が盤内か）はサーバでも弾く
      const fits = edges.every((e) => e.every((p) =>
        p[0] + vec.dc >= 0 && p[0] + vec.dc <= n - 1 && p[1] + vec.dr >= 0 && p[1] + vec.dr <= n - 1));
      if (!fits) return Response.json({ error: "移動した図が枠からはみ出します" }, { status: 400 });
      answer = { mode: "derived", transform: { type: "translate", ...vec } };
    } else {
      return Response.json({ error: `${task} の白紙作成は未対応です（AI 生成を使ってください）` }, { status: 400 });
    }
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
  /* 折り重ねだけ edges＝問題1 なので、metrics は完成図（answer 側）から引き直す。
     素の computeMetrics(edges) だと盤面項が紙1 の bbox に縮む（difficulty.ts の metricsEdges） */
  base.metrics = computeMetrics(metricsEdges(task, base), n);
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
