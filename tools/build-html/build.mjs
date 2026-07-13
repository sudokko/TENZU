// TENZU 設計書 Markdown → HTML 変換
// 使い方: node build.mjs

import { marked } from 'marked';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, basename, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');

// 除外ディレクトリ（プロジェクト全 .md を拾う際にスキップ）
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  'tools',           // ツール自体の README は対象外（必要なら別途）
  'journal',         // Claude とのやり取り履歴は対象外（CLAUDE.md 明記）
  '__pycache__',
]);

// 再帰的に .md ファイルを収集
async function collectMd(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      const subRel = base ? `${base}/${e.name}` : e.name;
      out.push(...(await collectMd(join(dir, e.name), subRel)));
    } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) {
      out.push(base ? `${base}/${e.name}` : e.name);
    }
  }
  return out;
}

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false,
});

// .md リンクを .html に書き換え + Windows パス対策
function rewriteMdLinks(html) {
  // [text](path.md) や [text](path.md#anchor) → .html
  return html.replace(/(href=")([^"]+?)\.md(#[^"]*)?(")/g, '$1$2.html$3$4');
}

// ```mermaid コードブロックを mermaid.js が拾える <pre class="mermaid"> へ変換
// marked は <pre><code class="language-mermaid">…</code></pre> を出力するので置換する
function rewriteMermaid(html) {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_, code) =>
      `<pre class="mermaid">${code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")}</pre>`
  );
}
function hasMermaid(html) {
  return /<pre class="mermaid">/.test(html);
}

// ============ docs/drafts/ 専用の前処理: frontmatter・コメント・独自コンポーネント ============
// 対象は docs/drafts/ 配下のみ（既存の一般 .md への影響を避けるスコープ限定）

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  return { fm: m[1], body: raw.slice(m[0].length) };
}

function renderFrontmatter(fm) {
  return `<details class="frontmatter"><summary>frontmatter</summary><pre>${escapeHtml(fm)}</pre></details>`;
}

function extractFrontmatterField(fm, key) {
  const m = fm.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'));
  if (!m) return '';
  const v = m[1].trim();
  // YAML の "..." / '...' クォート値は中身だけ取り出す
  const q = v.match(/^"(.*)"$|^'(.*)'$/);
  return q ? (q[1] ?? q[2]) : v;
}

function calloutHtml(text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const flagged = /要確認|TODO/i.test(trimmed);
  return `<div class="draft-callout${flagged ? ' flag' : ''}">${escapeHtml(trimmed)}</div>`;
}

// {/* ... */}（.mdx の JSX コメント）を可視コールアウトへ。marked に渡す前に stash() でプレースホルダ化する
// （複数行の生 HTML をそのまま埋め込むと、内部の空行で CommonMark の HTML ブロック認識が途切れ、
//   続きがインデントコードブロック扱いになって壊れるため）
function jsxCommentsToCallouts(body, stash) {
  return body.replace(/\{\/\*([\s\S]*?)\*\/\}/g, (_, inner) => {
    const html = calloutHtml(inner);
    return html ? stash(html) : '';
  });
}

// <!-- ... -->（.md のコメント・構成メモの執筆メモ欄）を可視コールアウトへ（同上の理由で stash() 経由）
function htmlCommentsToCallouts(body, stash) {
  return body.replace(/<!--([\s\S]*?)-->/g, (_, inner) => {
    const html = calloutHtml(inner);
    return html ? stash(html) : '';
  });
}

function getAttr(attrsStr, name) {
  const m = attrsStr.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : '';
}

// Diagram 内の JSX を静的 SVG へ整形（装飾ドット生成の Array.from・{/* */}・camelCase 属性・key prop）
function fixSvg(svg) {
  let out = svg;
  out = out.replace(/<g\b[^>]*>[\s\S]*?Array\.from[\s\S]*?<\/g>/g, '');
  out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  out = out.replace(/\s+key=\{[^}]*\}/g, '');
  const kebab = {
    strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin',
    strokeDasharray: 'stroke-dasharray', strokeOpacity: 'stroke-opacity', fillOpacity: 'fill-opacity',
    fillRule: 'fill-rule', fontSize: 'font-size', fontWeight: 'font-weight', fontFamily: 'font-family',
    textAnchor: 'text-anchor', dominantBaseline: 'dominant-baseline', letterSpacing: 'letter-spacing',
    clipRule: 'clip-rule',
  };
  for (const [camel, kebabName] of Object.entries(kebab)) {
    out = out.replace(new RegExp('\\b' + camel + '=', 'g'), kebabName + '=');
  }
  out = out.replace(/=\{([\d.]+)\}/g, '="$1"');
  return out.trim();
}

