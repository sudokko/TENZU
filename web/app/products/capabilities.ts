/* =========================================================================
   メーカー entitlement SSOT（per-maker 買い切り・所有モデル）
   横断判断 decisions.md §4.6（買い切り化）・§4.7（ログイン廃止・所有モデル）。

   旧モデル（撤回）: tier(guest/entry/full)・サブスク・段階解放 MAKER_MIN_TIER。
   現モデル: entitlement = 「所有するメーカーの集合」owned: MakerKey[]。
     - copy（模写）は無料で 4×4 まで使える（COPY_FREE_CAPS・グリッド以外は全機能開放・
       PDF 書き出しも無料）。¥980 買い切りで 5×5〜8×8 を解放する＝ゲートはグリッドサイズ 1 本。
     - その他 9 メーカーは ¥980 買い切り。未所有は FREE_CAPS で触れるが PDF 書き出しは所有が要る。
   有料ゲート: copy＝グリッドサイズ（5×5 以上）／その他 9＝PDF 書き出し。
     いずれもページ入室はゲートしない（全メーカー触れる・プレビュー可）。
   純粋 TS（"use client" の各 MakerApp からも import するため server-only な依存を持たない）。
   ========================================================================= */
import type { PaperKey, DotSize, LayoutPerPage } from "./print";

export type MakerKey =
  | "copy" | "solid" | "mirror" | "rotate" | "fill"     // 1 図形の操作（solid=立体模写）
  | "overlay" | "fold" | "decompose"                    // 2 図形（重ね系）
  | "scale" | "shrink" | "translate";                   // 座標変換

// 無料コア（買い切り対象外・常時利用可）。
export const FREE_MAKER: MakerKey = "copy";

// ¥980 買い切りで売る 9 メーカー（copy 以外）。/makers・/pricing の表示はこの集合が基準。
export const PAID_MAKERS: readonly MakerKey[] = [
  "solid", "mirror", "rotate", "fill", "overlay", "fold", "decompose", "scale", "shrink", "translate",
];

// 買い切りで「購入できる」全メーカー。copy も 5×5 以上の解放を買えるためここに含む
// （表示は無料エントリのまま）。Checkout 受付・Stripe 履歴からの所有再構成はこの集合で検証する。
export const PURCHASABLE_MAKERS: readonly MakerKey[] = [FREE_MAKER, ...PAID_MAKERS];

// ローンチ非公開（実装済・公開リストから除外・将来そのまま再投入可）。decisions §3.53。
// 拡大・縮小＝倍率・分数の概念依存が重く優先度低。平行移動はローンチ公開に復帰（2026-06-29）。
// 効く範囲: メーカー表示（makersInGroup）・商品カタログ（catalog GROUPS）・
//   商品ルート（products/[slug] generateStaticParams）から除外。
// 効かない範囲: makerByKey・PURCHASABLE_MAKERS は全件維持＝購入済みユーザーは引き続き使える。
// 商品 slug とメーカー key は同一識別子（scale/shrink）なので両ドメイン共用。
export const LAUNCH_HIDDEN: readonly MakerKey[] = ["scale", "shrink"];
export const isLaunchHidden = (key: string): boolean =>
  (LAUNCH_HIDDEN as readonly string[]).includes(key);

// 1 メーカーの買い切り価格（円・無期限）。9 メーカー個別販売（全部で約 ¥8,820 相当）。
export const MAKER_PRICE = 980;

// メーカーの盤面サイズ。所有時は 8×8 まで（copy 無料は 4×4・他 9 無料は 5×5）。
// 8 が実用上限: クリック式エディタの当たり判定（VIEW200・r9）が重ならない最大が約 8〜9。
export type GridSize = 3 | 4 | 5 | 6 | 7 | 8;

