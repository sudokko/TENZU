import type { Metadata } from "next";
import MakerRotateApp from "./MakerRotateApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "回転メーカー（内部用） · TENZU",
  description: "回転(rotate)タスクの問題を作って PDF にする内部用ツール。90/180/270 度の右回りで解答が自動算出される。出題＋解答を 1 PDF に連結。並びは答えに影響しない。",
  robots: { index: false, follow: false },
};

export default function MakerRotatePage() {
  return <MakerRotateApp />;
}
