/* =========================================================================
   商品カタログ Vol レベル SSOT
   タスク（11 ライン定義）× Lv × Vol を定義する単一ソース。
   ローンチ公開は 9 ライン＝scale/shrink のみ LAUNCH_HIDDEN（capabilities.ts）で
   公開カタログ・商品ルートから除外（データは温存・将来そのまま再投入可）。LAUNCH_TASKS 参照。
   catalog.tsx の GROUPS（表示コピー・Fig）はここから lvCounts() で巻数を導出する。
   出典: pack-design §11.6/§12.2/§12.7・pack-tasks §15-22。
   - sku slug 形式: {task}-lv{n}-vol{m}（同一 Lv ×同一グリッドの巻が存在するため
     grid ではなく Vol 番号で一意化。旧 copy-lv2-4x4 は SKU_ALIASES で温存）
   - status は定義しない＝入稿の有無から導出する。published/{sku}.json があれば
     "live"（詳細ページあり）、無ければ "scaffold"（一覧に「準備中」で陳列のみ）。
     atelier の「公開する」が published/ と skus.ts を書く＝そこが公開状態の唯一の入口。
     巻を店から下げたいときは status ではなく hidden（catalog-extra の patch）を使う
   - 2026-06-19 絵柄ライン完全削除（旧 motif タスク 7 巻廃止）。
     copy 任は図形のみ。/products/motif は /products/copy へリダイレクト維持
   ========================================================================= */

import catalogExtra from "./catalog-extra.json";
import { isLaunchHidden } from "./capabilities";
/* 入稿済み sku の文字列配列だけ（問題データ本体は published/index.ts 側）。
   data.ts は全ページから import されるので、ここで重い index.ts を読んではいけない。 */
import { PUBLISHED_SKUS } from "./problems/published/skus";

export type VolStatus = "live" | "scaffold";

export type Vol = {
  sku: string;            // "copy-lv3-vol1"
  lv: 1 | 2 | 3 | 4 | 5;
  volNo: number;          // Lv 内の巻番号（Vol.1, Vol.2 …）
  grid: string;           // "4×4"・立体は "ブロック 2〜5"・拡大縮小は "3×3 → 5×5"
  variant?: string;       // 同一 Lv 内の差分（縦軸/横軸・欠け少なめ/多め 等）
  blurb: string;          // 各巻 1 文（§12.7 / §15-22 キャッチコピー）
  ageLabel: string;       // "4〜6才ごろ"（外向け「才」表記・decisions §3.45）
  status: VolStatus;      // 導出値（入稿済み＝live）。手で与えない
  /* ---- 詳細ページ用（live のみ） ---- */
  meate?: string;         // この巻のめあて（プレビュー下の一文・40字程度・この巻で鍛えたい力）
  revisions?: { ver: string; date: string; note: string }[];
};

export type ProductTask = {
  slug: string;           // URL セグメント（/products/{slug}）
  name: string;           // catalog.tsx GROUPS の name と同一文字列（突合キー）
  groupIdx: 0 | 1 | 2;    // 見て写す / かたちを動かす / 重ねる・分ける
  vols: Vol[];
};

export const PRICE = 200;
export const QUESTIONS_PER_VOL = 12;

/* ===================== まとめ買い割引（decisions §3.101） =====================
   割引はカートの冊数だけで決まる。タスク・レベルは一切見ない＝種類をまたいで数える。
   「通しプリセット」（種類の全巻・ガイド結果）は価格を持たず、この関数の入力を作るだけ。
   だから巻が増えても値付けを直す場所がない。割引ルールの SSOT は本ブロック。
   外向け表記は「まとめ買い割引」（「段」は級・段制不採用 pack-design §0.3 と衝突するため不可）。 */
export const TIERS = [
  { min: 10, rate: 0.25 },
  { min: 5, rate: 0.2 },
  { min: 3, rate: 0.15 },
] as const;

/* 適用中の割引段階（3 冊未満は null） */
export function currentTier(count: number): { min: number; rate: number } | null {
  return TIERS.find((t) => count >= t.min) ?? null;
}

/* 冊数 → 割引率（0 / .15 / .2 / .25） */
export function tierRate(count: number): number {
  return currentTier(count)?.rate ?? 0;
}

/* 冊数 → 1 冊あたりの請求額（¥200 / ¥170 / ¥160 / ¥150 ＝すべて整数）。
   Stripe も画面もこの単価を共有するため、合計が 1 円もズレない。 */
