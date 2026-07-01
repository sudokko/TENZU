#!/usr/bin/env node
/* =========================================================================
   img-optimize — 記事画像の寸法/サイズ/形式 決定的検査（/article-image の機械パート）
   ---------------------------------------------------------------------------
   画像「生成」はしない（アイキャッチは本人が Gemini で手動生成）。本スクリプトは
   配置済み画像の寸法・容量・形式を検証するだけ（依存ゼロ・PNG/JPEG ヘッダを直読み）。
   実リサイズ/圧縮が必要なら sharp 等の導入を別途検討（現状は検証のみ）。

   SSOT: OG=1200×630（design/visual-identity・Phase 2 opengraph-image と一致）,
         alt 規約=revision-craft §3.5。

   使い方:
     node scripts/img-optimize.mjs                          # 既定: public/assets/articles を走査
     node scripts/img-optimize.mjs <img|dir> [...]          # 個別
     node scripts/img-optimize.mjs --og <img>               # OG 用に 1200×630 厳密判定
     node scripts/img-optimize.mjs --json

   終了コード: ERROR が 1 件でもあれば 1。
   ========================================================================= */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const REPO_ROOT = resolve(WEB_ROOT, "..");
const DEFAULT_DIR = join(WEB_ROOT, "public", "assets", "articles");

const OG_W = 1200;
const OG_H = 630;
const MAX_OG_BYTES = 8 * 1024 * 1024; // Facebook OG 上限
const WARN_BYTES = 1 * 1024 * 1024; // 1MB 超は配信重い

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const ogMode = args.includes("--og");
const inputs = args.filter((a) => !a.startsWith("--"));

/** PNG/JPEG のバイト列から寸法を取得（未対応形式は null）。 */
function readDimensions(buf) {
  // PNG: \x89PNG\r\n\x1a\n ... IHDR(width,height) が 16..24 バイト目
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: 0xFFD8 で始まり、SOF0-SOF3/SOF5-SOF7/SOF9-SOF11/SOF13-15 マーカーに寸法
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      // SOF マーカー群（DHT/DQT 等を除く）
      const isSOF =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isSOF) {
        return { format: "jpeg", height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      off += 2 + len;
    }
    return { format: "jpeg", width: null, height: null };
  }
  return null;
}

function collectFiles(input) {
  const abs = resolve(input);
  if (!existsSync(abs)) return [{ missing: abs }];
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs)
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .map((f) => ({ path: join(abs, f) }));
  }
  return [{ path: abs }];
}

function checkImage(file) {
  const findings = [];
  const add = (level, id, msg) => findings.push({ level, id, msg });

  const buf = readFileSync(file);
  const bytes = buf.length;
  const ext = extname(file).toLowerCase();

  if (![".png", ".jpg", ".jpeg"].includes(ext)) {
    add("WARN", "FMT", `対象外の拡張子: ${ext}（png/jpg のみ検証）`);
    return { file, bytes, dim: null, findings };
  }

  const dim = readDimensions(buf);
  if (!dim || dim.width == null) {
    add("ERROR", "DIM", "寸法を読めなかった（破損 or 未対応形式）");
    return { file, bytes, dim, findings };
  }

  // OG 判定: --og 指定、または既定ディレクトリ直下（<slug>.png = OG フォールバック規約）
  const looksOg = ogMode || /^[a-z0-9-]+\.(png|jpe?g)$/i.test(basename(file));
  if (looksOg) {
    if (dim.width !== OG_W || dim.height !== OG_H) {
      add("ERROR", "OG-DIM", `OG 寸法不一致: ${dim.width}×${dim.height}（要 ${OG_W}×${OG_H}）`);
    }
    if (bytes > MAX_OG_BYTES) add("ERROR", "OG-SIZE", `OG 上限超過: ${(bytes / 1048576).toFixed(2)}MB > 8MB`);
  }

  if (bytes > WARN_BYTES) {
    add("WARN", "SIZE", `${(bytes / 1048576).toFixed(2)}MB > 1MB。圧縮を検討（配信速度）`);
  }

  return { file, bytes, dim, findings };
}

// --- 実行 ---
// 既定ディレクトリが未作成（＝まだ記事画像を置いていない）のは正常。エラーにしない。
if (inputs.length === 0 && !existsSync(DEFAULT_DIR)) {
  console.log(`対象なし: ${DEFAULT_DIR} は未作成（記事画像を置くと検査対象になる）`);
  process.exit(0);
}
const targets = (inputs.length ? inputs : [DEFAULT_DIR]).flatMap(collectFiles);

const results = [];
const totals = { ERROR: 0, WARN: 0 };
for (const t of targets) {
  if (t.missing) {
    results.push({ file: t.missing, findings: [{ level: "ERROR", id: "NOENT", msg: "パスが存在しない" }] });
    totals.ERROR++;
    continue;
  }
  const r = checkImage(t.path);
  results.push(r);
  for (const f of r.findings) totals[f.level]++;
}

if (asJson) {
  console.log(JSON.stringify({ totals, results }, null, 2));
} else {
  const rel = (p) => p.replace(REPO_ROOT + "\\", "").replace(REPO_ROOT + "/", "").replace(/\\/g, "/");
  if (targets.length === 0) console.log("対象画像が見つからない");
  for (const r of results) {
    const errs = r.findings.filter((f) => f.level === "ERROR").length;
    const warns = r.findings.filter((f) => f.level === "WARN").length;
    const mark = errs ? "❌" : warns ? "⚠️ " : "✅";
    const meta = r.dim ? ` ${r.dim.width}×${r.dim.height} ${r.dim.format}` : "";
    const kb = r.bytes ? ` ${(r.bytes / 1024).toFixed(0)}KB` : "";
    console.log(`\n${mark} ${rel(r.file)}${meta}${kb}`);
    for (const f of r.findings) {
      console.log(`${f.level === "ERROR" ? "  ✗" : "  ·"} [${f.id}] ${f.msg}`);
    }
  }
  console.log(`\n── 合計: ERROR ${totals.ERROR} / WARN ${totals.WARN}（${targets.length} 画像）`);
}

process.exit(totals.ERROR > 0 ? 1 : 0);
