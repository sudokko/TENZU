#!/usr/bin/env node
/* =========================================================================
   llmo-check — 記事 MDX の LLMO / メタ / 構造 決定的検査（/llmo の機械パート）
   ---------------------------------------------------------------------------
   判定できるものだけを機械判定する（トーン・自然さの判断は /llmo スキル側）。
   SSOT: content/templates.md §2(frontmatter)/§7.4(LLMO 8原則)/§7.1(NG語),
         content/revision-craft.md §3.5(meta/alt)。

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

// 必須 frontmatter（JSON-LD / meta 生成に要る最小集合）
const REQUIRED_FM = ["slug", "title", "description", "article_type", "updated_at"];

// §7.1 医療メタファー等の Anti-Brand 語（決定的に落とせるものだけ）
const NG_WORDS = [
  "処方箋", "特効薬", "弱点診断", "健康診断", "ピンポイント治療",
  "劇的に", "手遅れ", "特訓", "修行", "最強", "天才",
];

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

/** frontmatter ブロックと本文を分離。 */
function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: raw };
  let fm = null;
  try {
    fm = yaml.load(m[1]) ?? {};
  } catch (e) {
    fm = { __parseError: String(e.message || e) };
  }
  return { fm, body: m[2] };
}

/** 本文を H2 セクションに分割（[{heading, text}]）。冒頭(見出し前)は heading=null。 */
function splitByH2(body) {
  const lines = body.split(/\r?\n/);
  const sections = [];
  let cur = { heading: null, lines: [] };
  for (const line of lines) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      sections.push(cur);
      cur = { heading: line.replace(/^##\s+/, "").trim(), lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  sections.push(cur);
  return sections.map((s) => ({ heading: s.heading, text: s.lines.join("\n") }));
}

function checkFile(file) {
  const findings = [];
  const add = (level, id, msg) => findings.push({ level, id, msg });

  const raw = readFileSync(file, "utf8");
  const { fm, body } = splitFrontmatter(raw);

  // --- frontmatter ---
  if (!fm) {
    add("ERROR", "FM-000", "frontmatter (--- ブロック) が見つからない");
    return { file, findings };
  }
  if (fm.__parseError) {
    add("ERROR", "FM-YAML", `frontmatter YAML パース失敗: ${fm.__parseError}`);
    return { file, findings };
  }
  for (const k of REQUIRED_FM) {
    if (fm[k] === undefined || fm[k] === null || fm[k] === "") {
      add("ERROR", "FM-REQ", `必須 frontmatter 欠落: ${k}`);
    }
  }

  // description 文字数（templates §2: 80-120 / revision-craft: 120以内）
  if (typeof fm.description === "string") {
    const len = [...fm.description].length;
    if (len > 120) add("WARN", "META-DESC", `description が長い (${len}字 > 120)。要約を削る`);
    else if (len < 60) add("WARN", "META-DESC", `description が短い (${len}字 < 60)。内容を補う`);
  }

  // slug とファイル名の一致
  if (fm.slug && `${fm.slug}.mdx` !== basename(file)) {
    add("WARN", "FM-SLUG", `slug (${fm.slug}) がファイル名 (${basename(file)}) と不一致`);
  }

  const isFaq = fm.article_type === "faq";

  // --- 見出し構造（LLMO 原則4）---
  // 本文の H1 は禁止（タイトルは frontmatter 由来でページ側が描画）
  const h1 = (body.match(/^#\s+/gm) || []).length;
  if (h1 > 0) add("ERROR", "LLMO-H1", `本文に H1 (# ) が ${h1} 個。タイトルは frontmatter・本文は H2 起点`);

  const h2list = (body.match(/^##\s+.+$/gm) || []).map((s) => s.replace(/^##\s+/, ""));
  if (!isFaq) {
    if (h2list.length < 4) add("WARN", "LLMO-H2", `H2 が ${h2list.length} 個 (<4)。LLMO 原則4は 4-6 個`);
    if (h2list.length > 6) add("WARN", "LLMO-H2", `H2 が ${h2list.length} 個 (>6)。分割/統合を検討`);
  }

  // --- 結論先出し（LLMO 原則1）---
  const hasTldr = /<TLDR[\s>]/.test(body) || h2list.some((h) => h.includes("結論"));
  if (!isFaq && !hasTldr) {
    add("WARN", "LLMO-TLDR", "結論先出しが無い（<TLDR> か『## 結論』を先頭付近に）");
  }

  // --- 箇条書き/表（LLMO 原則2）: 各 H2 に最低1つ ---
  for (const sec of splitByH2(body)) {
    if (!sec.heading) continue;
    const hasList = /^\s*[-*]\s+/m.test(sec.text) || /^\s*\d+\.\s+/m.test(sec.text);
    const hasTable = /^\s*\|.+\|\s*$/m.test(sec.text);
    if (!hasList && !hasTable) {
      add("WARN", "LLMO-LIST", `H2「${sec.heading}」に箇条書き/表が無い（LLMO 原則2）`);
    }
  }

  // --- 出典（LLMO 原則7）: <sup>[N]</sup> と References/参考文献・references の整合 ---
  const sups = body.match(/<sup>\s*\[\d+\]\s*<\/sup>/g) || [];
  if (sups.length > 0) {
    const hasRefSection =
      /<References[\s/>]/.test(body) || /^##\s+(参考文献|References)/m.test(body);
    const hasRefFm = Array.isArray(fm.references) && fm.references.length > 0;
    if (!hasRefSection && !hasRefFm) {
      add(
        "ERROR",
        "LLMO-REF",
        `引用 <sup>[N]</sup> が ${sups.length} 箇所あるが References セクションも frontmatter references も無い`,
      );
    }
  }

  // --- 画像 alt（revision-craft §3.5）---
  // markdown 画像 ![alt](src) の alt 空を検出
  for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    if (!m[1].trim()) add("WARN", "IMG-ALT", `画像 alt が空: ${m[2]}`);
  }
  // <img ...> で alt 属性が無い/空（装飾 SVG は alt="" 許容のため <img> のみ対象）
  for (const m of body.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/);
    if (!alt) add("WARN", "IMG-ALT", `<img> に alt 属性が無い: ${tag.slice(0, 60)}…`);
  }

  // --- eyecatch 実在チェック（指定時）---
  if (fm.eyecatch) {
    const rel = String(fm.eyecatch).replace(/^\//, "");
    if (!existsSync(join(WEB_ROOT, "public", rel))) {
      add("WARN", "IMG-EYE", `eyecatch が public に見つからない: ${fm.eyecatch}（未配置なら動的OGにフォールバック）`);
    }
  }

  // --- faq_schema 形状（FAQPage JSON-LD 用）---
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
  if (isFaq && fm.faq_schema === undefined) {
    add("WARN", "FAQ-MISSING", "article_type=faq だが faq_schema が無い（FAQPage 構造化データが出ない）");
  }

  // --- NG 語（§7.1）決定的検出 ---
  for (const w of NG_WORDS) {
    if (body.includes(w)) add("ERROR", "NG-WORD", `Anti-Brand 語を検出: 「${w}」（templates §7.1）`);
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
  console.log(`\n── 合計: ERROR ${totals.ERROR} / WARN ${totals.WARN}（${targets.length} ファイル）`);
}

process.exit(totals.ERROR > 0 ? 1 : 0);
