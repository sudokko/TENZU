/* =========================================================================
   商品カタログ Vol レベル SSOT
   タスク（11 ライン定義）× Lv × Vol を定義する単一ソース。
   ローンチ公開は 8 ライン＝translate/scale/shrink は LAUNCH_HIDDEN（capabilities.ts）で
   公開カタログ・商品ルートから除外（データは温存・将来そのまま再投入可）。LAUNCH_TASKS 参照。
   catalog.tsx の GROUPS（表示コピー・Fig）はここから lvCounts() で巻数を導出する。
   出典: pack-design §11.6/§12.2/§12.7・pack-tasks §15-22。
   - sku slug 形式: {task}-lv{n}-vol{m}（同一 Lv ×同一グリッドの巻が存在するため
     grid ではなく Vol 番号で一意化。旧 copy-lv2-4x4 は SKU_ALIASES で温存）
   - status: "live"＝詳細ページあり / "scaffold"＝一覧に「準備中」で陳列のみ
   - 2026-06-19 絵柄ライン完全削除（旧 motif タスク 7 巻廃止）。
     copy 任は図形のみ。/products/motif は /products/copy へリダイレクト維持
   ========================================================================= */

import catalogExtra from "./catalog-extra.json";
import { isLaunchHidden } from "./capabilities";

export type VolStatus = "live" | "scaffold";

