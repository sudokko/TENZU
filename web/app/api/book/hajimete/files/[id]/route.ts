import { NextRequest } from "next/server";
import { BOOK_COOKIE, readBookSession } from "../../../../../lib/book-auth";
import { readBookFile } from "../../../../../lib/book-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff" };
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!readBookSession(req.cookies.get(BOOK_COOKIE)?.value)) return Response.json({ error: "受取コードを入力し直してください。" }, { status: 401, headers });
  const { id } = await ctx.params;
  try {
    const file = await readBookFile(id);
    if (!file) return Response.json({ error: "ファイルが見つかりません。" }, { status: 404, headers });
    return new Response(new Uint8Array(file.data), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file.filename}"`, "Content-Length": String(file.data.length) } });
  } catch {
    return Response.json({ error: "PDFを取得できませんでした。時間をおいて再度お試しください。" }, { status: 503, headers });
  }
}