export type Capabilities = {
  gridSizes: GridSize[];        // 選べる盤面サイズ
  perPageMax: LayoutPerPage;    // 1 ページ最大問数（用紙別 paperMax とは別の上限）
  papers: PaperKey[];           // 選べる用紙（A4 縦横は無料・B4/A3 は所有時）
  dotSizes: DotSize[];          // 選べる点サイズ
  nameField: boolean;           // 記名・日付欄
  savedMax: number;             // 保存できる問題数（所有時は Infinity）
  dailyExports: number | null;  // 1 日の DL ソフト上限（null = 無制限）
};

const ALL_PAPERS: PaperKey[] = ["A4-P", "A4-L", "B4-P", "B4-L", "A3-P", "A3-L"];
const ALL_DOTS: DotSize[] = ["s", "m", "l"];

// 無料（未所有のメーカー・模写）の作図上限。
const FREE_CAPS: Capabilities = {
  gridSizes: [3, 4, 5],
  perPageMax: 3,
  papers: ["A4-P", "A4-L"],
  dotSizes: ALL_DOTS, // 点の大きさは無料でも全段（オーナー指示 2026-06-21・制限不要）
  nameField: false,
  savedMax: 5,
  dailyExports: 5,
};

// そのメーカーを所有しているときの作図上限（メーカー横断で同値）。
const OWNED_CAPS: Capabilities = {
  gridSizes: [3, 4, 5, 6, 7, 8],
  perPageMax: 12,
  papers: ALL_PAPERS,
  dotSizes: ALL_DOTS,
  nameField: true,
  savedMax: Infinity,
  dailyExports: null,
};

// copy（模写）の無料上限。グリッドだけ 4×4 に絞り、ほかは全機能開放（用紙・問数・記名欄・
// 保存・DL）。5×5 以上は ¥980 買い切りで OWNED_CAPS へ＝模写のゲートはグリッドサイズ 1 本。
const COPY_FREE_CAPS: Capabilities = {
  gridSizes: [3, 4],
  perPageMax: 12,
  papers: ALL_PAPERS,
  dotSizes: ALL_DOTS,
  nameField: true,
  savedMax: Infinity,
  dailyExports: null,
};

// そのメーカーを買い切り所有しているか（copy は対象外＝無料コアは canExportPdf 側で別扱い）。
export function ownsMaker(owned: readonly MakerKey[], key: MakerKey): boolean {
  return owned.includes(key);
}

// PDF 書き出しを許可するか。copy は無料で可（4×4 まで＝グリッドゲート側で上限を絞る）。
// その他 9 メーカーは所有していれば可（書き出しが有料ゲート）。
export function canExportPdf(owned: readonly MakerKey[], key: MakerKey): boolean {
  return key === FREE_MAKER || owned.includes(key);
}

// そのメーカーを使うときの作図上限。所有していれば OWNED_CAPS、未所有なら
// copy＝COPY_FREE_CAPS（4×4・他機能開放）／その他 9＝FREE_CAPS。
export function capabilities(owned: readonly MakerKey[], key: MakerKey): Capabilities {
  if (owned.includes(key)) return OWNED_CAPS;
  return key === FREE_MAKER ? COPY_FREE_CAPS : FREE_CAPS;
}

/* =========================================================================
   表示メタ（/makers・/pricing・MakerGate・/account 共用 SSOT）。
   価格は全メーカー一律 ¥980 のため tier 別プラン表（旧 PLANS）は廃止。
   ========================================================================= */

// メーカーの価格バッジ（ハブのカード・introbar 用）。
export function makerPriceLabel(key: MakerKey): string {
  // copy（模写）は 4×4 まで無料・5×5〜は ¥980 買い切り。バッジは無料の境界を明示する。
  return key === FREE_MAKER ? "4×4まで無料" : `¥${MAKER_PRICE}`;
}

// 未所有メーカーのロック画面・購入導線の見出し。
export function makerUnlockLabel(key: MakerKey): string {
  if (key === FREE_MAKER) return "";
  return `¥${MAKER_PRICE} の買い切りで、このメーカーの PDF を書き出せます`;
}

// メーカー内の個別機能（8×8・B4/A3・記名欄・保存無制限）のロック表示ラベル。
export function featureUnlockLabel(): string {
  return `¥${MAKER_PRICE} の買い切りで解放`;
}
