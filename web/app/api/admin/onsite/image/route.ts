/* 画像アップロード（管理用）。クライアント縮小済みの webp/jpeg/png を S3 へ置き、
   公開 URL を返す（バケットポリシーで onsite/* のみ公開読み取り）。
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

export async function POST(req: NextRequest) {
  const g = requireAdmin(req);
  if (g) return g;

  const bucket = process.env.ONSITE_IMAGE_BUCKET;
  if (!bucket) {
    return NextResponse.json(
      { error: "ONSITE_IMAGE_BUCKET が未設定です（web/.env.local）" },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* multipart でない */
  }
  if (!file) return NextResponse.json({ error: "file がありません" }, { status: 400 });

  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "webp / jpeg / png のみ対応です" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "500KB 以下にしてください（クライアント縮小に失敗している可能性）" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!magicOk(file.type, buf)) {
    return NextResponse.json({ error: "画像ファイルとして読めません" }, { status: 400 });
  }

  const key = `onsite/${randomUUID()}.${ext}`;
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  const region = awsClientConfig().region;
  return NextResponse.json({ src: `https://${bucket}.s3.${region}.amazonaws.com/${key}` });
}
