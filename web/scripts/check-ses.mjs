#!/usr/bin/env node
/* SES の状態診断（サンドボックス判定＋検証済みアドレス一覧）。
   OTP/ログインメールの「届く/届かない」切り分け用。web/.env.local を自動ロード。 */
import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESClient,
  GetSendQuotaCommand,
  ListVerifiedEmailAddressesCommand,
} from "@aws-sdk/client-ses";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = pathResolve(__dirname, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && !(m[1] in process.env)) {
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

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

console.log("SES_REGION:", process.env.SES_REGION ?? "ap-northeast-1");
console.log("SES_FROM_EMAIL:", process.env.SES_FROM_EMAIL);

const q = await ses.send(new GetSendQuotaCommand({}));
console.log("\n--- 送信枠 ---");
console.log("Max24HourSend:", q.Max24HourSend, "(200 ならサンドボックスの可能性大)");
console.log("SentLast24Hours:", q.SentLast24Hours);

const v = await ses.send(new ListVerifiedEmailAddressesCommand({}));
console.log("\n--- 検証済みアドレス（サンドボックス中はここ宛のみ届く）---");
console.log(v.VerifiedEmailAddresses);
