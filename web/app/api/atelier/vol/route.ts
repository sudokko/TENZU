/* dev 限定: Vol の自由な追加・メタ編集・削除/非表示。
   atelier まとめの VolManager が使う。既存 PRODUCT_TASKS（ハードコード）は data.ts を触らず、
   catalog-extra.json（追加 Vol＝vols[]／既存上書き＝patches[]）だけで管理する。
   生成器のあるタスク（copy/fill/mirror/motif）は追加時に ladder.json へ基準も複製する。 */
import { NextRequest } from "next/server";
import {
  devGuard, readCatalogExtra, readLadder, safeSku, writeCatalogExtra, writeLadder,
} from "../io";
import { taskBySlug, volBySku } from "../../../products/data";

export const dynamic = "force-dynamic";

type VolPatch = {
  grid?: string; blurb?: string; ageLabel?: string;
  variant?: string; status?: "live" | "scaffold";
};

const gridN = (grid: string): number | null => {
  const m = grid.match(/^(\d+)×(\d+)$/);
  return m && m[1] === m[2] ? Number(m[1]) : null;
};

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as {
    action?: string; sku?: string; task?: string; lv?: number; grid?: string;
    variant?: string; blurb?: string; ageLabel?: string;
    status?: "live" | "scaffold"; cloneFrom?: string; patch?: VolPatch;
  };
  const action = body.action;

  /* ---- 追加: 任意の Lv・grid で新規 Vol（クローン縛りなし） ---- */
  if (action === "create") {
    const task = body.task;
    const lv = Number(body.lv);
    const grid = (body.grid ?? "").trim();
    if (!task || !taskBySlug(task)) return Response.json({ error: `未知のタスク: ${task}` }, { status: 400 });
    if (!Number.isInteger(lv) || lv < 1 || lv > 5) return Response.json({ error: "Lv は 1〜5" }, { status: 400 });
    if (!grid) return Response.json({ error: "grid（例: 4×4）を入力してください" }, { status: 400 });

    const extra = await readCatalogExtra();
    const fromCatalog = (taskBySlug(task)?.vols ?? []).filter((x) => x.lv === lv).map((x) => x.volNo);
    const fromExtra = extra.vols.filter((x) => x.task === task && x.lv === lv).map((x) => x.volNo);
    const volNo = Math.max(0, ...fromCatalog, ...fromExtra) + 1;
    const sku = `${task}-lv${lv}-vol${volNo}`;
    if (volBySku(sku) || extra.vols.some((x) => x.sku === sku)) {
      return Response.json({ error: `すでに存在します: ${sku}` }, { status: 400 });
    }

    // 生成器のあるタスクは ladder 基準も用意（cloneFrom 優先・無ければ同タスク先頭を雛形に）
    const ladder = await readLadder();
    const group = ladder[task] as Record<string, { grid?: number }> | undefined;
    if (group) {
      const cf = safeSku(body.cloneFrom);
      const tmplKey = cf && group[cf] ? cf : Object.keys(group)[0];
      if (tmplKey && group[tmplKey]) {
        const entry = JSON.parse(JSON.stringify(group[tmplKey])) as { grid?: number };
        const n = gridN(grid);
        if (n != null) entry.grid = n;
        group[sku] = entry;
        ladder[task] = group;
        await writeLadder(ladder);
      }
    }

    extra.vols.push({
      task, sku, lv, volNo, grid,
      ageLabel: (body.ageLabel ?? "").trim(),
      status: body.status === "live" ? "live" : "scaffold",
      ...(body.variant?.trim() ? { variant: body.variant.trim() } : {}),
      blurb: (body.blurb ?? "").trim() || "新しい Vol（atelier で追加）。基準を調整して問題を作成してください。",
    });
    await writeCatalogExtra(extra);
    return Response.json({ ok: true, sku });
  }

  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  /* ---- メタ編集 ---- */
  if (action === "update") {
    const patch = body.patch ?? {};
    const extra = await readCatalogExtra();
    const inExtra = extra.vols.find((x) => x.sku === sku);
    if (inExtra) {
      if (patch.grid != null) inExtra.grid = patch.grid;
      if (patch.blurb != null) inExtra.blurb = patch.blurb;
      if (patch.ageLabel != null) inExtra.ageLabel = patch.ageLabel;
      if (patch.variant != null) inExtra.variant = patch.variant;
      if (patch.status != null) inExtra.status = patch.status;
    } else {
      if (!volBySku(sku)) return Response.json({ error: `未知の sku: ${sku}` }, { status: 400 });
      const patches = extra.patches ?? (extra.patches = []);
      let cur = patches.find((p) => p.sku === sku);
      if (!cur) { cur = { sku }; patches.push(cur); }
      Object.assign(cur, patch);
    }
    // 生成器タスクで grid を "N×N" に変えたら ladder の数値 grid も同期
    if (patch.grid != null) {
      const n = gridN(patch.grid);
      const task = sku.split("-")[0];
      const ladder = await readLadder();
      const group = ladder[task] as Record<string, { grid?: number }> | undefined;
      if (n != null && group?.[sku]) { group[sku].grid = n; ladder[task] = group; await writeLadder(ladder); }
    }
    await writeCatalogExtra(extra);
    return Response.json({ ok: true, sku });
  }

  /* ---- 削除（追加 Vol は実削除）／非表示（既存ハードコードは hidden フラグ） ---- */
  if (action === "delete") {
    const extra = await readCatalogExtra();
    const idx = extra.vols.findIndex((x) => x.sku === sku);
    if (idx >= 0) {
      extra.vols.splice(idx, 1);
      const task = sku.split("-")[0];
      const ladder = await readLadder();
      const group = ladder[task] as Record<string, unknown> | undefined;
      if (group && group[sku]) { delete group[sku]; ladder[task] = group; await writeLadder(ladder); }
      await writeCatalogExtra(extra);
      return Response.json({ ok: true, sku, removed: true });
    }
    if (!volBySku(sku)) return Response.json({ error: `未知の sku: ${sku}` }, { status: 400 });
    const patches = extra.patches ?? (extra.patches = []);
    let cur = patches.find((p) => p.sku === sku);
    if (!cur) { cur = { sku }; patches.push(cur); }
    cur.hidden = true;
    await writeCatalogExtra(extra);
    return Response.json({ ok: true, sku, hidden: true });
  }

  /* ---- 非表示の解除（hidden フラグを外す） ---- */
  if (action === "restore") {
    const extra = await readCatalogExtra();
    const cur = (extra.patches ?? []).find((p) => p.sku === sku);
    if (cur) delete cur.hidden;
    await writeCatalogExtra(extra);
    return Response.json({ ok: true, sku });
  }

  return Response.json({ error: `未知の action: ${action}` }, { status: 400 });
}
