#!/usr/bin/env node
/* =========================================================================
   TENZU 手動リカバリ CLI（メール不達時の救済・オーナー専用ローカルツール）

   「課金したのにメール（DLリンク/復元リンク）が届かない」客の対応を
   サクッと済ませるための発行装置。ネットには出さない＝ローカル実行のみ。
   発行関数は本番コードと同一ロジックを流用（auth.ts signMagic / success ページ）。

   使い方（web/ ディレクトリから）:
     node scripts/recover.mjs <メール または Stripe ID> [--resend] [--base=URL]

     例:
       node scripts/recover.mjs okayama@example.com      # メールで横断検索
       node scripts/recover.mjs cs_test_xxx              # Checkout セッション直指定（商品）
       node scripts/recover.mjs cus_xxx                  # 顧客直指定（メーカー）
       node scripts/recover.mjs pi_xxx                   # PaymentIntent 直指定（商品）
       node scripts/recover.mjs okayama@example.com --resend   # 登録メール宛に再送（スパム/一時不達用）

   読み込む env（web/.env.local を自動ロード・実 env が優先）:
     STRIPE_SECRET_KEY（必須）/ AUTH_SECRET（メーカーの復元リンク発行に必須）
     SITE_URL（発行リンクのドメイン・未設定なら https://tenzu.jp・--base で上書き可）
     SES_FROM_EMAIL ほか（--resend 時のみ）

   セキュリティ（厳守・末尾にも再掲）:
     - 発行リンクは「有料アクセスのベアラ」。Slack/メール等にうかつに貼らない
     - 既定は「登録メール宛」に手渡す。別アドレス希望時は金額・購入日・カード末尾4桁で本人確認してから
     - メーカーの復元リンクは verify 側で Stripe 履歴を再照合するため、未購入には無効（安全）
   発行は scripts/recover-audit.log.jsonl に追記される。
   ========================================================================= */
import { createHmac } from "node:crypto";
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Stripe from "stripe";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(HERE, "..");

