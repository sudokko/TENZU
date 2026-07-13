/* キャンペーン単体の upsert / 削除（管理用）。
   - PUT: 手動バリデーション（validate.ts）を通して DynamoDB へ保存 → 即時本番反映
   - DELETE: 入力ミスの後始末用。運用上の停止は active: false が原則
     （既読キー履歴を残す・acquisition/onsite-messaging.md §4） */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../guard";
import { putCampaign, deleteCampaign } from "../../../../../lib/onsite-store";
import { parseCampaign, CAMPAIGN_ID_RE } from "../../validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const g = requireAdmin(req);
  if (g) return g;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON が読めません" }, { status: 400 });
  }
  const parsed = parseCampaign(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }
  if (parsed.id !== id) {
    return NextResponse.json({ error: "URL の id と body の id が一致しません" }, { status: 400 });
  }

  try {
    await putCampaign(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const g = requireAdmin(req);
  if (g) return g;
  const { id } = await ctx.params;
  if (!CAMPAIGN_ID_RE.test(id)) {
    return NextResponse.json({ error: "id が不正です" }, { status: 400 });
  }
  try {
    await deleteCampaign(id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
