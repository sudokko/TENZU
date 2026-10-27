/* 購入済みの印をこのブラウザに立てる（初回限定クーポンの補助・lib/coupon.ts）。
   - body: { sessionId } を Stripe で照合し、支払い済みの TENZU の購入（プリント metadata.skus／メーカー metadata.makers）のときだけ立てる。
   - 決済画面を開いただけで買わなかった人には立てない。 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PURCHASED_COOKIE, PURCHASED_TTL } from "../../../lib/coupon";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ error: "STRIPE_SECRET_KEY が未設定です（web/.env.local）" }, { status: 500 });
  let body: { sessionId?: unknown };
  try {
    body = (await req.json()) as { sessionId?: unknown };
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  const id = typeof body.sessionId === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(body.sessionId) ? body.sessionId : null;
  if (!id) return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  try {
    const s = await new Stripe(key).checkout.sessions.retrieve(id);
    if (s.payment_status !== "paid" || !(s.metadata?.skus || s.metadata?.makers)) return Response.json({ ok: false }, { status: 409 });
  } catch {
    return Response.json({ ok: false }, { status: 404 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PURCHASED_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: PURCHASED_TTL });
  return res;
}
