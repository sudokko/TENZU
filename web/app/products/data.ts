/* =========================================================================
   商品カタログ Vol レベル SSOT
   タスク（10 ライン）× Lv × Vol の全 63 巻を定義する単一ソース。
   catalog.tsx の GROUPS（表示コピー・Fig）はここから lvCounts() で巻数を導出する。
   出典: pack-design §11.6/§12.2/§12.7・pack-tasks §15-22。
   - sku slug 形式: {task}-lv{n}-vol{m}（同一 Lv ×同一グリッドの巻が存在するため
     grid ではなく Vol 番号で一意化。旧 copy-lv2-4x4 は SKU_ALIASES で温存）
   - status: "live"＝詳細ページあり / "scaffold"＝一覧に「準備中」で陳列のみ
   ========================================================================= */

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
  /* ---- 詳細ページ用（live のみ・無ければセクション非表示） ---- */
  promise?: string;       // sku-promise（H1 直下の一文）
  observeNote?: string;   // 「ここを見てください」
  ownerNote?: string;     // 「店主から」
  parentNote?: string;    // 「親へのひとこと」
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

/* 旧 URL → 正本 sku（グリッド表記時代の slug。リダイレクトで温存） */
export const SKU_ALIASES: Record<string, string> = {
  "copy-lv2-4x4": "copy-lv2-vol2",
};

const v = (
  sku: string, lv: 1 | 2 | 3 | 4 | 5, volNo: number, grid: string,
  blurb: string, ageLabel: string, status: VolStatus, variant?: string,
): Vol => ({ sku, lv, volNo, grid, blurb, ageLabel, status, variant });

export const PRODUCT_TASKS: ProductTask[] = [
  /* ============ A. 見て写す ============ */
  {
    slug: "copy", name: "模写（図形）", groupIdx: 0,
    vols: [
      v("copy-lv1-vol1", 1, 1, "3×3", "はじめての点描写に。点と点を結ぶ「まっすぐ」から。", "4〜6才ごろ", "live"),
      v("copy-lv2-vol1", 2, 1, "3×3", "「ななめ」デビュー。同じ3×3で、少しだけ世界が広がる。", "4〜6才ごろ", "live"),
      {
        ...v("copy-lv2-vol2", 2, 2, "4×4", "枠がひとつ大きくなった4×4。斜めにも慣れてきたら。", "4〜7才ごろ", "live"),
        promise: "点と点の距離を、目で測れるように。",
        observeNote: "写す前に「みほんのどこから見るか」を、いっしょに確認してみてください。目の動きが、3×3 のころと変わってきます。",
        ownerNote: "点と点の距離を測る目を作るには、4×4 までの規則的な配置が必要です。3×3 では情報が足りず、5×5 では距離の比較対象が増えすぎる。この巻は「距離を測ること」だけに集中できる範囲として置きました。",
        parentNote: "このレベルは「写す前に、どこを見るか」を一緒に確認してみてください。\n次は明日でも大丈夫です。同じ問題を 2 回やる日があってもいい設計です。",
        revisions: [
          { ver: "v1.3", date: "2026-05-12", note: "線太さを 0.5pt 増しました" },
          { ver: "v1.2", date: "2026-04-30", note: "第 3 問の dot 配置を 1 段下げました" },
          { ver: "v1.1", date: "2026-04-12", note: "親向け解説の段落を入れ替えました" },
          { ver: "v1.0", date: "2026-04-01", note: "初版" },
        ],
      },
      v("copy-lv3-vol1", 3, 1, "4×4", "線が増えて、交差が登場。「見て、写す力」が育つ。", "5〜7才ごろ", "live"),
      v("copy-lv3-vol2", 3, 2, "5×5", "標準サイズの5×5へ。基礎のしあげに。", "5〜8才ごろ", "live"),
      v("copy-lv4-vol1", 4, 1, "5×5", "角度いろいろ、観察力が伸びる。ゆっくり、きれいに。", "6〜8才ごろ", "live"),
      v("copy-lv4-vol2", 4, 2, "6×6", "いつもの難しさのまま、枠をひとつ大きく。のびのび6×6。", "6〜9才ごろ", "live"),
      v("copy-lv5-vol1", 5, 1, "7×7", "最大盤面7×7。大人でも手ごたえの、点描写マスターへ。", "8才〜", "live"),
    ],
  },
  {
    slug: "motif", name: "模写（絵柄）", groupIdx: 0,
    vols: [
      v("motif-lv2-vol1", 2, 1, "3×3", "絵柄でななめに挑戦。小さな絵から。", "4〜6才ごろ", "scaffold"),
      v("motif-lv2-vol2", 2, 2, "4×4", "枠がひとつ大きくなった絵柄。", "4〜7才ごろ", "scaffold"),
      v("motif-lv3-vol1", 3, 1, "4×4", "線が増えた絵柄。交差も登場。", "5〜7才ごろ", "scaffold"),
      v("motif-lv3-vol2", 3, 2, "5×5", "標準サイズ5×5の絵柄へ。", "5〜8才ごろ", "scaffold"),
      v("motif-lv4-vol1", 4, 1, "5×5", "複雑な角度の絵柄に挑戦。", "6〜8才ごろ", "scaffold"),
      v("motif-lv4-vol2", 4, 2, "6×6", "大きな絵柄をのびのび写す。", "6〜9才ごろ", "scaffold"),
      v("motif-lv5-vol1", 5, 1, "7×7", "最大盤面の絵柄を写しきる。", "8才〜", "scaffold"),
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
    slug: "mirror", name: "線対称", groupIdx: 1,
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
    slug: "scale", name: "拡大・縮小", groupIdx: 1,
    vols: [
      v("scale-lv4-vol1", 4, 1, "3×3 → 5×5", "「倍率」デビュー。かんたんな形を2倍に大きく描こう。", "7〜9才ごろ", "scaffold", "2倍拡大・対称"),
      v("scale-lv4-vol2", 4, 2, "3×3 → 5×5", "いろいろな形を2倍に拡大。形の特徴をつかむ目を育てる。", "7〜10才ごろ", "scaffold", "2倍拡大・非対称"),
      v("scale-lv4-vol3", 4, 3, "4×4 → 7×7", "4×4の形を7×7へ拡大。広い盤面でも正確に。", "8〜10才ごろ", "scaffold", "2倍拡大・非対称"),
      v("scale-lv5-vol1", 5, 1, "5×5 → 3×3", "縮小デビュー。5×5の形を半分の3×3に。逆操作に挑戦。", "8〜11才ごろ", "scaffold", "1/2縮小・対称"),
      v("scale-lv5-vol2", 5, 2, "5×5 → 3×3", "いろいろな形を1/2に縮小。形を残しながらコンパクトに。", "9〜11才ごろ", "scaffold", "1/2縮小・非対称"),
      v("scale-lv5-vol3", 5, 3, "7×7 → 4×4", "7×7の形を4×4へ縮小。倍率マスターの最終巻。", "9才〜", "scaffold", "1/2縮小・非対称"),
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
];

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

/* 商品名（外向け）: "模写（図形） 入門編 Vol.2 — 4×4" */
export function volTitle(task: ProductTask, vol: Vol): string {
  return `${task.name} ${LEVEL_NAMES[vol.lv - 1]} Vol.${vol.volNo} — ${vol.grid}`;
}

/* Vol の URL（live は詳細・scaffold はタスク一覧の該当 Lv アンカー） */
export function volHref(task: ProductTask, vol: Vol): string {
  return vol.status === "live" ? `/products/${vol.sku}` : `/products/${task.slug}#lv${vol.lv}`;
}
