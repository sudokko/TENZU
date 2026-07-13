/* 管理ログイン（合言葉方式・decisions.md §5.15）。
   ADMIN_SECRET との照合に成功したら管理 cookie（tenzu_admin・30 日）を発行する。
   - タイミングセーフ比較: 両辺を SHA-256 してから timingSafeEqual（長さ正規化）
   - レート制限インフラは持たない（Lambda のインメモリは多重インスタンスで信頼できない）。
     十分長いランダム合言葉のエントロピーで守り、失敗時は ~400ms 待たせる程度 */
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { adminCookie } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const sha256 = (s: string) => createHash("sha256").update(s).digest();

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_SECRET が未設定です（web/.env.local）" },
      { status: 503 },
    );
  }

  let given = "";
  try {
    const body = (await req.json()) as { secret?: unknown };
    if (typeof body.secret === "string") given = body.secret;
  } catch {
    /* body なし・JSON でない → 空のまま失敗させる */
  }

  const ok = given.length > 0 && timingSafeEqual(sha256(given), sha256(expected));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const c = adminCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
