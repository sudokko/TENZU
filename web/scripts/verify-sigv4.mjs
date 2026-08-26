/* app/lib/s3-put.ts の自前 SigV4 が正しいことを、@smithy/signature-v4（AWS 公式実装）
   の署名とバイト単位で突き合わせて確認する。AWS への通信はしない＝資格情報も不要。

   なぜ必要か: @aws-sdk/client-s3 は Amplify の本番へ運ばれず route ごと 500 になるため
   自前署名に置き換えた（acquisition/onsite-messaging.md §9）。署名は間違えても
   「本番で 403」という形でしか気付けないので、ここで固定入力の一致を担保しておく。

   実行: node scripts/verify-sigv4.mjs */
import { createHash, createHmac } from "node:crypto";
import { SignatureV4 } from "@smithy/signature-v4";

/* ---- app/lib/s3-put.ts の signS3Put と同じ手順（TS を読まずに済むよう最小移植） ----
   本体を直す場合はここも同じに直すこと。ズレたらこのスクリプトが落ちる。 */
const ALGORITHM = "AWS4-HMAC-SHA256";
const sha256Hex = (d) => createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => createHmac("sha256", k).update(d, "utf8").digest();

function encodeKey(key) {
  return key
    .split("/")
    .map((seg) =>
      encodeURIComponent(seg).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()),
    )
    .join("/");
}

function signS3Put(p) {
  const host = `${p.bucket}.s3.${p.region}.amazonaws.com`;
  const canonicalUri = "/" + encodeKey(p.key);
  const amzDate = p.now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(p.body);

  const signed = {
    "content-type": p.contentType,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (p.sessionToken) signed["x-amz-security-token"] = p.sessionToken;

  const names = Object.keys(signed).sort();
  const canonicalHeaders = names.map((n) => `${n}:${signed[n].trim()}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${p.region}/s3/aws4_request`;
  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${p.secretAccessKey}`, dateStamp), p.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      ...signed,
      ...(p.cacheControl ? { "cache-control": p.cacheControl } : {}),
      Authorization:
        `${ALGORITHM} Credential=${p.accessKeyId}/${scope},` +
        ` SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

/* ---- 公式実装（@smithy/signature-v4）で同じリクエストを署名する ---- */
class Sha256 {
  constructor(secret) {
    this.h = secret === undefined ? createHash("sha256") : createHmac("sha256", secret);
  }
  update(data) {
    this.h.update(data);
  }
  async digest() {
    return new Uint8Array(this.h.digest());
  }
  reset() {}
}

async function signWithSmithy(p) {
  const host = `${p.bucket}.s3.${p.region}.amazonaws.com`;
  const signer = new SignatureV4({
    service: "s3",
    region: p.region,
    credentials: {
      accessKeyId: p.accessKeyId,
      secretAccessKey: p.secretAccessKey,
      ...(p.sessionToken ? { sessionToken: p.sessionToken } : {}),
    },
    sha256: Sha256,
    // S3 は本文のハッシュを署名に含める（UNSIGNED-PAYLOAD にしない）
    uriEscapePath: false,
    applyChecksum: false,
  });
  const headers = {
    "content-type": p.contentType,
    host,
    "x-amz-content-sha256": sha256Hex(p.body),
  };
  if (p.cacheControl) headers["cache-control"] = p.cacheControl;
  const signed = await signer.sign(
    {
      method: "PUT",
      protocol: "https:",
      hostname: host,
      path: "/" + encodeKey(p.key),
      query: {},
      headers,
      body: p.body,
    },
    { signingDate: p.now },
  );
  return signed.headers;
}

/* ---- ケース ---- */
const CASES = [
  {
    label: "通常の onsite キー（webp・cache-control あり）",
    region: "ap-northeast-1",
    bucket: "tenzu-onsite-assets",
    key: "onsite/3f2b9c1a-7d4e-4a11-9f80-2c6de5b0a913.webp",
    body: Buffer.from("RIFF____WEBPVP8 dummy payload"),
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    now: new Date("2026-08-26T12:55:44.000Z"),
  },
  {
    label: "cache-control なし・png・別リージョン",
    region: "us-east-1",
    bucket: "another-bucket",
    key: "onsite/00000000-0000-4000-8000-000000000000.png",
    body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]),
    contentType: "image/png",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    now: new Date("2026-01-02T03:04:05.000Z"),
  },
  {
    label: "空ボディ（0 バイト）",
    region: "ap-northeast-1",
    bucket: "tenzu-onsite-assets",
    key: "onsite/ffffffff-ffff-4fff-bfff-ffffffffffff.jpg",
    body: Buffer.alloc(0),
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    now: new Date("2026-12-31T23:59:59.000Z"),
  },
];

let failed = 0;
for (const c of CASES) {
  const mine = signS3Put(c).headers.Authorization;
  const theirs = (await signWithSmithy(c)).authorization;
  const ok = mine === theirs;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "NG  "} ${c.label}`);
  if (!ok) {
    console.log("  自前  :", mine);
    console.log("  smithy:", theirs);
  }
}

if (failed > 0) {
  console.error(`\n${failed} 件が不一致。app/lib/s3-put.ts の署名が壊れています。`);
  process.exit(1);
}
console.log(`\n${CASES.length} 件すべて公式実装と一致しました。`);
