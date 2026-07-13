/* 管理ログアウト（tenzu_admin cookie を失効させるだけ） */
import { NextResponse } from "next/server";
import { clearedAdminCookie } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const c = clearedAdminCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
