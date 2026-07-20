import type { Metadata } from "next";
import MakerShrinkApp from "./MakerShrinkApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はまとめ /makers に集約）。 */
export const metadata: Metadata = {
  title: "縮小メーカー · TENZU",
  description: "比をそろえて小さく写す（1/2・1/3）点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerShrinkPage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="shrink" initialOwned={owned}>
      <MakerShrinkApp />
    </MakerGate>
  );
}
