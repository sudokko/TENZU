/* =========================================================================
   記事の編集モード（dev 限定）— MDX ソースの解析・検証・書き戻し
   /api/atelier/article（route.ts）と /atelier/articles（一覧・編集画面）が共有する。
   - 本文は MDX パーサ（ビルドと同じ remark-frontmatter / remark-gfm 構成）でトップレベルの
     ブロックに分け、ソース上の位置（offset）を返す。記事ページの `article.article-body`
     直下の要素と同じ順に並ぶので、編集画面はクリックした要素からソースの範囲を引ける。
   - frontmatter はビルド側（remark-mdx-frontmatter）と同じ `yaml` で読む。
   - 書き戻しは「元ファイルの改行コード（CRLF/LF）と BOM を保つ」「壊れた MDX は書かない」
     「開いた後にファイルが変わっていたら書かない（ハッシュで衝突検知）」の 3 点を守る。
   - 依存: @mdx-js/mdx は @mdx-js/loader、yaml は remark-mdx-frontmatter の依存として
     必ず入っている（記事のビルドそのものがこの 2 つで動く）ため package.json には足さない。
   ========================================================================= */
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { createProcessor } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import YAML from "yaml";

const ARTICLES_DIR = () => path.join(process.cwd(), "content", "articles");
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export type BlockKind =
  | "heading" | "paragraph" | "list" | "table" | "blockquote" | "jsx" | "code" | "break" | "other";

export type SourceBlock = {
  kind: BlockKind;
  /** 画面に出す種類名（例: 段落・見出し（H2）・挿絵（Illustration）） */
  label: string;
  /** 改行を LF に揃えたソース上の範囲 */
  start: number;
  end: number;
  /** 開始行（1 始まり・ファイル先頭から） */
  line: number;
  /** 画面の要素と照合するための平文 */
  text: string;
};

export type FieldKey = "title" | "kicker" | "lead" | "description";

export type FieldInfo = {
  key: FieldKey;
  label: string;
  value: string | null;
  /** 1 行の単純な値のときだけ画面から直せる（複数行・未記入は全文ソースで直す） */
  editable: boolean;
};

export type SourceError = {
  message: string;
  line?: number;
  column?: number;
  /** パーサの原文（英語）。原因の切り分け用 */
  detail?: string;
};

export type ArticlePayload = {
  slug: string;
  /** リポジトリ相対パス（表示用） */
  file: string;
  /** ディスク上の内容のハッシュ（保存時の衝突検知に使う） */
  hash: string;
  /** 改行を LF に揃えたソース（offset はこれが基準） */
  source: string;
  status: "published" | "unlisted" | "draft";
  blocks: SourceBlock[];
  fields: FieldInfo[];
  parseError: SourceError | null;
};

export type Mutation =
  | { action: "replaceBlock"; start: number; end: number; original: string; replacement: string }
  | { action: "setField"; key: FieldKey; value: string }
  | { action: "writeAll"; source: string };

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "title", label: "タイトル" },
  { key: "kicker", label: "キッカー（タイトル上の小さな見出し）" },
  { key: "lead", label: "リード（タイトル下の導入文）" },
  { key: "description", label: "説明文（検索結果・SNS に出る要約）" },
];
export const FIELD_KEYS = FIELDS.map((f) => f.key);

/* mdx-components.tsx が供給する独自ブロックの呼び名 */
const JSX_LABELS: Record<string, string> = {
  LeadGraf: "リード段落",
  Illustration: "挿絵",
  Diagram: "図解",
  Quote: "キメ引用",
  SideNote: "開発ノート",
  TenzuTranslate: "研究引用＋TENZU 訳",
};
/* 照合用の平文に入れない属性（画面に文字として出ないもの） */
const SKIP_ATTRS = new Set(["src", "href", "ratio", "className", "id", "wide"]);

type MdNode = {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean | null;
  name?: string | null;
  attributes?: { type: string; name?: string; value?: unknown }[];
  children?: MdNode[];
  position?: { start: { line: number; offset?: number }; end: { line: number; offset?: number } };
};

let processor: ReturnType<typeof createProcessor> | null = null;
const mdx = () =>
  (processor ??= createProcessor({ remarkPlugins: [remarkFrontmatter, remarkGfm] }));

export const isValidSlug = (slug: string) => SLUG_RE.test(slug);
const statusOf = (v: unknown): ArticlePayload["status"] => (v === "draft" || v === "unlisted" ? v : "published");
const fileOf = (slug: string) => path.join(ARTICLES_DIR(), `${slug}.mdx`);
const hashOf = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

