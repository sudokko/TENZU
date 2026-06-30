/* メーカー買い切り Checkout セッション作成（payment mode・¥980/メーカー）。
   - body: { makers: MakerKey[], email? } を検証（PURCHASABLE_MAKERS のみ・copy も grid 解放で対象）
   - 各メーカーを price_data でその場定義（Stripe 側に商品事前登録は不要）
   - 購入メーカーは metadata.makers に CSV で載せ、success（/api/auth/verify）で所有 cookie を mint
   - 成功 = /api/auth/verify?session_id=... がその場で所有 cookie を発行（＝ログインの代替）
   - 別端末用には webhook(checkout.session.completed) が復元リンクをメール送信
   - base は SITE_URL 優先（Amplify SSR では req.nextUrl.origin が内部ホストに化けるため） */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { MAKER_PRICE, PURCHASABLE_MAKERS, type MakerKey } from "../../products/capabilities";
import { makerByKey } from "../../products/makers";

export const dynamic = "force-dynamic";

const PAID_SET = new Set<string>(PURCHASABLE_MAKERS);

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json({ error: "STRIPE_SECRET_KEY が未設定です（web/.env.local）" }, { status: 500 });
  }

  let body: { makers?: unknown; email?: unknown };
  try {
    body = (await req.json()) as { makers?: unknown; email?: unknown };
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  // 重複除去 → 買い切り対象メーカーのみ採用（不正キーは弾く・copy も grid 解放で対象）
  const makers: MakerKey[] = Array.isArray(body.makers)
    ? [...new Set(body.makers.filter((m): m is MakerKey => typeof m === "string" && PAID_SET.has(m)))]
    : [];

  if (makers.length === 0) {
    return Response.json({ error: "購入できるメーカーが指定されていません" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" && body.email.includes("@") ? body.email : undefined;

  const stripe = new Stripe(key);
  const base = process.env.SITE_URL ?? req.nextUrl.origin;
  const makerCsv = makers.join(",");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: makers.map((m) => ({
        price_data: {
          currency: "jpy",
          unit_amount: MAKER_PRICE, // 980 = ¥980（JPY はゼロ小数通貨）
          product_data: { name: `${makerByKey(m)?.name ?? m}（買い切り）` },
        },
        quantity: 1,
      })),
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      metadata: { makers: makerCsv },
      success_url: `${base}/api/auth/verify?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/makers`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "決済セッションの作成に失敗しました";
    return Response.json({ error: msg }, { status: 502 });
  }
}
