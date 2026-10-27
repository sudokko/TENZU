/* =========================================================================
   初回限定クーポン（プリントのカート・メーカーの購入確認ページ・pack-commerce §14.7.2）。
   - コードの正本は Stripe の Promotion Code（クーポン＝¥100 OFF・JPY・初回限定）。
     コード文字列はコードに書かない（本や案内に刷ったものを Stripe 側で作る）。
   - Stripe の「初回限定」は Checkout に customer を渡したときしか効かない（ゲスト決済は
     毎回「初回」扱い）。そこでカートでメールアドレスを受け取り、同じメールの Customer に
     支払い済みがあれば断ってから、その Customer を渡して Checkout を作る。
   - プリント・メーカーの Checkout は customer_creation: "always" で Customer を残す（次回の照合用）。
   - Stripe の決済画面のコード欄（allow_promotion_codes）は使わない（初回の確認をすり抜けるため）。
   - 補助として、買い物をしたブラウザ（プリント・メーカー）には購入済みの cookie を立て、そのブラウザでは断る
     （別のブラウザ・シークレットウィンドウでは見えない。メールの照合が主）。
   ========================================================================= */
import type Stripe from "stripe";

/** TENZU で買い物をしたブラウザの印（値は意味を持たない）。購入完了ページが支払い済みを確かめてから立てる。 */
export const PURCHASED_COOKIE = "tenzu_purchased";
/** ブラウザが受け付ける最長（400日）。買い物のたびに延びる。 */
export const PURCHASED_TTL = 60 * 60 * 24 * 400;
export const ALREADY_PURCHASED = "このクーポンは、TENZUではじめてのお買い物のときだけ使えます。";

export type FirstCoupon = { id: string; code: string; amountOff: number; label: string };

/** 入力のゆれ（全角・前後の空白・小文字）を吸収する。英数とハイフン以外は受け付けない。 */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.normalize("NFKC").trim().toUpperCase();
  return /^[A-Z0-9-]{3,32}$/.test(s) ? s : null;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.normalize("NFKC").trim().toLowerCase();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

/** 有効な初回限定の定額クーポンだけを返す。率引き・初回限定でないコードはカートでは扱わない。 */
export async function findFirstCoupon(stripe: Stripe, code: string): Promise<FirstCoupon | null> {
  const res = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ["data.promotion.coupon"] });
  const pc = res.data[0];
  if (!pc || pc.code.toUpperCase() !== code || !pc.restrictions.first_time_transaction) return null;
  if (pc.expires_at && pc.expires_at * 1000 < Date.now()) return null;
  const coupon = pc.promotion.coupon;
  if (!coupon || typeof coupon === "string" || !coupon.valid || coupon.currency !== "jpy" || !coupon.amount_off) return null;
  return { id: pc.id, code: pc.code, amountOff: coupon.amount_off, label: coupon.name ?? `初回限定 ¥${coupon.amount_off} OFF` };
}

/** このメールで支払い済みの買い物があるか（プリント・メーカーとも、Customer に結びついたもの）。 */
async function hasPaid(stripe: Stripe, customers: Stripe.Customer[]): Promise<boolean> {
  for (const c of customers) {
    const sessions = await stripe.checkout.sessions.list({ customer: c.id, limit: 20 });
    if (sessions.data.some((s) => s.payment_status === "paid" || s.payment_status === "no_payment_required")) return true;
  }
  return false;
}

/** 初回なら Checkout に渡す Customer の ID を返す（無ければ作る）。買い物の記録があれば null。 */
export async function firstTimeCustomer(stripe: Stripe, email: string): Promise<string | null> {
  const found = await stripe.customers.list({ email, limit: 20 });
  if (await hasPaid(stripe, found.data)) return null;
  return found.data[0]?.id ?? (await stripe.customers.create({ email })).id;
}

export type CouponResult =
  | { ok: true; params: Pick<Stripe.Checkout.SessionCreateParams, "customer" | "discounts"> | null }
  | { ok: false; status: number; error: string };

/** Checkout を作る前のクーポン確認（両方の決済で共通）。コードが無ければ params: null。 */
export async function resolveCoupon(
  stripe: Stripe, rawCode: unknown, rawEmail: unknown, purchasedBefore: boolean,
): Promise<CouponResult> {
  if (rawCode == null || rawCode === "") return { ok: true, params: null };
  const code = normalizeCode(rawCode), email = normalizeEmail(rawEmail);
  if (!code) return { ok: false, status: 400, error: "このクーポンコードは使えません。入力をお確かめください。" };
  if (purchasedBefore) return { ok: false, status: 409, error: ALREADY_PURCHASED };
  if (!email) return { ok: false, status: 400, error: "クーポンを使うときは、メールアドレスを入れてください。" };
  try {
    const coupon = await findFirstCoupon(stripe, code);
    if (!coupon) return { ok: false, status: 400, error: "このクーポンコードは使えません。入力をお確かめください。" };
    const customer = await firstTimeCustomer(stripe, email);
    if (!customer) return { ok: false, status: 409, error: ALREADY_PURCHASED };
    return { ok: true, params: { customer, discounts: [{ promotion_code: coupon.id }] } };
  } catch {
    return { ok: false, status: 502, error: "クーポンを確かめられませんでした。時間をおいてもう一度お試しください。" };
  }
}
