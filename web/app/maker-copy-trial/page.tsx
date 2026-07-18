import type { Metadata } from "next";
import MakerCopyTrialApp from "./MakerCopyTrialApp";
import "../maker/maker.css";

/* 図形模写トライアル（内部限定・実験用）。
   模写メーカー（/maker）をフォークし、「背景の点をとる」設定を試すためのプロトタイプ。
   課金・所有ゲートなし（オーナー検証専用）。ツール自体は noindex。 */
export const metadata: Metadata = {
  title: "図形模写トライアル（内部用） · TENZU",
  description: "模写メーカーの試作。背景の点を消した「白紙模写」形式を試せます。",
  robots: { index: false, follow: false },
};

export default function MakerCopyTrialPage() {
  return <MakerCopyTrialApp />;
}