// MDX 独自コンポーネント（LeadGraf/Diagram/TenzuTranslate/Quote/SideNote）を静的 HTML へ変換し stash() でプレースホルダ化
function convertMdxComponents(body, stash) {
  let out = body;
  out = out.replace(/<Diagram([\s\S]*?)>([\s\S]*?)<\/Diagram>/g, (_, attrs, inner) => {
    const title = getAttr(attrs, 'title');
    const caption = getAttr(attrs, 'caption');
    const html = '<figure class="tenzu-diagram">' +
      (title ? `<div class="diagram-title">${title}</div>` : '') +
      `<div class="diagram-svg">${fixSvg(inner)}</div>` +
      (caption ? `<figcaption>${caption}</figcaption>` : '') +
      '</figure>';
    return stash(html);
  });
  out = out.replace(/<TenzuTranslate([\s\S]*?)>([\s\S]*?)<\/TenzuTranslate>/g, (_, attrs, inner) => {
    const src = getAttr(attrs, 'src');
    const cite = getAttr(attrs, 'cite');
    const html = '<div class="tenzu-translate">' +
      (src ? `<div class="tt-src">"${src}"</div>` : '') +
      `<div class="tt-body">${marked.parseInline(inner.trim())}</div>` +
      (cite ? `<div class="tt-cite">${cite}</div>` : '') +
      '</div>';
    return stash(html);
  });
  out = out.replace(/<Quote([\s\S]*?)>([\s\S]*?)<\/Quote>/g, (_, attrs, inner) => {
    const author = getAttr(attrs, 'author');
    const html = '<blockquote class="tenzu-quote"><p>' + marked.parseInline(inner.trim()) + '</p>' +
      (author ? `<cite>${author}</cite>` : '') + '</blockquote>';
    return stash(html);
  });
  out = out.replace(/<SideNote([\s\S]*?)>([\s\S]*?)<\/SideNote>/g, (_, attrs, inner) => {
    const label = getAttr(attrs, 'label');
    const html = '<aside class="tenzu-sidenote">' +
      (label ? `<div class="sn-label">${label}</div>` : '') +
      `<div class="sn-body">${marked.parseInline(inner.trim())}</div></aside>`;
    return stash(html);
  });
  out = out.replace(/<LeadGraf>([\s\S]*?)<\/LeadGraf>/g, (_, inner) =>
    stash(`<p class="lead-graf">${marked.parseInline(inner.trim())}</p>`));
  return out;
}

// 記事内部リンク /articles/<slug> をローカル同階層の <slug>.html へ書き換え（ドラフト間のジャンプを可能にする）
function rewriteArticleLinks(body) {
  return body.replace(/\(\/articles\/([a-z0-9-]+)\/?\)/g, '($1.html)');
}

// 目次（h2 / h3）を本文から抽出
function buildToc(tokens) {
  const items = [];
  for (const t of tokens) {
    if (t.type === 'heading' && (t.depth === 2 || t.depth === 3)) {
      const id = slugify(t.text);
      items.push({ depth: t.depth, text: t.text, id });
    }
  }
  if (items.length === 0) return '';
  let html = '<nav class="toc"><h2>目次</h2><ul>';
  let curDepth = 2;
  for (const it of items) {
    if (it.depth > curDepth) html += '<ul>'.repeat(it.depth - curDepth);
    if (it.depth < curDepth) html += '</ul>'.repeat(curDepth - it.depth);
    curDepth = it.depth;
    html += `<li><a href="#${it.id}">${escapeHtml(it.text)}</a></li>`;
  }
  if (curDepth > 2) html += '</ul>'.repeat(curDepth - 2);
  html += '</ul></nav>';
  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// heading に id を付与するため renderer を上書き（marked v12+ API）
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^\w぀-ゟ゠-ヿ一-鿿々ー]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
const renderer = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const raw = tokens.map((t) => t.raw || t.text || '').join('');
    const id = slugify(raw);
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}">#</a>${text}</h${depth}>\n`;
  },
};
marked.use({ renderer });

