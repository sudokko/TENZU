/* 所有 cookie 発行の単一入口（購入復帰 or マジックリンク復元）。
   - ?session_id=...  : メーカー買い切り Checkout からの復帰。session.metadata.makers を
                        所有に加える（＝購入の瞬間がログインの代替）。
   - ?token=...       : メールのマジックリンク（別端末復元）。署名検証 → メール →
                        Stripe の購入履歴から所有集合を再構成。
   いずれも既存 cookie の所有集合とマージして署名 cookie を再発行し /makers へ。 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { SESSION_COOKIE, readSession, readMagic, sessionCookie } from "../../../lib/auth";
import { parseMakers, resolveOwnedByEmail } from "../../../lib/billing";
import type { MakerKey } from "../../../products/capabilities";

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

  let acquired: MakerKey[] = [];
  try {
    if (sessionId) {
      const s = await stripe.checkout.sessions.retrieve(sessionId);
      if (s.payment_status !== "paid") return fail("unpaid");
      acquired = parseMakers(s.metadata);
    } else if (token) {
      const m = readMagic(token);
      if (!m) return fail("expired");
      acquired = await resolveOwnedByEmail(stripe, m.email);
    } else {
      return fail("missing");
    }
  } catch {
    return fail("stripe");
  }

  // 既存 cookie の所有集合とマージ（買い増し・別端末の合流に対応）。
  const existing = readSession(req.cookies.get(SESSION_COOKIE)?.value)?.owned ?? [];
  const owned = [...new Set<MakerKey>([...existing, ...acquired])];
  if (owned.length === 0) return fail("noowned");

  // 購入直後（session_id）は完了画面 /maker-thanks（買ったメーカーを ?m= で渡す）。
  // 復元（token）は所有一覧の /account へ。
  const dest = sessionId
    ? `${base}/maker-thanks?m=${encodeURIComponent(acquired.join(","))}`
    : `${base}/account?restored=1`;
  const res = NextResponse.redirect(dest);
  const c = sessionCookie(owned);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