export type Vol = {
  sku: string;            // "copy-lv2-vol2"
  lv: 1 | 2 | 3 | 4 | 5;
  volNo: number;          // Lv 内の巻番号（Vol.1, Vol.2 …）
  grid: string;           // "4×4"・立体は "ブロック 2〜5"・拡大縮小は "3×3 → 5×5"
  variant?: string;       // 同一 Lv 内の差分（縦軸/横軸・欠け少なめ/多め 等）
  blurb: string;          // 各巻 1 文（§12.7 / §15-22 キャッチコピー）
  ageLabel: string;       // "4〜6才ごろ"（外向け「才」表記・decisions §3.45）
  status: VolStatus;
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

export const LEVEL_NAMES = ["はじめの一歩", "入門編", "基礎編", "応用編", "発展編"];

/* レベル別 対象年齢のめやす（Lv.1→5 順・才表記）。LevelGraph の帯と SSOT を共有。 */
export const LEVEL_AGES = ["4〜6才", "4〜7才", "5〜8才", "6〜9才", "8才〜"];

/* 旧 URL → 正本 sku（グリッド表記時代の slug。リダイレクトで温存） */
export const SKU_ALIASES: Record<string, string> = {
  "copy-lv2-4x4": "copy-lv2-vol2",
};

/* 旧タスク slug → 統合後タスク slug（タスク廃止時のリダイレクト用）
   2026-06-19: 絵柄ライン完全削除（旧 motif タスクは廃止・copy にリダイレクト） */
export const TASK_ALIASES: Record<string, string> = {
  motif: "copy",
};

const v = (
  sku: string, lv: 1 | 2 | 3 | 4 | 5, volNo: number, grid: string,
  blurb: string, ageLabel: string, status: VolStatus, variant?: string,
): Vol => ({ sku, lv, volNo, grid, blurb, ageLabel, status, variant });

export const PRODUCT_TASKS: ProductTask[] = [
  /* ============ A. 見て写す ============ */
  {
    /* 2026-06-19: 絵柄ライン完全削除。模写は図形のみで運用。
       /products/motif → /products/copy リダイレクトは TASK_ALIASES で維持 */
    slug: "copy", name: "模写", groupIdx: 0,
    vols: [
      {
        ...v("copy-lv1-vol1", 1, 1, "3×3", "はじめての点描写に。点と点を結ぶ「まっすぐ」から。", "4〜6才ごろ", "live"),
        meate: "たて・よこのまっすぐな線だけでできた、2〜3本のシンプルな形からスタート。「見本のどの点とどの点がつながっているか」を一つずつ目で確かめ、同じ位置の点を見つけて線で結ぶ——点描写の土台となる『見て、探して、写す』の手順を、いちばんやさしい形でじっくり身につけます。",
      },
      {
        ...v("copy-lv2-vol1", 2, 1, "3×3", "「ななめ」デビュー。同じ3×3で、少しだけ世界が広がる。", "4〜6才ごろ", "live"),
        meate: "たて・よこに加えて、ななめの線がはじめて登場します。同じ3×3の小さな盤面のまま、「右上がりか、左上がりか」という線の向きを見分け、斜めに離れた点どうしを正しく結ぶ練習に集中。タテヨコだけの世界から一歩ふみ出し、線の“傾き”に目を向けるはじめの一歩です。",
      },
      {
        ...v("copy-lv2-vol2", 2, 2, "4×4", "枠がひとつ大きくなった4×4。斜めにも慣れてきたら。", "4〜7才ごろ", "live"),
        meate: "盤面が4×4に広がり、使う点の数がぐっと増えます。離れた点までの距離や、ななめの線の通り道を、より広い面の中で見取る必要が出てきます。枠が大きくなっても見本と同じバランスを保って写しきる——全体を見渡しながら細部を合わせる、空間の“見取り”の力を伸ばします。",
      },
      {
        ...v("copy-lv3-vol1", 3, 1, "4×4", "線が増えて、交差が登場。「見て、写す力」が育つ。", "5〜7才ごろ", "live"),
        meate: "線の本数が増え、線と線が交わる『交差』がはじめて現れます。重なって見える部分も、「どの線がどこからどこまで引かれているか」を一本ずつ落ち着いて追いかけ、ほどいて写しとる練習です。ごちゃっと見える形を分解して捉える、観察の解像度がぐんと上がる巻です。",
      },
      {
        ...v("copy-lv3-vol2", 3, 2, "5×5", "標準サイズの5×5へ。基礎のしあげに。", "5〜8才ごろ", "live"),
        meate: "標準サイズの5×5で、ななめの線も交差も増え、左右・上下に対称な少し複雑な形が登場します。部分の線を写しながらも、つねに全体のかたちを見渡してバランスを確かめる——“木を見て森も見る”見方が求められます。基礎の総しあげとして、形をまるごと捉える力を固めます。",
      },
      {
        ...v("copy-lv4-vol1", 4, 1, "5×5", "角度いろいろ、観察力が伸びる。ゆっくり、きれいに。", "6〜8才ごろ", "live"),
        meate: "45°だけでなく、いろいろな角度の線が組み合わさり、交差も増えてきます。線の傾きや長さのわずかな違いを見極め、ときに離れた二つのかたまりを同時に見ながら、ゆっくり丁寧に再現します。『なんとなく似ている』で済ませない、ワンランク上の観察の精度と運筆を養う巻です。",
      },
      {
        ...v("copy-lv4-vol2", 4, 2, "6×6", "いつもの難しさのまま、枠をひとつ大きく。のびのび6×6。", "6〜9才ごろ", "live"),
        meate: "難しさはそのままに、盤面が6×6へと一段広がります。線の角度や交差の複雑さは応用編のまま、より広い面の中で点の位置を見失わずに最後まで写しきることに挑みます。広がった空間でも形の全体像を保ち続ける、集中力と空間の保持力をきたえる巻です。",
      },
      {
        ...v("copy-lv5-vol1", 5, 1, "7×7", "最大盤面7×7。大人でも手ごたえの、点描写マスターへ。", "8才〜", "live"),
        meate: "最大盤面の7×7。点の数も線の密度も最大で、ななめ・交差・複数のかたまりが入りまじった、大人でも手ごたえのある複雑な形に挑みます。全体の構造をおおまかにつかんでから細部を一本ずつ詰めていく——複雑な図形を読み解いて正確に再現する、点描写の総仕上げとなる力を完成させます。",
      },
    ],
  },
  {
    slug: "solid", name: "模写（立体）", groupIdx: 0,
    vols: [
      v("solid-lv3-vol1", 3, 1, "ブロック 2〜5", "立体デビュー。立方体を組んだかたちを、見て写そう。", "6〜8才ごろ", "scaffold", "単一塊・段"),
      v("solid-lv4-vol1", 4, 1, "ブロック 4〜8", "階段やテラスのかたち。立体の段差を読む目を育てる。", "7〜9才ごろ", "scaffold", "階段・テラス"),
      v("solid-lv4-vol2", 4, 2, "ブロック 5〜10", "三角柱・四角錐が登場。ナナメの辺にも慣れてきたら。", "7〜10才ごろ", "scaffold", "斜め辺導入"),
      v("solid-lv5-vol1", 5, 1, "ブロック 8〜14", "橋や中庭。真ん中に空間のあるかたちへ。", "8〜11才ごろ", "scaffold", "抜け構造"),
      v("solid-lv5-vol2", 5, 2, "ブロック 10〜16", "トンネル・空洞の複合構造。大人でも手ごたえの最終巻。", "9才〜", "scaffold", "複合構造"),
    ],
  },
  {
    slug: "fill", name: "欠け補完", groupIdx: 0,
    vols: [
      v("fill-lv1-vol1", 1, 1, "3×3", "はじめての欠け補完。「足りない線を見つける」目を育てよう。", "4〜6才ごろ", "live"),
      v("fill-lv2-vol1", 2, 1, "3×3", "ナナメ線が入った形の続きを描こう。3×3でじっくり。", "4〜6才ごろ", "live"),
      v("fill-lv3-vol1", 3, 1, "4×4", "4×4で線が増えて交差も。欠け少なめで型をつかむ。", "5〜7才ごろ", "live", "欠け少なめ"),
      v("fill-lv3-vol2", 3, 2, "4×4", "同じ4×4で欠けが多めに。全体像を推測する力が育つ。", "5〜8才ごろ", "live", "欠け多め"),
      v("fill-lv4-vol1", 4, 1, "5×5", "5×5・ナナメ入り。広い盤面で欠け少なめ。", "6〜8才ごろ", "live", "欠け少なめ"),
      v("fill-lv4-vol2", 4, 2, "5×5", "5×5で欠けが多め。空間認知の応用力を試す。", "6〜9才ごろ", "live", "欠け多め"),
      v("fill-lv5-vol1", 5, 1, "6×6", "6×6に拡大。最大盤面で欠け少なめから。", "8才〜", "live", "欠け少なめ"),
      v("fill-lv5-vol2", 5, 2, "6×6", "6×6で欠け最大。補完マスターへ。", "8才〜", "live", "欠け多め"),
    ],
  },
  /* ============ B. かたちを動かす ============ */
  {
    slug: "mirror", name: "鏡", groupIdx: 1,
    vols: [
      v("mirror-lv2-vol1", 2, 1, "3×3", "「鏡うつし」デビュー。まずは縦の線を境に、左右おなじを描こう。", "4〜6才ごろ", "live", "縦軸"),
      v("mirror-lv3-vol1", 3, 1, "4×4", "線が増えて交差も登場。縦の鏡うつしを4×4でしっかり。", "5〜7才ごろ", "live", "縦軸"),
      v("mirror-lv4-vol1", 4, 1, "3×3", "横の鏡デビュー。水面にうつる景色のように、上下を返す目を育てる。", "6〜8才ごろ", "live", "横軸"),
      v("mirror-lv4-vol2", 4, 2, "4×4", "横の鏡うつしも4×4へ。広い盤面でも落ち着いて。", "6〜9才ごろ", "live", "横軸"),
      v("mirror-lv5-vol1", 5, 1, "3×3", "ナナメの鏡デビュー。日常にない方向の反転に挑戦。", "8才〜", "live", "斜め軸"),
      v("mirror-lv5-vol2", 5, 2, "4×4", "ナナメの鏡うつしも4×4へ。空間操作の力をつける。", "8才〜", "live", "斜め軸"),
    ],
  },
  {
    slug: "rotate", name: "回転", groupIdx: 1,
    vols: [
      v("rotate-lv2-vol1", 2, 1, "3×3", "「回す」デビュー。紙をまわした景色を、点でなぞろう。", "4〜6才ごろ", "scaffold", "90°右回り"),
      v("rotate-lv3-vol1", 3, 1, "4×4", "線が増えて交差も。90°右まわりを4×4で深める。", "5〜7才ごろ", "scaffold", "90°右回り"),
      v("rotate-lv3-vol2", 3, 2, "4×4", "左まわりデビュー。同じ枠のまま方向だけ反対へ。", "5〜8才ごろ", "scaffold", "90°左回り"),
      v("rotate-lv4-vol1", 4, 1, "3×3", "180°デビュー。さかさまの世界を、点で読み解く。", "6〜8才ごろ", "scaffold", "180°"),
      v("rotate-lv4-vol2", 4, 2, "4×4", "180°のまま枠を4×4へ。回転マスターまで一歩。", "6〜9才ごろ", "scaffold", "180°"),
    ],
  },
  {
    slug: "translate", name: "平行移動", groupIdx: 1,
    vols: [
      v("translate-lv2-vol1", 2, 1, "3×3", "「ずらす」デビュー。形はそのまま、横にスライドするだけ。", "4〜6才ごろ", "scaffold", "横"),
      v("translate-lv2-vol2", 2, 2, "3×3", "同じ3×3で、こんどは縦にずらす。方向感覚を育てる。", "4〜6才ごろ", "scaffold", "縦"),
      v("translate-lv3-vol1", 3, 1, "4×4", "斜めにもずらせる。4×4でナナメ方向の感覚を養う。", "5〜7才ごろ", "scaffold", "斜め"),
      v("translate-lv4-vol1", 4, 1, "4×4", "「右に2、下に1」など2方向同時の移動へ。", "6〜8才ごろ", "scaffold", "複合"),
    ],
  },
  {
    slug: "scale", name: "拡大", groupIdx: 1,
    vols: [
      v("scale-lv4-vol1", 4, 1, "3×3 → 5×5", "「倍率」デビュー。かんたんな形を2倍に大きく描こう。", "7〜9才ごろ", "scaffold", "2倍拡大・対称"),
      v("scale-lv4-vol2", 4, 2, "3×3 → 5×5", "いろいろな形を2倍に拡大。形の特徴をつかむ目を育てる。", "7〜10才ごろ", "scaffold", "2倍拡大・非対称"),
      v("scale-lv4-vol3", 4, 3, "4×4 → 7×7", "4×4の形を7×7へ拡大。広い盤面でも正確に。", "8〜10才ごろ", "scaffold", "2倍拡大・非対称"),
    ],
  },
  {
    slug: "shrink", name: "縮小", groupIdx: 1,
    vols: [
      v("shrink-lv5-vol1", 5, 1, "5×5 → 3×3", "縮小デビュー。5×5の形を半分の3×3に。逆操作に挑戦。", "8〜11才ごろ", "scaffold", "1/2縮小・対称"),
      v("shrink-lv5-vol2", 5, 2, "5×5 → 3×3", "いろいろな形を1/2に縮小。形を残しながらコンパクトに。", "9〜11才ごろ", "scaffold", "1/2縮小・非対称"),
      v("shrink-lv5-vol3", 5, 3, "7×7 → 4×4", "7×7の形を4×4へ縮小。倍率マスターの最終巻。", "9才〜", "scaffold", "1/2縮小・非対称"),
    ],
  },
  /* ============ C. 重ねる・分ける ============ */
  {
    slug: "overlay", name: "かさね", groupIdx: 2,
    vols: [
      v("overlay-lv2-vol1", 2, 1, "3×3", "「かさねる」デビュー。2つの形を重ねた姿を描いてみよう。", "4〜6才ごろ", "scaffold"),
      v("overlay-lv3-vol1", 3, 1, "4×4", "4×4で線が増えて交差も。線少なめで合成の型をつかむ。", "5〜7才ごろ", "scaffold", "線少なめ"),
      v("overlay-lv3-vol2", 3, 2, "4×4", "同じ4×4で線が密に。重なりを読みほぐす力が育つ。", "5〜8才ごろ", "scaffold", "線多め"),
      v("overlay-lv4-vol1", 4, 1, "5×5", "5×5・ナナメも入る。線少なめで角度に集中。", "6〜8才ごろ", "scaffold", "線少なめ"),
      v("overlay-lv4-vol2", 4, 2, "5×5", "5×5の密な重なり。2図同時保持の力を試す。", "6〜9才ごろ", "scaffold", "線多め"),
      v("overlay-lv5-vol1", 5, 1, "6×6", "6×6に拡大。広い盤面で線少なめから始めよう。", "8才〜", "scaffold", "線少なめ"),
      v("overlay-lv5-vol2", 5, 2, "6×6", "6×6で線も最大密。かさねマスターへ。", "8才〜", "scaffold", "線多め"),
    ],
  },
  {
    slug: "decompose", name: "分解", groupIdx: 2,
    vols: [
      v("decompose-lv2-vol1", 2, 1, "3×3", "「とりだす」デビュー。重なった形から、片方だけを見つけて描こう。", "4〜6才ごろ", "scaffold"),
      v("decompose-lv3-vol1", 3, 1, "4×4", "4×4で線が増える。少なめの線から「引き算思考」を育てる。", "5〜7才ごろ", "scaffold", "線少なめ"),
      v("decompose-lv3-vol2", 3, 2, "4×4", "同じ4×4で線が密に。どの線を取り出す？を見極める力。", "5〜8才ごろ", "scaffold", "線多め"),
      v("decompose-lv4-vol1", 4, 1, "5×5", "5×5・ナナメ入り。線少なめで広い盤面に慣れる。", "6〜8才ごろ", "scaffold", "線少なめ"),
      v("decompose-lv4-vol2", 4, 2, "5×5", "5×5の密な重なりから1つを抜き出す。集中力が問われる。", "6〜9才ごろ", "scaffold", "線多め"),
      v("decompose-lv5-vol1", 5, 1, "6×6", "6×6に拡大。広い盤面で線少なめから始めよう。", "8才〜", "scaffold", "線少なめ"),
      v("decompose-lv5-vol2", 5, 2, "6×6", "6×6で線も最大密。分解マスターへ。", "8才〜", "scaffold", "線多め"),
    ],
  },
  {
    slug: "fold", name: "折り重ね", groupIdx: 2,
    vols: [
      v("fold-lv2-vol1", 2, 1, "3×3", "「折り重ね」デビュー。問題1を折り返して問題2に重ねた形を描こう。", "4〜6才ごろ", "scaffold"),
      v("fold-lv3-vol1", 3, 1, "4×4", "4×4で線が増える。少なめの線から折り返しの型をつかむ。", "5〜7才ごろ", "scaffold", "線少なめ"),
      v("fold-lv3-vol2", 3, 2, "4×4", "同じ4×4で線が密に。折って重ねた姿を読みほぐす。", "5〜8才ごろ", "scaffold", "線多め"),
      v("fold-lv4-vol1", 4, 1, "5×5", "5×5・ナナメも入る。線少なめで折り返しに集中。", "6〜8才ごろ", "scaffold", "線少なめ"),
      v("fold-lv4-vol2", 4, 2, "5×5", "5×5の密な折り重ね。2図を同時に保持する力を試す。", "6〜9才ごろ", "scaffold", "線多め"),
      v("fold-lv5-vol1", 5, 1, "6×6", "6×6に拡大。広い盤面で線少なめから。", "8才〜", "scaffold", "線少なめ"),
      v("fold-lv5-vol2", 5, 2, "6×6", "6×6で線も最大密。折り重ねマスターへ。", "8才〜", "scaffold", "線多め"),
    ],
  },
];

/* atelier から追加された Vol を該当タスクへ合流（既存 PRODUCT_TASKS は不変・SSOT を壊さない）。
   catalog-extra.json は /api/atelier/ladder/add-vol が書く。重複 sku はスキップ。 */
type ExtraVol = {
  task: string; sku: string; lv: number; volNo: number; grid: string;
  variant?: string; blurb: string; ageLabel: string; status: string;
};
for (const ev of (catalogExtra.vols ?? []) as ExtraVol[]) {
  const t = PRODUCT_TASKS.find((x) => x.slug === ev.task);
  if (!t || t.vols.some((x) => x.sku === ev.sku)) continue;
  t.vols.push(v(ev.sku, ev.lv as 1 | 2 | 3 | 4 | 5, ev.volNo, ev.grid, ev.blurb, ev.ageLabel, ev.status as VolStatus, ev.variant));
}

/* atelier の編集（レベル定義見直し・Vol メタ編集・非表示）が書く表示メタ上書き。
   既存 PRODUCT_TASKS（ハードコード）を data.ts を触らず dev で反映するための層。
   /api/atelier/{ladder,vol} が書く。副作用なしの単純マージ＋hidden 除外。 */
type ExtraPatch = {
  sku: string; grid?: string; blurb?: string; ageLabel?: string;
  variant?: string; status?: VolStatus; hidden?: boolean;
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
  if (p.status != null) hit.vol.status = p.status;
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

/* Lv.1〜5 の各 Vol 数（catalog.tsx GROUPS の lv 配列はここから導出） */
export function lvCounts(slug: string): number[] {
  const task = taskBySlug(slug);
  const counts = [0, 0, 0, 0, 0];
  task?.vols.forEach((x) => { counts[x.lv - 1] += 1; });
  return counts;
}

/* ★最初の1冊 ＝ 最小 Lv の Vol.1 */
export function firstVol(task: ProductTask): Vol {
  return [...task.vols].sort((a, b) => a.lv - b.lv || a.volNo - b.volNo)[0];
}

/* 商品名（外向け）: "模写 入門編 Vol.2 — 4×4" */
export function volTitle(task: ProductTask, vol: Vol): string {
  return `${task.name} ${LEVEL_NAMES[vol.lv - 1]} Vol.${vol.volNo} — ${vol.grid}`;
}

/* Vol の URL（live は詳細・scaffold はタスク一覧の該当 Lv アンカー） */
export function volHref(task: ProductTask, vol: Vol): string {
  return vol.status === "live" ? `/products/${vol.sku}` : `/products/${task.slug}#lv${vol.lv}`;
}
