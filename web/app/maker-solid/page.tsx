import type { Metadata } from "next";
import MakerSolidApp from "./MakerSolidApp";
import MakerGate from "../maker/MakerGate";
import { readOwned } from "../lib/auth";
import "../maker/maker.css";
import "./maker-solid.css";

/* 立体模写メーカー（自由線エディタ・買い切り ¥980）。
   模写メーカーの「点クリック→任意方向の線分」描画をフォークし、
   矩形点格子＋実線/点線（隠れ線）で四角すい・八角柱・切り欠き立方体などを手描きする。
   PDF 書き出しは所有ゲート。ツール自体は noindex（SEO はまとめ /makers に集約）。 */
export const metadata: Metadata = {
  title: "立体模写メーカー",
  description: "点格子に立体を手描きして PDF で印刷できます。実線＝見える辺／点線＝かくれた辺。",
  robots: { index: false, follow: false },
};

// cookie から所有集合を読むため動的レンダリング（MakerGate がクライアントで確定）。
export const dynamic = "force-dynamic";

export default async function MakerSolidPage() {
  const owned = await readOwned();
  return (
    <MakerGate makerKey="solid" initialOwned={owned}>
      <MakerSolidApp />
    </MakerGate>
  );
}
