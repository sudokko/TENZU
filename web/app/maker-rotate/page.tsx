import type { Metadata } from "next";
import MakerRotateApp from "./MakerRotateApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はハブ /makers に集約）。 */
export const metadata: Metadata = {
  title: "回転メーカー · TENZU",
  description: "回した形を思いうかべて描く点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerRotatePage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="rotate" initialOwned={owned}>
      <MakerRotateApp />
    </MakerGate>
  );
}
