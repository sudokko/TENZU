import type { Metadata } from "next";
import MakerDecomposeApp from "./MakerDecomposeApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "分解メーカー（内部用） · TENZU",
  description:
    "分解(decompose)の問題を作って PDF にする内部用ツール。重なった全体「正解の図」と取り去る「引くもの」を描くと残り（こたえ）を確認でき、「正解の図 − 引くもの ＝ 空欄」の一列で出題。解答 PDF も 1 ファイルに連結出力。",
  robots: { index: false, follow: false },
};

export default function MakerDecomposePage() {
  return <MakerDecomposeApp />;
}
