/** npx tsx scripts/create-first-coupon.ts [--code HAJIMETE100] [--rule first|once] [--live]
 * ¥100 OFF のクーポン（JPY・まとめ買い割引と併用可）を Stripe に作る（pack-commerce §14.7.2）。
 * --rule first（既定）＝初回限定。クーポン本体は1つ（metadata.tenzu=first-100）で、配る場所ごとにプロモーションコードを足す。
 * --rule once＝何回目のお買い物でも、1つのメールアドレスにつき1回（本のアンケートのお礼・ENQUETE100）。
 *   クーポン本体は別（metadata.tenzu=enquete-100）。コードの metadata.tenzu_rule=once-per-email を lib/coupon.ts が読む。
 * 何度流しても同じ物を作り直さない。鍵は STRIPE_SECRET_KEY（無ければ web/.env.local）。本番鍵は --live のときだけ使う。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { ONCE_PER_EMAIL, findCoupon, normalizeCode } from "../app/lib/coupon";

const argOf = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const code = normalizeCode(argOf("--code") ?? "HAJIMETE100");
if (!code) throw new Error("--code は英数とハイフン 3〜32 文字");
const rule = argOf("--rule") ?? "first";
if (rule !== "first" && rule !== "once") throw new Error("--rule は first か once");
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env.local");
const key = process.env.STRIPE_SECRET_KEY?.trim()
  || (fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1]?.trim() : undefined);
if (!key) throw new Error("STRIPE_SECRET_KEY がありません");
const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
if (live && !process.argv.includes("--live")) throw new Error("本番の鍵です。本番に作るときは --live をつけてください");

const AMOUNT = 100;
const KIND: { tag: string; name: string; restrictions: Stripe.PromotionCodeCreateParams.Restrictions; metadata: Record<string, string> } = rule === "first"
  ? { tag: "first-100", name: `初回限定 ¥${AMOUNT} OFF`, restrictions: { first_time_transaction: true }, metadata: {} }
  : { tag: "enquete-100", name: `アンケートのお礼 ¥${AMOUNT} OFF`, restrictions: {}, metadata: { tenzu_rule: ONCE_PER_EMAIL } };
const stripe = new Stripe(key);

async function main() {
  const existing = await findCoupon(stripe, code!);
  if (existing) return console.log(`${live ? "本番" : "テスト"}: ${code} はもうあります（${existing.label}・${existing.rule}・${existing.id}）`);
  let coupon = (await stripe.coupons.list({ limit: 100 })).data.find((c) => c.metadata?.tenzu === KIND.tag && c.valid);
  coupon ??= await stripe.coupons.create({
    amount_off: AMOUNT, currency: "jpy", duration: "once", name: KIND.name, metadata: { tenzu: KIND.tag },
  });
  const pc = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id }, code: code!,
    restrictions: KIND.restrictions, metadata: { tenzu: KIND.tag, ...KIND.metadata },
  });
  console.log(`${live ? "本番" : "テスト"}: ${pc.code} を作りました（${rule}・クーポン ${coupon.id}・コード ${pc.id}）`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
