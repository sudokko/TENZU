import type { Metadata } from "next";
import MakerShrinkApp from "./MakerShrinkApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "縮小メーカー（内部用） · TENZU",
  description:
    "縮小(scale 1/N)タスクの問題を作って PDF にする内部用ツール。×1/2 ×1/3 で縮小図が自動算出される（始点を固定して縮小・格子に乗るか判定）。出題＋解答を 1 PDF に連結。並びは答えに影響しない。",
  robots: { index: false, follow: false },
};

export default function MakerShrinkPage() {
  return <MakerShrinkApp />;
}
