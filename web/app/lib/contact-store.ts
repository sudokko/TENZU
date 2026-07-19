/* =========================================================================
   問い合わせフォームの永続層（DynamoDB・ONSITE_TABLE に相乗り）。
   - CONTACT アイテム: PK="CONTACT", SK="{ISO日時}#{短ID}"
     … SK 昇順＝時系列。一覧は ScanIndexForward:false で新しい順に読む
   - ONSITE_TABLE 未設定時は読み＝空・書き込み＝false を返して degrade
     （AWS 認証の無い環境でもビルド・他機能の開発を阻害しない。
      onsite-store.ts と同じ流儀。テーブル定義 SSOT: acquisition/onsite-messaging.md §4）
   ========================================================================= */
import { randomBytes } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { awsClientConfig } from "./aws";

export type ContactInput = {
  company?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
};

export type ContactRecord = ContactInput & {
  id: string;
  createdAt: string; // ISO 8601（UTC）
};

const table = () => process.env.ONSITE_TABLE ?? "";

let cachedDoc: DynamoDBDocumentClient | null = null;
function doc(): DynamoDBDocumentClient {
  if (!cachedDoc) {
    cachedDoc = DynamoDBDocumentClient.from(new DynamoDBClient(awsClientConfig()), {
      // undefined の任意フィールド（company / phone …）を保存時に落とす
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return cachedDoc;
}

/* 保存。テーブル未設定なら false（呼び出し側でメール通知のみに degrade する） */
export async function putContact(input: ContactInput): Promise<ContactRecord | false> {
  if (!table()) return false;
  const createdAt = new Date().toISOString();
  const id = randomBytes(4).toString("hex");
  const rec: ContactRecord = { ...input, id, createdAt };
  await doc().send(
    new PutCommand({
      TableName: table(),
      Item: { ...rec, PK: "CONTACT", SK: `${createdAt}#${id}` },
    }),
  );
  return rec;
}

/* 一覧（新しい順）。問い合わせ量は小さい想定なので全ページ読み切る */
export async function listContacts(): Promise<ContactRecord[]> {
  if (!table()) return [];
  const rows: ContactRecord[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const r = await doc().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": "CONTACT" },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const it of r.Items ?? []) {
      const rec = it as unknown as ContactRecord;
      rows.push({
        id: rec.id,
        createdAt: rec.createdAt,
        ...(rec.company ? { company: rec.company } : {}),
        ...(rec.name ? { name: rec.name } : {}),
        ...(rec.email ? { email: rec.email } : {}),
        ...(rec.phone ? { phone: rec.phone } : {}),
        ...(rec.message ? { message: rec.message } : {}),
      });
    }
    lastKey = r.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return rows;
}
