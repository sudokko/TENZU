/* =========================================================================
   会員 entitlement の署名 cookie（DB なし・Stripe 単一ソース）。
   プラン §2: cookie に customer_id + tier + exp を持ち、期限切れ時のみ Stripe へ再照会。
   - 依存追加なし: jose ではなく Node 標準の crypto（HMAC-SHA256）で自前署名。
     これらの Route Handler は Stripe SDK のため Node ランタイム確定なので node:crypto で十分。
   - 二層式 exp: ログイン(lexp)=30 日スライディング / tier 再検証(texp)=24h。
     → 「永続ログイン」と「解約の早期反映（最大 24h）」を両立。
   - cookie の set/clear は Route Handler 側で NextResponse.cookies に適用する
     （redirect レスポンスへ確実に載せるため、ここでは設定オブジェクトだけ返す）。
   ========================================================================= */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Tier } from "../products/capabilities";

export const SESSION_COOKIE = "tenzu_session";

const LOGIN_TTL = 60 * 60 * 24 * 30; // 30 日（cookie maxAge ＝ lexp）
const TIER_TTL = 60 * 60 * 24;       // 24 時間（tier 再検証 ＝ texp）
const MAGIC_TTL = 60 * 30;           // 30 分（メール内マジックリンク）

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET が未設定です（web/.env.local）");
  return s;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function pack(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function unpack<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null; // AUTH_SECRET 未設定
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

// ---- セッショントークン（会員ログイン）----
export type Session = { typ: "s"; sub: string; tier: Tier; texp: number; lexp: number };

export function signSession(sub: string, tier: Tier): string {
  const t = nowSec();
  return pack({ typ: "s", sub, tier, texp: t + TIER_TTL, lexp: t + LOGIN_TTL } satisfies Session);
}

// 署名 OK かつログイン未失効なら返す（texp は過ぎていても返す＝呼び出し側が再検証する）。
export function readSession(token: string | undefined | null): Session | null {
  const p = unpack<Session>(token);
  if (!p || p.typ !== "s" || p.lexp < nowSec()) return null;
  return p;
}

export function tierExpired(s: Session): boolean {
  return s.texp < nowSec();
}

// ---- マジックリンク（メール経由の再ログイン・別端末）----
export type Magic = { typ: "m"; email: string; exp: number };

export function signMagic(email: string): string {
  return pack({ typ: "m", email, exp: nowSec() + MAGIC_TTL } satisfies Magic);
}

export function readMagic(token: string | undefined | null): Magic | null {
  const p = unpack<Magic>(token);
  if (!p || p.typ !== "m" || p.exp < nowSec()) return null;
  return p;
}

// ---- cookie 設定オブジェクト（Route Handler が NextResponse.cookies.set に渡す）----
type CookieSpec = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
};

function spec(value: string, maxAge: number): CookieSpec {
  return {
    name: SESSION_COOKIE,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    },
  };
}

export function sessionCookie(sub: string, tier: Tier): CookieSpec {
  return spec(signSession(sub, tier), LOGIN_TTL);
}

export function clearedCookie(): CookieSpec {
  return spec("", 0);
}

// ---- Server Component から現在の tier を読む（楽観的・Stripe 再照会はしない）----
export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(token);
}

export async function readTier(): Promise<Tier> {
  return (await currentSession())?.tier ?? "guest";
}
