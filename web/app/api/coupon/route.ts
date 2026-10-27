/* カートのクーポン欄の確認（コードだけ見る・メールの照合は /api/checkout で行う）。
   - body: { code } → { code, amountOff, label }。使えないコードは 404、購入済みのブラウザは 409。 */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { ALREADY_PURCHASED, PURCHASED_COOKIE, findFirstCoupon, normalizeCode } from "../../lib/coupon";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ error: "STRIPE_SECRET_KEY が未設定です（web/.env.local）" }, { status: 500 });
  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  if (req.cookies.has(PURCHASED_COOKIE)) return Response.json({ error: ALREADY_PURCHASED }, { status: 409 });
  const code = normalizeCode(body.code);
  const coupon = code ? await findFirstCoupon(new Stripe(key), code).catch(() => null) : null;
  if (!coupon) return Response.json({ error: "このクーポンコードは使えません。入力をお確かめください。" }, { status: 404 });
  return Response.json({ code: coupon.code, amountOff: coupon.amountOff, label: coupon.label });
}
