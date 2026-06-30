import type { Metadata } from "next";
import MakerSolidProtoApp from "./MakerSolidProtoApp";
import "../maker/maker.css";

/* 立体模写メーカー（C案＝アイソメ直接配置）の検証用プロトタイプ。
   本番未連携：ヘッダー/LP/フッター/カタログ/maker-index から動線なし。
   capabilities（所有ゲート）・PDF 書き出し・保存も未配線（純粋に作図体験だけ見る）。
   robots noindex。 */
export const metadata: Metadata = {
  title: "立体メーカー（試作・C案 アイソメ直接） · TENZU",
  description: "等角投影の盤面に直接ブロックを積む立体模写メーカーの試作。本番未連携の検証用。",
  robots: { index: false, follow: false },
};

export default function MakerSolidProtoPage() {
  return <MakerSolidProtoApp />;
}
