/* =========================================================================
   メーカー機能ゲート SSOT（おためし点描写メーカーの tier 別ケイパビリティ）
   無料ゲスト / ¥480 スタンダード / ¥980 フル の 3 段。
   絞り原則「深さは削るな・幅と量を絞れ」（maker-monetization-2026-06）:
     コア体験（模写を 1 枚作って印刷）は無料で完璧に。絞るのは量産・仕上げ・所有・他タスク。
   純粋 TS（"use client" の MakerApp からも import するため server-only な依存を持たない）。
   ========================================================================= */
import type { PaperKey, DotSize, LayoutPerPage } from "./print";

export type Tier = "guest" | "entry" | "full";

// メーカーの盤面サイズ。entry / full とも 8×8 まで（guest のみ 5×5・幾何コードは dots 駆動なので 7/8 も自動成立）。
// 8 が実用上限: クリック式エディタの当たり判定（VIEW200・r9）が重ならない最大が約 8〜9。
export type GridSize = 3 | 4 | 5 | 6 | 7 | 8;

export type Capabilities = {
  tier: Tier;
  gridSizes: GridSize[];        // 選べる盤面サイズ
  perPageMax: LayoutPerPage;    // 1 ページ最大問数（用紙別 paperMax とは別の tier 上限）
  papers: PaperKey[];           // 選べる用紙（A4 縦横は無料死守・B4/A3 は有料）
  dotSizes: DotSize[];          // 選べる点サイズ（無料は中のみ）
  nameField: boolean;           // 記名・日付欄
  savedMax: number;             // 保存できる問題数（full は Infinity）
  dailyExports: number | null;  // 1 日の DL ソフト上限（null = 無制限）
  allTasks: boolean;            // 鏡/回転/欠け補完/立体など模写以外（full のみ）
};

const ALL_PAPERS: PaperKey[] = ["A4-P", "A4-L", "B4-P", "B4-L", "A3-P", "A3-L"];
const ALL_DOTS: DotSize[] = ["s", "m", "l"];

const GUEST: Capabilities = {
  tier: "guest",
  gridSizes: [3, 4, 5],
  perPageMax: 3,
  papers: ["A4-P", "A4-L"],
  dotSizes: ALL_DOTS, // 点の大きさは無料でも全段（オーナー指示 2026-06-21・制限不要）
  nameField: false,
  savedMax: 5,
  dailyExports: 5,
  allTasks: false,
};

const ENTRY: Capabilities = {
  tier: "entry",
  gridSizes: [3, 4, 5, 6, 7, 8], // entry でも 8×8 まで開放（full と同値・グリッドでは tier を絞らない）
  perPageMax: 12,
  papers: ALL_PAPERS,
  dotSizes: ALL_DOTS,
  nameField: true,
  savedMax: Infinity, // 模写は制限なし（full と同等）＝保存も無制限
  dailyExports: null,
  allTasks: false,    // 唯一の制限: 模写以外（鏡/回転/欠け補完/立体）は full のみ
};

const FULL: Capabilities = {
  ...ENTRY,
  tier: "full",
  allTasks: true, // スタンダード（entry）との唯一の差: 模写以外のタスクも解放。grid/保存/用紙は同等。
};

export function capabilities(tier: Tier): Capabilities {
  return tier === "full" ? FULL : tier === "entry" ? ENTRY : GUEST;
}

/* プラン表示メタ（/pricing・アップセル・/account 共用 SSOT）。
   tier を「どこから解放されるか」の表示にも使う。 */
export type PlanKey = "entry" | "full";

export const PLANS: Record<PlanKey, {
  key: PlanKey; name: string; yen: number; tagline: string; for: string;
}> = {
  entry: {
    key: "entry",
    name: "スタンダード",
    yen: 480,
    tagline: "模写を、たくさん・きれいに。",
    for: "模写プリントを家庭でどんどん刷りたい親に。",
  },
  full: {
    key: "full",
    name: "フル",
    yen: 980,
    tagline: "全タスク（鏡・回転・欠け補完・立体）まで、ぜんぶ。",
    for: "鏡・回転・欠け補完・立体まで自作したい親に。",
  },
};

// 「この機能はどのプランで解放されるか」の表示用ラベル。
export function unlockLabel(tier: Tier): string {
  if (tier === "entry") return `${PLANS.entry.name}（¥${PLANS.entry.yen}/月）で解放`;
  return `${PLANS.full.name}（¥${PLANS.full.yen}/月）で解放`;
}
