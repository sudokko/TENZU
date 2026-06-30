/* dev 限定: 巻のレベル定義（生成パラメータ）の取得・編集。
   atelier の基準編集パネルが「各編のレベル定義見直し」で使う。ladder.json を disk から直に読み書きする。
   編集可能フィールドは ladder-schema.ts（copy/fill/mirror/motif）が SSOT。grid も編集可能で、
   grid 変更時は catalog-extra に表示メタ patch を書いて data.ts の表示 grid を同期する。 */
import { NextRequest } from "next/server";
import { devGuard, readLadder, safeSku, upsertCatalogPatch, writeLadder } from "../io";
import {
  buildLadderEntry, displayGridFor, ladderFieldsFor, type LadderEntry,
} from "../../../products/problems/ladder-schema";
import { volBySku } from "../../../products/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;
  const sku = safeSku(req.nextUrl.searchParams.get("sku"));
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });
  const task = sku.split("-")[0];
  const ladder = await readLadder();
  const group = ladder[task] as Record<string, unknown> | undefined;
  const entry = group?.[sku];
  if (!entry) return Response.json({ error: `ラダー未定義: ${sku}` }, { status: 404 });
  return Response.json({ sku, task, entry, editable: ladderFieldsFor(task) != null });
}

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string; patch?: LadderEntry };
  const sku = safeSku(body.sku);
  if (!sku || !body.patch) return Response.json({ error: "bad request" }, { status: 400 });
  const task = sku.split("-")[0];
  if (!ladderFieldsFor(task)) {
    return Response.json({ error: `${task} のレベル定義は編集対象外です` }, { status: 400 });
  }

  const ladder = await readLadder();
  const group = (ladder[task] ?? {}) as Record<string, LadderEntry>;
  // 未定義（手設計タスク等）は新規作成扱い（UI が全フィールド patch を送る）
  const cur = group[sku] ?? {};

  const built = buildLadderEntry(task, cur, body.patch);
  if ("error" in built) return Response.json({ error: built.error }, { status: 400 });

  group[sku] = built.entry;
  ladder[task] = group;
  await writeLadder(ladder);

  // 盤面（grid/gridFrom→gridTo/blocks）を変えたら表示メタ（data.ts の grid 文字列）も同期する
  let gridChanged = false;
  const newGrid = displayGridFor(task, built.entry);
  if (newGrid && newGrid !== volBySku(sku)?.vol.grid) {
    await upsertCatalogPatch(sku, { grid: newGrid });
    gridChanged = true;
  }

  return Response.json({ ok: true, sku, entry: built.entry, gridChanged });
}
