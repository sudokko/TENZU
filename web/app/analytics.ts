/* =========================================================================
   計測（GA4・広告ピクセル等のタグは GTM 側で管理 — コードは dataLayer に流すだけ）
   - NEXT_PUBLIC_GTM_ID 未設定の環境（ローカル dev 等）では dataLayer 送信が no-op。
     例外: trackOnsiteMsg の first-party ビーコン（/api/onsite/track）だけは
     GTM と独立に送る（管理画面 /admin/onsite の自前カウンタ）
   - イベント定義・UTM 命名規則の SSOT は engineering/analytics.md
     （Phase 1 は 3 イベントのみ: tool_start / generated_pdf / purchase。
      流入元＝UTM は GA4 が自動取得するためコード側の実装は不要）
   ========================================================================= */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";

declare global {
  interface Window { dataLayer?: Record<string, unknown>[] }
}

function push(obj: Record<string, unknown>): void {
  if (typeof window === "undefined" || !GTM_ID) return;
  (window.dataLayer = window.dataLayer ?? []).push(obj);
}

/* 現在ページのメーカー識別子（/maker → copy、/maker-mirror → mirror …） */
export function makerFromPath(): string {
  if (typeof window === "undefined") return "unknown";
  const seg = window.location.pathname.split("/")[1] ?? "";
  if (seg === "maker") return "copy";
  return seg.startsWith("maker-") ? seg.slice("maker-".length) : seg || "unknown";
}

/* メーカー起動（共通シェル MakerHeader のマウント時 1 回） */
export function trackToolStart(maker: string): void {
  push({ event: "tool_start", maker });
}

/* PDF 書き出し完了（メーカー共通 exportPdf の保存直後） */
export function trackGeneratedPdf(maker: string, pages: number): void {
  push({ event: "generated_pdf", maker, pages });
}

/* オンサイトメッセージ（補助イベント — 広告ファネル 10 イベントとは別系統）。
   二重経路（engineering/analytics.md）:
   - GTM dataLayer（push・GTM_ID 未設定なら no-op）… GA4 用。タグは静かな開店期に追加
   - first-party ビーコン（/api/onsite/track → DynamoDB 日次カウンタ）… 管理画面
     /admin/onsite の表示数/クリック数。GTM_ID ゲートの外＝GTM 未接続でも数える。
     プレビュー表示（?om_preview）は first-party 側だけ数えない */
export function trackOnsiteMsg(
  action: "show" | "click" | "dismiss",
  campaignId: string,
  trigger: string,
  opts?: { preview?: boolean },
): void {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    console.debug(`[onsite] ${action}: ${campaignId} (${trigger})`);
  }
  push({ event: `onsite_msg_${action}`, campaign_id: campaignId, trigger });

  if (opts?.preview || typeof window === "undefined") return;
  const body = JSON.stringify({ action, campaignId });
  try {
    // sendBeacon はページ遷移直前（CTA click）でも取りこぼさない
    if (navigator.sendBeacon("/api/onsite/track", new Blob([body], { type: "application/json" }))) {
      return;
    }
  } catch {
    /* sendBeacon 不可の環境 → fetch keepalive へ */
  }
  fetch("/api/onsite/track", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

export type PurchaseItem = { id: string; name: string; price: number };

/* 購入（GA4 eコマース形式）。kind: paper=紙の巻 / maker=工房買い切り。
   item_category に kind を焼く＝アタッチ率（紙→工房転換）を GA4 側で切るための鍵。
   サンクスページは再訪・リロードされる（メールのリンク・処理中画面の自動更新）ため
   transaction_id で localStorage ガード。GA4 側の同 ID 重複排除は二段目の保険。 */
export function trackPurchase(opts: {
  transactionId: string;
  value: number; // JPY（ゼロ小数通貨・円そのまま）
  kind: "paper" | "maker";
  items: PurchaseItem[];
}): void {
  if (typeof window === "undefined" || !GTM_ID) return;
  const guard = `tenzu_purchase_${opts.transactionId}`;
  try {
    if (window.localStorage.getItem(guard)) return;
    window.localStorage.setItem(guard, "1");
  } catch {
    /* プライベートモード等 — GA4 側の重複排除に任せて送信は続行 */
  }
  push({ ecommerce: null }); // GTM 推奨: 直前の ecommerce オブジェクトをクリア
  push({
    event: "purchase",
    purchase_kind: opts.kind,
    ecommerce: {
      transaction_id: opts.transactionId,
      currency: "JPY",
      value: opts.value,
      items: opts.items.map((it) => ({
        item_id: it.id,
        item_name: it.name,
        item_category: opts.kind,
        price: it.price,
        quantity: 1,
      })),
    },
  });
}
