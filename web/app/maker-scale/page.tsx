import type { Metadata } from "next";
import MakerScaleApp from "./MakerScaleApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はハブ /makers に集約）。 */
export const metadata: Metadata = {
  title: "拡大メーカー · TENZU",
  description: "比をそろえて大きく写す（×2・×3）点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerScalePage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="scale" initialOwned={owned}>
      <MakerScaleApp />
    </MakerGate>
  );
}
