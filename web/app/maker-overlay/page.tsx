import type { Metadata } from "next";
import MakerOverlayApp from "./MakerOverlayApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "重ねメーカー（内部用） · TENZU",
  description:
    "重ね(overlay)の問題を作って PDF にする内部用ツール。図形A・図形B を描くと重ねた結果を確認でき、「図形A ＋ 図形B ＝ 空欄」の一列で出題。解答 PDF も 1 ファイルに連結出力。",
  robots: { index: false, follow: false },
};

export default function MakerOverlayPage() {
  return <MakerOverlayApp />;
}
