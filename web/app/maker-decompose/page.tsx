import type { Metadata } from "next";
import MakerDecomposeApp from "./MakerDecomposeApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はまとめ /makers に集約）。 */
export const metadata: Metadata = {
  title: "分解メーカー · TENZU",
  description: "重なった形から片方を取り出す点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerDecomposePage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="decompose" initialOwned={owned}>
      <MakerDecomposeApp />
    </MakerGate>
  );
}
