/* =========================================================================
   Stripe サブスク照会ヘルパー（entitlement の信頼ソース）。
   - tier 判定: 顧客の有効サブスクの price ID を env（ENTRY/FULL）と突合。
   - メール→顧客の解決（マジックリンク・重複回避）。
   既存の単発購入（¥200 payment mode）には一切触らない。
   ========================================================================= */
import type Stripe from "stripe";
import type { Tier } from "../products/capabilities";

export function priceIds(): { entry: string | undefined; full: string | undefined } {
  return {
    entry: process.env.STRIPE_PRICE_ENTRY,
    full: process.env.STRIPE_PRICE_FULL,
  };
}

// メールから Stripe 顧客 ID を引く（無ければ null）。
export async function findCustomerIdByEmail(
  stripe: Stripe, email: string,
): Promise<string | null> {
  const res = await stripe.customers.list({ email, limit: 1 });
  return res.data[0]?.id ?? null;
}

// 顧客の有効サブスクから tier を解決（full > entry > guest）。
// active / trialing を「有効」とみなす（past_due 等は無効＝guest）。
export async function resolveTier(stripe: Stripe, customerId: string): Promise<Tier> {
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 20 });
  const { entry, full } = priceIds();
  let hasEntry = false;
  let hasFull = false;
  for (const s of subs.data) {
    if (s.status !== "active" && s.status !== "trialing") continue;
    for (const item of s.items.data) {
      const pid = item.price.id;
      if (full && pid === full) hasFull = true;
      if (entry && pid === entry) hasEntry = true;
    }
  }
  return hasFull ? "full" : hasEntry ? "entry" : "guest";
}
