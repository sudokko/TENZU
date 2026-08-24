/* 推奨5テンプレート（管理用）。
   - 既定: 未存在 id のみ投入（冪等）
   - ?replace=1: 管理画面の確認後、同じ id も推奨設定で upsert */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../guard";
import { putCampaign, seedCampaign } from "../../../../lib/onsite-store";
import { SEED_CAMPAIGNS } from "../../../../components/onsite/campaigns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const g = requireAdmin(req);
  if (g) return g;
  const inserted: string[] = [];
  const skipped: string[] = [];
  const updated: string[] = [];
  const replace = req.nextUrl.searchParams.get("replace") === "1";
  try {
    for (const c of SEED_CAMPAIGNS) {
      if (replace) {
        await putCampaign(c);
        updated.push(c.id);
      } else if (await seedCampaign(c)) inserted.push(c.id);
      else skipped.push(c.id);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
  return NextResponse.json({ inserted, skipped, updated });
}
