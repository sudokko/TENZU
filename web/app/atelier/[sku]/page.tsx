/* 検品ツール SKU 単位ページ — dev 限定（本番は 404） */
import { notFound } from "next/navigation";
import { volBySku } from "../../products/data";
import { generatorFor } from "../../products/problems/gen";
import { readLadder } from "../../api/atelier/io";
import { defaultLadderEntry, ladderFieldsFor } from "../../products/problems/ladder-schema";
import AtelierApp from "../AtelierApp";
import "../atelier.css";

export const metadata = { robots: { index: false } };

/* 模様候補シードの対象 sku（Lv.2〜Lv.3）。
   AtelierApp が初回ロードで /api/atelier/seed-motif-inspo を 1 回叩く */
const MOTIF_INSPO_SKUS = new Set([
  "copy-lv2-vol1", "copy-lv2-vol2",
  "copy-lv3-vol1", "copy-lv3-vol2",
]);

export default async function AtelierSku({ params }: { params: Promise<{ sku: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { sku } = await params;
  const hit = volBySku(sku);
  if (!hit) notFound();

  const gen = generatorFor(sku);
  // 白紙作成で使う盤面サイズ（正方のみ。"3×3 → 5×5"/"ブロック…" は対象外＝undefined）
  const gm = hit.vol.grid.match(/^(\d+)×(\d+)$/);
  const blankGridN = gm && gm[1] === gm[2] ? Number(gm[1]) : undefined;
  // レベル定義（生成パラメータ）の現値。基準編集パネルが全タスクで使う（disk から鮮度確保）。
  // 手設計タスクは ladder 未定義なので data.ts の grid/variant から既定値を合成（保存時に実体化）。
  const task = sku.split("-")[0];
  const ladder = await readLadder();
  const group = ladder[task] as Record<string, unknown> | undefined;
  const ladderEntry = (group?.[sku] as Record<string, unknown> | undefined)
    ?? (ladderFieldsFor(task) ? defaultLadderEntry(task, hit.vol.grid, hit.vol.variant) : null);
  return (
    <AtelierApp
      sku={sku}
      title={`${hit.task.name} Lv.${hit.vol.lv} Vol.${hit.vol.volNo} · ${hit.vol.grid}`}
      blurb={hit.vol.blurb}
      meate={hit.vol.meate}
      hasGenerator={Boolean(gen)}
      genKind={gen?.kind}
      linesRange={gen?.lines}
      gapRange={gen?.gapLines}
      motifInspoEnabled={MOTIF_INSPO_SKUS.has(sku)}
      blankGridN={blankGridN}
      ladderEntry={ladderEntry}
    />
  );
}
