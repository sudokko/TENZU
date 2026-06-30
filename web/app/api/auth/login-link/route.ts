/* 別端末・データ消失からの「購入の復元」リンク送信（/login のフォームから）。
   - body: { email }
   - そのメールに買い切り購入があれば復元リンクを SES 送信。
   - メール存在の有無を漏らさないため、結果に関わらず常に { ok: true } を返す。 */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { signMagic } from "../../../lib/auth";
import { resolveOwnedByEmail } from "../../../lib/billing";
import { sendRestoreLink } from "../../../lib/email";
import { makerByKey } from "../../../products/makers";

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

  // 漏洩防止: 顧客・購入の有無で挙動を変えず、常に ok。送信可否のみ内部で分岐。
  try {
    const stripe = new Stripe(key);
    const owned = await resolveOwnedByEmail(stripe, email);
    if (owned.length > 0) {
      const base = process.env.SITE_URL ?? req.nextUrl.origin;
      const restoreUrl = `${base}/api/auth/verify?token=${signMagic(email)}`;
      const items = owned.map((k) => makerByKey(k)?.name).filter((n): n is string => Boolean(n));
      await sendRestoreLink({ to: email, restoreUrl, items });
    }
  } catch (e) {
    // 送信失敗もユーザーには成功と見せる（列挙攻撃対策）。運用はログで検知。
    console.error("[login-link] failed:", e);
  }

  return Response.json({ ok: true });
}
