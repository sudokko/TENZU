/* サブスク申込 → Stripe Checkout（mode: subscription）作成。
   - body: { plan: "entry" | "full", email?: string }
   - price ID は env（STRIPE_PRICE_ENTRY / STRIPE_PRICE_FULL）。
   - 成功 → /api/auth/verify?session_id=... が同じブラウザで即ログイン cookie 発行。
     別端末用には webhook(customer.subscription.created) がメールでもリンクを送る。
   - 既存の単発購入（/api/checkout・payment mode）には触らず別フローで共存。 */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { priceIds } from "../../lib/billing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json({ error: "STRIPE_SECRET_KEY が未設定です（web/.env.local）" }, { status: 500 });
  }

  let body: { plan?: unknown; email?: unknown };
  try {
    body = (await req.json()) as { plan?: unknown; email?: unknown };
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const plan = body.plan === "full" ? "full" : body.plan === "entry" ? "entry" : null;
  if (!plan) {
    return Response.json({ error: "プランが不正です" }, { status: 400 });
  }
  const price = priceIds()[plan];
  if (!price) {
    return Response.json(
      { error: `価格 ID が未設定です（STRIPE_PRICE_${plan.toUpperCase()}）` },
      { status: 500 },
    );
  }

  const email =
    typeof body.email === "string" && body.email.includes("@") ? body.email : undefined;

  const stripe = new Stripe(key);
  const base = process.env.SITE_URL ?? req.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      success_url: `${base}/api/auth/verify?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "決済セッションの作成に失敗しました";
    return Response.json({ error: msg }, { status: 502 });
  }
}
