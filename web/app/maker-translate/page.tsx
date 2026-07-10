import type { Metadata } from "next";
import MakerTranslateApp from "./MakerTranslateApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はハブ /makers に集約）。 */
export const metadata: Metadata = {
  title: "移動メーカー · TENZU",
  description: "形を変えずにずらして写す点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerTranslatePage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="translate" initialOwned={owned}>
      <MakerTranslateApp />
    </MakerGate>
  );
}
