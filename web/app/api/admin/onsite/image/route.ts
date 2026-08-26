/* 画像アップロード（管理用）。クライアント縮小済みの webp/jpeg/png を S3 へ置き、
   公開 URL を返す（バケットポリシーで onsite/* のみ公開読み取り）。
   - S3 への PUT は app/lib/s3-put.ts（自前 SigV4）。@aws-sdk/client-s3 は Next の既定
     serverExternalPackages に入っていて Amplify の本番へ運ばれず、import しただけで
     このルートが丸ごと 500 になっていた（理由の詳細は s3-put.ts の冒頭）
   - 管理画面は application/json（base64）で送る。旧 multipart も後方互換として受ける
   - 500KB 上限（Amplify SSR のリクエストボディ上限 ~1MB の内側。超えるようなら
     presigned URL 方式への切替を検討）
   - MIME allowlist ＋ マジックバイト検査
   - キーは onsite/{uuid}.{ext}（immutable・上書きなし・旧画像は放置でよい） */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../../guard";
import { awsClientConfig } from "../../../../lib/aws";
import { s3PutObject, S3PutError } from "../../../../lib/s3-put";

export const dynamic = "force-dynamic";

const MAX_BYTES = 500 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_BYTES / 3) * 4;

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

function magicOk(mime: string, buf: Buffer): boolean {
  if (mime === "image/png") {
    return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === "image/jpeg") {
    return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === "image/webp") {
    return (
      buf.length > 12 &&
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

type UploadBody = { mime?: unknown; data?: unknown };

function jsonError(error: string, status: number, code: string) {
  return NextResponse.json({ error, code }, { status });
}

function validBase64(value: string): boolean {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

async function readImage(req: NextRequest): Promise<
  | { mime: string; buf: Buffer }
  | { response: NextResponse }
> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: UploadBody;
    try {
      body = (await req.json()) as UploadBody;
    } catch {
      return { response: jsonError("画像データをJSONとして読めません", 400, "INVALID_JSON") };
    }
    if (typeof body.mime !== "string" || typeof body.data !== "string") {
      return { response: jsonError("画像データがありません", 400, "MISSING_IMAGE") };
    }
    if (!EXT[body.mime]) {
      return { response: jsonError("webp / jpeg / png のみ対応です", 400, "UNSUPPORTED_TYPE") };
    }
    if (body.data.length > MAX_BASE64_CHARS || !validBase64(body.data)) {
      return { response: jsonError("画像データが大きすぎるか、壊れています", 400, "INVALID_BASE64") };
    }
    return { mime: body.mime, buf: Buffer.from(body.data, "base64") };
  }

  // 旧管理画面との後方互換。新しい画面は上の JSON 経路だけを使う。
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { response: jsonError("file がありません", 400, "MISSING_IMAGE") };
    }
    if (!EXT[file.type]) {
      return { response: jsonError("webp / jpeg / png のみ対応です", 400, "UNSUPPORTED_TYPE") };
    }
    if (file.size > MAX_BYTES) {
      return { response: jsonError("500KB 以下にしてください", 400, "IMAGE_TOO_LARGE") };
    }
    return { mime: file.type, buf: Buffer.from(await file.arrayBuffer()) };
  } catch {
    return { response: jsonError("画像データを読めません", 400, "INVALID_MULTIPART") };
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleUpload(req);
  } catch (e) {
    // ここに来る＝想定外の例外。素の 500（HTML）だと管理画面に手掛かりが残らないため、
    // 必ず JSON にしてログへ名前を残す（acquisition/onsite-messaging.md §9）。
    console.error("[onsite-image] unexpected failure", {
      errorName: (e as { name?: string }).name ?? "UnknownError",
      message: (e as Error).message,
    });
    return jsonError(
      "画像アップロードが想定外のエラーで止まりました。Amplify のログで [onsite-image] を確認してください",
      500,
      "UNEXPECTED",
    );
  }
}

async function handleUpload(req: NextRequest) {
  const g = requireAdmin(req);
  if (g) return g;

  const bucket = process.env.ONSITE_IMAGE_BUCKET;
  if (!bucket) {
    return jsonError(
      "画像保存先が設定されていません。ONSITE_IMAGE_BUCKETを確認してください",
      503,
      "S3_BUCKET_NOT_CONFIGURED",
    );
  }

  const image = await readImage(req);
  if ("response" in image) return image.response;
  const { mime, buf } = image;
  if (buf.length > MAX_BYTES) {
    return jsonError(
      "500KB 以下にしてください（クライアント縮小に失敗している可能性）",
      400,
      "IMAGE_TOO_LARGE",
    );
  }
  if (!magicOk(mime, buf)) {
    return jsonError("画像ファイルとして読めません", 400, "INVALID_IMAGE");
  }

  const ext = EXT[mime];
  const key = `onsite/${randomUUID()}.${ext}`;
  const config = awsClientConfig();
  if (!config.credentials) {
    // SDK を使わないため既定の認証チェーンへは落ちられない（s3-put.ts 冒頭）
    return jsonError(
      "S3の認証情報が未設定です。APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEYを確認してください",
      503,
      "S3_CREDENTIALS_MISSING",
    );
  }

  try {
    const src = await s3PutObject({
      region: config.region,
      bucket,
      key,
      body: buf,
      contentType: mime,
      cacheControl: "public, max-age=31536000, immutable",
      accessKeyId: config.credentials.accessKeyId,
      secretAccessKey: config.credentials.secretAccessKey,
    });
    return NextResponse.json({ src });
  } catch (e) {
    const err = e instanceof S3PutError ? e : null;
    console.error("[onsite-image] S3 PUT failed", {
      code: err?.code ?? "UNKNOWN",
      status: err?.status,
      region: config.region,
      bucket,
    });
    return jsonError(
      err?.message ?? "S3への画像保存に失敗しました。時間を置いて再度お試しください",
      503,
      err?.code ?? "S3_UPLOAD_FAILED",
    );
  }
}
