import type { Metadata } from "next";
import MakerFoldApp from "./MakerFoldApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "折り重ねメーカー（内部用） · TENZU",
  description:
    "折り重ね(fold)の問題を作って PDF にする内部用ツール。問題1を折り線で折り返して問題2に重ねた図を出題する鏡×重ねのハイブリッド。出題＋解答を1ファイルに連結出力。",
  robots: { index: false, follow: false },
};

export default function MakerFoldPage() {
  return <MakerFoldApp />;
}
