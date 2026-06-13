/* =========================================================================
   atelier dev API 共有ヘルパ（fs 読み書き・dev ガード）
   route.ts 以外のファイルは route にならないのでここに集約。
   本番（next start / 本番ビルドのプリレンダ）では guard() が 404 を返す。
   ========================================================================= */
import { promises as fs } from "fs";
import path from "path";
import {
  TASK_ANSWER_MODE, validateProblemSet,
  type CandidateFile, type SkuProblemSet,
} from "../../products/problems/schema";

export function devGuard(): Response | null {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  return null;
}

const PROBLEMS_DIR = () => path.join(process.cwd(), "app", "products", "problems");
const CAND_DIR = () => path.join(PROBLEMS_DIR(), "candidates");
const PUB_DIR = () => path.join(PROBLEMS_DIR(), "published");

/* sku はファイル名に使うので形式を縛る（パストラバーサル防止） */
export function safeSku(sku: unknown): string | null {
  return typeof sku === "string" && /^[a-z0-9-]+$/.test(sku) ? sku : null;
}

export async function readCandidates(sku: string): Promise<CandidateFile | null> {
  try {
    const raw = await fs.readFile(path.join(CAND_DIR(), `${sku}.json`), "utf8");
    return JSON.parse(raw) as CandidateFile;
  } catch {
    return null;
  }
}

export async function writeCandidates(file: CandidateFile): Promise<void> {
  await fs.mkdir(CAND_DIR(), { recursive: true });
  await fs.writeFile(
    path.join(CAND_DIR(), `${file.sku}.json`),
    JSON.stringify(file, null, 1),
    "utf8",
  );
}

export async function writePublished(set: SkuProblemSet): Promise<string[]> {
  const errs = validateProblemSet(set);
  if (errs.length > 0) return errs;
  await fs.mkdir(PUB_DIR(), { recursive: true });
  await fs.writeFile(
    path.join(PUB_DIR(), `${set.sku}.json`),
    JSON.stringify(set, null, 1),
    "utf8",
  );
  await regenerateIndex();
  return [];
}

/* published/ の実ファイルから index.ts を機械生成（静的 import 一覧） */
export async function regenerateIndex(): Promise<void> {
  const files = (await fs.readdir(PUB_DIR()))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const imports = files
    .map((f, i) => `import j${i} from "./${f}";`)
    .join("\n");
  const entries = files
    .map((f, i) => `  "${f.replace(/\.json$/, "")}": j${i} as unknown as SkuProblemSet,`)
    .join("\n");
  const src = `/* eslint-disable */
/* =========================================================================
   AUTO-GENERATED — /api/atelier/publish が再生成する。手で編集しない。
   published/{sku}.json の静的レジストリ（SSG・クライアント双方で bundle される）
   ========================================================================= */
import type { SkuProblemSet } from "../schema";
${imports ? imports + "\n" : ""}
export const PUBLISHED: Record<string, SkuProblemSet> = {
${entries}
};

export function publishedSet(sku: string): SkuProblemSet | undefined {
  return PUBLISHED[sku];
}
`;
  await fs.writeFile(path.join(PUB_DIR(), "index.ts"), src, "utf8");
}

export function answerModeOf(task: string) {
  return TASK_ANSWER_MODE[task] ?? "none";
}

/* 兄弟巻（同タスクの他 SKU）で生きている変種キーを集める。
   motif のようにライブラリが有限なジェネレータの巻またぎ重複防止に使う。
   - candidates: rejected 以外（pending/adopted）を「生きている」とみなす
   - published: 全問対象 */
export async function readSiblingVariantKeys(task: string, exceptSku: string): Promise<Set<string>> {
  const keys = new Set<string>();
  const collect = (problems: { gen?: { variant?: string }; status?: string }[]) => {
    for (const p of problems) {
      if (p.status === "rejected") continue;
      if (p.gen?.variant) keys.add(p.gen.variant);
    }
  };
  for (const dir of [CAND_DIR(), PUB_DIR()]) {
    let files: string[] = [];
    try {
      files = (await fs.readdir(dir)).filter(
        (f) => f.startsWith(`${task}-`) && f.endsWith(".json") && f !== `${exceptSku}.json`,
      );
    } catch { continue; }
    for (const f of files) {
      try {
        const raw = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
        collect(raw.candidates ?? raw.problems ?? []);
      } catch { /* 壊れたファイルは無視（publish 時に validate される） */ }
    }
  }
  return keys;
}
