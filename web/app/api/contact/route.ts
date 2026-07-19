/* 問い合わせフォーム（/contact）の受け口。
   - body: { company?, name?, email?, phone?, message?, website? }
   - 全項目任意だが「全部空」は 400。website はハニーポット（人間には見えない
     フィールド。埋まっていたら bot とみなし、保存せず ok を返して静かに捨てる。
     rate-limit 基盤を持たないため（api/admin/login/route.ts 参照）これが第一防壁）。
   - DynamoDB 保存（contact-store）→ SES 通知（sendContactMail）。
     片方の失敗は握りつぶし、両方失敗したときだけ 500 を返す。 */
import { NextRequest } from "next/server";
import { putContact, type ContactInput } from "../../lib/contact-store";
import { sendContactMail } from "../../lib/email";

export const dynamic = "force-dynamic";

const LIMITS: Record<keyof ContactInput, number> = {
  company: 200,
  name: 200,
  email: 320,
  phone: 50,
  message: 4000,
};

function field(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  // ハニーポット: bot には成功と見せて捨てる
  if (typeof body.website === "string" && body.website.trim()) {
    return Response.json({ ok: true });
  }

  const input: ContactInput = {
    company: field(body.company, LIMITS.company),
    name: field(body.name, LIMITS.name),
    email: field(body.email, LIMITS.email),
    phone: field(body.phone, LIMITS.phone),
    message: field(body.message, LIMITS.message),
  };
  if (!input.company && !input.name && !input.email && !input.phone && !input.message) {
    return Response.json({ error: "いずれかの項目をご入力ください" }, { status: 400 });
  }

  let saved = false;
  try {
    saved = (await putContact(input)) !== false;
  } catch (e) {
    console.error("[contact] save failed:", e);
  }

  let mailed = false;
  try {
    await sendContactMail(input);
    mailed = true;
  } catch (e) {
    // SES サンドボックス中は宛先未検証で失敗しうる。保存が生きていれば ok 扱い
    console.error("[contact] notify failed:", e);
  }

  if (!saved && !mailed) {
    return Response.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください" },
      { status: 500 },
    );
  }
  return Response.json({ ok: true });
}
