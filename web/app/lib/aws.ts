/* AWS SDK 共通設定（DynamoDB / S3 用）。
   Amplify Hosting は "AWS" 接頭辞の環境変数を予約済みで設定できないため、認証情報は
   別名（APP_AWS_*）で受ける。未設定なら既定の認証チェーン（ローカルの AWS_* env /
   Amplify コンピュートロール）にフォールバックする（lib/email.ts の SES_* と同じ流儀）。
   SES は歴史的経緯で SES_* を読み続ける — 実体は同一 IAM ユーザーでよい。 */

export function awsClientConfig() {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  return {
    region: process.env.APP_AWS_REGION ?? process.env.AWS_REGION ?? "ap-northeast-1",
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  };
}
