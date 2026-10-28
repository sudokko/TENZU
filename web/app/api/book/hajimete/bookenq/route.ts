/* 本のアンケート（/book/hajimete/bookenq）の受け口。
   - body: SurveyAnswer の形（survey.ts の parseSurvey で検査）＋ website（ハニーポット）。
   - DynamoDB 保存（survey-store）→ オーナーへ通知（sendSurveyMail）。片方の失敗は握りつぶし、両方失敗したときだけ 500。
   - 答えた人には、お礼のクーポンコードを返し、回答済みの cookie を立てる（同じブラウザでもう一度開くとコードを出し直す）。
     コードはメールごとに1回（lib/coupon.ts の once）。本の97ページには金額だけを刷り、コードはここでだけ見せる。 */
import { NextRequest, NextResponse } from "next/server";
import { SURVEY_COOKIE, SURVEY_COUPON, putSurvey } from "../../../../lib/survey-store";
import { sendSurveyMail } from "../../../../lib/email";
import { AGES, PROGRESS, REASONS, STUCK, STUCK_WHY, labelOf, parseSurvey } from "../../../../book/hajimete/survey";

export const dynamic = "force-dynamic";

function done() {
  const res = NextResponse.json({ ok: true, coupon: SURVEY_COUPON });
  res.cookies.set(SURVEY_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return res;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  // ハニーポット: bot には成功と見せて捨てる（コードは渡さない）
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });
  // 同じブラウザからの2回目は保存せず、コードだけ出し直す
  if (req.cookies.has(SURVEY_COOKIE)) return done();

  const answer = parseSurvey(body);
  if (typeof answer === "string") return Response.json({ error: answer }, { status: 400 });

  let saved = false;
  try {
    saved = (await putSurvey(answer)) !== false;
  } catch (e) {
    console.error("[book-survey] save failed:", e);
  }
  let mailed = false;
  try {
    const many = (choices: typeof AGES, values: string[]) => values.map((v) => labelOf(choices, v)).join("、") || "（未回答）";
    await sendSurveyMail([
      ["子どもの学年", many(AGES, answer.ages)],
      ["どこまで進んだか", labelOf(PROGRESS, answer.progress)],
      ["手が止まった巻", answer.stuck ? `${labelOf(STUCK, answer.stuck)}${answer.stuckNo ? `（${answer.stuckNo}／12）` : ""}` : "（未回答）"],
      ["そのとき", many(STUCK_WHY, answer.stuckWhy)],
      ["買った決め手", many(REASONS, answer.reasons)],
      ["すすめたいか（0〜10）", String(answer.recommend)],
      ["来たところ", answer.from ?? "（不明）"],
      ["自由記述", answer.comment ?? "（なし）"],
    ]);
    mailed = true;
  } catch (e) {
    console.error("[book-survey] notify failed:", e);
  }
  if (!saved && !mailed) return Response.json({ error: "送信できませんでした。時間をおいて、もう一度お試しください。" }, { status: 500 });
  return done();
}
