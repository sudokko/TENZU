import type { Metadata } from "next";
import MakerFoldApp from "./MakerFoldApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はまとめ /makers に集約）。 */
export const metadata: Metadata = {
  title: "折り重ねメーカー · TENZU",
  description: "折り返して重ねた形を描く点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerFoldPage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="fold" initialOwned={owned}>
      <MakerFoldApp />
    </MakerGate>
  );
}
