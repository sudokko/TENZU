/* dev 限定: 記事の編集モード（/atelier/articles/[slug]）が使う読み書き API。
   GET  ?slug=…            … ソース・本文ブロック・frontmatter の直せる項目を返す
   GET  ?slug=…&hashOnly=1 … ハッシュだけ（外部での更新の検知用）
   POST { slug, baseHash, action, … }
     replaceBlock … 本文ブロック 1 つを差し替え（空にすると削除）
     setField     … frontmatter の 1 行の値（title / kicker / lead / description）を書き換え
     writeAll     … ファイル全体を書き換え（全文ソース・取り消し）
   保存先は web/content/articles/<slug>.mdx だけ。解析・検証・書き戻しは article-source.ts。 */
import { NextRequest } from "next/server";
import { devGuard } from "../io";
import {
  FIELD_KEYS, applyMutation, isValidSlug, loadPayload, readHash,
  type FieldKey, type Mutation,
} from "../article-source";

export const dynamic = "force-dynamic";

const fail = (status: number, message: string) => Response.json({ error: { message } }, { status });

export async function GET(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!isValidSlug(slug)) return fail(400, "slug が不正です");

  if (req.nextUrl.searchParams.get("hashOnly")) {
    const hash = await readHash(slug);
    return hash ? Response.json({ hash }) : fail(404, "記事ファイルが見つかりません");
  }
  const payload = await loadPayload(slug);
  return payload ? Response.json(payload) : fail(404, "記事ファイルが見つかりません");
}

function toMutation(body: Record<string, unknown>): Mutation | null {
  switch (body.action) {
    case "replaceBlock": {
      const { start, end, original, replacement } = body;
      return Number.isInteger(start) && Number.isInteger(end) && typeof original === "string" && typeof replacement === "string"
        ? { action: "replaceBlock", start: start as number, end: end as number, original, replacement }
        : null;
    }
    case "setField":
      return FIELD_KEYS.includes(body.key as FieldKey) && typeof body.value === "string"
        ? { action: "setField", key: body.key as FieldKey, value: body.value }
        : null;
    case "writeAll":
      return typeof body.source === "string" ? { action: "writeAll", source: body.source } : null;
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "リクエストが読めません");
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!isValidSlug(slug)) return fail(400, "slug が不正です");
  if (typeof body.baseHash !== "string") return fail(400, "baseHash がありません");
  const mutation = toMutation(body);
  if (!mutation) return fail(400, "操作の指定が不正です");

  const result = await applyMutation(slug, body.baseHash, mutation);
  return result.ok
    ? Response.json(result.payload)
    : Response.json({ error: result.error, payload: result.payload ?? null }, { status: result.status });
}