type RawFile = { bom: boolean; crlf: boolean; source: string; hash: string };

async function readRaw(slug: string): Promise<RawFile | null> {
  if (!isValidSlug(slug)) return null;
  let raw: string;
  try {
    raw = await fs.readFile(fileOf(slug), "utf8");
  } catch {
    return null;
  }
  const bom = raw.startsWith("﻿");
  const body = bom ? raw.slice(1) : raw;
  return { bom, crlf: body.includes("\r\n"), source: body.replace(/\r\n/g, "\n"), hash: hashOf(raw) };
}

export async function articleExists(slug: string): Promise<boolean> {
  return (await readRaw(slug)) !== null;
}

export async function readHash(slug: string): Promise<string | null> {
  return (await readRaw(slug))?.hash ?? null;
}

/* MDX パーサのよくあるエラーを、直す人向けの日本語に言い換える */
const ERROR_HINTS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/Expected a closing tag for `<([^>]+)>`/, (m) => `<${m[1]}> の閉じタグ（</${m[1]}>）が見つかりません`],
  [/Unexpected closing tag `<\/([^>]+)>`/, (m) => `閉じタグ </${m[1]}> に対応する開きタグがありません`],
  [/Unexpected end of file/, () => "タグや { } が閉じられないまま、ファイルが終わっています"],
  [/Could not parse expression with acorn/, () => "{ } の中が読めません（文章に { } を書くときは \\{ \\} とします）"],
  [/Unexpected character `(.+?)`/, (m) => `「${m[1]}」のところで書き方が崩れています（< > や " の閉じ忘れ・消し忘れがないか見てください）`],
];

function toSourceError(e: unknown): SourceError {
  const detail = e instanceof Error ? e.message : String(e);
  const err = e as { line?: number; column?: number; place?: { line?: number; column?: number; start?: { line: number; column: number } } };
  const inMessage = /\((\d+):(\d+)/.exec(detail);
  const line = err.line ?? err.place?.start?.line ?? err.place?.line ?? (inMessage ? Number(inMessage[1]) : undefined);
  const column = err.column ?? err.place?.start?.column ?? err.place?.column ?? (inMessage ? Number(inMessage[2]) : undefined);
  let message = detail;
  for (const [re, say] of ERROR_HINTS) {
    const m = re.exec(detail);
    if (m) {
      message = say(m);
      break;
    }
  }
  return { message, line, column, detail };
}

function plain(node: MdNode): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
    case "code":
      return node.value ?? "";
    case "yaml":
    case "mdxjsEsm":
    case "html":
    case "mdxFlowExpression":
    case "mdxTextExpression":
      return "";
  }
  const parts: string[] = [];
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    for (const a of node.attributes ?? []) {
      if (a.type === "mdxJsxAttribute" && typeof a.value === "string" && !SKIP_ATTRS.has(a.name ?? "")) {
        parts.push(a.value);
      }
    }
  }
  for (const child of node.children ?? []) parts.push(plain(child));
  return parts.join(" ");
}

function describe(node: MdNode): { kind: BlockKind; label: string } {
  switch (node.type) {
    case "heading":
      return { kind: "heading", label: `見出し（H${node.depth ?? 2}）` };
    case "paragraph":
      return { kind: "paragraph", label: "段落" };
    case "list":
      return { kind: "list", label: node.ordered ? "番号リスト" : "箇条書き" };
    case "table":
      return { kind: "table", label: "表" };
    case "blockquote":
      return { kind: "blockquote", label: "引用" };
    case "code":
      return { kind: "code", label: "コード" };
    case "thematicBreak":
      return { kind: "break", label: "区切り線" };
    case "mdxJsxFlowElement": {
      const name = node.name ?? "要素";
      return { kind: "jsx", label: JSX_LABELS[name] ? `${JSX_LABELS[name]}（${name}）` : `<${name}>` };
    }
    default:
      return { kind: "other", label: node.type };
  }
}

function analyze(source: string): { blocks: SourceBlock[]; yaml: MdNode | null; parseError: SourceError | null } {
  let tree: MdNode;
  try {
    tree = mdx().parse(source) as unknown as MdNode;
  } catch (e) {
    return { blocks: [], yaml: null, parseError: toSourceError(e) };
  }
  const blocks: SourceBlock[] = [];
  let yaml: MdNode | null = null;
  for (const node of tree.children ?? []) {
    if (node.type === "yaml") {
      yaml = node;
      continue;
    }
    if (node.type === "mdxjsEsm") continue; // import / export は本文に出ない
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) continue;
    blocks.push({ ...describe(node), start, end, line: node.position!.start.line, text: plain(node) });
  }
  return { blocks, yaml, parseError: null };
}