/* ---- .env.local 読み込み（依存なし・実 env が優先）---- */
function loadEnv(name) {
  try {
    const txt = readFileSync(join(WEB_DIR, name), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch { /* ファイルが無ければ無視 */ }
}
loadEnv(".env.local");
loadEnv(".env");

/* ---- 引数 ---- */
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--") && !a.includes("=")));
const baseArg = argv.find((a) => a.startsWith("--base="));
const query = argv.find((a) => !a.startsWith("--"));
const RESEND = flags.has("--resend");
const BASE = ((baseArg ? baseArg.split("=").slice(1).join("=") : process.env.SITE_URL) || "https://tenzu.jp").replace(/\/$/, "");

const C = process.stdout.isTTY
  ? { dim: "\x1b[2m", b: "\x1b[1m", g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", c: "\x1b[36m", x: "\x1b[0m" }
  : { dim: "", b: "", g: "", y: "", r: "", c: "", x: "" };
const line = (s = "") => console.log(s);
const head = (s) => line(`\n${C.b}${s}${C.x}`);

if (!query) {
  line(`${C.b}TENZU 手動リカバリ CLI${C.x}`);
  line(`使い方: ${C.c}node scripts/recover.mjs <メール または Stripe ID> [--resend] [--base=URL]${C.x}`);
  line(`  メール       例: node scripts/recover.mjs okayama@example.com`);
  line(`  Checkout     例: node scripts/recover.mjs cs_test_xxx   （商品）`);
  line(`  顧客       例: node scripts/recover.mjs cus_xxx   （メーカー）`);
  line(`  PaymentIntent 例: node scripts/recover.mjs pi_xxx   （商品）`);
  line(`  --resend     登録メール宛に再送（スパム/一時不達用）`);
  process.exit(1);
}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  line(`${C.r}STRIPE_SECRET_KEY が未設定です（web/.env.local）。${C.x}`);
  process.exit(1);
}
const AUTH_SECRET = process.env.AUTH_SECRET;
const stripe = new Stripe(STRIPE_KEY);

/* ---- 発行プリミティブ（本番コードと一致）---- */
// auth.ts signMagic と同一: pack({typ:"m",email,exp}) を HMAC-SHA256 で署名。
// 署名は token 内の body 文字列に対して計算され verify 側も同じ body で再計算するため、
// payload のキー順は一致不要（同じ AUTH_SECRET で署名されていれば検証は通る）。
function makerRestoreLink(email) {
  if (!AUTH_SECRET) return null;
  const payload = { typ: "m", email, exp: Math.floor(Date.now() / 1000) + 60 * 30 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${BASE}/api/auth/verify?token=${body}.${sig}`;
}
const productDownloadLink = (sessionId) => `${BASE}/checkout/success?session_id=${sessionId}`;

/* ---- 表示ヘルパー ---- */
const yen = (n, cur = "jpy") =>
  n == null ? "—" : (cur === "jpy" ? "¥" + n.toLocaleString("ja-JP") : `${n} ${cur.toUpperCase()}`);
const when = (sec) => (sec ? new Date(sec * 1000).toLocaleString("ja-JP") : "—");
const lc = (s) => (s || "").trim().toLowerCase();

function audit(entry) {
  try {
    appendFileSync(join(HERE, "recover-audit.log.jsonl"), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch { /* ログ失敗は致命ではない */ }
}

/* 顧客の支払い済み Checkout から所有メーカー集合を再構成（billing.ts resolveOwnedMakers と同一判定）。 */
async function ownedForCustomer(customerId) {
  const owned = new Set();
  const rows = [];
  for await (const s of stripe.checkout.sessions.list({ customer: customerId, limit: 100 })) {
    if (s.payment_status !== "paid") continue;
    const makers = (s.metadata?.makers ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (makers.length === 0) continue;
    for (const m of makers) owned.add(m);
    rows.push({ id: s.id, makers: makers.join("・"), created: s.created });
  }
  return { owned: [...owned], rows };
}

/* Checkout セッションのカード情報を best-effort で取得（本人確認の照合用）。 */
async function sessionCard(sessionId) {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
    const card = s.payment_intent?.latest_charge?.payment_method_details?.card;
    return card ? `${card.brand} ****${card.last4}` : null;
  } catch { return null; }
}

/* メール横断: 直近の payment-mode 済 Checkout を走査（launch 規模前提・上限あり）。 */
async function findProductSessions(email) {
  const matches = [];
  let scanned = 0;
  const CAP = 1500;
  for await (const s of stripe.checkout.sessions.list({ limit: 100 })) {
    scanned++;
    if (s.mode === "payment" && s.payment_status === "paid" && lc(s.customer_details?.email) === lc(email)) {
      matches.push(s);
    }
    if (scanned >= CAP) break;
  }
  return { matches, scanned, capped: scanned >= CAP };
}

/* ---- 出力ブロック ---- */
function printMaker({ email, owned, rows }) {
  head("■ メーカー（買い切り）");
  if (!owned || owned.length === 0) { line(`${C.dim}  購入済みのメーカーは見つかりませんでした。${C.x}`); return null; }
  line(`  購入済み : ${C.g}${owned.join("・")}${C.x}`);
  for (const r of rows) line(`  購入     : ${r.id}  ${r.makers}  ${when(r.created)}`);
  const link = makerRestoreLink(email);
  if (!link) { line(`${C.r}  AUTH_SECRET 未設定のため復元リンクを発行できません。${C.x}`); return null; }
  line(`  ${C.b}復元リンク（30分有効・このメール宛の購入のみ有効）:${C.x}`);
  line(`  ${C.c}${link}${C.x}`);
  return link;
}

function printProducts({ matches, scanned, capped }, cards) {
  head("■ 商品（単発購入 ¥200）");
  if (matches.length === 0) {
    line(`${C.dim}  直近 ${scanned} 件を走査・該当する支払い済み購入は見つかりませんでした。${C.x}`);
    if (capped) line(`${C.y}  ※ 上限まで走査。古い購入は Stripe ダッシュボードで cs_... を確認し直接指定してください。${C.x}`);
    return [];
  }
  const links = [];
  matches.forEach((s, i) => {
    const link = productDownloadLink(s.id);
    links.push(link);
    line(`  [${i + 1}] ${when(s.created)} ・ ${yen(s.amount_total, s.currency)} ・ ${cards[i] || "カード不明"}`);
    line(`      商品: ${s.metadata?.skus || "（skus メタデータなし）"}`);
    line(`      ${C.b}再DLリンク:${C.x} ${C.c}${link}${C.x}`);
  });
  if (capped) line(`${C.y}  ※ 上限まで走査。古い購入は cs_... を直接指定してください。${C.x}`);
  return links;
}

function printTemplates({ email, makerLink, productLinks }) {
  const dl = productLinks[0];
  head("■ 返信テンプレ（コピペ用・宛先は原則「登録メール」）");
  line(`${C.dim}--- ① まず迷惑メール確認＋再送 ---${C.x}`);
  line(`お問い合わせありがとうございます。ご購入を確認いたしました。`);
  line(`お送りしたメールが迷惑メールフォルダに振り分けられている場合があります。`);
  line(`「TENZU」で検索いただくか、念のため同じアドレスへ再送しました（数分お待ちください）。`);
  if (makerLink || dl) {
    line(`\n${C.dim}--- ② リンクを直接お渡し ---${C.x}`);
    line(`大変失礼いたしました。下記のリンクからご利用いただけます。`);
    if (makerLink) line(`▼ 復元リンク（30分有効）\n${makerLink}`);
    if (dl) line(`▼ ダウンロードページ\n${dl}`);
  }
  line(`\n${C.dim}--- ③ 別アドレスを希望された場合（本人確認してから）---${C.x}`);
  line(`恐れ入りますが、ご本人確認のため、お手数ですが以下をご返信ください。`);
  line(`・ご購入日 ・ご利用カードの下4桁 ・お支払い金額`);
  line(`確認でき次第、ご指定のアドレスへ改めてお送りいたします。`);
}

/* ---- 再送（--resend・登録メール宛・スパム/一時不達用の最小実装）---- */
async function resend(toEmail, links) {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) { line(`${C.r}SES_FROM_EMAIL 未設定のため再送できません。${C.x}`); return; }
  if (!toEmail) { line(`${C.r}登録メールが取得できず再送できません。${C.x}`); return; }
  if (links.length === 0) { line(`${C.y}発行リンクが無いため再送をスキップしました。${C.x}`); return; }
  const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
  const ses = new SESClient({
    region: process.env.SES_REGION ?? process.env.AWS_REGION ?? "ap-northeast-1",
    ...(process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY
      ? { credentials: { accessKeyId: process.env.SES_ACCESS_KEY_ID, secretAccessKey: process.env.SES_SECRET_ACCESS_KEY } }
      : {}),
  });
  const text = [
    "TENZU をご利用いただきありがとうございます。",
    "先日お送りしたリンクを再送いたします。",
    "",
    ...links,
    "",
    "迷惑メールに振り分けられる場合があります。届かない場合はこのメールにご返信ください。",
    "— 点図形（点描写）プリントの専門店 TENZU",
  ].join("\n");
  await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: "【TENZU】リンクの再送", Charset: "UTF-8" },
      Body: { Text: { Data: text, Charset: "UTF-8" } },
    },
  }));
  line(`${C.g}✓ ${toEmail} へ再送しました。${C.x}`);
}

/* ========================== メイン ========================== */
line(`${C.dim}base=${BASE}${C.x}`);
let onFileEmail = null;       // 登録メール（再送・本人確認の基準）
let makerLink = null;
let productLinks = [];

try {
  if (query.includes("@")) {
    /* メール横断検索 */
    onFileEmail = query;
    line(`検索: ${C.b}${query}${C.x}`);

    const custs = await stripe.customers.list({ email: query, limit: 5 });
    if (custs.data.length === 0) {
      head("■ メーカー（買い切り）");
      line(`${C.dim}  この宛先の Stripe 顧客は見つかりませんでした。${C.x}`);
    } else {
      for (const cust of custs.data) {
        const { owned, rows } = await ownedForCustomer(cust.id);
        line(`${C.dim}  customer=${cust.id} email=${cust.email}${C.x}`);
        const l = printMaker({ email: query, owned, rows });
        if (l) makerLink = l;
      }
    }

    const found = await findProductSessions(query);
    const cards = await Promise.all(found.matches.map((s) => sessionCard(s.id)));
    productLinks = printProducts(found, cards);

  } else if (query.startsWith("cs_")) {
    /* Checkout セッション直指定 */
    const s = await stripe.checkout.sessions.retrieve(query);
    onFileEmail = s.customer_details?.email ?? null;
    const sessMakers = (s.metadata?.makers ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (sessMakers.length > 0) {
      /* メーカー買い切り（payment mode・metadata.makers）→ 顧客の所有を横断再構成 */
      const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
      const email = onFileEmail ?? (customerId ? (await stripe.customers.retrieve(customerId)).email : null);
      onFileEmail = email;
      if (email && customerId) {
        const { owned, rows } = await ownedForCustomer(customerId);
        makerLink = printMaker({ email, owned, rows });
      } else if (email) {
        makerLink = printMaker({ email, owned: sessMakers, rows: [{ id: s.id, makers: sessMakers.join("・"), created: s.created }] });
      }
    } else {
      const paid = s.payment_status === "paid";
      head("■ 商品（単発購入 ¥200）");
      line(`  ${when(s.created)} ・ ${yen(s.amount_total, s.currency)} ・ paid=${paid} ・ ${(await sessionCard(s.id)) || "カード不明"}`);
      line(`  商品: ${s.metadata?.skus || "（skus なし）"}`);
      if (paid) { const l = productDownloadLink(s.id); productLinks.push(l); line(`  ${C.b}再DLリンク:${C.x} ${C.c}${l}${C.x}`); }
      else line(`${C.y}  未入金のため発行しません。${C.x}`);
    }

  } else if (query.startsWith("cus_")) {
    /* 顧客直指定（メーカー買い切り） */
    const cust = await stripe.customers.retrieve(query);
    onFileEmail = cust.deleted ? null : cust.email;
    line(`${C.dim}  customer=${query} email=${onFileEmail}${C.x}`);
    const { owned, rows } = await ownedForCustomer(query);
    if (onFileEmail) makerLink = printMaker({ email: onFileEmail, owned, rows });
    else line(`${C.r}  顧客にメールが無く、復元リンクを発行できません。${C.x}`);

  } else if (query.startsWith("pi_")) {
    /* PaymentIntent 直指定（商品）→ Checkout セッションを逆引き */
    const list = await stripe.checkout.sessions.list({ payment_intent: query, limit: 1 });
    const s = list.data[0];
    if (!s) { line(`${C.y}この PaymentIntent に紐づく Checkout セッションが見つかりません。${C.x}`); }
    else {
      onFileEmail = s.customer_details?.email ?? null;
      head("■ 商品（単発購入 ¥200）");
      const paid = s.payment_status === "paid";
      line(`  ${when(s.created)} ・ ${yen(s.amount_total, s.currency)} ・ paid=${paid} ・ ${(await sessionCard(s.id)) || "カード不明"}`);
      line(`  商品: ${s.metadata?.skus || "（skus なし）"}`);
      if (paid) { const l = productDownloadLink(s.id); productLinks.push(l); line(`  ${C.b}再DLリンク:${C.x} ${C.c}${l}${C.x}`); }
    }

  } else {
    line(`${C.r}認識できない入力です: ${query}${C.x}`);
    line(`メール、または cs_/cus_/pi_ で始まる Stripe ID を渡してください。`);
    process.exit(1);
  }

  if (makerLink || productLinks.length) printTemplates({ email: onFileEmail, makerLink, productLinks });

  if (RESEND) {
    head("■ 再送（--resend）");
    await resend(onFileEmail, [makerLink, ...productLinks].filter(Boolean));
  }

  audit({ query, base: BASE, onFileEmail, issued: { maker: !!makerLink, products: productLinks.length }, resend: RESEND });

  head("⚠ セキュリティ");
  line("  発行リンクは有料アクセスのベアラです。原則「登録メール宛」にのみ手渡してください。");
  line("  別アドレス希望時は 購入日・金額・カード末尾4桁 で本人確認してから送ること。");
  line(`  ${C.dim}発行記録: scripts/recover-audit.log.jsonl${C.x}`);
  line("");
} catch (e) {
  line(`${C.r}エラー: ${e?.message || e}${C.x}`);
  process.exit(1);
}
