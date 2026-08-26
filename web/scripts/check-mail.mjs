#!/usr/bin/env node
/* メール配送の疎通確認（業者非依存）。web/.env.local を自動ロードし、
   MAIL_PROVIDER の設定に従って 1 通だけ実送信する。
     node scripts/check-mail.mjs 宛先@example.com
   SES サンドボックス中は宛先も検証済みである必要がある（Resend は不要）。 */
import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(pathResolve(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("使い方: node scripts/check-mail.mjs 宛先@example.com");
  process.exit(1);
}

const from = process.env.MAIL_FROM_EMAIL ?? process.env.SES_FROM_EMAIL;
const provider = process.env.MAIL_PROVIDER ?? (process.env.RESEND_API_KEY ? "resend" : "ses");
console.log("provider:", provider);
console.log("from:", from);
console.log("to:", to);

const subject = "【TENZU】配送テスト";
const text = `配送テストです（provider=${provider}）。\n\n— 点図形（点描写）プリントの専門店 TENZU`;
const html = `<p>配送テストです（provider=${provider}）。</p><p style="font-size:12px;color:#9AA0AA">— 点図形（点描写）プリントの専門店 TENZU</p>`;

if (provider === "resend") {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  console.log("\nstatus:", res.status, await res.text());
  if (!res.ok) process.exit(1);
} else {
  const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
  const ses = new SESClient({
    region: process.env.SES_REGION ?? "ap-northeast-1",
    ...(process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.SES_ACCESS_KEY_ID,
            secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
  const r = await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } },
    },
  }));
  console.log("\nMessageId:", r.MessageId);
}
console.log("\n送信完了。受信箱と迷惑メールの両方を確認すること。");