function parseYamlObject(text: string): Record<string, unknown> | null {
  try {
    const doc = YAML.parseDocument(text);
    if (doc.errors.length > 0) return null;
    const value = doc.toJS();
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** `key: 値` が 1 行で完結している行の番号。複数行の値・入れ子・未記入は null */
function singleLineField(yamlText: string, key: string): number | null {
  const lines = yamlText.split("\n");
  const i = lines.findIndex((l) => l.startsWith(`${key}:`) && (l.length === key.length + 1 || /\s/.test(l[key.length + 1])));
  if (i < 0) return null;
  const rest = lines[i].slice(key.length + 1).trim();
  if (rest === "" || rest.startsWith("|") || rest.startsWith(">")) return null;
  const next = lines[i + 1];
  if (next !== undefined && /^[ \t]/.test(next)) return null; // 折り返しの続き行がある
  return i;
}

/** YAML に書く表記。そのままで同じ文字列に読み戻せるなら素のまま、無理ならダブルクォート */
function yamlScalar(key: string, value: string): string | null {
  const readsBack = (text: string) => parseYamlObject(`${key}: ${text}`)?.[key] === value;
  if (value !== "" && value.trim() === value && readsBack(value)) return value;
  const quoted = JSON.stringify(value);
  return readsBack(quoted) ? quoted : null;
}

/** frontmatter の本体（--- の内側）がソースのどこにあるか */
function yamlRange(source: string, yaml: MdNode): { start: number; end: number } | null {
  const outer = yaml.position?.start.offset;
  if (outer === undefined) return null;
  const start = source.indexOf("\n", outer) + 1;
  const inner = yaml.value ?? "";
  return start > 0 && source.slice(start, start + inner.length) === inner
    ? { start, end: start + inner.length }
    : null;
}

function buildPayload(slug: string, f: RawFile): ArticlePayload {
  const { blocks, yaml, parseError } = analyze(f.source);
  const data = yaml?.value ? parseYamlObject(yaml.value) : null;
  const fields = FIELDS.map(({ key, label }) => ({
    key,
    label,
    value: typeof data?.[key] === "string" ? (data[key] as string) : null,
    editable: Boolean(yaml && data && singleLineField(yaml.value ?? "", key) !== null),
  }));
  return {
    slug,
    file: `web/content/articles/${slug}.mdx`,
    hash: f.hash,
    source: f.source,
    status: statusOf(data?.status),
    blocks,
    fields,
    parseError,
  };
}

export async function loadPayload(slug: string): Promise<ArticlePayload | null> {
  const f = await readRaw(slug);
  return f ? buildPayload(slug, f) : null;
}

/** 書き込む前の検査。MDX として読めない・frontmatter が壊れている・slug がずれている、を止める */
function validateSource(slug: string, source: string): SourceError | null {
  const { yaml, parseError } = analyze(source);
  if (parseError) return { ...parseError, message: `MDX の書き方に誤りがあります: ${parseError.message}` };
  if (!yaml) return { message: "frontmatter（先頭の --- で囲んだ部分）が見つかりません" };
  const doc = YAML.parseDocument(yaml.value ?? "");
  if (doc.errors.length > 0) {
    const err = doc.errors[0];
    const line = err.linePos?.[0]?.line;
    return {
      message: `frontmatter の書き方に誤りがあります: ${err.message.split("\n")[0]}`,
      line: line ? line + 1 : undefined, // 先頭の --- の 1 行ぶんずらす
    };
  }
  const data = parseYamlObject(yaml.value ?? "");
  if (!data) return { message: "frontmatter が読み取れません" };
  if (data.slug !== slug) return { message: `frontmatter の slug はファイル名と同じ「${slug}」にしてください` };
  if (typeof data.title !== "string" || data.title.trim() === "") return { message: "title が空です" };
  return null;
}

function setField(source: string, key: FieldKey, value: string): { source: string } | SourceError {
  if (/[\r\n]/.test(value)) return { message: "改行は入れられません（1 行で書いてください）" };
  if (value.trim() === "") return { message: "空にはできません" };
  const { yaml } = analyze(source);
  const range = yaml ? yamlRange(source, yaml) : null;
  if (!yaml || !range) return { message: "frontmatter の位置を特定できませんでした。全文ソースで直してください" };
  const inner = source.slice(range.start, range.end);
  const i = singleLineField(inner, key);
  if (i === null) return { message: `${key} は 1 行の値ではないため、全文ソースで直してください` };
  const formatted = yamlScalar(key, value);
  if (formatted === null) return { message: "この文字列は frontmatter に安全に書けません。全文ソースで直してください" };
  const lines = inner.split("\n");
  lines[i] = `${key}: ${formatted}`;
  const nextInner = lines.join("\n");
  const before = parseYamlObject(inner);
  const after = parseYamlObject(nextInner);
  if (!before || !after || after[key] !== value) return { message: "書き換え後の frontmatter を検証できませんでした" };
  const others = (o: Record<string, unknown>) => JSON.stringify({ ...o, [key]: null });
  if (others(before) !== others(after)) return { message: "他の項目まで変わってしまうため中止しました" };
  return { source: source.slice(0, range.start) + nextInner + source.slice(range.end) };
}

async function writeSource(slug: string, f: RawFile, next: string): Promise<void> {
  let out = next;
  if (f.source.endsWith("\n")) out = out.replace(/\n*$/, "\n"); // 末尾の改行 1 つは元のまま保つ
  if (f.crlf) out = out.replace(/\n/g, "\r\n");
  if (f.bom) out = `﻿${out}`;
  await fs.writeFile(fileOf(slug), out, "utf8");
}

export type MutationResult =
  | { ok: true; payload: ArticlePayload }
  | { ok: false; status: number; error: SourceError; payload?: ArticlePayload };

export async function applyMutation(slug: string, baseHash: string, m: Mutation): Promise<MutationResult> {
  const f = await readRaw(slug);
  if (!f) return { ok: false, status: 404, error: { message: "記事ファイルが見つかりません" } };
  if (f.hash !== baseHash) {
    return {
      ok: false,
      status: 409,
      error: { message: "開いた後にファイルが別の場所で更新されていました。最新の内容を読み込み直したので、もう一度その場所を開いて直してください" },
      payload: buildPayload(slug, f),
    };
  }

  let next: string;
  if (m.action === "replaceBlock") {
    if (f.source.slice(m.start, m.end) !== m.original) {
      return {
        ok: false,
        status: 409,
        error: { message: "直そうとした箇所の元の文章が見つかりません。読み込み直してください" },
        payload: buildPayload(slug, f),
      };
    }
    const replacement = m.replacement.replace(/\r\n/g, "\n").replace(/^\n+/, "").replace(/\s+$/, "");
    next = replacement === ""
      ? f.source.slice(0, m.start) + f.source.slice(m.end).replace(/^\n{1,2}/, "") // ブロック削除＝区切りの空行ごと
      : f.source.slice(0, m.start) + replacement + f.source.slice(m.end);
  } else if (m.action === "setField") {
    const r = setField(f.source, m.key, m.value);
    if (!("source" in r)) return { ok: false, status: 400, error: r };
    next = r.source;
  } else {
    next = m.source.replace(/\r\n/g, "\n");
  }

  if (next === f.source) return { ok: true, payload: buildPayload(slug, f) };
  const invalid = validateSource(slug, next);
  if (invalid) return { ok: false, status: 400, error: invalid };

  await writeSource(slug, f, next);
  const fresh = await readRaw(slug);
  return fresh
    ? { ok: true, payload: buildPayload(slug, fresh) }
    : { ok: false, status: 500, error: { message: "保存後の読み直しに失敗しました" } };
}

export type ArticleListItem = {
  slug: string;
  title: string;
  status: ArticlePayload["status"];
  updatedAt: string | null;
  publishedAt: string | null;
};

/** 一覧用。frontmatter だけ読む（本文は解析しない） */
export async function listArticleFiles(): Promise<ArticleListItem[]> {
  const files = (await fs.readdir(ARTICLES_DIR())).filter((n) => n.endsWith(".mdx"));
  const items = await Promise.all(
    files.map(async (name) => {
      const slug = name.replace(/\.mdx$/, "");
      const f = await readRaw(slug);
      const m = f ? /^---\n([\s\S]*?)\n---/.exec(f.source) : null;
      const data = m ? parseYamlObject(m[1]) : null;
      const str = (k: string) => (typeof data?.[k] === "string" ? (data[k] as string) : null);
      return {
        slug,
        title: str("title") ?? slug,
        status: statusOf(data?.status),
        updatedAt: str("updated_at"),
        publishedAt: str("published_at"),
      } satisfies ArticleListItem;
    }),
  );
  return items.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}