export function unitPrice(count: number): number {
  return Math.round(PRICE * (1 - tierRate(count)));
}

/* 冊数 → 請求合計（税込） */
export function cartTotal(count: number): number {
  return count * unitPrice(count);
}

export const LEVEL_NAMES = ["入門編", "初級編", "基礎編", "応用編", "発展編"];

/* レベル別 対象年齢のめやす（Lv.1→5 順・才表記）。LevelGraph の帯と SSOT を共有。 */
export const LEVEL_AGES = ["3〜6才", "4〜7才", "5〜8才", "6〜9才", "7才〜"];

/* 旧 URL → 正本 sku（グリッド表記時代の slug。リダイレクトで温存）。
   copy-lv2-4x4（旧 Lv.2 の 4×4）は 4×4 を Lv.3 vol1 へ一本化した際に正本を付け替え。 */
export const SKU_ALIASES: Record<string, string> = {
  "copy-lv2-4x4": "copy-lv3-vol1",
  // 2026-07-23: 移動 Lv.2 の横/縦 2 巻を「左右上下」1 巻に統合（decisions §3.85）
  "translate-lv2-vol2": "translate-lv2-vol1",
  // 2026-08-02: 回転 Lv.4 の生き残り 4×4 巻を Vol.1 へ付け替え（§3.86 の逆転・旧 Vol.2 URL を転送）
  "rotate-lv4-vol2": "rotate-lv4-vol1",
};

/* 旧タスク slug → 統合後タスク slug（タスク廃止時のリダイレクト用）
   2026-06-19: 絵柄ライン完全削除（旧 motif タスクは廃止・copy にリダイレクト） */
export const TASK_ALIASES: Record<string, string> = {
  motif: "copy",
};

/* 入稿済み＝公開（live）。atelier で「公開する」を押した巻が published/ に落ち、
   skus.ts に載る＝そのまま商品ページが生える。フラグの二重管理をしない。 */
const publishedSkus = new Set(PUBLISHED_SKUS);
export const isPublished = (sku: string): boolean => publishedSkus.has(sku);

const v = (
  sku: string, lv: 1 | 2 | 3 | 4 | 5, volNo: number, grid: string,
  blurb: string, ageLabel: string, variant?: string,
): Vol => ({
  sku, lv, volNo, grid, blurb, ageLabel, variant,
  status: isPublished(sku) ? "live" : "scaffold",
});

