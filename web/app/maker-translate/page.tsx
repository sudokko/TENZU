import type { Metadata } from "next";
import MakerTranslateApp from "./MakerTranslateApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "平行移動メーカー（内部用） · TENZU",
  description: "平行移動(translate)タスクの問題を作って PDF にする内部用ツール。図形を描き、移動先を 1 つ置くと、起点（★）から移動先（●）へ図形全体を平行移動した図を自動算出（枠に収まるか判定）。出題＋解答を 1 PDF に連結。並びは答えに影響しない。",
  robots: { index: false, follow: false },
};

export default function MakerTranslatePage() {
  return <MakerTranslateApp />;
}
