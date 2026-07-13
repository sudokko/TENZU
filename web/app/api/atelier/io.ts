/* =========================================================================
   atelier dev API 共有ヘルパ（fs 読み書き・dev ガード）
   route.ts 以外のファイルは route にならないのでここに集約。
   本番（next start / 本番ビルドのプリレンダ）では guard() が 404 を返す。
   ========================================================================= */
import { promises as fs } from "fs";
import path from "path";
import {
  TASK_ANSWER_MODE, validateProblemSet,
  type CandidateFile, type EdgeT, type SkuProblemSet,
} from "../../products/problems/schema";
import { migrateCandidateFile, migrateSet } from "../../products/problems/gen/difficulty";
import { shapeSignature } from "../../products/problems/gen/dedupe";

export function devGuard(): Response | null {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  return null;
}

const PROBLEMS_DIR = () => path.join(process.cwd(), "app", "products", "problems");
const CAND_DIR = () => path.join(PROBLEMS_DIR(), "candidates");
const PUB_DIR = () => path.join(PROBLEMS_DIR(), "published");
const LADDER_PATH = () => path.join(PROBLEMS_DIR(), "ladder.json");

/* ラダー（巻の難易度基準）の dev 読み書き。gen/ladder.ts は静的 import で読むが、
   atelier の編集 UI はここで disk から直に読み（編集直後の値を即返す）・書き戻す。
   構造は { schemaVersion, copy:{sku:params}, fill:{...}, mirror:{...}, motif:{...} }。 */
export type LadderFile = { schemaVersion: number } & Record<string, unknown>;

export async function readLadder(): Promise<LadderFile> {
  const raw = await fs.readFile(LADDER_PATH(), "utf8");
  return JSON.parse(raw) as LadderFile;
}

export async function writeLadder(data: LadderFile): Promise<void> {
  await fs.writeFile(LADDER_PATH(), JSON.stringify(data, null, 2) + "\n", "utf8");
}

/* atelier から追加した Vol の置き場（既存 data.ts PRODUCT_TASKS は不変のまま合流する）。
   add-vol API が書き、data.ts が読み込み時に該当タスクへ append する。 */
const CATALOG_EXTRA_PATH = () => path.join(process.cwd(), "app", "products", "catalog-extra.json");
export type CatalogExtraVol = {
  task: string; sku: string; lv: number; volNo: number; grid: string;
  variant?: string; blurb: string; ageLabel: string; status: "live" | "scaffold";
};
/* 既存 PRODUCT_TASKS（ハードコード TS・API から書き戻せない）の表示メタを
   dev で上書きするレイヤ。grid 編集・メタ編集・非表示を data.ts を触らず反映する。
   hidden=true は data.ts が PRODUCT_TASKS から除外（公開・atelier 双方から消える）。 */
export type CatalogPatch = {
  sku: string; grid?: string; blurb?: string; ageLabel?: string;
  variant?: string; status?: "live" | "scaffold"; hidden?: boolean;
};
export type CatalogExtra = { vols: CatalogExtraVol[]; patches?: CatalogPatch[] };

export async function readCatalogExtra(): Promise<CatalogExtra> {
  try {
    return JSON.parse(await fs.readFile(CATALOG_EXTRA_PATH(), "utf8")) as CatalogExtra;
  } catch {
    return { vols: [] };
  }
}

export async function writeCatalogExtra(data: CatalogExtra): Promise<void> {
  await fs.writeFile(CATALOG_EXTRA_PATH(), JSON.stringify(data, null, 2) + "\n", "utf8");
}

/* 表示メタの上書きを catalog-extra に反映する。scaffold Vol（extra.vols に居る sku）は
   patch ではなく vols 側を直接更新し、それ以外（PRODUCT_TASKS の既存巻）は patches へ upsert。 */
export async function upsertCatalogPatch(
  sku: string, partial: Omit<CatalogPatch, "sku">,
): Promise<void> {
  const extra = await readCatalogExtra();
  const inExtra = extra.vols.find((x) => x.sku === sku);
  if (inExtra) {
    if (partial.grid != null) inExtra.grid = partial.grid;
    if (partial.blurb != null) inExtra.blurb = partial.blurb;
    if (partial.ageLabel != null) inExtra.ageLabel = partial.ageLabel;
    if (partial.variant != null) inExtra.variant = partial.variant;
    if (partial.status != null) inExtra.status = partial.status;
  } else {
    const patches = extra.patches ?? (extra.patches = []);
    const cur = patches.find((p) => p.sku === sku);
    if (cur) Object.assign(cur, partial);
    else patches.push({ sku, ...partial });
  }
  await writeCatalogExtra(extra);
}

/* sku はファイル名に使うので形式を縛る（パストラバーサル防止） */
export function safeSku(sku: unknown): string | null {
  return typeof sku === "string" && /^[a-z0-9-]+$/.test(sku) ? sku : null;
}

export async function readCandidates(sku: string): Promise<CandidateFile | null> {
  try {
    const raw = await fs.readFile(path.join(CAND_DIR(), `${sku}.json`), "utf8");
    // 読み取り境界で v1→v2 昇格（difficulty/provenance 補完）。全ルートがここを通る。
    return migrateCandidateFile(JSON.parse(raw) as CandidateFile);
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
  // 公開 JSON に difficulty/provenance を焼き込む（消費側は migrate 不要で読める）。
  const migrated = migrateSet(set);
  const errs = validateProblemSet(migrated);
  if (errs.length > 0) return errs;
  await fs.mkdir(PUB_DIR(), { recursive: true });
  await fs.writeFile(
    path.join(PUB_DIR(), `${migrated.sku}.json`),
    JSON.stringify(migrated, null, 1),
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
/* 兄弟巻（同 task の他 SKU・candidates 非 rejected ＋ published）で使われている
   図形の形シグネチャ集合。変種キー除外（readSiblingVariantKeys）の補完＝
   ライブラリと小箱列挙など「別キーが同じ形」を作るケースを塞ぐ（rotate 等が使う）。
   fold は「重なり図」＝完成図が answer 側にある（edges=問題1ペイン）ため、
   answer.edges のシグネチャを集める（overlay/decompose とのクロス照合が成立する）。 */
export async function readSiblingShapeSignatures(task: string, exceptSku: string): Promise<Set<string>> {
  const sigs = new Set<string>();
  const collect = (problems: { edges?: EdgeT[]; status?: string; answer?: { mode: string; edges?: EdgeT[] } }[]) => {
    for (const p of problems) {
      if (p.status === "rejected") continue;
      const src = task === "fold" && p.answer?.mode === "explicit" && p.answer.edges?.length
        ? p.answer.edges
        : p.edges;
      if (src && src.length > 0) sigs.add(shapeSignature(src));
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
  return sigs;
}

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
