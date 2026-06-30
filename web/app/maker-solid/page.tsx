import type { Metadata } from "next";
import MakerSolidApp from "./MakerSolidApp";
import "../maker/maker.css";
import "./maker-solid.css";

/* 立体模写メーカー（自由線エディタ）。
   模写メーカーの「点クリック→任意方向の線分」描画をフォークし、
   大きな正方形格子＋実線/点線（隠れ線）で四角すい・八角柱・切り欠き立方体などを手描きする。
   オーナー専用・本番未連携：課金ゲート・所有判定・商品配線なし（全開放）。robots noindex。
   旧プロト /maker-solid-proto（ボクセル積み木式・C案）を置換する。 */
export const metadata: Metadata = {
  title: "立体模写メーカー（試作・オーナー専用） · TENZU",
  description: "点格子に立体を手描きするエディタ。実線＝見える辺／点線＝かくれた辺。本番未連携の作図ツール。",
  robots: { index: false, follow: false },
};

export default function MakerSolidPage() {
  return <MakerSolidApp />;
}
