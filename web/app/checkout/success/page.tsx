/* サンクスページ＝決済検証＋ PDF DL 解放（サーバーコンポーネント）。
   - session_id を Stripe で照合し payment_status=paid を確認
   - metadata.skus を復元 → 各巻を SkuPrintPreview の purchased モードで描画
   ソフトゲートの実態（オーナー承認済み・2026-06-14）:
     ここの検証は「DL UI の提示」をゲートするだけで、問題座標データ自体は
     公開の商品詳細ページにも既にクライアント配信されている。¥200 MVP の
     割り切りとして、本物データの認証 API 化（再構築）は次フェーズ送り。 */
import Stripe from "stripe";
import SiteHeader from "../../SiteHeader";
import SkuPrintPreview, { type RenderProblem } from "../../products/SkuPrintPreview";
import ClearCartOnSuccess from "./ClearCartOnSuccess";
import { volBySku, volTitle, PRICE } from "../../products/data";
import { publishedSet } from "../../products/problems/published";
import "../../products/product.css"; // SkuPrintPreview の spv-* スタイル（チップ/設定/レイアウト）
import "../../cart/cart.css"; // ↑の後に読み、success の上書きを優先させる

export const dynamic = "force-dynamic";

function FailShell({ message }: { message: string }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap success-wrap">
        <div className="success-fail">
          <p>{message}</p>
          <a className="btn-cart-link" href="/cart">カートに戻る →</a>
        </div>
      </main>
    </>
  );
}

/* 非同期決済（コンビニ/銀行振込/一部の PayPay 等）はリダイレクト時点でまだ paid でない
   ことがある。行き止まりにせず「処理中」を見せ、20 秒ごとに自動再読込して paid になり
   次第ダウンロード画面へ自動遷移させる（メール不達でも初回アクセスを成立させる）。 */
function ProcessingShell() {
  return (
    <>
      {/* React 19 が <head> に巻き上げる。完了後の自動再読込。 */}
      <meta httpEquiv="refresh" content="20" />
      <SiteHeader />
      <main className="wrap success-wrap">
        <div className="success-head">
          <h1>お支払いを確認しています</h1>
          <p>コンビニ・銀行振込などの場合、確認に少しお時間がかかることがあります。</p>
          <p className="success-revisit">このページを開いたままお待ちください（確認でき次第、自動でダウンロード画面に切り替わります）。ブックマークして後で開き直しても大丈夫です。ご購入確認メールも届きます。</p>
        </div>
      </main>
    </>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) {
    return <FailShell message="決済情報が見つかりませんでした。" />;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return <FailShell message="決済の確認設定が未完了です（STRIPE_SECRET_KEY）。" />;
  }

  let paid = false;
  let skus: string[] = [];
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    paid = session.payment_status === "paid";
    skus = (session.metadata?.skus ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  } catch {
    return <FailShell message="決済の確認に失敗しました。時間をおいて再度お試しください。" />;
  }

  if (!paid) {
    // セッションは取得できている（＝決済自体は開始済み）→ 行き止まりにせず処理中表示。
    return <ProcessingShell />;
  }

  const purchased = skus
    .map((sku) => ({ sku, resolved: volBySku(sku) }))
    .filter((r) => r.resolved);

  return (
    <>
      <ClearCartOnSuccess />
      <SiteHeader />
      <main className="wrap success-wrap">
        <div className="success-head">
          <span className="success-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5 11-11" />
            </svg>
          </span>
          <h1>ご購入ありがとうございます</h1>
          <p>用紙・問題数・並びを選んで、PDF をダウンロードしてください。</p>
          <p className="success-revisit">このページのリンクはご購入確認メールにも届いています。ブックマークすれば、いつでも・別の端末からでも再ダウンロードできます。</p>
        </div>

        {purchased.map(({ sku, resolved }) => {
          const { vol } = resolved!;
          const set = publishedSet(sku);
          const problems: RenderProblem[] | undefined = set?.problems.map((p) => ({
            n: p.grid.n, edges: p.edges,
          }));
          const qn = set?.problems.length ?? 12;
          return (
            <section className="success-sku" key={sku}>
              <div className="success-sku-head">
                <span className="success-sku-stamp">購入済み</span>
                <h2 className="success-sku-name">{volTitle(resolved!.task, vol)}</h2>
                <p className="success-sku-meta">{vol.grid} · 全 {qn} 問 · ¥{PRICE}（税込）</p>
              </div>
              <SkuPrintPreview sku={sku} grid={vol.grid} problems={problems} purchased />
            </section>
          );
        })}
      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
