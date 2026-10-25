import { NextRequest } from "next/server";
import { BOOK_COOKIE, readBookSession } from "../../../../../lib/book-auth";
import { bookPrintVolume } from "../../../../../lib/book-print";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };

export async function GET(req: NextRequest, ctx: { params: Promise<{ sku: string }> }) {
  if (!readBookSession(req.cookies.get(BOOK_COOKIE)?.value)) return Response.json({ error: "受取コードを入力し直してください。" }, { status: 401, headers });
  const { sku } = await ctx.params;
  try {
    const volume = bookPrintVolume(sku);
    if (!volume) return Response.json({ error: "この本に収録されていない問題です。" }, { status: 404, headers });
    return Response.json(volume, { headers });
  } catch {
    return Response.json({ error: "問題を読み込めませんでした。時間をおいて再度お試しください。" }, { status: 503, headers });
  }
}
