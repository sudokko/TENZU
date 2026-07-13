/* 初期シード（管理用・冪等）。campaigns.ts の SEED_CAMPAIGNS を
   「未存在 id のみ」DynamoDB へ投入する。既存アイテムには一切触れない。 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../guard";
import { seedCampaign } from "../../../../lib/onsite-store";
import { SEED_CAMPAIGNS } from "../../../../components/onsite/campaigns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const g = requireAdmin(req);
  if (g) return g;
  const inserted: string[] = [];
  const skipped: string[] = [];
  try {
    for (const c of SEED_CAMPAIGNS) {
      if (await seedCampaign(c)) inserted.push(c.id);
      else skipped.push(c.id);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
  return NextResponse.json({ inserted, skipped });
}
