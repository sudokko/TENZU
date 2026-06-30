/* =========================================================================
   Stripe 買い切り照会ヘルパー（所有メーカー集合の信頼ソース）。
   - メール → 顧客の解決（マジックリンク復元・重複回避）。
   - 顧客の支払い済み Checkout から「所有するメーカー集合」を再構成（買い切り＝失効しない）。
   既存の単発購入（¥200 プリント・metadata.skus）には一切触らない（こちらは metadata.makers）。
   ========================================================================= */
import type Stripe from "stripe";
import type { MakerKey } from "../products/capabilities";
import { PURCHASABLE_MAKERS } from "../products/capabilities";

const PAID_SET = new Set<string>(PURCHASABLE_MAKERS);

// Checkout セッションの metadata.makers（CSV）から正規の買い切りメーカーだけを取り出す。
export function parseMakers(metadata: Stripe.Metadata | null | undefined): MakerKey[] {
  const raw = (metadata?.makers ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.filter((k): k is MakerKey => PAID_SET.has(k));
}

// メールから Stripe 顧客 ID を引く（無ければ null）。
export async function findCustomerIdByEmail(
  stripe: Stripe, email: string,
): Promise<string | null> {
  const res = await stripe.customers.list({ email, limit: 1 });
  return res.data[0]?.id ?? null;
}

// 顧客の支払い済み Checkout から所有メーカー集合を再構成する（買い切り＝無期限）。
export async function resolveOwnedMakers(
  stripe: Stripe, customerId: string,
): Promise<MakerKey[]> {
  const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
  const owned = new Set<MakerKey>();
  for (const s of sessions.data) {
    if (s.payment_status !== "paid") continue;
    for (const k of parseMakers(s.metadata)) owned.add(k);
  }
  return [...owned];
}

// メールから所有メーカー集合を解決（マジックリンク復元用・顧客が無ければ空）。
export async function resolveOwnedByEmail(
  stripe: Stripe, email: string,
): Promise<MakerKey[]> {
  const cid = await findCustomerIdByEmail(stripe, email);
  return cid ? resolveOwnedMakers(stripe, cid) : [];
}