export const PRODUCT_TASKS: ProductTask[] = [
  /* ============ A. 見て写す ============ */
  {
    /* 2026-06-19: 絵柄ライン完全削除。模写は図形のみで運用。
       /products/motif → /products/copy リダイレクトは TASK_ALIASES で維持 */
    slug: "copy", name: "模写", groupIdx: 0,
    vols: [
      {
        ...v("copy-lv1-vol1", 1, 1, "3×3", "はじめての点描写に。点と点を結ぶ「まっすぐ」から。", "3〜6才ごろ"),
        meate: "たて・よこのまっすぐな線だけでできた、2〜3本のシンプルな形からスタート。「見本のどの点とどの点がつながっているか」を一つずつ目で確かめ、同じ位置の点を見つけて線で結ぶ——点描写の土台となる『見て、探して、写す』の手順を、いちばんやさしい形でじっくり身につけます。",
      },
      {
        ...v("copy-lv2-vol1", 2, 1, "3×3", "「ななめ」デビュー。同じ3×3で、少しだけ世界が広がる。", "4〜6才ごろ"),
        meate: "たて・よこに加えて、ななめの線がはじめて登場します。同じ3×3の小さな盤面のまま、「右上がりか、左上がりか」という線の向きを見分け、斜めに離れた点どうしを正しく結ぶ練習に集中。タテヨコだけの世界から一歩ふみ出し、線の“傾き”に目を向けるはじめの一歩です。",
      },
      {
        ...v("copy-lv3-vol1", 3, 1, "4×4", "線が増えて、交差が登場。「見て、写す力」が育つ。", "5〜7才ごろ"),
        meate: "線の本数が増え、線と線が交わる『交差』がはじめて現れます。重なって見える部分も、「どの線がどこからどこまで引かれているか」を一本ずつ落ち着いて追いかけ、ほどいて写しとる練習です。ごちゃっと見える形を分解して捉える、観察の解像度がぐんと上がる巻です。",
      },
      {
        ...v("copy-lv3-vol2", 3, 2, "5×5", "標準サイズの5×5へ。基礎のしあげに。", "5〜8才ごろ"),
        meate: "標準サイズの5×5で、ななめの線も交差も増え、左右・上下に対称な少し複雑な形が登場します。部分の線を写しながらも、つねに全体のかたちを見渡してバランスを確かめる——“木を見て森も見る”見方が求められます。基礎の総しあげとして、形をまるごと捉える力を固めます。",
      },
      {
        ...v("copy-lv4-vol1", 4, 1, "4×4", "45°じゃないナナメが初登場。まずは小さな4×4で、めずらしい傾きに集中。", "6〜8才ごろ"),
        meate: "これまでの45°のナナメに加えて、45°ではない“ちょっと変わった傾き”の線がはじめて登場します。見なれない角度は写しにくいので、まずは点の少ない4×4の盤面で、線がどの点からどの点へ向かうのかを一本ずつていねいに見極める練習に集中します。『なんとなく似ている』で済ませない、ワンランク上の観察の精度を養う巻です。",
      },
      {
        ...v("copy-lv4-vol2", 4, 2, "5×5", "45°じゃないナナメのまま、盤面を5×5へ。少し広い面で写しきろう。", "6〜9才ごろ"),
        meate: "応用編の非45°のナナメはそのままに、盤面が4×4から5×5へと広がります。線の本数も増え、めずらしい傾きの線を、より広い面の中で点の位置を見失わずに写しとります。非45°に慣れながら盤面の広さにも対応する——観察の精度と空間の保持力をあわせてきたえる巻です。",
      },
      {
        ...v("copy-lv5-vol1", 5, 1, "6×6", "発展編のはじまり。広い6×6で、複雑なかたちに挑む。", "7才〜"),
        meate: "発展編の入り口。盤面が6×6に広がり、ななめ・交差・複数のかたまりが入りまじった複雑な形に挑みます。まず全体のかたちをおおまかにつかんでから、細部を一本ずつ合わせていく——複雑な図形を読み解いて写しとる、発展編の土台となる力を養います。",
      },
      {
        ...v("copy-lv5-vol2", 5, 2, "7×7", "盤面は7×7へ。自分で解いて2分かかりました。1問目のソフトクリームは、作っていていちばん楽しかった一問。", "7才〜"),
        meate: "盤面が7×7へ。点の数も線の密度も上がり、ななめ・交差・複数のかたまりが入りまじった、大人でも手ごたえのある複雑な形に挑みます。全体の構造をおおまかにつかんでから細部を一本ずつ詰めていく——複雑な図形を読み解いて正確に再現する力を固めます。",
      },
      {
        ...v("copy-lv5-vol3", 5, 3, "8×8", "8×8の大盤面に、絵になる形だけを12問。ロボット・どうぶつ・くるま・星——親子でどちらが速いか競える一冊。", "7才〜"),
        meate: "盤面を8×8まで広げた、模写のいちばん上の巻。線の本数も傾きの種類も増え、一本ずつ写すだけでは途中で迷子になります。まず「これは何の絵か」をつかみ、頭・胴・車輪といったまとまりごとに区切って攻める——大きな図を部分に分けて計画的に写しとる、大人でも手ごたえのある総仕上げの巻です。",
      },
    ],
  },
  {
    /* 立体（斜投影＝キャビネット図・矩形点格子）。旧「ブロック数」は廃止・2026-07-01 ゼロベース再設計。
       巻＝難易度（Lv.3・Lv.4＝見える辺だけ／Lv.5＝隠れ辺フル）／中身は形カタログの混合＝5かたち×3変種。
       各巻に立方体・直方体・L字・三角柱・階段・家・門・錐・塔・複合 等を混ぜる（decisions §3.57）。 */
    slug: "solid", name: "模写（立体）", groupIdx: 0,
    vols: [
      {
        ...v("solid-lv3-vol1", 3, 1, "はこ・きほんの形", "立方体・直方体・L字・三角柱・階段。見える辺だけで、いろいろな立体を写す。", "5〜8才ごろ", "見える辺だけ・5かたち"),
        meate: "立方体・直方体・L字・三角柱・階段——立体をななめから見た図を、見える辺だけで写します。平面の点描写とちがい、同じ長さの辺が紙の上では傾いて見えるのがむずかしいところ。奥ゆきをあらわすななめの線に慣れ、立体を紙に写す入口を開く巻です。",
      },
      {
        ...v("solid-lv4-vol1", 4, 1, "組む・柱・屋根", "段差・三角柱・家・門・小さな錐。見える辺だけで、組み合わさった立体へ。", "6〜9才ごろ", "見える辺だけ・組む形"),
        meate: "段差・三角柱・家・門・小さな錐——ひとつの箱ではなく、いくつかの形が組み合わさった立体を写します。基礎の巻と同じく描くのは見える辺だけですが、屋根や柱で線の向きが増え、どこが手前でどこが奥かを見分ける目が必要になります。組み立てられた形を部分に分けて読み取り、順に写していく力を育てる巻です。",
      },
      v("solid-lv5-vol1", 5, 1, "錐・空洞・複合", "四角錐・空洞・大階段・塔・複合建築。隠れ辺をすべて点線で写す発展編。", "7才〜", "隠れ辺フル・5かたち"),
    ],
  },
  {
    /* 欠け補完（2026-07-01 再構成・decisions §3.58）：模写の再校正ラダーをベースに
       Lv.2〜5 各編 Vol.1 のみ＝全4巻。主ドライバー＝欠け本数（1-2→2-3→3-4→4-6）。
       グリッド梯子は 3→4→5→6・Lv.4 で非45°解禁（slopes any・許可のみ）。 */
    slug: "fill", name: "欠け補完", groupIdx: 0,
    vols: [
      {
        ...v("fill-lv2-vol1", 2, 1, "3×3", "はじめての欠け補完。ナナメも入る3×3で、足りない線をさがそう。", "4〜6才ごろ", "欠け1〜2本"),
        meate: "見本の図形には線が1〜2本足りていません。完成形を思いうかべながら「どこが欠けているか」を見つけ出し、足りない線をおぎなって形を仕上げます。ナナメの線も入る3×3のやさしい形で、『見て写す』とは逆向きに、推理するように見る目の第一歩を育てます。",
      },
      {
        ...v("fill-lv3-vol1", 3, 1, "4×4", "4×4で線が増えて交差も。欠け2〜3本を見つけて補う。", "5〜8才ごろ", "欠け2〜3本"),
        meate: "盤面が4×4に広がり、線の交差も現れます。欠けは2〜3本に増え、残っている線と形のバランスを手がかりに「足りない線」を一本ずつ特定します。複雑になった形でも、全体像から欠けを逆算する見方をしっかり固める巻です。",
      },
      {
        ...v("fill-lv4-vol1", 4, 1, "5×5", "5×5・いろいろな角度の線へ。欠け3〜4本の応用編。", "6〜9才ごろ", "欠け3〜4本"),
        meate: "5×5の広い盤面に、45°以外の角度の線も混ざってきます。欠けは3〜4本。線の数が増えたぶん見落としが起きやすく、広い面を端から端まで見渡して、傾きの珍しい線の欠けも取りこぼさず補完しきる——注意力と全体把握力の応用編です。",
      },
      {
        ...v("fill-lv5-vol1", 5, 1, "6×6", "最大6×6・欠け4〜6本。全体像を復元する総仕上げ。", "7才〜", "欠け4〜6本"),
        meate: "最大盤面の6×6で、欠けは4〜6本。形の多くの部分が抜けた状態から、残った線と対称性を頼りに完成形を推理して描き起こします。限られた手がかりから全体像を確信を持って復元する、欠け補完の総仕上げです。",
      },
    ],
  },
  /* ============ B. かたちを動かす ============ */
  {
    /* 鏡（2026-07-01 再々設計・decisions §3.59）：軸はレベルではなく印刷時の並び選択
       （横並び=左右反転／縦並び=上下反転・maker-mirror と同一 UX）。みほんは盤面全体を使う。
       レベルは図形の複雑さのみ＝模写連動のグリッド梯子 3→4→5→6（maker の盤面上限と一致）。 */
    slug: "mirror", name: "鏡", groupIdx: 1,
    vols: [
      {
        ...v("mirror-lv2-vol1", 2, 1, "3×3", "「鏡うつし」デビュー。3×3のやさしい形を、鏡の反対側に描こう。", "4〜6才ごろ"),
        meate: "鏡の線を境に、見本をパタンと折り返した「鏡うつし」を描きます。見本の点が、鏡の線からおなじ距離だけ反対側のどこへ移るか——位置を“裏返して”考える、点描写とはひと味ちがう空間の操作にはじめて挑戦します。3×3のやさしい形で感覚をじっくりつかみます。紙面の並びで、左右の鏡にも上下の鏡にもできます。",
      },
      {
        ...v("mirror-lv3-vol1", 3, 1, "4×4", "線が増えて交差も登場。4×4の鏡うつしをしっかり。", "5〜8才ごろ"),
        meate: "盤面が4×4に広がり、線が増えて交差も現れます。裏返す線の本数が多くなるぶん、一本ずつ「鏡の向こう側のどこへ移るか」を正確に対応させる根気が要ります。複雑になった形でも対称に写しとる、鏡うつしの基礎を固める巻です。",
      },
      {
        ...v("mirror-lv4-vol1", 4, 1, "5×5", "5×5の広い盤面へ。はなれた点の対応づけに挑む。", "6〜9才ごろ"),
        meate: "5×5の広い盤面で、鏡の線から遠い点も増えてきます。「鏡から3つ目の点は、反対側の3つ目へ」——距離の対応づけを、離れた点でも崩さずやりきる集中力が問われます。広い空間で位置を裏返す、応用の巻です。",
      },
      {
        ...v("mirror-lv5-vol1", 5, 1, "6×6", "最大6×6。複雑な形の鏡うつし、総仕上げ。", "7才〜"),
        meate: "最大盤面の6×6。線の数も密度も最大の複雑な形を、まるごと鏡うつしします。全体の構造をつかんでから一本ずつ正確に裏返していく——空間の位置関係を自在に操作する力を完成させる、鏡タスクの総仕上げです。",
      },
    ],
  },
  {
    slug: "translate", name: "移動", groupIdx: 1,
    vols: [
      {
        ...v("translate-lv2-vol1", 2, 1, "3×3", "「ずらす」デビュー。形はそのまま、左右や上下にスライドするだけ。", "4〜6才ごろ", "左右上下"),
        meate: "形はそのままに、見本を左右または上下へまるごとスライドさせて描きます。かたちを変えず位置だけを動かす——回転や鏡とちがって見た目は変わらないぶん、「何マスぶん動いたか」を数える目が主役になります。3×3のやさしい形で、移動の考え方の第一歩をつかみます。",
      },
      {
        ...v("translate-lv3-vol1", 3, 1, "4×4", "移動量が2マスに。上下左右、動いた数をきちんと数えてずらす。", "5〜7才ごろ", "左右上下2マス"),
        meate: "ずらす量が2マスに増えます。方向は左右上下のまま、「どちらへ・いくつ動いたか」を数えて形をまるごと移しかえます。4×4に広がった盤面では1マスずれの取りちがえが起きやすいところ——移動量を正確に数える目を育てる巻です。",
      },
      {
        ...v("translate-lv3-vol2", 3, 2, "4×4", "斜めにもずらせる。4×4でナナメ方向の感覚を養う。", "5〜7才ごろ", "斜め"),
        meate: "ずらす向きにナナメが加わります。右へ1・下へ1のように、たてとよこの動きが同時に起きるのがナナメ移動。4×4の盤面で、点が斜めにいくつ分ずれたのかを読み取り、形をくずさず移しかえる——移動の感覚を二方向へ広げる巻です。",
      },
      {
        ...v("translate-lv4-vol1", 4, 1, "5×5", "「右に2、下に1」など2方向同時の移動を、5×5の広い盤面で。", "6〜9才ごろ", "複合"),
        meate: "「右に2、下に1」のように、たてとよこで動く量がちがう複合の移動に挑みます。2方向ぶんのずれを両方おぼえたまま描き進める必要があり、5×5の広い盤面では途中で1マスずれる取りちがえが起きやすいところ。数えて動かす正確さをきたえる応用編です。",
      },
      {
        ...v("translate-lv5-vol1", 5, 1, "6×6", "たてとよこ、2つの向きを組み合わせて動かします。6×6の最終巻。", "7才〜", "複合"),
        meate: "最大盤面の6×6。線が多く密な形を、2方向ぶんの移動量を保ったまままるごと移しかえます。形の複雑さと盤面の広さが重なり、一本ずつ数えなおしていては追いつきません。形の特徴を手がかりにひとかたまりとして動かす——移動の総仕上げです。",
      },
    ],
  },
  {
    slug: "rotate", name: "回転", groupIdx: 1,
    vols: [
      {
        ...v("rotate-lv2-vol1", 2, 1, "3×3", "「回す」デビュー。紙をまわした景色を、点でなぞろう。", "4〜6才ごろ", "90°右回り"),
        meate: "見本を右へ90°まわしたときの形を描きます。紙をくるりと回した景色を頭の中で思いうかべ、たての線はよこへ、よこの線はたてへ——線の向きがそっくり入れかわることに気づくのが第一歩。3×3のやさしい形で、回すと点がどこへ移るのかをゆっくり確かめながら身につけます。",
      },
      {
        ...v("rotate-lv3-vol1", 3, 1, "4×4", "線が増えて交差も。90°右まわりを4×4で深める。", "5〜7才ごろ", "90°右回り"),
        meate: "盤面が4×4に広がり、線が増えて交差も現れます。回す向きは右90°のまま、点の数が増えたぶん「この点は回したあとどこへ行くか」の対応づけがぐっと難しくなります。中心からの距離を手がかりに、一本ずつ移していく——回転の基礎を固める巻です。",
      },
      {
        ...v("rotate-lv3-vol2", 3, 2, "4×4", "左まわりデビュー。同じ枠のまま方向だけ反対へ。", "5〜8才ごろ", "90°左回り"),
        meate: "同じ4×4のまま、回す向きだけが左90°に変わります。右まわりで身につけた手つきがそのままでは通じません。向きが反対になれば点の移り先も反対側になる——それを体感として知り、「どちら回りか」を毎回たしかめてから描き出す慎重さを育てる巻です。",
      },
      {
        ...v("rotate-lv4-vol1", 4, 1, "4×4", "180°デビュー。さかさまの世界を、4×4で読み解く。", "6〜9才ごろ", "180°"),
        meate: "180°＝さかさまの世界に挑みます。上下も左右もまとめて反対になるため、見本のどこが「下」に来るのかを取りちがえやすいところ。4×4の盤面で、中心をはさんで反対側の同じ距離へ点を移す——回転の考え方をいちばんはっきり体感できる巻です。",
      },
      v("rotate-lv5-vol1", 5, 1, "5×5", "最大5×5。右まわり・左まわり・さかさまが1冊に混ざる、回転の総仕上げ。", "7才〜", "右・左・180°混在"),
    ],
  },
  {
    slug: "scale", name: "拡大", groupIdx: 1,
    vols: [
      v("scale-lv4-vol1", 4, 1, "3×3 → 5×5", "「倍率」デビュー。かんたんな形を2倍に大きく描こう。", "7〜9才ごろ", "2倍拡大・対称"),
      v("scale-lv4-vol2", 4, 2, "3×3 → 5×5", "いろいろな形を2倍に拡大。形の特徴をつかむ目を育てる。", "7〜10才ごろ", "2倍拡大・非対称"),
      v("scale-lv4-vol3", 4, 3, "4×4 → 7×7", "4×4の形を7×7へ拡大。広い盤面でも正確に。", "8〜10才ごろ", "2倍拡大・非対称"),
    ],
  },
  {
    slug: "shrink", name: "縮小", groupIdx: 1,
    vols: [
      v("shrink-lv5-vol1", 5, 1, "5×5 → 3×3", "縮小デビュー。5×5の形を半分の3×3に。逆操作に挑戦。", "8〜11才ごろ", "1/2縮小・対称"),
      v("shrink-lv5-vol2", 5, 2, "5×5 → 3×3", "いろいろな形を1/2に縮小。形を残しながらコンパクトに。", "9〜11才ごろ", "1/2縮小・非対称"),
      v("shrink-lv5-vol3", 5, 3, "7×7 → 4×4", "7×7の形を4×4へ縮小。倍率マスターの最終巻。", "9才〜", "1/2縮小・非対称"),
    ],
  },
  /* ============ C. 重ねる・分ける ============ */
  {
    /* かさねは模写軸ラダー（decisions §3.71/§3.72）: Lv＝図形要素（45°→45°必須+交差→
       非45°必須）が模写Lvに同期・絡み（A・B間の交差数）も Lv とともに増え Lv.5 で最大化。
       各Lv 1巻（Vol.1/Vol.2 の絡み分冊は差が小さく廃止＝§3.72） */
    slug: "overlay", name: "かさね", groupIdx: 2,
    vols: [
      {
        ...v("overlay-lv2-vol1", 2, 1, "3×3", "「かさねる」デビュー。2つの形を重ねた姿を描いてみよう。", "4〜6才ごろ"),
        meate: "2つの見本を1枚に重ねた姿を描きます。片方を写してからもう片方を足すのではなく、2つが同じ盤面に同居したらどう見えるかを先に思いうかべるのがねらい。3×3のやさしい形で、重なった線は1本になるという合成のきまりを手を動かしながら覚えます。",
      },
      v("overlay-lv3-vol1", 3, 1, "4×4", "4×4・ナナメも交差も登場。絡みはひかえめに、合成の型をつかむ。", "5〜8才ごろ"),
      v("overlay-lv4-vol1", 4, 1, "5×5", "45°ではない傾きが、重ねる形に入ります。盤面は5×5。交わりはまだ穏やかです。", "6〜9才ごろ"),
      v("overlay-lv5-vol1", 5, 1, "6×6", "6×6・絡み最大。かさねマスターへ。", "7才〜"),
    ],
  },
  {
    /* 分解はかさねの逆操作＝同じ模写軸ラダー（decisions §3.73）: Lv＝図形要素が
       模写Lv同期・絡みも Lv とともに増え Lv.5 で最大化。各Lv 1巻 */
    slug: "decompose", name: "分解", groupIdx: 2,
    vols: [
      v("decompose-lv2-vol1", 2, 1, "3×3", "「とりだす」デビュー。重なった形から、片方だけを見つけて描こう。", "4〜6才ごろ"),
      v("decompose-lv3-vol1", 3, 1, "4×4", "盤面が4×4へ。まずは絡みの少ない図で、引き算の手つきをつかむ。", "5〜8才ごろ"),
      v("decompose-lv4-vol1", 4, 1, "5×5", "引くほうの形に、めずらしい角度の線。どちらの線を残すかの見分けが山場です。", "6〜9才ごろ"),
      v("decompose-lv5-vol1", 5, 1, "6×6", "密に重なった6×6から、片方だけを抜き出す。分解の最終巻です。", "7才〜"),
    ],
  },
  {
    /* 折り重ねはかさね・分解と同じ模写軸ラダー（decisions §3.74）: 鏡×かさねの
       ハイブリッド＝能力ラダー最終段。Lv＝図形要素が模写Lv同期・絡みも Lv とともに
       増え Lv.5 で最大化。各Lv 1巻 */
    slug: "fold", name: "折り重ね", groupIdx: 2,
    vols: [
      v("fold-lv2-vol1", 2, 1, "3×3", "「折り重ね」デビュー。問題1を折り返して、問題2に重ねた形を描こう。", "4〜6才ごろ"),
      v("fold-lv3-vol1", 3, 1, "4×4", "4×4になって、折り目をまたぐ線が増えてきます。", "5〜8才ごろ"),
      v("fold-lv4-vol1", 4, 1, "5×5", "折り返す線が45°から外れます。折る前と後で、傾きがどう変わるか。", "6〜9才ごろ"),
      v("fold-lv5-vol1", 5, 1, "6×6", "6×6。折り返した線どうしが、何度もぶつかります。折り重ねの最後の一冊。", "7才〜"),
    ],
  },
];

