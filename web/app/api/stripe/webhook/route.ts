/* Stripe Webhook（checkout.session.completed → 購入完了メール配送）。
   - 署名検証には raw body が必須 → req.text() で生のまま取得（JSON パースしない）
   - 宛先メールは Stripe Checkout が収集した customer_details.email を使う
   - マジックリンク＝既存サンクスURL（/checkout/success?session_id=...）。
     あのページがサーバー側で paid を再照合するため、独自トークン保管は不要
   - Stripe にエンドポイントを無効化されないよう、処理失敗でも 200 を返す（ログのみ）
   - 冪等性: DB を持たないため webhook 重複時はメール重複の可能性あり（低害・MVP 受容） */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { volBySku, volTitle } from "../../../products/data";
import { sendPurchaseEmail, sendLoginLink } from "../../../lib/email";
import { signMagic } from "../../../lib/auth";
import { resolveTier } from "../../../lib/billing";
import { PLANS } from "../../../products/capabilities";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) {
    return Response.json({ error: "Stripe の環境変数が未設定です" }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig) throw new Error("missing stripe-signature");
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e) {
    // 署名検証失敗は 400（Stripe はこれを「不正」として扱い、再送しない）
    const msg = e instanceof Error ? e.message : "signature verification failed";
    return Response.json({ error: `Webhook signature error: ${msg}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const email = session.customer_details?.email;
      // サブスク Checkout は skus を持たない → 単発購入（payment mode）のみ DL メール。
      const skus = (session.metadata?.skus ?? "").split(",").map((s) => s.trim()).filter(Boolean);

      if (session.payment_status === "paid" && email && skus.length > 0) {
        const items = skus
          .map((sku) => { const r = volBySku(sku); return r ? volTitle(r.task, r.vol) : null; })
          .filter((t): t is string => Boolean(t));

        const base = process.env.SITE_URL ?? req.nextUrl.origin;
        const downloadUrl = `${base}/checkout/success?session_id=${session.id}`;

        await sendPurchaseEmail({ to: email, downloadUrl, items });
      }
    } catch (e) {
      // 送信失敗してもエンドポイントを生かすため 200 で返す（運用はログで検知）
      console.error("[stripe webhook] purchase email failed:", e);
    }
  }

  // 会員サブスク作成 → 別端末/再ログイン用のマジックリンクをメール送信。
  // （申込ブラウザは success_url の /api/auth/verify で即ログイン済み。これは予備手段）
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    try {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const stripe2 = new Stripe(key);
      const customer = await stripe2.customers.retrieve(customerId);
      const email = !customer.deleted ? customer.email : null;
      if (email) {
        const tier = await resolveTier(stripe2, customerId);
        if (tier !== "guest") {
          const base = process.env.SITE_URL ?? req.nextUrl.origin;
          const loginUrl = `${base}/api/auth/verify?token=${signMagic(email)}`;
          const planName = tier === "full" ? PLANS.full.name : PLANS.entry.name;
          await sendLoginLink({ to: email, loginUrl, planName });
        }
      }
    } catch (e) {
      console.error("[stripe webhook] login link failed:", e);
    }
  }

  return Response.json({ received: true });
}
