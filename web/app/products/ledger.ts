/* =========================================================================
   設計台帳（/products/design）のデータ導出

   ★ このファイルには「巻の中身」を1つも書かない。すべて既存 SSOT からの導出：
       - どの巻があるか        … data.ts（PRODUCT_TASKS・live のみ載せる）
       - 巻の設計仕様          … problems/ladder.json
       - 仕様フィールドの見せ方 … problems/ladder-schema.ts（LADDER_FIELDS）
       - 実際に入っている12問   … problems/published/*.json → coverage.ts
       - 難易度の式の文言       … problems/gen/difficulty.ts（式のコードと同居）

   ★ 変更前提の設計（難易度も収録問題も今後まるごと再設計される）:
       1. ladder.json にフィールドが増えても、LADDER_FIELDS に足せば台帳に出る
       2. LADDER_FIELDS に無いキーも「素の値」で必ず出す＝黙って消えない
       3. D 窓・D 値・実測レンジが無い巻でも欠損として素直に扱う（嘘を書かない）
       4. タスクが増減しても data.ts の配列を追うだけ（ここに一覧を持たない）
   ========================================================================= */

import LADDER from "./problems/ladder.json";
import { LADDER_FIELDS, type LadderField } from "./problems/ladder-schema";
import { publishedSet } from "./problems/published";
import { D_BASE_FORMULA, D_TASK_EXCLUDES, D_TASK_FULL_FORMULA } from "./problems/gen/difficulty";
import { coverageOf, type Coverage } from "./coverage";
import { LAUNCH_TASKS, LEVEL_NAMES, volHref, type ProductTask, type Vol } from "./data";

/* ladder.json は「タスク → SKU → 任意のキー」の素の JSON。
   型を固定すると新フィールド追加のたびに型エラーになるので、あえて緩く受ける。 */
type LadderEntry = Record<string, unknown>;
const LADDER_BY_TASK = LADDER as unknown as Record<string, Record<string, LadderEntry>>;

export type SpecItem = { label: string; value: string; key: string };

export type LedgerRow = {
  sku: string;
  href: string;
  taskName: string;
  lvNo: number;
  lvName: string;
  volNo: number;
  grid: string;
  blurb: string;
  spec: SpecItem[];                 // 設計仕様（ladder.json の中身を人が読める形に）
  dWindow?: [number, number];       // 設計上の難易度窓（持たないタスクもある）
  cov?: Coverage;                   // 実際に入っている12問（未入稿なら undefined）
};

export type LedgerTask = {
  slug: string;
  name: string;
  groupIdx: number;                 // 3群の体系順（並べ替えキー・data.ts が SSOT）
  declaredAt: number;               // 同群内の順序（PRODUCT_TASKS の並び）
  formula: string;                  // このタスクの D の完全な式（difficulty.ts が SSOT）
  excludes?: string;                // そのタスクで使っていない項の但し書き
  rows: LedgerRow[];
};

export type Ledger = {
  tasks: LedgerTask[];
  volCount: number;
  problemCount: number;
  taskCount: number;          // 台帳に載っているタスク数（準備中を含む）
  liveTaskCount: number;      // うち公開巻があるタスク数
  lvCount: number;                  // 台帳に載っている巻が使っているレベルの種類数
};

/* ---- 値の日本語化。kind ごとの整形だけを担当し、何を出すかは決めない ---- */
function formatByField(f: LadderField, v: unknown): string | undefined {
  switch (f.kind) {
    case "grid":
      return typeof v === "number" ? `${v}×${v}` : String(v);
    case "select": {
      const hit = f.options?.find((o) => o.value === String(v));
      return hit ? hit.label : String(v);
    }
    case "range":
      return Array.isArray(v) && v.length === 2
        ? (v[0] === v[1] ? `${v[0]}` : `${v[0]}〜${v[1]}`)
        : String(v);
    case "bool":
      /* optional な真偽値は true のときだけ意味がある（「45°斜めを必須」など）。
         false は「その制約を課していない」＝行に出さない */
      return v === true ? "あり" : undefined;
    case "int":
    case "float":
      return String(v);
    default:
      return String(v);
  }
}

/* LADDER_FIELDS に記述の無いキーの保険。
   ラダーに新しい制約を足したのに ladder-schema.ts への登録を忘れた場合でも、
   台帳から黙って消えないようにキー名のまま出す（欠落より不格好を選ぶ）。 */
function formatUnknown(v: unknown): string {
  if (Array.isArray(v)) return v.length === 2 ? `${v[0]}〜${v[1]}` : v.join("・");
  if (typeof v === "boolean") return v ? "あり" : "なし";
  return String(v);
}