const CSS = `
:root {
  --bg: #fafaf7;
  --panel: #ffffff;
  --text: #1f2328;
  --muted: #57606a;
  --border: #d0d7de;
  --accent: #6b5b3a;
  --accent-soft: #f0ead7;
  --code-bg: #f4f0e7;
  --table-row-alt: #faf7ee;
}
* { box-sizing: border-box; }
html, body { background: var(--bg); color: var(--text); }
body {
  font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.75;
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 96px;
  font-size: 15.5px;
}
header.doc-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
header.doc-header .path { color: var(--muted); font-size: 12.5px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
header.doc-header .back { color: var(--accent); text-decoration: none; font-size: 13px; }
header.doc-header .back:hover { text-decoration: underline; }
h1, h2, h3, h4 { color: var(--accent); line-height: 1.4; }
h1 { font-size: 24px; margin: 0 0 8px; }
h2 { font-size: 19px; margin: 32px 0 12px; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
h3 { font-size: 16.5px; margin: 24px 0 8px; }
h4 { font-size: 15px; margin: 18px 0 6px; }
h2 a.anchor, h3 a.anchor, h4 a.anchor {
  opacity: 0;
  text-decoration: none;
  color: var(--muted);
  margin-left: -16px;
  padding-right: 6px;
  font-weight: normal;
}
h2:hover a.anchor, h3:hover a.anchor, h4:hover a.anchor { opacity: 1; }
p { margin: 8px 0 14px; }
a { color: #496f3f; }
a:hover { text-decoration: underline; }
ul, ol { padding-left: 1.5em; }
li { margin: 3px 0; }
strong { color: #3d3320; }
blockquote {
  border-left: 4px solid var(--accent-soft);
  background: #fbf8ef;
  margin: 12px 0;
  padding: 8px 14px;
  color: var(--muted);
  border-radius: 0 6px 6px 0;
}
code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 12px 14px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.55;
}
pre code { background: transparent; padding: 0; }
pre.mermaid {
  background: transparent;
  border: none;
  padding: 0;
  overflow-x: auto;
  text-align: center;
}
pre.mermaid svg { max-width: none !important; height: auto; }
table {
  border-collapse: collapse;
  width: 100%;
  margin: 14px 0;
  font-size: 14px;
  display: block;
  overflow-x: auto;
}
table thead { background: var(--accent-soft); }
table th, table td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}
table tbody tr:nth-child(2n) { background: var(--table-row-alt); }
hr { border: none; border-top: 1px dashed var(--border); margin: 28px 0; }
nav.toc {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 18px;
  margin: 0 0 28px;
  font-size: 13.5px;
}
nav.toc h2 {
  font-size: 14px;
  margin: 0 0 6px;
  border: none;
  padding: 0;
  color: var(--muted);
}
nav.toc ul { padding-left: 1.3em; margin: 4px 0; }
nav.toc li { margin: 2px 0; }
nav.toc a { color: var(--accent); text-decoration: none; }
nav.toc a:hover { text-decoration: underline; }
footer.doc-footer {
  margin-top: 48px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
details.frontmatter {
  margin: 0 0 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
}
details.frontmatter summary {
  cursor: pointer;
  padding: 8px 14px;
  font-size: 12.5px;
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
details.frontmatter pre {
  margin: 0;
  border: none;
  border-top: 1px solid var(--border);
  border-radius: 0 0 8px 8px;
  white-space: pre-wrap;
}
.draft-callout {
  margin: 14px 0;
  padding: 8px 14px;
  border-radius: 0 6px 6px 0;
  border-left: 3px solid #9aa583;
  background: #eef1e6;
  color: var(--muted);
  font-size: 13px;
  white-space: pre-wrap;
}
.draft-callout.flag {
  border-left-color: #c99a3a;
  background: #fbf1da;
  color: #6b5320;
}
.tenzu-diagram {
  margin: 20px 0;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  text-align: center;
}
.tenzu-diagram .diagram-title {
  font-size: 13px;
  font-weight: bold;
  color: var(--accent);
  margin-bottom: 8px;
}
.tenzu-diagram .diagram-svg svg {
  max-width: 100%;
  height: auto;
}
.tenzu-diagram figcaption {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--muted);
}
.tenzu-translate {
  margin: 16px 0;
  padding: 14px 18px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 0 8px 8px 0;
}
.tenzu-translate .tt-src {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}
.tenzu-translate .tt-cite {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--muted);
}
.tenzu-quote {
  font-size: 17px;
  border-left-color: var(--accent);
}
.tenzu-quote cite {
  display: block;
  margin-top: 6px;
  font-size: 12.5px;
  font-style: normal;
  color: var(--muted);
}
.tenzu-sidenote {
  margin: 16px 0;
  padding: 12px 16px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: #f4f2ea;
}
.tenzu-sidenote .sn-label {
  font-size: 12px;
  font-weight: bold;
  color: var(--accent);
  margin-bottom: 4px;
}
`;

