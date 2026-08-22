/* 立体 Lv.5 を 4 巻 → 2 巻へ組み直す（npx tsx scripts/migrate-solid-lv5-restructure.ts [--dry]）
   decisions §3.108。オーナー判断:
   - Vol.3（やぐら・建てこみ）・Vol.4（最大盤面）は**廃止**（candidates ごと削除）
   - 旧 Vol.2（大型・隠れ辺を全部 OFF にして publish 済み・D 34.8〜56.3）→ **新 Vol.1**
   - 旧 Vol.1（隠れ辺フル・D 50〜120）→ **新 Vol.2**
   ＝「大きい形を隠れ辺なしで写す」→「隠れ辺つきで写す」の順に上がるラダーになる。

   触るもの: candidates/*.json（ファイル名・sku・問題 id）／published/solid-lv5-vol2.json →
   solid-lv5-vol1.json（同上）／published の index.ts・skus.ts 再生成。
   ladder.json・data.ts・catalog-extra.json は別途手で直す（この移行と同じコミットで）。 */
import { promises as fs } from "fs";
import path from "path";
import { regenerateIndex } from "../app/api/atelier/io";
import type { CandidateFile, SkuProblemSet } from "../app/products/problems/schema";

const CAND = path.join(process.cwd(), "app", "products", "problems", "candidates");
const PUB = path.join(process.cwd(), "app", "products", "problems", "published");
const dry = process.argv.includes("--dry");
const stripBom = (s: string) => s.replace(/^﻿/, "");

/* sku 名の付け替え。ファイル本体の sku と、問題 id の接頭辞（{sku}-s7-23 / {sku}-m01）を書き換える。 */
function rename<T extends CandidateFile | SkuProblemSet>(data: T, from: string, to: string): T {
  const out = { ...data, sku: to } as T;
  const list = "candidates" in out ? out.candidates : out.problems;
  for (const p of list) {
    if (p.id.startsWith(`${from}-`)) p.id = `${to}-${p.id.slice(from.length + 1)}`;
  }
  return out;
}

const readJson = async <T,>(p: string): Promise<T> =>
  JSON.parse(stripBom(await fs.readFile(p, "utf8"))) as T;
const writeJson = async (p: string, v: unknown) =>
  fs.writeFile(p, JSON.stringify(v, null, 1), "utf8");

async function main() {
  const V1 = "solid-lv5-vol1", V2 = "solid-lv5-vol2";

  // 1) 廃止する 2 巻
  for (const sku of ["solid-lv5-vol3", "solid-lv5-vol4"]) {
    const f = path.join(CAND, `${sku}.json`);
    const n = (await readJson<CandidateFile>(f)).candidates.length;
    console.log(`削除: candidates/${sku}.json（候補 ${n} 問）`);
    if (!dry) await fs.rm(f);
  }

  // 2) 候補の入れ替え（旧 vol2 → 新 vol1／旧 vol1 → 新 vol2）
  const old1 = await readJson<CandidateFile>(path.join(CAND, `${V1}.json`));
  const old2 = await readJson<CandidateFile>(path.join(CAND, `${V2}.json`));
  console.log(`入れ替え: candidates ${V2}（${old2.candidates.length} 問）→ ${V1}`);
  console.log(`入れ替え: candidates ${V1}（${old1.candidates.length} 問）→ ${V2}`);
  if (!dry) {
    await writeJson(path.join(CAND, `${V1}.json`), rename(old2, V2, V1));
    await writeJson(path.join(CAND, `${V2}.json`), rename(old1, V1, V2));
  }

  // 3) published（旧 vol2 だけが入稿済み）を新 vol1 へ
  const pubOld2 = path.join(PUB, `${V2}.json`);
  const set = await readJson<SkuProblemSet>(pubOld2);
  console.log(`入れ替え: published ${V2}（${set.problems.length} 問）→ ${V1}`);
  if (!dry) {
    await writeJson(path.join(PUB, `${V1}.json`), rename(set, V2, V1));
    await fs.rm(pubOld2);
    await regenerateIndex();      // index.ts / skus.ts を実ファイルから引き直す
  }

  console.log(dry ? "（--dry: 書き込みなし）" : "完了。ladder.json / data.ts / catalog-extra.json も直すこと");
}

main().catch((e) => { console.error(e); process.exit(1); });
