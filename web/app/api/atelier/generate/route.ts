/* dev 限定: 候補の追加生成（seedCursor インクリメント・既存候補と多様性比較）
   ジェネレータはレジストリ（gen/index.ts）経由で解決する。
   motif はライブラリが有限なので、兄弟巻で生きている変種を除外して生成する。 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, readSiblingVariantKeys, safeSku, writeCandidates } from "../io";
import { generatorFor } from "../../../products/problems/gen";
import type { CandidateFile } from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string; count?: number; lines?: number };
  const sku = safeSku(body.sku);
  if (!sku) return Response.json({ error: "bad sku" }, { status: 400 });
  const gen = generatorFor(sku);
  if (!gen) {
    return Response.json({ error: `ジェネレータ未対応の sku: ${sku}（手設計は candidates JSON へ直接追記）` }, { status: 400 });
  }

  // 線本数の指定生成（省略時はラダー全帯域から生成）
  let lines: number | undefined;
  if (body.lines !== undefined) {
    if (!Number.isInteger(body.lines) || body.lines < gen.lines[0] || body.lines > gen.lines[1]) {
      return Response.json(
        { error: `線本数は ${gen.lines[0]}〜${gen.lines[1]} の範囲で指定してください` },
        { status: 400 },
      );
    }
    lines = body.lines;
  }

  const task = sku.split("-")[0];
  const file: CandidateFile = (await readCandidates(sku)) ?? {
    schemaVersion: 1, sku, task, candidates: [], seedCursor: 0,
  };

  const excludeVariants = gen.crossVolExclusive
    ? await readSiblingVariantKeys(task, sku)
    : undefined;

  const seed = file.seedCursor + 1;
  const fresh = gen.generate(sku, seed, body.count ?? 5, {
    existing: file.candidates,
    linesOverride: lines,
    excludeVariants,
  });

  file.candidates.push(...fresh.map((p) => ({ ...p, status: "pending" as const })));
  file.seedCursor = seed;
  await writeCandidates(file);

  return Response.json({ ok: true, added: fresh.length, seed, total: file.candidates.length });
}
