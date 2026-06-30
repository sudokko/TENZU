/* Amazon SES 経由のトランザクションメール送信（購入完了→DLリンク配送）。
   @aws-sdk/client-ses は既定の認証チェーンで AWS_* env / IAM ロールを自動解決する。
   サンドボックス時は SES_FROM_EMAIL と受信者の双方が検証済みである必要がある。 */
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/* Amplify Hosting は "AWS" 接頭辞の環境変数を予約済みで設定できないため、SES 認証情報は
   別名（SES_*）で受ける。SES_* が無ければ既定の認証チェーン（ローカルの AWS_* env / IAM
   ロール）にフォールバックする＝ローカル開発と Amplify コンピュートロール運用の両対応。 */
const ses = new SESClient({
  region: process.env.SES_REGION ?? process.env.AWS_REGION ?? "ap-northeast-1",
  ...(process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendPurchaseEmail(opts: {
  to: string;
  downloadUrl: string;
  items: string[]; // 巻名（volTitle）の配列
}): Promise<void> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error("SES_FROM_EMAIL 未設定");

  const list = opts.items.length ? opts.items : ["ご購入の商品"];
  const textBody = [
    "TENZU をご利用いただきありがとうございます。",
    "",
    "ご購入いただいた商品：",
    ...list.map((t) => `・${t}`),
    "",
    "下記のリンクからダウンロードページを開けます（用紙・問題数を選んで PDF を保存できます）。",
    "このリンクはブックマークすれば、いつでも・別の端末からでも再ダウンロードできます。",
    "",
    opts.downloadUrl,
    "",
    "— 点図形（点描写）プリントの専門店 TENZU",
  ].join("\n");

  const htmlBody = `
    <div style="font-family:sans-serif;line-height:1.7;color:#3A424E">
      <p>TENZU をご利用いただきありがとうございます。</p>
      <p>ご購入いただいた商品：</p>
      <ul>${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <p>下記のボタンからダウンロードページを開けます（用紙・問題数を選んで PDF を保存できます）。<br>
      このリンクはブックマークすれば、いつでも・別の端末からでも再ダウンロードできます。</p>
      <p><a href="${esc(opts.downloadUrl)}"
        style="display:inline-block;background:#2C6E7F;color:#fff;text-decoration:none;
        padding:12px 24px;border-radius:4px;font-weight:600">ダウンロードページを開く</a></p>
      <p style="font-size:12px;color:#9AA0AA">${esc(opts.downloadUrl)}</p>
      <p style="font-size:12px;color:#9AA0AA">— 点図形（点描写）プリントの専門店 TENZU</p>
    </div>`;

  await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [opts.to] },
    Message: {
      Subject: { Data: "【TENZU】ご購入ありがとうございます — ダウンロードリンク", Charset: "UTF-8" },
      Body: {
        Text: { Data: textBody, Charset: "UTF-8" },
        Html: { Data: htmlBody, Charset: "UTF-8" },
      },
    },
  }));
}

/* 購入したメーカーの別端末復元リンク（マジックリンク）。
   買い切り（payment mode）完了時・別端末からの復元時に送る。
   リンク先 = /api/auth/verify?token=...（署名トークンを検証し、Stripe 履歴から所有を再 mint）。 */
export async function sendRestoreLink(opts: {
  to: string;
  restoreUrl: string;
  items: string[]; // 購入メーカー名の配列（空でも可）
}): Promise<void> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error("SES_FROM_EMAIL 未設定");

  const list = opts.items.length ? opts.items : ["ご購入のメーカー"];
  const textBody = [
    "TENZU メーカーのご購入ありがとうございます。",
    "",
    "ご購入いただいたメーカー：",
    ...list.map((t) => `・${t}`),
    "",
    "別の端末（スマホ↔パソコン）で使うときや、ブラウザのデータを消したときは、",
    "下記のリンクを開くと購入済みのメーカーを復元できます（このリンクは 30 分間有効です）。",
    "",
    opts.restoreUrl,
    "",
    "— 点図形（点描写）プリントの専門店 TENZU",
  ].join("\n");

  const htmlBody = `
    <div style="font-family:sans-serif;line-height:1.7;color:#3A424E">
      <p>TENZU メーカーのご購入ありがとうございます。</p>
      <p>ご購入いただいたメーカー：</p>
      <ul>${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <p>別の端末（スマホ↔パソコン）で使うときや、ブラウザのデータを消したときは、<br>
      下記のボタンから購入済みのメーカーを復元できます（このリンクは 30 分間有効です）。</p>
      <p><a href="${esc(opts.restoreUrl)}"
        style="display:inline-block;background:#2C6E7F;color:#fff;text-decoration:none;
        padding:12px 24px;border-radius:4px;font-weight:600">購入を復元する</a></p>
      <p style="font-size:12px;color:#9AA0AA">${esc(opts.restoreUrl)}</p>
      <p style="font-size:12px;color:#9AA0AA">— 点図形（点描写）プリントの専門店 TENZU</p>
    </div>`;

  await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [opts.to] },
    Message: {
      Subject: { Data: "【TENZU】ご購入ありがとうございます — 別端末での復元リンク", Charset: "UTF-8" },
      Body: {
        Text: { Data: textBody, Charset: "UTF-8" },
        Html: { Data: htmlBody, Charset: "UTF-8" },
      },
    },
  }));
}
