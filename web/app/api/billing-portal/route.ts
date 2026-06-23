/* Stripe Billing Portal セッション生成（解約・支払い方法変更を Stripe に丸投げ）。
   現在の会員 cookie から customer_id を取り、ポータル URL を返す。/account から呼ぶ。 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { SESSION_COOKIE, readSession } from "../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "サーバー設定が未完了です" }, { status: 500 });

  const sess = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!sess) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const base = process.env.SITE_URL ?? req.nextUrl.origin;
  try {
    const stripe = new Stripe(key);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sess.sub,
      return_url: `${base}/account`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ポータルの作成に失敗しました";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
