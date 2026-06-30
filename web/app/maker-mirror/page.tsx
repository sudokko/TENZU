import type { Metadata } from "next";
import MakerMirrorApp from "./MakerMirrorApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はハブ /makers に集約）。 */
export const metadata: Metadata = {
  title: "鏡メーカー · TENZU",
  description: "鏡の反対側に映る形を描く点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

// cookie から tier を読むため動的レンダリング（MakerGate がクライアントで確定）。
export const dynamic = "force-dynamic";

export default async function MakerMirrorPage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="mirror" initialOwned={owned}>
      <MakerMirrorApp />
    </MakerGate>
  );
}
