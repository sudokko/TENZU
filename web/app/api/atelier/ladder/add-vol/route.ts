/* dev 限定: Vol 追加。既存 SKU を複製して同 Lv の次の Vol を作る。
   ladder.json（生成基準）と catalog-extra.json（商品カタログの追加分）の両方に書き、
   atelier だけで Vol 追加が完結する。既存 PRODUCT_TASKS は触らない（合流は data.ts）。 */
import { NextRequest } from "next/server";
import {
  devGuard, readCatalogExtra, readLadder, safeSku, writeCatalogExtra, writeLadder,
} from "../../io";
import { taskBySlug, volBySku } from "../../../../products/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const hit = volBySku(sku);
  if (!hit) return Response.json({ error: `未知の sku: ${sku}` }, { status: 400 });
  const task = sku.split("-")[0];
  const { lv, grid, ageLabel, variant } = hit.vol;

  const extra = await readCatalogExtra();
  // 同タスク・同 Lv の最大 Vol 番号（PRODUCT_TASKS 合流済み ＋ まだ反映前の catalog-extra 両方を見る）
  const fromCatalog = (taskBySlug(task)?.vols ?? []).filter((x) => x.lv === lv).map((x) => x.volNo);
  const fromExtra = extra.vols.filter((x) => x.task === task && x.lv === lv).map((x) => x.volNo);
  const nextVolNo = Math.max(0, ...fromCatalog, ...fromExtra) + 1;
  const newSku = `${task}-lv${lv}-vol${nextVolNo}`;

  if (volBySku(newSku) || extra.vols.some((x) => x.sku === newSku)) {
    return Response.json({ error: `すでに存在します: ${newSku}` }, { status: 400 });
  }

  // ラダー基準を複製（生成器のある copy/fill/mirror/motif のみ。無いタスクは白紙作成で運用）
  const ladder = await readLadder();
  const group = ladder[task] as Record<string, unknown> | undefined;
  let hasLadder = false;
  if (group && group[sku]) {
    group[newSku] = JSON.parse(JSON.stringify(group[sku]));
    await writeLadder(ladder);
    hasLadder = true;
  }

  // カタログに新 Vol を追加。未入稿なので一覧には「準備中」で陳列される
  // （公開状態は published/{sku}.json の有無から導出＝フラグは持たせない）
  extra.vols.push({
    task, sku: newSku, lv, volNo: nextVolNo, grid, ageLabel,
    ...(variant ? { variant } : {}),
    blurb: "新しい Vol（atelier で追加）。基準を調整して問題を作成してください。",
  });
  await writeCatalogExtra(extra);

  return Response.json({ ok: true, sku: newSku, clonedFrom: sku, hasLadder });
}
