import type { Metadata } from "next";
import MakerOverlayApp from "./MakerOverlayApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はまとめ /makers に集約）。 */
export const metadata: Metadata = {
  title: "重ねメーカー · TENZU",
  description: "2 つの形を重ねたところを描く点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerOverlayPage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="overlay" initialOwned={owned}>
      <MakerOverlayApp />
    </MakerGate>
  );
}
