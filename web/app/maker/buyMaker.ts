/* メーカー買い切りの購入トリガー（クライアント共有）。
   MakerGate の introbar・各 MakerApp の書き出しゲートから呼ぶ。
   POST /api/maker-checkout → Stripe Checkout（payment mode）へリダイレクト。 */
import type { MakerKey } from "../products/capabilities";

export async function buyMaker(makerKey: MakerKey): Promise<void> {
  const res = await fetch("/api/maker-checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ makers: [makerKey] }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (data?.url) {
    window.location.href = data.url;
    return;
  }
  throw new Error(data?.error ?? "決済ページに進めませんでした");
}