function wrap({ title, relPath, generated, tocHtml, frontmatterHtml, bodyHtml, mermaid }) {
  // ルートへ戻るリンクを領域ファイルから相対で算出
  const depth = relPath.split('/').length - 1;
  const indexHref = '../'.repeat(depth) + 'docs/html-index.html';
  const mermaidScript = mermaid
    ? `<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: false, theme: 'neutral', themeVariables: { fontSize: '8px' }, flowchart: { rankSpacing: 35, nodeSpacing: 25, padding: 4 } });
await mermaid.run();
// 縮小表示を防ぎ、viewBox の原寸幅で描画（横はみ出しは pre.mermaid 側でスクロール）
document.querySelectorAll('pre.mermaid svg').forEach((svg) => {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width) svg.style.width = Math.round(vb.width) + 'px';
});
</script>`
    : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} — TENZU</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${CSS}</style>
</head>
<body>
<header class="doc-header">
  <div>
    <span class="path">${escapeHtml(relPath)}</span>
  </div>
  <a class="back" href="${indexHref}">← 一覧へ戻る</a>
</header>
${frontmatterHtml || ''}
${tocHtml}
<main>
${bodyHtml}
</main>
<footer class="doc-footer">
  <span>${escapeHtml(relPath)}</span>
  <span>Generated: ${generated}</span>
</footer>
${mermaidScript}
</body>
</html>`;
}

async function convert(relPath) {
  const absMd = join(REPO, relPath);
  const raw = await readFile(absMd, 'utf8');
  const normRel = relPath.replace(/\\/g, '/');
  const isDraft = normRel.startsWith('docs/drafts/');
  const isMdx = normRel.endsWith('.mdx');

  let frontmatterHtml = '';
  let md = raw;

  // 独自コンポーネント/コールアウトは複数行の生 HTML になるため、marked に渡す前に
  // プレースホルダへ差し替え、パース後の bodyHtml に対して最後に実 HTML へ戻す
  // （生 HTML を直接埋め込むと、内部の空行で CommonMark の HTML ブロック認識が途切れて壊れる）
  const blocks = [];
  const stash = (html) => {
    const token = `TENZUBLOCK${blocks.length}X`;
    blocks.push(html);
    return token;
  };

  // frontmatter 分離とタイトル補完は、置き場所に関わらず frontmatter を持つ全ファイルに適用
  // （docs/drafts/ 以外にも archive/retired-drafts・web/content/articles の .mdx が同じ形式を使う）
  const split = splitFrontmatter(raw);
  if (split) {
    frontmatterHtml = renderFrontmatter(split.fm);
    md = split.body;
    // .mdx は本文に H1 を書かない運用（タイトルは frontmatter のみ）なので、無ければ補う
    if (!/^#\s+/m.test(md)) {
      const fmTitle = extractFrontmatterField(split.fm, 'title') || extractFrontmatterField(split.fm, 'title_main');
      if (fmTitle) md = `# ${fmTitle}\n\n${md}`;
    }
  }
  if (isMdx) {
    // 独自コンポーネント（LeadGraf 等）は .mdx 全般の記法なのでディレクトリを問わず変換する
    // 順序が重要: 独自コンポーネント（内部の {/* */} を含む）を先に静的 HTML 化してから、
    // 残った本文直下の {/* */} だけをコールアウトに変換する
    md = convertMdxComponents(md, stash);
    md = rewriteArticleLinks(md);
    md = jsxCommentsToCallouts(md, stash);
  } else if (isDraft) {
    // <!-- --> コールアウト化は docs/drafts/ 限定（他の .md の既存コメント慣習に影響を与えないため）
    md = htmlCommentsToCallouts(md, stash);
  }

  const tokens = marked.lexer(md);
  const tocHtml = buildToc(tokens);
  let bodyHtml = marked.parser(tokens);
  bodyHtml = rewriteMdLinks(bodyHtml);
  bodyHtml = rewriteMermaid(bodyHtml);
  if (blocks.length) {
    // marked が段落として <p>TOKEN</p> に包む想定。念のため裸のトークンも保険で置換する
    bodyHtml = bodyHtml.replace(/<p>TENZUBLOCK(\d+)X<\/p>/g, (_, i) => blocks[Number(i)]);
    bodyHtml = bodyHtml.replace(/TENZUBLOCK(\d+)X/g, (_, i) => blocks[Number(i)]);
  }

  // タイトルは本文（frontmatter 除去後）の最初の H1 を抜く
  const h1Match = md.match(/^#\s+(.+)$/m);
  const title = h1Match ? h1Match[1].trim() : basename(relPath, extname(relPath));

  const html = wrap({
    title,
    relPath: normRel,
    generated: new Date().toISOString().slice(0, 16).replace('T', ' '),
    tocHtml,
    frontmatterHtml,
    bodyHtml,
    mermaid: hasMermaid(bodyHtml),
  });

  const outPath = absMd.replace(/\.mdx?$/, '.html');
  await writeFile(outPath, html, 'utf8');
  return outPath;
}