/* atelier から追加された Vol を該当タスクへ合流（既存 PRODUCT_TASKS は不変・SSOT を壊さない）。
   catalog-extra.json は /api/atelier/ladder/add-vol が書く。重複 sku はスキップ。
   status は持たない（追加巻も入稿の有無から導出＝v() 内で判定）。 */
type ExtraVol = {
  task: string; sku: string; lv: number; volNo: number; grid: string;
  variant?: string; blurb: string; ageLabel: string;
};
for (const ev of (catalogExtra.vols ?? []) as ExtraVol[]) {
  const t = PRODUCT_TASKS.find((x) => x.slug === ev.task);
  if (!t || t.vols.some((x) => x.sku === ev.sku)) continue;
  t.vols.push(v(ev.sku, ev.lv as 1 | 2 | 3 | 4 | 5, ev.volNo, ev.grid, ev.blurb, ev.ageLabel, ev.variant));
}

/* atelier の編集（レベル定義見直し・Vol メタ編集・非表示）が書く表示メタ上書き。
   既存 PRODUCT_TASKS（ハードコード）を data.ts を触らず dev で反映するための層。
   /api/atelier/{ladder,vol} が書く。副作用なしの単純マージ＋hidden 除外。
   status は patch できない（公開状態の単一ソースは published/＝入稿の有無）。 */
