import type { Metadata } from "next";
import MakerApp from "./MakerApp";
import "./maker.css";

export const metadata: Metadata = {
  title: "おためし点描写メーカー · TENZU",
  description:
    "親向けの点描写プリント生成ツール。模写のお手本を作り、PDF にして印刷できます。作るのは画面、練習は紙。",
};

export default function MakerPage() {
  return <MakerApp />;
}
