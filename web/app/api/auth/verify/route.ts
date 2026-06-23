/* ログイン cookie 発行（マジックリンク検証 or Checkout 復帰の単一入口）。
   - ?session_id=...  : サブスク Checkout 復帰。session から顧客を取り、即ログイン。
   - ?token=...       : メールのマジックリンク。署名検証 → メール → 顧客解決。
   いずれも Stripe で現 tier を確定してから署名 cookie を発行し /maker へ。
   会員でない（有効サブスクなし）場合は cookie を出さず /login へ誘導。 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { readMagic, sessionCookie } from "../../../lib/auth";
import { findCustomerIdByEmail, resolveTier } from "../../../lib/billing";
import type { Tier } from "../../../products/capabilities";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = process.env.SITE_URL ?? req.nextUrl.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${base}/login?e=${encodeURIComponent(reason)}`);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return fail("config");

  const stripe = new Stripe(key);
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const token = url.searchParams.get("token");

  let customerId: string | null = null;
  try {
    if (sessionId) {
      const s = await stripe.checkout.sessions.retrieve(sessionId);
      customerId =
        typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      if (!customerId && s.customer_details?.email) {
        customerId = await findCustomerIdByEmail(stripe, s.customer_details.email);
      }
    } else if (token) {
      const m = readMagic(token);
      if (!m) return fail("expired");
      customerId = await findCustomerIdByEmail(stripe, m.email);
    } else {
      return fail("missing");
    }
  } catch {
    return fail("stripe");
  }

  if (!customerId) return fail("nocustomer");

  let tier: Tier;
  try {
    tier = await resolveTier(stripe, customerId);
  } catch {
    return fail("stripe");
  }
  if (tier === "guest") return fail("nosub");

  const res = NextResponse.redirect(`${base}/maker?welcome=1`);
  const c = sessionCookie(customerId, tier);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