type ExtraPatch = {
  sku: string; grid?: string; blurb?: string; ageLabel?: string;
  variant?: string; hidden?: boolean;
};
const hiddenSkus = new Set<string>();
for (const p of (catalogExtra.patches ?? []) as ExtraPatch[]) {
  if (p.hidden) hiddenSkus.add(p.sku);
  const hit = volBySku(p.sku);
  if (!hit) continue;
  if (p.grid != null) hit.vol.grid = p.grid;
  if (p.blurb != null) hit.vol.blurb = p.blurb;
  if (p.ageLabel != null) hit.vol.ageLabel = p.ageLabel;
  if (p.variant != null) hit.vol.variant = p.variant;
}
/* hidden は PRODUCT_TASKS から除外（公開・atelier 双方から消える。復活は catalog-extra の patch を消す） */
if (hiddenSkus.size > 0) {
  for (const t of PRODUCT_TASKS) t.vols = t.vols.filter((x) => !hiddenSkus.has(x.sku));
}

/* ローンチ公開タスク（LAUNCH_HIDDEN を除外）。公開ルート生成・件数の基準。
   PRODUCT_TASKS（全件）はルート解決・所有判定で温存する。 */
export const LAUNCH_TASKS: ProductTask[] = PRODUCT_TASKS.filter((t) => !isLaunchHidden(t.slug));

