/* キャンペーン一覧（管理用・inactive 含む全件＋管理メタ） */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../guard";
import { listCampaigns } from "../../../../lib/onsite-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = requireAdmin(req);
  if (g) return g;
  try {
    const campaigns = await listCampaigns();
    campaigns.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(
      { campaigns },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
