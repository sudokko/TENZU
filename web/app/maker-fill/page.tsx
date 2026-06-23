import type { Metadata } from "next";
import MakerFillApp from "./MakerFillApp";
import "../maker/maker.css";

/* 内部用ツール: 検索/シェアに乗せない */
export const metadata: Metadata = {
  title: "欠け補完メーカー（内部用） · TENZU",
  description: "欠け補完(fill)の問題を作って PDF にする内部用ツール。F（完全図）と R（抜く線）を編集できる。",
  robots: { index: false, follow: false },
};

export default function MakerFillPage() {
  return <MakerFillApp />;
}
