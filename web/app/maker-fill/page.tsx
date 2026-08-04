import type { Metadata } from "next";
import MakerFillApp from "./MakerFillApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";

/* 公開メーカー（買い切り ¥980）。ツール自体は noindex（SEO はまとめ /makers に集約）。 */
export const metadata: Metadata = {
  title: "欠け補完メーカー",
  description: "足りない辺を補って形を閉じる点描写プリントを作って、PDF で印刷できます。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerFillPage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="fill" initialOwned={owned}>
      <MakerFillApp />
    </MakerGate>
  );
}
