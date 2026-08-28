/* 所有 cookie 発行の単一入口（購入復帰 or マジックリンク復元）。
   - GET ?session_id=... : メーカー買い切り Checkout からの復帰。session.metadata.makers を
                           所有に加える（＝購入の瞬間がログインの代替）。Stripe からの
                           リダイレクト着地なので GET のまま自動発行してよい。
   - GET ?token=...      : 旧メールリンクの互換。**ここでは発行しない**＝説明ページ
                           /restore?t=... へ受け流すだけ。
   - POST { token }      : /restore のボタンから。署名検証 → メール → Stripe の購入履歴
                           から所有集合を再構成し、cookie を発行する。
   いずれも既存 cookie の所有集合とマージして署名 cookie を再発行する。

   ⚠ GET でトークンを消費しない設計にした理由（decisions §3.114）:
   「/api/… の長い不透明トークンを開いた瞬間に権限が発行される」形は資格情報フィッシング
   の典型で、Chrome Safe Browsing にソーシャルエンジニアリング判定を受けた。人が読める
   ページで説明 → 明示的な操作、へ組み替えている。 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { SESSION_COOKIE, readSession, readMagic, sessionCookie } from "../../../lib/auth";
import { parseMakers, resolveOwnedByEmail } from "../../../lib/billing";
import type { MakerKey } from "../../../products/capabilities";

export const dynamic = "force-dynamic";

/* 既存 cookie の所有集合と acquired をマージして cookie を載せる（買い増し・別端末の合流）。 */
function withOwnership(
  req: NextRequest,
  res: NextResponse,
  acquired: MakerKey[],
): MakerKey[] {
  const existing = readSession(req.cookies.get(SESSION_COOKIE)?.value)?.owned ?? [];
  const owned = [...new Set<MakerKey>([...existing, ...acquired])];
  if (owned.length > 0) {
    const c = sessionCookie(owned);
    res.cookies.set(c.name, c.value, c.options);
  }
  return owned;
}

export async function GET(req: NextRequest) {
  const base = process.env.SITE_URL ?? req.nextUrl.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${base}/login?e=${encodeURIComponent(reason)}`);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const token = url.searchParams.get("token");

  // 旧メールリンクの互換: 発行はせず、説明ページへ渡すだけ。
  if (!sessionId && token) {
    return NextResponse.redirect(`${base}/restore?t=${encodeURIComponent(token)}`);
  }
  if (!sessionId) return fail("missing");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return fail("config");

  let acquired: MakerKey[] = [];
  try {
    const stripe = new Stripe(key);
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== "paid") return fail("unpaid");
    acquired = parseMakers(s.metadata);
  } catch {
    return fail("stripe");
  }

  // 購入直後は完了画面 /maker-thanks（買ったメーカーを ?m= で渡す）。
  // sid は購入計測（purchase イベント）用。金額は maker-thanks 側で Stripe から取り直す。
  const res = NextResponse.redirect(
    `${base}/maker-thanks?m=${encodeURIComponent(acquired.join(","))}&sid=${encodeURIComponent(sessionId)}`,
  );
  const owned = withOwnership(req, res, acquired);
  if (owned.length === 0) return fail("noowned");
  return res;
}

/* /restore の「この端末で使えるようにする」から呼ばれる。
   成功時のみ cookie を発行し、遷移先を JSON で返す。 */
export async function POST(req: NextRequest) {
  const err = (reason: string, status = 400) =>
    Response.json({ error: reason }, { status });

  let body: { token?: unknown };
  try {
    body = (await req.json()) as { token?: unknown };
  } catch {
    return err("missing");
  }
  const token = typeof body.token === "string" ? body.token : null;
  if (!token) return err("missing");

  const m = readMagic(token);
  if (!m) return err("expired");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return err("config", 500);

  let acquired: MakerKey[] = [];
  try {
    const stripe = new Stripe(key);
    acquired = await resolveOwnedByEmail(stripe, m.email);
  } catch {
    return err("stripe", 502);
  }

  const res = NextResponse.json({ ok: true, dest: "/account?restored=1" });
  const owned = withOwnership(req, res, acquired);
  if (owned.length === 0) return err("noowned");
  return res;
}
