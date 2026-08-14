/* dev 限定: adopted 12 問を order 順に SkuProblemSet 化して published へ確定。
   published/{sku}.json 書き込み＋ published/index.ts をコード再生成し、
   カタログ上の巻 status を live へ引き上げる（＝/products/{sku} が実際に生える）。 */
import { NextRequest } from "next/server";
import { answerModeOf, devGuard, readCandidates, safeSku, writePublished } from "../io";
import { QUESTIONS_PER_VOL } from "../../../products/data";
import type { Problem, SkuProblemSet } from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });

  const file = await readCandidates(sku);
  if (!file) return Response.json({ error: "no candidates file" }, { status: 404 });

  const adopted = file.candidates
    .filter((c) => c.status === "adopted")
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  if (adopted.length !== QUESTIONS_PER_VOL) {
    return Response.json(
      { error: `採用がちょうど ${QUESTIONS_PER_VOL} 問のときだけ公開できます（現在 ${adopted.length} 問）` },
      { status: 400 },
    );
  }

  /* 検品専用のフィールドは published へ持ち込まない。solidHiddenParked（隠れ線 OFF の
     退避分）は candidates が持ち続ける＝ON へ戻すのは検品側の操作で、公開スナップショットは
     「紙面に出る線だけ」でよい（本番バンドルに出ない線を積まない）。 */
  const problems: Problem[] = adopted.map((c) => {
    const { status: _s, order: _o, edited: _e, solidHiddenParked: _h, ...p } = c;
    return p;
  });

  const set: SkuProblemSet = {
    schemaVersion: 1,
    sku,
    task: file.task,
    answerMode: answerModeOf(file.task),
    problems,
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  const errs = await writePublished(set);
  if (errs.length > 0) return Response.json({ error: "validation failed", details: errs }, { status: 400 });

  /* 公開＝商品ページが生えること。カタログの status は published/ の有無から
     導出される（products/data.ts が skus.ts を読む）ので、ここで別途フラグを
     立てる必要はない。writePublished が skus.ts も再生成している。 */
  return Response.json({ ok: true, sku, questions: problems.length });
}
