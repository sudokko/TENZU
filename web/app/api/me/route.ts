/* 現在の tier を返す（AuthContext がマウント時に取得）。
   二層式 exp の再検証地点:
   - cookie が無い/失効 → guest。
   - tier(texp 24h) がまだ新しい → cookie の tier をそのまま返す（Stripe 照会なし）。
   - texp 切れ → Stripe で現 tier を再取得し、cookie を再発行（ログイン期限も 30 日へスライド）。
     guest に落ちていれば cookie を失効。Stripe 障害時は楽観的に旧 tier を維持。 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  SESSION_COOKIE, readSession, tierExpired, sessionCookie, clearedCookie,
} from "../../lib/auth";
import { resolveTier } from "../../lib/billing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const sess = readSession(token);
  if (!sess) return NextResponse.json({ tier: "guest" });

  if (!tierExpired(sess)) return NextResponse.json({ tier: sess.tier });

  // texp 切れ → Stripe へ再照会
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ tier: sess.tier }); // 再検証不能なら楽観維持

  try {
    const stripe = new Stripe(key);
    const tier = await resolveTier(stripe, sess.sub);
    const res = NextResponse.json({ tier });
    const c = tier === "guest" ? clearedCookie() : sessionCookie(sess.sub, tier);
    res.cookies.set(c.name, c.value, c.options);
    return res;
  } catch {
    // Stripe 障害時は cookie が hard-expire（lexp）するまで旧 tier を維持
    return NextResponse.json({ tier: sess.tier });
  }
}
