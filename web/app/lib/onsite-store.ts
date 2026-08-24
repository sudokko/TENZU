/* =========================================================================
   オンサイトメッセージの永続層（DynamoDB・テーブル 1 本 = ONSITE_TABLE）。
   設計 SSOT: acquisition/onsite-messaging.md §4（decisions.md §5.15）。
   - CAMPAIGN アイテム: PK="CAMPAIGN", SK={id}
     … キャンペーン定義。管理画面（/admin/onsite）の保存が即時本番反映される
   - STAT アイテム:     PK="STAT", SK="{yyyy-mm-dd}#{campaignId}"（JST 日次）
     … show / click / dismiss を UpdateItem ADD でアトミック加算
   - ONSITE_TABLE 未設定時は読み＝空・計測＝no-op・管理書き込み＝エラー、に degrade
     （AWS 認証の無い環境でもビルド・他機能の開発を阻害しない）
   - 表示回数・最終表示・クリック済みはクライアントの localStorage — サーバーに
     個人単位の記録は持たない
   ========================================================================= */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { awsClientConfig } from "./aws";
import type { Campaign } from "../components/onsite/campaigns";

export type TrackAction = "show" | "click" | "dismiss";

/* 定義＋管理用メタ（配信 API へは Campaign 部分だけを返すこと） */
export type CampaignRecord = Campaign & { createdAt?: string; updatedAt?: string };

export type StatRow = {
  date: string; // "2026-07-12"（JST）
  campaignId: string;
  show: number;
  click: number;
  dismiss: number;
};

const table = () => process.env.ONSITE_TABLE ?? "";

let cachedDoc: DynamoDBDocumentClient | null = null;
function doc(): DynamoDBDocumentClient {
  if (!cachedDoc) {
    cachedDoc = DynamoDBDocumentClient.from(new DynamoDBClient(awsClientConfig()), {
      // undefined の任意フィールド（cta / image / excludePages …）を保存時に落とす
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return cachedDoc;
}

/* JST の今日。サーバー（Lambda）は UTC で動くため +9h して日付を切る */
export function jstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function toRecord(item: Record<string, unknown>): CampaignRecord {
  const it = item as unknown as CampaignRecord & { PK?: string; SK?: string };
  return {
    id: it.id,
    trigger: it.trigger,
    pages: it.pages ?? [],
    ...(it.excludePages ? { excludePages: it.excludePages } : {}),
    ...(it.headline ? { headline: it.headline } : {}),
    message: it.message,
    ...(it.cta ? { cta: it.cta } : {}),
    ...(it.image ? { image: it.image } : {}),
    ...(it.layout ? { layout: it.layout } : {}),
    ...(it.conditions ? { conditions: it.conditions } : {}),
    ...(it.frequency ? { frequency: it.frequency } : {}),
    priority: it.priority,
    ...(it.delaySec != null ? { delaySec: it.delaySec } : {}),
    ...(it.idleSec != null ? { idleSec: it.idleSec } : {}),
    active: it.active,
    ...(it.createdAt ? { createdAt: it.createdAt } : {}),
    ...(it.updatedAt ? { updatedAt: it.updatedAt } : {}),
  };
}

// ---- キャンペーン定義 ----

export async function listCampaigns(): Promise<CampaignRecord[]> {
  if (!table()) return [];
  const r = await doc().send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "CAMPAIGN" },
    }),
  );
  return (r.Items ?? []).map(toRecord);
}

export async function getCampaign(id: string): Promise<CampaignRecord | null> {
  if (!table()) return null;
  const r = await doc().send(
    new GetCommand({ TableName: table(), Key: { PK: "CAMPAIGN", SK: id } }),
  );
  return r.Item ? toRecord(r.Item) : null;
}

/* upsert。createdAt は既存があれば維持する */
export async function putCampaign(c: Campaign): Promise<void> {
  if (!table()) throw new Error("ONSITE_TABLE が未設定です（web/.env.local）");
  const now = new Date().toISOString();
  const prev = await doc().send(
    new GetCommand({
      TableName: table(),
      Key: { PK: "CAMPAIGN", SK: c.id },
      ProjectionExpression: "createdAt",
    }),
  );
  await doc().send(
    new PutCommand({
      TableName: table(),
      Item: {
        ...c,
        PK: "CAMPAIGN",
        SK: c.id,
        createdAt: (prev.Item?.createdAt as string | undefined) ?? now,
        updatedAt: now,
      },
    }),
  );
}

/* シード用: 既存 id には触れない（冪等）。投入したら true */
export async function seedCampaign(c: Campaign): Promise<boolean> {
  if (!table()) throw new Error("ONSITE_TABLE が未設定です（web/.env.local）");
  const now = new Date().toISOString();
  try {
    await doc().send(
      new PutCommand({
        TableName: table(),
        Item: { ...c, PK: "CAMPAIGN", SK: c.id, createdAt: now, updatedAt: now },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw e;
  }
}

/* 入力ミスの削除用。運用上の停止は active: false（既読キー履歴を残す）が原則 */
export async function deleteCampaign(id: string): Promise<void> {
  if (!table()) throw new Error("ONSITE_TABLE が未設定です（web/.env.local）");
  await doc().send(
    new DeleteCommand({ TableName: table(), Key: { PK: "CAMPAIGN", SK: id } }),
  );
}

// ---- 日次カウンタ ----

/* ベストエフォート（未設定環境では黙って no-op）。アイテム未存在でも ADD が自動生成する */
export async function bumpStat(campaignId: string, action: TrackAction): Promise<void> {
  if (!table()) return;
  const date = jstToday();
  await doc().send(
    new UpdateCommand({
      TableName: table(),
      Key: { PK: "STAT", SK: `${date}#${campaignId}` },
      // "date" は DynamoDB 予約語のため #d で参照する
      UpdateExpression: "ADD #a :one SET #d = :date, campaignId = :cid",
      ExpressionAttributeNames: { "#a": action, "#d": "date" },
      ExpressionAttributeValues: { ":one": 1, ":date": date, ":cid": campaignId },
    }),
  );
}

/* from〜to（両端含む・JST 日付文字列）を 1 パーティションの Range Query で一括取得 */
export async function queryStats(from: string, to: string): Promise<StatRow[]> {
  if (!table()) return [];
  const rows: StatRow[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const r = await doc().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk AND SK BETWEEN :from AND :to",
        ExpressionAttributeValues: {
          ":pk": "STAT",
          ":from": `${from}#`,
          // 上限 = "{to}#" ＋ BMP 最大コードポイント（campaignId のどの値よりも大きい番兵）
          ":to": `${to}#${String.fromCharCode(0xffff)}`,
        },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const it of r.Items ?? []) {
      const sk = String(it.SK ?? "");
      rows.push({
        date: (it.date as string) ?? sk.slice(0, 10),
        campaignId: (it.campaignId as string) ?? sk.slice(11),
        show: (it.show as number) ?? 0,
        click: (it.click as number) ?? 0,
        dismiss: (it.dismiss as number) ?? 0,
      });
    }
    lastKey = r.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return rows;
}
