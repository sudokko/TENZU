/* Stripe Checkout セッション作成（複数巻まとめ買い・テスト/本番共通）。
   - body: { skus: string[] } を検証（live SKU のみ・全 ¥200 一律）
   - 各 SKU を price_data でその場定義（Stripe 側に商品事前登録は不要）
   - 購入 SKU は metadata.skus に CSV で載せ、サンクスページで復元する
   - body.coupon・body.email があれば初回限定クーポン（lib/coupon.ts）。同じメールに支払い済みが
     あれば 409 で断り、無ければその Customer を渡して割引つきで作る（Stripe も初回を確かめる）。
     購入済みの cookie があるブラウザも 409（/api/checkout/purchased が立てる）。
     クーポンなしは customer_creation: "always" で Customer を残し、次回の照合に使う
   - success/cancel の base は SITE_URL 優先（Amplify SSR では req.nextUrl.origin が
     CloudFront/Lambda 裏の内部ホスト localhost:3000 に化けるため）。ローカルは
     SITE_URL=http://localhost:3001 が効き、未設定環境では origin にフォールバック */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { volBySku, volTitle, unitPrice } from "../../products/data";
import { PURCHASED_COOKIE, resolveCoupon } from "../../lib/coupon";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json({ error: "STRIPE_SECRET_KEY が未設定です（web/.env.local）" }, { status: 500 });
  }

  let body: { skus?: unknown; coupon?: unknown; email?: unknown };
  try {
    body = (await req.json()) as { skus?: unknown; coupon?: unknown; email?: unknown };
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  // 重複除去 → live SKU のみ採用（不正・未入荷は弾く）
  const skus = Array.isArray(body.skus)
    ? [...new Set(body.skus.filter((s): s is string => typeof s === "string"))]
    : [];
  const resolved = skus
    .map((sku) => ({ sku, found: volBySku(sku) }))
    .filter((r) => r.found);

  if (resolved.length === 0) {
    return Response.json({ error: "カートに有効な商品がありません" }, { status: 400 });
  }

  const stripe = new Stripe(key);

  const base = process.env.SITE_URL ?? req.nextUrl.origin;

  // metadata 値は 500 文字制限。SKU slug ~15 字 → 実用上のカート規模では収まる。
  const skuCsv = resolved.map((r) => r.sku).join(",");

  // まとめ買い割引（冊数だけで決まる）を単価へ落とす。¥200/170/160/150 はいずれも
  // 整数なので、行単価 × 冊数がカート画面の合計と 1 円もズレない。
  const unit = unitPrice(resolved.length);

  // 初回限定クーポン。コードが入っていればメールも要る（ゲスト決済では Stripe が初回を判定できないため）。
  const coupon = await resolveCoupon(stripe, body.coupon, body.email, req.cookies.has(PURCHASED_COOKIE));
  if (!coupon.ok) return Response.json({ error: coupon.error }, { status: coupon.status });
  const discount = coupon.params;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // payment_method_types を明示しない＝ダッシュボードで有効化した決済方法（カード/PayPay 等）
      // を Stripe が自動で出し分ける（automatic_payment_methods は Stripe v22 SDK の型に未存在）
      line_items: resolved.map(({ found }) => ({
        price_data: {
          currency: "jpy",
          unit_amount: unit, // JPY はゼロ小数通貨（¥200 一律 → 冊数により ¥170/160/150）
          product_data: { name: volTitle(found!.task, found!.vol) },
        },
        quantity: 1,
      })),
      ...(discount ?? { customer_creation: "always" as const }),
      metadata: { skus: skuCsv },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cart`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "決済セッションの作成に失敗しました";
    return Response.json({ error: msg }, { status: 502 });
  }
}
