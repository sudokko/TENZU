/* 別端末・再ログイン用のマジックリンク送信（/login のフォームから）。
   - body: { email }
   - そのメールの顧客に有効サブスクがあればログインリンクを SES 送信。
   - メール存在の有無を漏らさないため、結果に関わらず常に { ok: true } を返す。 */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { signMagic } from "../../../lib/auth";
import { findCustomerIdByEmail, resolveTier } from "../../../lib/billing";
import { sendLoginLink } from "../../../lib/email";
import { PLANS } from "../../../products/capabilities";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" && body.email.includes("@") ? body.email.trim() : null;
  if (!email) return Response.json({ error: "メールアドレスを入力してください" }, { status: 400 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ error: "サーバー設定が未完了です" }, { status: 500 });

  // 漏洩防止: 顧客の有無・サブスクの有無で挙動を変えず、常に ok。送信可否のみ内部で分岐。
  try {
    const stripe = new Stripe(key);
    const customerId = await findCustomerIdByEmail(stripe, email);
    if (customerId) {
      const tier = await resolveTier(stripe, customerId);
      if (tier !== "guest") {
        const base = process.env.SITE_URL ?? req.nextUrl.origin;
        const loginUrl = `${base}/api/auth/verify?token=${signMagic(email)}`;
        const planName = tier === "full" ? PLANS.full.name : PLANS.entry.name;
        await sendLoginLink({ to: email, loginUrl, planName });
      }
    }
  } catch (e) {
    // 送信失敗もユーザーには成功と見せる（列挙攻撃対策）。運用はログで検知。
    console.error("[login-link] failed:", e);
  }

  return Response.json({ ok: true });
}
