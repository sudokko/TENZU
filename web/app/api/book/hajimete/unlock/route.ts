import { NextRequest, NextResponse } from "next/server";
import { acceptsBookCode, bookConfigured, BOOK_COOKIE, BOOK_TTL, bookAttemptKey, bookRetryAfter, recordBookFailure, clearBookFailures, signBookSession } from "../../../../lib/book-auth";
import { bookFiles } from "../../../../lib/book-files";
import { BOOK } from "../../../../book/hajimete/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function POST(req: NextRequest) {
  const fail = (error: string, status: number, retry?: number) => NextResponse.json({ error }, { status, headers: { ...headers, ...(retry ? { "Retry-After": String(retry) } : {}) } });
  // SITE_URL first: on Amplify SSR req.nextUrl.origin is an internal host, so it would refuse every reader (as in checkout).
  // Without it (local dev), the Host the browser addressed is the page's own origin.
  const own = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  if (req.headers.get("origin") !== own) return fail("ページを開き直してお試しください。", 403);
  if (!bookConfigured()) return fail("ただいま受取設定を確認しています。時間をおいてお試しいただくか、お問い合わせください。", 503);
  if (Number(req.headers.get("content-length") ?? 0) > 1024) return fail("コードをご確認ください。", 400);
  const key = bookAttemptKey(req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown");
  const retry = bookRetryAfter(key);
  if (retry) return fail("入力が続いたため、15分ほどおいてからお試しください。", 429, retry);
  let body: unknown;
  try { const raw = await req.text(); if (raw.length > 1024) return fail("コードをご確認ください。", 400); body = JSON.parse(raw); }
  catch { return fail("コードをご入力ください。", 400); }
  const code = body && typeof body === "object" && "code" in body ? body.code : undefined;
  if (!acceptsBookCode(code)) {
    recordBookFailure(key);
    return fail(`コードが一致しません。本書${BOOK.codePage}ページの受取コードをもう一度ご確認ください。`, 400);
  }
  const files = await bookFiles();
  if (files.some((f) => !f.ready)) return fail("PDFを準備し直しています。少し時間をおいてお試しください。", 503);
  clearBookFailures(key);
  const res = NextResponse.json({ ok: true }, { headers });
  res.cookies.set(BOOK_COOKIE, signBookSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: BOOK_TTL });
  return res;
}
