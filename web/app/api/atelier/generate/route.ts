/* dev 限定: 候補の追加生成（seedCursor インクリメント・既存候補と多様性比較）
   ジェネレータはレジストリ（gen/index.ts）経由で解決する。
   motif はライブラリが有限なので、兄弟巻で生きている変種を除外して生成する。 */
import { NextRequest } from "next/server";
import { devGuard, readCandidates, readSiblingVariantKeys, safeSku, writeCandidates } from "../io";
import { generatorFor } from "../../../products/problems/gen";
import { migrateCandidateFile } from "../../../products/problems/gen/difficulty";
import type { CandidateFile } from "../../../products/problems/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = devGuard();
  if (guard) return guard;

  const body = await req.json() as { sku?: string; count?: number; lines?: number; gap?: number };
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
        { error: `線分の本数は ${gen.lines[0]}〜${gen.lines[1]} の範囲で指定してください` },
        { status: 400 },
      );
    }
    lines = body.lines;
  }

  // 欠け本数の指定生成（fill のみ・省略時はラダー範囲から）
  let gap: number | undefined;
  if (body.gap !== undefined) {
    if (!gen.gapLines) {
      return Response.json({ error: `この sku は欠け本数を指定できません` }, { status: 400 });
    }
    if (!Number.isInteger(body.gap) || body.gap < gen.gapLines[0] || body.gap > gen.gapLines[1]) {
      return Response.json(
        { error: `欠けの本数は ${gen.gapLines[0]}〜${gen.gapLines[1]} の範囲で指定してください` },
        { status: 400 },
      );
    }
    gap = body.gap;
  }

  const task = sku.split("-")[0];
  const file: CandidateFile = (await readCandidates(sku)) ?? {
    schemaVersion: 1, sku, task, candidates: [], seedCursor: 0,
  };

  const excludeVariants = gen.crossVolExclusive
    ? await readSiblingVariantKeys(task, sku)
    : undefined;

  // copy はライブラリ全件ロード方式（seed 固定・全件・seedCursor 進めない＝冪等）
  const seed = gen.loadAll ? 1 : file.seedCursor + 1;
  const count = gen.loadAll ? 9999 : (body.count ?? 5);
  const fresh = gen.generate(sku, seed, count, {
    existing: file.candidates,
    linesOverride: lines,
    gapOverride: gap,
    excludeVariants,
  });

  /* id は既存の最大連番から続けて振る。loadAll（copy・seed 固定）は押すたび generator が
     s{seed}-01.. と採番し直すため、追記でそのまま使うと既存と id 衝突する（adopt/save が
     id マッチ＝双子に誤適用）。ここで一意な連番に振り直して衝突を防ぐ。 */
  const maxN = file.candidates.reduce((mx, c) => {
    const n = parseInt(c.id.match(/-s\d+-(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, n);
  }, 0);
  file.candidates.push(...fresh.map((p, i) => ({
    ...p,
    id: `${sku}-s${seed}-${String(maxN + i + 1).padStart(2, "0")}`,
    status: "pending" as const,
  })));
  if (!gen.loadAll) file.seedCursor = seed;
  // 生成候補に difficulty/provenance を焼き込んでから書き出す（atelier がすぐ難易度を出せる）。
  await writeCandidates(migrateCandidateFile(file));

  return Response.json({ ok: true, added: fresh.length, seed, total: file.candidates.length });
}
