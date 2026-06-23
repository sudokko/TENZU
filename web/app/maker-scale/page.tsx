import type { Metadata } from "next";
import MakerScaleApp from "./MakerScaleApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "拡大メーカー（内部用） · TENZU",
  description: "拡大(scale)タスクの問題を作って PDF にする内部用ツール。×2/×3 で拡大図が自動算出される（伸ばす方向は図形から自動判定・枠に収まるか判定）。出題＋解答を 1 PDF に連結。並びは答えに影響しない。",
  robots: { index: false, follow: false },
};

export default function MakerScalePage() {
  return <MakerScaleApp />;
}
