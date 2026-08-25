/* 画像アップロード（管理用）。クライアント縮小済みの webp/jpeg/png を S3 へ置き、
   公開 URL を返す（バケットポリシーで onsite/* のみ公開読み取り）。
   - Amplify compute で multipart が 500 になる経路を避けるため、管理画面は
     application/json（base64）で送る。旧 multipart も後方互換として受ける
   - 500KB 上限（Amplify SSR のリクエストボディ上限 ~1MB の内側。超えるようなら
     presigned URL 方式への切替を検討）
   - MIME allowlist ＋ マジックバイト検査
   - キーは onsite/{uuid}.{ext}（immutable・上書きなし・旧画像は放置でよい） */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAdmin } from "../../guard";
import { awsClientConfig } from "../../../../lib/aws";

export const dynamic = "force-dynamic";

const MAX_BYTES = 500 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_BYTES / 3) * 4;

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

let cachedS3: S3Client | null = null;
function s3(): S3Client {
  if (!cachedS3) cachedS3 = new S3Client(awsClientConfig());
  return cachedS3;
}

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

function s3ErrorMessage(e: unknown): { message: string; code: string } {
  const err = e as { name?: string; Code?: string; code?: string };
  const name = err.name ?? err.Code ?? err.code ?? "";
  if (name === "AccessDenied" || name === "Forbidden") {
    return {
      message: "S3への書き込み権限がありません。IAMの s3:PutObject を確認してください",
      code: "S3_ACCESS_DENIED",
    };
  }
  if (name === "NoSuchBucket") {
    return {
      message: "画像保存先のS3バケットが見つかりません。ONSITE_IMAGE_BUCKETを確認してください",
      code: "S3_BUCKET_NOT_FOUND",
    };
  }
  if (
    name === "CredentialsProviderError" ||
    name === "InvalidAccessKeyId" ||
    name === "SignatureDoesNotMatch" ||
    name === "UnrecognizedClientException"
  ) {
    return {
      message: "S3の認証に失敗しました。APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEYを確認してください",
      code: "S3_CREDENTIALS_ERROR",
    };
  }
  return {
    message: "S3への画像保存に失敗しました。時間を置いて再度お試しください",
    code: "S3_UPLOAD_FAILED",
  };
}

export async function POST(req: NextRequest) {
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
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (e) {
    const detail = s3ErrorMessage(e);
    console.error("[onsite-image] S3 PutObject failed", {
      errorName: (e as { name?: string }).name ?? "UnknownError",
      region: config.region,
      code: detail.code,
    });
    return jsonError(detail.message, 503, detail.code);
  }

  return NextResponse.json({ src: `https://${bucket}.s3.${config.region}.amazonaws.com/${key}` });
}
