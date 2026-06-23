/* 検品ツール SKU 単位ページ — dev 限定（本番は 404） */
import { notFound } from "next/navigation";
import { volBySku } from "../../products/data";
import { generatorFor } from "../../products/problems/gen";
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
  return (
    <AtelierApp
      sku={sku}
      title={`${hit.task.name} Lv.${hit.vol.lv} Vol.${hit.vol.volNo} · ${hit.vol.grid}`}
      hasGenerator={Boolean(gen)}
      genKind={gen?.kind}
      linesRange={gen?.lines}
      gapRange={gen?.gapLines}
      motifInspoEnabled={MOTIF_INSPO_SKUS.has(sku)}
    />
  );
}
