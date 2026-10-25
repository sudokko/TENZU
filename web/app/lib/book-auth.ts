import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BOOK } from "../book/hajimete/catalog";

// Cookie, signing domain and code hashes are per book, so a second book never opens this one.
export const BOOK_COOKIE = `tenzu_book_${BOOK.slug}`;
export const BOOK_TTL = 60 * 60 * 24 * 30;
const DOMAIN = `tenzu:book:${BOOK.slug}:v1:`;
export const BOOK_CODE_ENV = `BOOK_${BOOK.slug.toUpperCase()}_CODE_SHA256`;
export function normalizeBookCode(code: string) {
  return code.normalize("NFKC").toUpperCase().replace(/[\s\-‐‑‒–—ー−]/g, "");
}
export function hashBookCode(code: string) {
  return createHash("sha256").update(normalizeBookCode(code)).digest("hex");
}
export function bookConfigured() {
  return Boolean(process.env.AUTH_SECRET && codeHashes().length);
}
function codeHashes() {
  return (process.env[BOOK_CODE_ENV] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[a-f0-9]{64}$/.test(s));
}
export function acceptsBookCode(code: unknown) {
  if (typeof code !== "string" || code.length > 100) return false;
  const actual = Buffer.from(hashBookCode(code), "hex");
  return codeHashes().some((hash) => timingSafeEqual(actual, Buffer.from(hash, "hex")));
}
function signature(body: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Book signing configuration is missing");
  return createHmac("sha256", secret).update(DOMAIN + body).digest("base64url");
}
export function signBookSession(now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ book: BOOK.slug, exp: Math.floor(now / 1000) + BOOK_TTL })).toString("base64url");
  return `${body}.${signature(body)}`;
}
export function readBookSession(token?: string, now = Date.now()) {
  if (!token || token.length > 512 || !bookConfigured()) return false;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return false;
  try {
    const expected = Buffer.from(signature(body));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    const seconds = Math.floor(now / 1000);
    return data.book === BOOK.slug && Number.isInteger(data.exp) && data.exp > seconds && data.exp <= seconds + BOOK_TTL;
  } catch { return false; }
}

// 共通コード用の補助制限。インスタンス単位であり、購入証明や分散制限ではない。
const failures = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;
export function bookAttemptKey(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}
export function bookRetryAfter(key: string, now = Date.now()) {
  const hit = failures.get(key);
  if (!hit) return 0;
  if (hit.until <= now) { failures.delete(key); return 0; }
  return hit.count >= 5 ? Math.ceil((hit.until - now) / 1000) : 0;
}
export function recordBookFailure(key: string, now = Date.now()) {
  const previous = failures.get(key);
  if (failures.size >= 2048) {
    for (const [k, v] of failures) if (v.until <= now) failures.delete(k);
    if (failures.size >= 2048) failures.delete(failures.keys().next().value!);
  }
  failures.set(key, previous && previous.until > now ? { ...previous, count: previous.count + 1 } : { count: 1, until: now + WINDOW });
}
export function clearBookFailures(key: string) { failures.delete(key); }
