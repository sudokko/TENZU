/* S3 へ 1 オブジェクトを PUT するだけの最小実装（SigV4 を node:crypto で自前に組む）。

   なぜ @aws-sdk/client-s3 を使わないか:
   Next.js は `@aws-sdk/client-s3` を既定の serverExternalPackages に含めており
   （node_modules/next/dist/lib/server-external-packages.jsonc）、バンドルせず生の
   node_modules 参照として残す。Amplify は amplify.yml の artifacts=.next しか本番へ
   運ばないため、import した route はランタイムで解決できず、認証チェックに入る前に
   モジュール読み込みごと落ちて 500 になる（client-ses / client-dynamodb は既定リストに
   入っていないのでバンドルされ、同じ構成でも動く）。transpilePackages では戻せない。
   詳細は acquisition/onsite-messaging.md §9。

   認証情報は APP_AWS_* の明示指定のみを受ける。SDK を外した以上、既定の認証チェーン
   （コンピュートロール等）へのフォールバックは持てないため、未設定なら明示的に失敗する。

   実装の正しさは scripts/verify-sigv4.mjs で @smithy/signature-v4 の署名と
   バイト一致することを確認している（AWS への通信なしで検証できる）。 */
import { createHash, createHmac } from "node:crypto";

const ALGORITHM = "AWS4-HMAC-SHA256";
const SERVICE = "s3";

export class S3PutError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = "S3PutError";
  }
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/* RFC3986。S3 のキーはスラッシュを区切りとして残し、各セグメントだけを encode する */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((seg) =>
      encodeURIComponent(seg).replace(
        /[!'()*]/g,
        (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
      ),
    )
    .join("/");
}

/* 20260826T125544Z / 20260826 の 2 形式 */
function amzDates(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export type S3PutParams = {
  region: string;
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  /** 署名の検証用。省略時は現在時刻 */
  now?: Date;
};

/* 署名済みの PUT リクエスト（URL・ヘッダ）を組み立てる。送信はしない＝検証しやすい形。 */
export function signS3Put(p: S3PutParams): { url: string; headers: Record<string, string> } {
  const host = `${p.bucket}.s3.${p.region}.amazonaws.com`;
  const canonicalUri = "/" + encodeKey(p.key);
  const { amzDate, dateStamp } = amzDates(p.now ?? new Date());
  const payloadHash = sha256Hex(p.body);

  // 署名対象ヘッダ（小文字・名前順）。fetch が足す accept 等は署名しない＝S3 は無視する。
  // cache-control は AWS 公式実装が署名対象から外している（プロキシが書き換えうる
  // ヘッダのため）。送りはするが署名には含めない — scripts/verify-sigv4.mjs で一致確認済み。
  const signed: Record<string, string> = {
    "content-type": p.contentType,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (p.sessionToken) signed["x-amz-security-token"] = p.sessionToken;

  const names = Object.keys(signed).sort();
  const canonicalHeaders = names.map((n) => `${n}:${signed[n].trim()}\n`).join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "", // クエリ文字列なし
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${p.region}/${SERVICE}/aws4_request`;
  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${p.secretAccessKey}`, dateStamp), p.region), SERVICE),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      ...signed,
      ...(p.cacheControl ? { "cache-control": p.cacheControl } : {}), // 署名対象外
      Authorization:
        `${ALGORITHM} Credential=${p.accessKeyId}/${scope},` +
        ` SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

/* 署名して PUT する。成功なら公開 URL を返す。 */
export async function s3PutObject(p: S3PutParams): Promise<string> {
  const { url, headers } = signS3Put(p);
  // host は fetch が自分で付ける（明示すると環境によっては拒否される）
  const { host: _host, ...sendHeaders } = headers;

  let res: Response;
  try {
    res = await fetch(url, { method: "PUT", headers: sendHeaders, body: new Uint8Array(p.body) });
  } catch (e) {
    throw new S3PutError(
      `S3 へ接続できませんでした: ${(e as Error).message}`,
      "S3_NETWORK_ERROR",
    );
  }

  if (!res.ok) {
    // S3 のエラーは XML。<Code>…</Code> だけ拾って分類する
    const text = await res.text().catch(() => "");
    const code = /<Code>([^<]+)<\/Code>/.exec(text)?.[1] ?? `HTTP_${res.status}`;
    throw new S3PutError(s3ErrorMessage(code, res.status), code, res.status);
  }
  return url;
}

function s3ErrorMessage(code: string, status: number): string {
  if (code === "AccessDenied") {
    return "S3への書き込み権限がありません。IAMの s3:PutObject を確認してください";
  }
  if (code === "NoSuchBucket") {
    return "画像保存先のS3バケットが見つかりません。ONSITE_IMAGE_BUCKETを確認してください";
  }
  if (code === "InvalidAccessKeyId" || code === "SignatureDoesNotMatch") {
    return "S3の認証に失敗しました。APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEYを確認してください";
  }
  if (code === "PermanentRedirect" || code === "AuthorizationHeaderMalformed") {
    return "S3バケットのリージョンが違います。APP_AWS_REGION を確認してください";
  }
  return `S3への画像保存に失敗しました（${code} / HTTP ${status}）`;
}
