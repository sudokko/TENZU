/* 検品ツール SKU 単位ページ — dev 限定（本番は 404） */
import { notFound } from "next/navigation";
import { volBySku } from "../../products/data";
import { COPY_LADDER } from "../../products/problems/gen/ladder";
import AtelierApp from "../AtelierApp";
import "../atelier.css";

export const metadata = { robots: { index: false } };

export default async function AtelierSku({ params }: { params: Promise<{ sku: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { sku } = await params;
  const hit = volBySku(sku);
  if (!hit) notFound();

  return (
    <AtelierApp
      sku={sku}
      title={`${hit.task.name} Lv.${hit.vol.lv} Vol.${hit.vol.volNo} · ${hit.vol.grid}`}
      hasGenerator={Boolean(COPY_LADDER[sku])}
      linesRange={COPY_LADDER[sku]?.lines}
    />
  );
}