/* ===================== ヘルパー ===================== */

export function taskBySlug(slug: string): ProductTask | undefined {
  return PRODUCT_TASKS.find((t) => t.slug === slug);
}

export function volBySku(sku: string): { task: ProductTask; vol: Vol } | undefined {
  for (const task of PRODUCT_TASKS) {
    const vol = task.vols.find((x) => x.sku === sku);
    if (vol) return { task, vol };
  }
  return undefined;
}

/* 同一タスク内で lv→volNo 順に並べたときの前後の Vol（atelier の戻る/進む用）。
   端では該当側が undefined。task をまたいだ移動はしない。 */
export function adjacentVols(sku: string): { prev?: Vol; next?: Vol } {
  const hit = volBySku(sku);
  if (!hit) return {};
  const ordered = [...hit.task.vols].sort((a, b) => a.lv - b.lv || a.volNo - b.volNo);
  const i = ordered.findIndex((v) => v.sku === sku);
  if (i < 0) return {};
  return { prev: ordered[i - 1], next: ordered[i + 1] };
}

/* Lv.1〜5 の各 Vol 数（catalog.tsx GROUPS の lv 配列はここから導出） */
export function lvCounts(slug: string): number[] {
  const task = taskBySlug(slug);
  const counts = [0, 0, 0, 0, 0];
  task?.vols.forEach((x) => { counts[x.lv - 1] += 1; });
  return counts;
}

