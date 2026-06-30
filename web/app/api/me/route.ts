/* 現在の所有メーカー集合を返す（AuthContext がマウント時に取得）。
   買い切りは失効しないため Stripe 再照会は持たず、署名 cookie をそのまま読むだけ。
   - cookie が無い/失効 → owned: []。
   - 失効（lexp・実質 400 日）時はマジックリンク（/login）で再 mint する。 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, readSession, effectiveOwned } from "../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sess = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ owned: effectiveOwned(sess?.owned ?? []) });
}
