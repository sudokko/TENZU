/* メーカー買い切りの購入トリガー（クライアント共有）。
   MakerGate の introbar・各 MakerApp の書き出しゲートから呼ぶ。
   購入確認ページ /maker-buy へ移る（初回限定クーポンを入れる場所。そこから /api/maker-checkout → Stripe）。 */
import type { MakerKey } from "../products/capabilities";

export async function buyMaker(makerKey: MakerKey): Promise<void> {
  window.location.href = `/maker-buy?m=${encodeURIComponent(makerKey)}`;
}
