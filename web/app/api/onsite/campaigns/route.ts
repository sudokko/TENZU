/* オンサイトメッセージ配信（公開・認証なし）。
   - 既定: active のみ全件（評価・トリガー判定はクライアントの OnsiteMessenger）
   - ?id={id}: 該当 1 件を active 無視で返す（?om_preview 用。露出するのは
     販促文言のみで、無認証を許容している）
   - 管理画面の保存が即時反映されるよう CDN キャッシュしない（no-store）。
     トラフィックが増えたら s-maxage=60, stale-while-revalidate=60 へ緩めてよい */
import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, getCampaign, type CampaignRecord } from "../../../lib/onsite-store";
import type { Campaign } from "../../../components/onsite/campaigns";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/* 管理メタ（createdAt/updatedAt）は配信に載せない */
function strip(c: CampaignRecord): Campaign {
  const { createdAt: _c, updatedAt: _u, ...rest } = c;
  return rest;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const c = await getCampaign(id);
      return NextResponse.json({ campaigns: c ? [strip(c)] : [] }, { headers: NO_STORE });
    }
    const all = await listCampaigns();
    const campaigns = all
      .filter((c) => c.active)
      .map(strip)
      .sort((a, b) => a.priority - b.priority);
    return NextResponse.json({ campaigns }, { headers: NO_STORE });
  } catch {
    /* ストア障害時は空を返す（クライアントは「出さない側に倒す」） */
    return NextResponse.json({ campaigns: [] }, { status: 503, headers: NO_STORE });
  }
}
