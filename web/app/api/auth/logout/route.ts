/* ログアウト = セッション cookie の失効。AuthContext から POST で呼ぶ。 */
import { NextResponse } from "next/server";
import { clearedCookie } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const c = clearedCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
