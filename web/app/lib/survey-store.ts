/* =========================================================================
   本のアンケートの永続層（DynamoDB・ONSITE_TABLE に相乗り・contact-store.ts と同じ流儀）。
   - SURVEY アイテム: PK="BOOK_SURVEY#hajimete", SK="{ISO日時}#{短ID}" … SK 昇順＝時系列
   - ONSITE_TABLE 未設定時は読み＝空・書き込み＝false を返して degrade
   ========================================================================= */
import { randomBytes } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { awsClientConfig } from "./aws";
import type { LegacySurveyAnswer, SurveyAnswer } from "../book/hajimete/survey";

/** 読むときは、設問を変える前の答え（ages・comment）が混ざることがある。 */
export type SurveyRecord = Partial<SurveyAnswer> & LegacySurveyAnswer & Pick<SurveyAnswer, "recommend"> & { id: string; createdAt: string };

/** 答えた人へのお礼のクーポン（Stripe の Promotion Code・メールごとに1回・pack-commerce §14.7.2）。画面には回答後にだけ出す。 */
export const SURVEY_COUPON = "ENQUETE100";
/** 回答済みのブラウザの印。もう一度開いたときにコードを出し直すためだけに使う。 */
export const SURVEY_COOKIE = "tenzu_book_survey";

const PK = "BOOK_SURVEY#hajimete";
const table = () => process.env.ONSITE_TABLE ?? "";

let cachedDoc: DynamoDBDocumentClient | null = null;
function doc(): DynamoDBDocumentClient {
  cachedDoc ??= DynamoDBDocumentClient.from(new DynamoDBClient(awsClientConfig()), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return cachedDoc;
}

/* 保存。テーブル未設定なら false（呼び出し側でメール通知のみに degrade する） */
export async function putSurvey(answer: SurveyAnswer): Promise<SurveyRecord | false> {
  if (!table()) return false;
  const createdAt = new Date().toISOString();
  const id = randomBytes(4).toString("hex");
  const rec = { ...answer, id, createdAt };
  await doc().send(new PutCommand({ TableName: table(), Item: { ...rec, PK, SK: `${createdAt}#${id}` } }));
  return rec;
}

/* 一覧（新しい順）。回答は多くない想定なので全ページ読み切る */
export async function listSurveys(): Promise<SurveyRecord[]> {
  if (!table()) return [];
  const rows: SurveyRecord[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const r = await doc().send(new QueryCommand({
      TableName: table(), KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": PK },
      ScanIndexForward: false, ExclusiveStartKey: lastKey,
    }));
    for (const it of r.Items ?? []) {
      const rec = { ...it } as Record<string, unknown>;
      delete rec.PK; delete rec.SK;
      rows.push(rec as unknown as SurveyRecord);
    }
    lastKey = r.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return rows;
}
