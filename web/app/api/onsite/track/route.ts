/* first-party 計測受信（公開・sendBeacon 対応）。
   GTM/GA4（dataLayer 経由）とは独立の自前日次カウンタ（engineering/analytics.md）。
   - 素朴カウント: 重複・ボット除去はしない（生涯 1 回表示なので show ≒ ユニーク）
   - 未知の campaignId は黙って捨てる（公開エンドポイント経由のゴミアイテム注入防止）
   - 応答は常に 204（ビーコンは応答を見ない） */
import { NextRequest } from "next/server";
import { listCampaigns, bumpStat, type TrackAction } from "../../../lib/onsite-store";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<TrackAction>(["show", "click", "dismiss"]);
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/* 既知 campaignId 集合（60 秒 TTL・Lambda インスタンス毎）。
   多重インスタンスでも「listCampaigns がたまに増える」だけで整合性の害はない */
let knownIds: Set<string> | null = null;
let knownAt = 0;

async function isKnown(id: string): Promise<boolean> {
  const now = Date.now();
  if (!knownIds || now - knownAt > 60_000) {
    knownIds = new Set((await listCampaigns()).map((c) => c.id));
    knownAt = now;
  }
  return knownIds.has(id);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { action?: unknown; campaignId?: unknown };
    const action = body.action as TrackAction;
    const id = typeof body.campaignId === "string" ? body.campaignId : "";
    if (ACTIONS.has(action) && ID_RE.test(id) && (await isKnown(id))) {
      await bumpStat(id, action);
    }
  } catch {
    /* 計測はベストエフォート — 失敗しても 204 */
  }
  return new Response(null, { status: 204 });
}
