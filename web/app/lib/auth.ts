/* =========================================================================
   メーカー所有 entitlement の署名 cookie（DB なし・買い切り＝失効しない）。
   decisions.md §4.7: 買い切りでは「ログイン」を廃止し、cookie が持つのは
   「所有するメーカーの集合」owned: MakerKey[]。
   - 依存追加なし: jose ではなく Node 標準の crypto（HMAC-SHA256）で自前署名。
     これらの Route Handler は Stripe SDK のため Node ランタイム確定なので node:crypto で十分。
   - 単一 exp: 所有は永続のため tier 再検証（旧 texp/24h）は持たない。
     cookie 失効（lexp）時は Stripe 照会ではなくマジックリンクで所有集合を再 mint する。
   - cookie の set/clear は Route Handler 側で NextResponse.cookies に適用する
     （redirect レスポンスへ確実に載せるため、ここでは設定オブジェクトだけ返す）。
   ========================================================================= */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PURCHASABLE_MAKERS, type MakerKey } from "../products/capabilities";

export const SESSION_COOKIE = "tenzu_session";

const LOGIN_TTL = 60 * 60 * 24 * 400; // 400 日（cookie maxAge ＝ 実質永続・所有は失効しない）
const MAGIC_TTL = 60 * 30;            // 30 分（メール内マジックリンク＝別端末復元）

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

// ---- セッショントークン（所有 entitlement・購入で mint＝ログインの代替）----
export type Session = { typ: "s"; owned: MakerKey[]; exp: number };

export function signSession(owned: MakerKey[]): string {
  return pack({ typ: "s", owned, exp: nowSec() + LOGIN_TTL } satisfies Session);
}

// 署名 OK かつ未失効なら返す。
export function readSession(token: string | undefined | null): Session | null {
  const p = unpack<Session>(token);
  if (!p || p.typ !== "s" || !Array.isArray(p.owned) || p.exp < nowSec()) return null;
  return p;
}

// ---- マジックリンク（メール経由の別端末復元・買い替え）----
// 復元は email を載せて送り、verify 側が Stripe の購入履歴から owned を再構成する。
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

function spec(name: string, value: string, maxAge: number): CookieSpec {
  return {
    name,
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

export function sessionCookie(owned: MakerKey[]): CookieSpec {
  return spec(SESSION_COOKIE, signSession(owned), LOGIN_TTL);
}

export function clearedCookie(): CookieSpec {
  return spec(SESSION_COOKIE, "", 0);
}

// ---- Server Component から現在の所有集合を読む（cookie のみ・Stripe 照会なし）----
export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(token);
}

export async function readOwned(): Promise<MakerKey[]> {
  return effectiveOwned((await currentSession())?.owned ?? []);
}

// ---- 管理者 cookie（/admin 配下・合言葉ログイン → 30 日）----
// 所有 entitlement（typ:"s"）とは独立した管理フラグ。ADMIN_SECRET の照合は
// /api/admin/login 側の責務で、ここは署名 cookie の mint/verify だけを持つ。
export const ADMIN_COOKIE = "tenzu_admin";

const ADMIN_TTL = 60 * 60 * 24 * 30; // 30 日

export type Admin = { typ: "a"; exp: number };

export function signAdmin(): string {
  return pack({ typ: "a", exp: nowSec() + ADMIN_TTL } satisfies Admin);
}

export function readAdmin(token: string | undefined | null): Admin | null {
  const p = unpack<Admin>(token);
  if (!p || p.typ !== "a" || p.exp < nowSec()) return null;
  return p;
}

export function adminCookie(): CookieSpec {
  return spec(ADMIN_COOKIE, signAdmin(), ADMIN_TTL);
}

export function clearedAdminCookie(): CookieSpec {
  return spec(ADMIN_COOKIE, "", 0);
}

// Server Component から管理ログイン状態を読む。
export async function currentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return readAdmin(token);
}

// ---- 開発専用: メーカー全解放デバッグ（本番は NODE_ENV ガードで常に無効）----
// web/.env.local に MAKER_DEBUG_OWN_ALL=1 を置くと、ログイン/購入 cookie なしでも
// 全メーカーを所有扱いにする。cookie 発行系（currentSession の生値）は汚さず、
// アプリが UI 表示に使う「実効所有集合」だけに override を効かせる。
function debugOwnAll(): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.MAKER_DEBUG_OWN_ALL === "1";
}

// cookie 由来の owned に開発 override を適用した実効所有集合。
export function effectiveOwned(cookieOwned: MakerKey[]): MakerKey[] {
  return debugOwnAll() ? [...PURCHASABLE_MAKERS] : cookieOwned;
}
