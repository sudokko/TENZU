import type { Metadata } from "next";
import MakerMirrorApp from "./MakerMirrorApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "鏡メーカー（内部用） · TENZU",
  description: "鏡(mirror)タスクの問題を作って PDF にする内部用ツール。左右反転／上下反転の軸切替で解答が自動算出される。解答 PDF は 1 問 1 ページの用紙 MAX で別出力。",
  robots: { index: false, follow: false },
};

export default function MakerMirrorPage() {
  return <MakerMirrorApp />;
}
