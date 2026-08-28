/* Stripe Webhook（支払い確定 → 購入完了メール配送）。
   - 署名検証には raw body が必須 → req.text() で生のまま取得（JSON パースしない）
   - 宛先メールは Stripe Checkout が収集した customer_details.email を使う
   - プリント（metadata.skus）= DL ページのリンクをメール（再 DL 用）
   - メーカー買い切り（metadata.makers）= 別端末復元のマジックリンクをメール
     （申込ブラウザは success_url の /api/auth/verify で即 cookie 取得済み。これは予備手段）
   - Stripe にエンドポイントを無効化されないよう、処理失敗でも 200 を返す（ログのみ）
   - 冪等性: DB を持たないため webhook 重複時はメール重複の可能性あり（低害・MVP 受容）

   ■ 後払い（コンビニ払い等）を扱うため 2 種のイベントを購読する
   カード決済は completed の時点で payment_status="paid" になるので 1 イベントで完結する。
   コンビニ払いは「申込」と「入金」が別の瞬間に起きるため 2 段になる:
     1. checkout.session.completed              … payment_status="unpaid"（申込しただけ）
     2. checkout.session.async_payment_succeeded … 客が店頭で払った時点。ここが配送の合図
   したがって completed だけを購読すると、コンビニ払いの客に購入メールが永遠に届かない。
   両方を同じ経路へ流し、payment_status==="paid" のガードで実際の配送可否を決める
   （＝ 1 の unpaid はここで落ちるので、二重送信にはならない）。

   ※ 開店時点の決済手段は「カードのみ」＝コンビニ払いは未有効（固定電話番号が要るため・
   decisions.md §3.110）。この 2 イベント購読は将来の非同期決済に備えて残してある。
   購読していても実害はなく、逆に購読漏れは「入金したのに届かない」を生む。 */
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { volBySku, volTitle } from "../../../products/data";
import { sendPurchaseEmail, sendRestoreLink } from "../../../lib/email";
import { signMagic } from "../../../lib/auth";
import { parseMakers } from "../../../lib/billing";
import { makerByKey } from "../../../products/makers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  /* 署名シークレットは 2 つの名前を見る。Amplify のコンソールに正しく登録されていても
     STRIPE_WEBHOOK_SECRET だけがビルドシェルへ渡らない事象に当たったため、別名の
     APP_STRIPE_WH_SECRET を予備の入口として用意した（[decisions.md §3.112](../../../../decisions.md)）。
     どちらか入っていれば動く。 */
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.APP_STRIPE_WH_SECRET;
  if (!key || !whSecret) {
    return Response.json({ error: "Stripe の環境変数が未設定です" }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig) throw new Error("missing stripe-signature");
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e) {
    // 署名検証失敗は 400（Stripe はこれを「不正」として扱い、再送しない）
    const msg = e instanceof Error ? e.message : "signature verification failed";
    return Response.json({ error: `Webhook signature error: ${msg}` }, { status: 400 });
  }

  /* 入金が確定しうる 2 イベント。async_payment_failed は配送しないので購読しない
     （コンビニの期限切れ・入金失敗の案内は Stripe 側の自動メールに任せる）。 */
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const email = session.customer_details?.email;
      // 後払いの「申込だけ（unpaid）」はここで落ちる＝入金後の 2 通目で配送される
      if (session.payment_status !== "paid" || !email) {
        return Response.json({ received: true });
      }

      const skus = (session.metadata?.skus ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const makers = parseMakers(session.metadata);
      const base = process.env.SITE_URL ?? req.nextUrl.origin;

      if (skus.length > 0) {
        // プリント（payment mode・¥200）→ 再 DL ページのリンク。
        const items = skus
          .map((sku) => { const r = volBySku(sku); return r ? volTitle(r.task, r.vol) : null; })
          .filter((t): t is string => Boolean(t));
        const downloadUrl = `${base}/checkout/success?session_id=${session.id}`;
        await sendPurchaseEmail({ to: email, downloadUrl, items });
      } else if (makers.length > 0) {
        // メーカー買い切り → 別端末復元のマジックリンク（所有は Stripe 履歴から再構成）。
        const items = makers
          .map((k) => makerByKey(k)?.name)
          .filter((n): n is string => Boolean(n));
        const restoreUrl = `${base}/restore?t=${signMagic(email)}`;
        await sendRestoreLink({ to: email, restoreUrl, items });
      }
    } catch (e) {
      // 送信失敗してもエンドポイントを生かすため 200 で返す（運用はログで検知）
      console.error("[stripe webhook] purchase email failed:", e);
    }
  }

  return Response.json({ received: true });
}