// 一覧（インデックス）ページ
async function buildIndex(outputs) {
  const items = outputs
    .map(({ relPath }) => {
      const htmlPath = relPath.replace(/\.mdx?$/, '.html');
      const dir = dirname(relPath);
      return { dir, relPath, htmlPath };
    })
    .reduce((acc, it) => {
      (acc[it.dir] ||= []).push(it);
      return acc;
    }, {});

  const groups = Object.keys(items).sort();
  let sections = '';
  for (const g of groups) {
    sections += `<h2 id="${g.replace(/\//g, '-')}">${escapeHtml(g)}/</h2><ul>`;
    for (const it of items[g]) {
      // index 配置は docs/html-index.html → ファイルは TENZU/領域/x.html。docs/html-index.html から見ると ../領域/x.html
      const href = '../' + it.htmlPath.replace(/\\/g, '/');
      sections += `<li><a href="${href}">${escapeHtml(basename(it.relPath))}</a></li>`;
    }
    sections += '</ul>';
  }

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>TENZU 設計書 HTML 版 一覧</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${CSS}</style>
</head>
<body>
<header class="doc-header">
  <div><strong>TENZU 設計書 — HTML 版</strong></div>
  <span class="path">docs/html-index.html</span>
</header>
<main>
<p><strong>${outputs.length} 本</strong>の .md / .mdx から生成した HTML 版。各領域ディレクトリに <code>*.html</code> が並んでいます。</p>
${sections}
</main>
<footer class="doc-footer">
  <span>TENZU</span>
  <span>Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</span>
</footer>
</body>
</html>`;

  const indexDir = join(REPO, 'docs');
  await writeFile(join(indexDir, 'html-index.html'), html, 'utf8');
  return join(indexDir, 'html-index.html');
}

async function main() {
  const files = await collectMd(REPO);
  // パスをスラッシュ統一
  const targets = files.map((f) => f.split(sep).join('/')).sort();
  console.log(`対象: ${targets.length} 本の .md/.mdx を変換`);

  const outputs = [];
  for (const relPath of targets) {
    try {
      const out = await convert(relPath);
      outputs.push({ relPath, out });
    } catch (e) {
      console.error(`✗ ${relPath}: ${e.message}`);
    }
  }
  console.log(`✓ ${outputs.length} 本変換完了`);

  try {
    const idx = await buildIndex(outputs);
    console.log(`✓ index → ${relative(REPO, idx).replace(/\\/g, '/')}`);
  } catch (e) {
    console.error(`✗ index: ${e.message}`);
  }
}

main();
