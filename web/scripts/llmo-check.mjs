#!/usr/bin/env node
/* =========================================================================
   llmo-check — 構造化データ(JSON-LD/meta/OG)の「入力=frontmatter」検査
   ---------------------------------------------------------------------------
   スコープは構造層フィーダーのみ。本文の 8原則・NG語・alt・見出し階層などの
   「本文品質」は article-reviewer（§H ほか）が担当し、ここでは扱わない。
   ここが見るのは「自動生成される JSON-LD/meta/OG が正しく出るか」だけ。

   SSOT: 構造化データ生成 = web/app/articles/[slug]/page.tsx（Article/BreadcrumbList/
         FAQPage）・generateMetadata。frontmatter キー = content/templates.md §2.5。

   使い方:
     node scripts/llmo-check.mjs                     # 既定パスを全走査
     node scripts/llmo-check.mjs <file.mdx> [...]    # 個別ファイル
     node scripts/llmo-check.mjs --json              # JSON 出力

   終了コード: ERROR が 1 件でもあれば 1、無ければ 0（WARN は 0）。
   ========================================================================= */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const REPO_ROOT = resolve(WEB_ROOT, "..");

const DEFAULT_DIRS = [
  join(WEB_ROOT, "content", "articles"), // 公開
  join(REPO_ROOT, "docs", "drafts", "articles"), // 下書き
];

// JSON-LD(Article)/meta 生成に要る最小 frontmatter
const REQUIRED_FM = ["slug", "title", "description", "article_type", "updated_at"];

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const fileArgs = args.filter((a) => !a.startsWith("--"));

function listTargets() {
  if (fileArgs.length > 0) return fileArgs.map((f) => resolve(f));
  const out = [];
  for (const dir of DEFAULT_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".mdx")) out.push(join(dir, f));
    }
  }
  return out;
}

/** frontmatter ブロックだけ取り出す（本文は見ない）。 */
function readFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  try {
    return yaml.load(m[1]) ?? {};
  } catch (e) {
    return { __parseError: String(e.message || e) };
  }
}

function checkFile(file) {
  const findings = [];
  const add = (level, id, msg) => findings.push({ level, id, msg });

  const fm = readFrontmatter(readFileSync(file, "utf8"));

  if (!fm) {
    add("ERROR", "FM-000", "frontmatter (--- ブロック) が見つからない");
    return { file, findings };
  }
  if (fm.__parseError) {
    add("ERROR", "FM-YAML", `frontmatter YAML パース失敗: ${fm.__parseError}`);
    return { file, findings };
  }

  // 必須キー（Article JSON-LD / meta に直結）
  for (const k of REQUIRED_FM) {
    if (fm[k] === undefined || fm[k] === null || fm[k] === "") {
      add("ERROR", "FM-REQ", `必須 frontmatter 欠落: ${k}`);
    }
  }

  // description 文字数（meta/OG スニペット・JSON-LD description）
  if (typeof fm.description === "string") {
    const len = [...fm.description].length;
    if (len > 120) add("WARN", "META-DESC", `description が長い (${len}字 > 120)。要約を削る`);
    else if (len < 60) add("WARN", "META-DESC", `description が短い (${len}字 < 60)。内容を補う`);
  }

  // slug とファイル名の一致（canonical/URL 整合）
  if (fm.slug && `${fm.slug}.mdx` !== basename(file)) {
    add("WARN", "FM-SLUG", `slug (${fm.slug}) がファイル名 (${basename(file)}) と不一致`);
  }

  // eyecatch 実在（OG 一次画像。無ければ動的 OG にフォールバック）
  if (fm.eyecatch) {
    const rel = String(fm.eyecatch).replace(/^\//, "");
    if (!existsSync(join(WEB_ROOT, "public", rel))) {
      add("WARN", "IMG-EYE", `eyecatch が public に見つからない: ${fm.eyecatch}（未配置なら動的OGにフォールバック）`);
    }
  }

  // faq_schema 形状（FAQPage JSON-LD 用）
  if (fm.faq_schema !== undefined) {
    if (!Array.isArray(fm.faq_schema) || fm.faq_schema.length === 0) {
      add("ERROR", "FAQ-SHAPE", "faq_schema は非空配列であること");
    } else {
      fm.faq_schema.forEach((item, i) => {
        if (!item || typeof item.q !== "string" || typeof item.a !== "string") {
          add("ERROR", "FAQ-SHAPE", `faq_schema[${i}] は {q, a} 文字列ペアであること`);
        }
      });
    }
  }
  if (fm.article_type === "faq" && fm.faq_schema === undefined) {
    add("WARN", "FAQ-MISSING", "article_type=faq だが faq_schema が無い（FAQPage 構造化データが出ない）");
  }

  return { file, findings };
}

// --- 実行 ---
const targets = listTargets();
const results = targets.map(checkFile);

const totals = { ERROR: 0, WARN: 0 };
for (const r of results) for (const f of r.findings) totals[f.level]++;

if (asJson) {
  console.log(JSON.stringify({ totals, results }, null, 2));
} else {
  const rel = (p) => p.replace(REPO_ROOT + "\\", "").replace(REPO_ROOT + "/", "").replace(/\\/g, "/");
  if (targets.length === 0) console.log("対象 .mdx が見つからない");
  for (const r of results) {
    const errs = r.findings.filter((f) => f.level === "ERROR");
    const warns = r.findings.filter((f) => f.level === "WARN");
    const mark = errs.length ? "❌" : warns.length ? "⚠️ " : "✅";
    console.log(`\n${mark} ${rel(r.file)}  (ERROR ${errs.length} / WARN ${warns.length})`);
    for (const f of r.findings) {
      const icon = f.level === "ERROR" ? "  ✗" : "  ·";
      console.log(`${icon} [${f.id}] ${f.msg}`);
    }
  }
  console.log(`\n── 合計: ERROR ${totals.ERROR} / WARN ${totals.WARN}（${targets.length} ファイル・構造層フィーダー検査のみ）`);
}

process.exit(totals.ERROR > 0 ? 1 : 0);