/* ★いちばんやさしい巻 ＝ 最小 Lv の Vol.1（おすすめではなく事実表示・decisions §4 コンセプト＝じぶんで選ぶ店） */
export function firstVol(task: ProductTask): Vol {
  return [...task.vols].sort((a, b) => a.lv - b.lv || a.volNo - b.volNo)[0];
}

/* 通しプリセットを出せるか＝そのタスクの巻がすべて入稿済み。
   1 巻でも scaffold なら未入稿を含む通しになるため出さない。
   検品→publish が進むと自動で点灯する（コード変更不要）。 */
export function isTaskComplete(task: ProductTask): boolean {
  return task.vols.length > 0 && task.vols.every((v) => v.status === "live");
}

/* 通しプリセットの構成 sku（Lv→Vol 順）。カートへ渡す入力そのもの。 */
export function taskPresetSkus(task: ProductTask): string[] {
  return [...task.vols]
    .sort((a, b) => a.lv - b.lv || a.volNo - b.volNo)
    .map((v) => v.sku);
}

/* 商品名（外向け）: "模写 入門編 Vol.2 — 4×4" */
export function volTitle(task: ProductTask, vol: Vol): string {
  return `${task.name} ${LEVEL_NAMES[vol.lv - 1]} Vol.${vol.volNo} — ${vol.grid}`;
}

/* Vol の URL（live は詳細・scaffold はタスク一覧の該当 Lv アンカー） */
export function volHref(task: ProductTask, vol: Vol): string {
  return vol.status === "live" ? `/products/${vol.sku}` : `/products/${task.slug}#lv${vol.lv}`;
}
