/* 管理 API 共通ガード。tenzu_admin cookie（合言葉ログインで発行）が無ければ 401。
   route.ts の各ハンドラ冒頭で `const g = requireAdmin(req); if (g) return g;` する。 */
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, readAdmin } from "../../lib/auth";

export function requireAdmin(req: NextRequest): NextResponse | null {
  const admin = readAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