/* 公開面だけのラベル読み替え。
   ladder-schema.ts のラベルは atelier（作り手の管理画面）の SSOT なので触らない。
   ただしそのままだと内部パラメータ名が保護者の前に出てしまうため、
   意味の変わらない範囲で読める言葉に置き換えてから台帳に載せる。 */
const PUBLIC_SPEC_LABELS: Record<string, string> = {
  components: "図のまとまりの数",
  bbox: "図の最小の広がり",
  closedBias: "閉じた形の出やすさ",
};

function specOf(taskSlug: string, entry: LadderEntry | undefined): SpecItem[] {
  if (!entry) return [];
  const fields = LADDER_FIELDS[taskSlug] ?? [];
  const out: SpecItem[] = [];
  const seen = new Set<string>();

  for (const f of fields) {
    seen.add(f.key);
    if (f.key === "D") continue;              // D 窓は専用の列で見せるので仕様欄には出さない
    const raw = entry[f.key];
    if (raw === undefined || raw === null || raw === "") continue;
    const text = formatByField(f, raw);
    if (text === undefined) continue;
    out.push({ key: f.key, label: PUBLIC_SPEC_LABELS[f.key] ?? f.label, value: text });
  }

  for (const [k, v] of Object.entries(entry)) {
    if (seen.has(k) || v === undefined || v === null || v === "") continue;
    out.push({ key: k, label: k, value: formatUnknown(v) });
  }
  return out;
}

function dWindowOf(entry: LadderEntry | undefined): [number, number] | undefined {
  const d = entry?.D;
  return Array.isArray(d) && d.length === 2 && typeof d[0] === "number" && typeof d[1] === "number"
    ? [d[0], d[1]]
    : undefined;
}

function rowOf(task: ProductTask, vol: Vol): LedgerRow {
  const entry = LADDER_BY_TASK[task.slug]?.[vol.sku];
  const set = publishedSet(vol.sku);
  return {
    sku: vol.sku,
    href: volHref(task, vol),
    taskName: task.name,
    lvNo: vol.lv,
    lvName: LEVEL_NAMES[vol.lv - 1],
    volNo: vol.volNo,
    grid: vol.grid,
    blurb: vol.blurb,
    spec: specOf(task.slug, entry),
    dWindow: dWindowOf(entry),
    cov: set ? coverageOf(set) : undefined,
  };
}

/* 台帳本体。巻は公開中（live）だけを載せる＝準備中の巻の中身は外に見せない。
   ただし「どんなタスクを用意しているか」は体系そのものなので、まだ公開巻が
   1 つも無いタスクも見出しと式だけ出す（rows は空＝準備中と表示される）。
   ローンチで伏せるタスク（拡大・縮小＝LAUNCH_HIDDEN）は台帳にも出さない。


   ★ 並びは「配列に書いてある順」ではなく、意味のあるキーで毎回ソートする。
     data.ts の PRODUCT_TASKS / task.vols は手で並べたリストなので、巻を足したり
     付け替えたり（過去に Lv 横滑りの再編があった）すると記述順が実態とずれる。
     ずれても台帳は黙って古い順のまま出てしまうため、ここで並べ直す：
       タスク … groupIdx（3群の体系順）→ 同群内は PRODUCT_TASKS の順
       巻   … レベル → 同レベル内は Vol 番号
     これで data.ts をどう書き足しても台帳は常に体系順で出る。 */
export function buildLedger(): Ledger {
  const tasks: LedgerTask[] = LAUNCH_TASKS
    .map((task, declaredAt) => {
      const rows = task.vols
        .filter((v) => v.status === "live")
        .slice()
        .sort((a, b) => a.lv - b.lv || a.volNo - b.volNo)
        .map((v) => rowOf(task, v));
      return {
        slug: task.slug,
        name: task.name,
        groupIdx: task.groupIdx,
        declaredAt,
        formula: D_TASK_FULL_FORMULA[task.slug] ?? D_BASE_FORMULA,
        excludes: D_TASK_EXCLUDES[task.slug],
        rows,
      };
    })
    .sort((a, b) => a.groupIdx - b.groupIdx || a.declaredAt - b.declaredAt);

  const allRows = tasks.flatMap((t) => t.rows);
  return {
    tasks,
    volCount: allRows.length,
    problemCount: allRows.reduce((n, r) => n + (r.cov?.count ?? 0), 0),
    taskCount: tasks.length,
    liveTaskCount: tasks.filter((t) => t.rows.length > 0).length,
    lvCount: new Set(allRows.map((r) => r.lvNo)).size,
  };
}
