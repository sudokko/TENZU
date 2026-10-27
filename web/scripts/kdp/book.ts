/** The retired 216-problem book (export-kdp-book.ts). Its Web catalogue became /book/hajimete, so its identity lives here. */
export const BOOK_216 = {
  title: "点図形（点描写）",
  subtitle: "4〜6才の図形・空間認識トレーニング",
  edition: "1.1",
  qrUrl: "https://tenzu.jp/book/216?utm_source=kdp&utm_medium=book&utm_campaign=first-patterns-216",
} as const;
const BOOK_216_SKUS = ["copy-lv1-vol1", "copy-lv2-vol1", "copy-lv3-vol1", "fill-lv2-vol1", "fill-lv3-vol1", "mirror-lv2-vol1", "mirror-lv3-vol1",
  "translate-lv2-vol1", "translate-lv3-vol2", "rotate-lv2-vol1", "rotate-lv3-vol2", "overlay-lv2-vol1", "overlay-lv3-vol1",
  "decompose-lv2-vol1", "decompose-lv3-vol1", "fold-lv2-vol1", "fold-lv3-vol1", "solid-lv3-vol1"];
/** Book-specific editorial choices. Problem content and catalogue metadata stay in their SSOTs. */
export const BOOK = {
  id: "first-patterns-216",
  checkedAt: "2026-10-08",
  title: BOOK_216.title,
  subtitle: BOOK_216.subtitle,
  skus: BOOK_216_SKUS,
  frontPages: 4,
  omitAnswerTasks: ["copy", "fill", "solid"] as readonly string[],
  margins: { inside: 18, outside: 12, top: 14, bottom: 14 },
  problemMargins: { top: 8, bottom: 6.8 },
  minLineMm: 0.3,
  bleedMm: 3.2,
  whitePaperSpineMmPerPage: 0.0572,
} as const;

export const TASK_COPY: Record<string, { short: string; instruction: string; explanation: string }> = {
  copy: { short: "うつす", instruction: "ひだりと おなじ かたちを かこう。", explanation: "左の図と同じ位置の点を探し、右に写します。Lv.1・2は3×3、Lv.3は4×4の盤面です。線の始まりと終わりを、一つずつ確かめましょう。" },
  mirror: { short: "かがみ", instruction: "てんせんを かがみにして かこう。", explanation: "中央の点線を鏡と考え、左右を反対にした形を右に描きます。鏡から点までの距離を確かめると、位置を探しやすくなります。" },
  translate: { short: "うごかす", instruction: "しかくの めじるしまで ずらして かこう。", explanation: "四角で囲んだ点が、右の四角の位置に来るように図形全体を動かします。向きや大きさは変えません。上下左右の移動に続いて、斜めの移動を収録しています。" },
  rotate: { short: "まわす", instruction: "やじるしの むきに まわして かこう。", explanation: "盤面の真ん中を中心に、右または左へ90度回した形を描きます。90度は4分の1回転です。四角の目じるしが、回転前後の位置を示します。" },
  fill: { short: "たす", instruction: "たりない せんを かきたそう。", explanation: "左の完成図と右の図を見比べ、足りない線を書き足します。右に印刷されている線はそのまま使い、同じ形を完成させます。" },
  overlay: { short: "かさねる", instruction: "ふたつを かさねた かたちを かこう。", explanation: "左と中央の図を、位置や向きを変えずに重ねます。両方の線がある完成図を、右の盤面に描きます。＋は重ねる、＝の先は答えを書く場所です。" },
  decompose: { short: "とりのぞく", instruction: "まんなかの せんを のぞいて かこう。", explanation: "左の図から、中央に示された線を取り除きます。残る線だけを右に描きます。−は取り除く、＝の先は答えを書く場所です。" },
  fold: { short: "おりかさねる", instruction: "ひだりを おりかさねて かこう。", explanation: "左の図を左右反対にして中央の図に重ね、できた形を右に描きます。曲がった矢印は、左の図を右へ折り重ねる動きを示しています。" },
  solid: { short: "りったい", instruction: "うえと おなじ かたちを したに かこう。", explanation: "立体を表した上の図を、下の盤面に写します。9×9の点から線の端を探しましょう。この本では見える辺だけの問題を収録しています。" },
};

/** Parent-facing purpose of each of the nine tasks in this paperback. */
export const TASK_AIM: Record<string, string> = {
  copy: "線の向きと点の位置を確かめながら、見本を写す力を育てます。",
  fill: "完成した形と見比べ、足りない部分に気づく力を育てます。",
  mirror: "鏡の線を基準に、反対側の点の位置を思い浮かべる力を育てます。",
  translate: "形の向きを変えずに、動く方向と移る先をとらえる力を育てます。",
  rotate: "形を頭の中で回し、変わったあとの向きと位置を考える力を育てます。",
  overlay: "二つの形の位置を見比べ、重ねた姿を思い描く力を育てます。",
  decompose: "全体から取り除く線を見分け、残る形をとらえる力を育てます。",
  fold: "左右反対にすることと重ねることを組み合わせ、できる形を思い描く力を育てます。",
  solid: "立体の線のつながりや奥行きを読み取り、平面に写す力を育てます。",
};

/** Worked-example captions; the dashed target edges are derived from published problems. */
export const GUIDE_COPY: Record<string, string> = {
  copy: "ひだりの かたちを みて、みぎに おなじように かこう。",
  fill: "みぎで たりない せんを さがそう。てんせんの ところに かいてみよう。",
  mirror: "まんなかの てんせんを かがみにして、みぎに かこう。",
  translate: "しかくの しるしを あわせて、かたちを そのまま うごかそう。",
  rotate: "やじるしの むきに かたちを まわして、みぎに かこう。",
  overlay: "ふたつの かたちを かさねて、みぎに かこう。",
  decompose: "まんなかの せんを とって、のこった せんを みぎに かこう。",
  fold: "ひだりを おりかえして、まんなかに かさねよう。\nできた かたちを みぎに かこう。",
  solid: "うえの かたちを みて、したに おなじように かこう。",
};

/** Parent-facing note shown at the start of each source volume. The catalogue blurb is the factual anchor. */
export const LEVEL_COPY: Record<string, string> = {
  "copy-lv1-vol1": "たて・よこのまっすぐな線から。見本と同じ点を、右の盤面で探します。",
  "copy-lv2-vol1": "点の数は3×3のまま。ななめの線が加わります。",
  "fill-lv2-vol1": "完成した形と見比べて、足りない線を1〜2本見つけます。",
  "mirror-lv2-vol1": "3×3の形を、中央の線をはさんで反対側へ写します。",
  "translate-lv2-vol1": "形の向きを変えずに、上下左右へずらします。",
  "rotate-lv2-vol1": "真ん中を中心に、まず右へ90度回します。",
  "overlay-lv2-vol1": "2つの形を重ねて、1つになった形を描きます。",
  "decompose-lv2-vol1": "左の形から、中央に示した線を取り除きます。",
  "fold-lv2-vol1": "左の形を折り返して、中央の形に重ねます。",
  "copy-lv3-vol1": "盤面が4×4に広がります。線が交わる形も、一つずつ追って写します。",
  "fill-lv3-vol1": "4×4で線が増えます。足りない線を2〜3本探します。",
  "mirror-lv3-vol1": "4×4の形を鏡うつしに。交わる線も、点の位置を確かめます。",
  "translate-lv3-vol2": "4×4の形を、ななめ方向にもずらします。縦と横の動きを数えましょう。",
  "rotate-lv3-vol2": "4×4の形を、左へ90度回します。右回りとの違いも見てみましょう。",
  "overlay-lv3-vol1": "4×4の2つの形を重ねます。線が交わるところも見てみましょう。",
  "decompose-lv3-vol1": "4×4の形から線を取り除きます。残る線を一本ずつ確かめます。",
  "fold-lv3-vol1": "4×4で、折り目をまたぐ線も出てきます。折った後の位置を考えます。",
  "solid-lv3-vol1": "9×9の点を使います。見える線を探し、箱や階段などの形を写します。",
  "copy-lv3-vol2": "盤面が5×5に広がります。点を数えて、線の端を確かめます。",
  "copy-lv4-vol1": "45°でないななめの線が出てきます。4×4に戻して、新しい傾きに集中します。",
  "copy-lv4-vol2": "同じななめの線のまま、盤面を5×5へ広げます。",
  "fill-lv4-vol1": "5×5で、いろいろな角度の線。足りない線を3〜4本探します。",
  "translate-lv3-vol1": "4×4の形を、上下左右に2マスずらします。動いた数を数えましょう。",
  "rotate-lv3-vol1": "4×4の形を、右へ90度回します。交わる線も出てきます。",
};

/** Pages that are not problems. Copy is drafted later from the articles named in kdp-paperback §2.4. */
export type SeriesSlot =
  | { kind: "opening" | "route" | "index" | "benefit" | "answers" | "colophon" }
  | { kind: "stage"; sku: string; perPage: 1 | 2 | 3; lv?: 1 | 2 | 3 | 4 | 5; volNo?: number;
      /** null = not published yet; a published stand-in keeps the layout until the owner adopts 12 problems. */
      source?: null; standIn?: string }
  | { kind: "extra"; id: string; title: string; pages: number; spread?: boolean; note: string };

export type SeriesBook = {
  id: string; title: string; subtitle: string; slug: string; total: number;
  omitAnswerTasks: readonly string[];
  /** Explanation pages: true = one per Lv・Vol pair, "volume" = one before every volume (たす and うつす apart). */
  stageIntro?: boolean | "volume";
  /** Explanation pages after the first one drop the worked example and the parent note and carry the volume's first
   * problems instead (2026-10-25: the reader needs them once, at the start of the book). */
  introProblems?: 2;
  /** Book-specific wording where the shared TASK_COPY describes the 216-problem selection. */
  explanation: Partial<Record<string, string>>;
  slots: readonly SeriesSlot[];
  /** Pages the owner designed outside the exporter (PDF relative to the repo root), listed by final page number.
   * Those pages are copied as they are; problems and level explanations are still drawn from the data. */
  design?: { file: string; pages: readonly number[];
    /** QR codes printed on designed pages, redrawn by the exporter so they carry the page's tracking parameters.
     * box = the dark modules of the owner's QR in mm from the top-left (measured on explain-pages.pdf). */
    qr?: readonly { page: number; url: string; box: readonly [number, number, number, number] }[] };
};

/** A volume planned for the book but not generated yet; a published stand-in keeps the layout honest until then. */
const fillPlanned = (sku: string, lv: 1 | 2 | 3 | 4 | 5, volNo: number, standIn: string): SeriesSlot =>
  ({ kind: "stage", sku, perPage: 2, lv, volNo, source: null, standIn });

const extra = (id: string, title: string, note: string, pages = 1, spread = false): SeriesSlot =>
  ({ kind: "extra", id, title, pages, spread, note });

/** The book is `first` (kdp-paperback §1–§2); `second` is frozen but kept so its draft can still be exported (§7).
 * Slugs and subtitles stay provisional until the owner decides them. */
export const SERIES: Record<"first" | "second", SeriesBook> = {
  first: {
    id: "series-1-hajimete", title: "はじめての点図形（点描写）", subtitle: "4才ごろからの　図形を写す練習 144問",
    slug: "hajimete", total: 98, omitAnswerTasks: ["copy", "fill"], stageIntro: "volume", introProblems: 2,
    explanation: {
      copy: "左の図と同じ位置の点を探し、右に写します。盤面は3×3から5×5まで広がります。線の始まりと終わりを、一つずつ確かめましょう。",
    },
    // Pages the owner designed and still uses; the rest are drawn by the exporter in the same frame (2026-10-23).
    // The afterword and colophon (96) moved to the exporter when the owner's afterword grew past the page (2026-10-25).
    design: { file: "docs/drafts/kdp/series-1-hajimete/design/explain-pages.pdf", pages: [4, 6, 57, 93, 94, 95],
      qr: [{ page: 6, url: "https://tenzu.jp/book/hajimete", box: [135.06, 210.24, 160.5, 235.67] }] },
    slots: [
      // Page 1 is also what a buyer sees first: what the book does for a first-timer and how it differs from other books.
      extra("features", "この本の特徴", "6段階・たすが先・やさしい順（独自の計算式）・特典PDFでくり返し・刷り分け"),
      extra("about", "点図形（点描写）とは", "はじめに：点つなぎとの違い・見る→考える→書く・何の練習になるか"),
      extra("contents", "もくじ", "本の頭から終わりまで。問題の部はレベルごとの番号とページ"),
      { kind: "route" },
      extra("lineup", "この本の問題は、TENZUから", "TENZU（Webサイト）の紹介と、TENZUで用意している問題・この本の範囲・もっと難しい問題へのQR"),
      { kind: "benefit" },
      extra("print-options", "印刷でできること", "並び・背景の点・用紙・名前欄を図で（print-settings-guide）"),
      // Each level pairs たす (draw a few lines) with うつす (draw all); each volume has its own explanation page.
      fillPlanned("fill-lv1-vol1", 1, 1, "fill-lv2-vol1"),
      { kind: "stage", sku: "copy-lv1-vol1", perPage: 2 },
      { kind: "stage", sku: "fill-lv2-vol1", perPage: 2 },
      { kind: "stage", sku: "copy-lv2-vol1", perPage: 2 },
      { kind: "stage", sku: "fill-lv3-vol1", perPage: 2 },
      { kind: "stage", sku: "copy-lv3-vol1", perPage: 2 },
      fillPlanned("fill-lv3-vol2", 3, 2, "fill-lv3-vol1"),
      { kind: "stage", sku: "copy-lv3-vol2", perPage: 2 },
      extra("habit", "続けるコツ", "その日の量・始めやすいタイミング・見守り方（how-to-train-spatial-recognition・teaching-point-drawing）"),
      fillPlanned("fill-lv4-vol1", 4, 1, "fill-lv4-vol2"),
      { kind: "stage", sku: "copy-lv4-vol1", perPage: 2 },
      { kind: "stage", sku: "fill-lv4-vol2", perPage: 2 },
      { kind: "stage", sku: "copy-lv4-vol2", perPage: 2 },
      extra("more-levels", "もっと難しい問題に取り組みたい場合", "うつす・たすのLv.5を縮小の紙面見本で"),
      // Facing the Lv.5 page: what those volumes cost, the bulk discount and the book's first-purchase coupon.
      extra("prices", "料金とクーポン", "1巻¥200・まとめ買い割引の表・初回限定クーポン（コードと使い方）・前のページの巻での計算例"),
      extra("more-tasks", "うつす・たす以外の問題", "7つの課題の入口の巻を縮小の紙面見本で"),
      // One writable problem from each of the 7 tasks' first volume, with what it asks and what it trains; answers follow.
      extra("samples", "ためしの1問", "7課題の入口の巻の最もやさしい1問・おうちの方へ・めあて・その課題の棚へのQR", 7),
      extra("sample-answers", "ためしの1問のこたえ", "7問の答え"),
      extra("make", "じぶんでつくろう", "空いた盤面3×3〜5×5。親子で出し合う", 3),
      extra("maker", "自分で問題を作る", "点図形（点描写）メーカーを1ページで。模写4×4はPDF保存まで無料"),
      // The page that was left white behind the colophon now asks for the reader's answers (2026-10-27), so the
      // afterword and colophon close the book on its last, left-hand page.
      extra("survey", "アンケート", "手が止まったところ・感想を Web で（7問・お礼の¥100 OFF クーポン）・QR"),
      { kind: "colophon" },
    ],
  },
  second: {
    id: "series-2-kukan", title: "空間認知力を伸ばす点描写", subtitle: "写した形を、動かす・重ねる・組み立てる",
    slug: "kukan", total: 98, omitAnswerTasks: ["solid"],
    explanation: {
      translate: "四角で囲んだ点が、右の四角の位置に来るように図形全体を動かします。向きや大きさは変えません。Lv.2は1マス、Lv.3は2マス、上下左右へ動かします。",
      rotate: "盤面の真ん中を中心に、右へ90度回した形を描きます。90度は4分の1回転です。四角の目じるしが、回転前後の位置を示します。",
    },
    slots: [
      { kind: "opening" }, { kind: "route" }, { kind: "index" }, { kind: "benefit" },
      extra("parents", "おうちの方へ", "写すから動かすへ・盤面が3×3に戻る理由（from-copying-shapes）"),
      extra("map", "7つの動きの地図", "課題の関係とLv.2〜5の全体。本はここまで、続きはWeb"),
      extra("progress", "できたよ表", "課題ごとに塗る表。特典PDFにも再録"),
      extra("hands", "手で確かめる方法", "紙を回す・折る・手鏡・透かす"),
      { kind: "stage", sku: "mirror-lv2-vol1", perPage: 2 },
      { kind: "stage", sku: "mirror-lv3-vol1", perPage: 2 },
      { kind: "stage", sku: "translate-lv2-vol1", perPage: 2 },
      { kind: "stage", sku: "translate-lv3-vol1", perPage: 2 },
      { kind: "stage", sku: "rotate-lv2-vol1", perPage: 2 },
      { kind: "stage", sku: "rotate-lv3-vol1", perPage: 2 },
      { kind: "stage", sku: "overlay-lv2-vol1", perPage: 3 },
      { kind: "stage", sku: "decompose-lv2-vol1", perPage: 3 },
      { kind: "stage", sku: "fold-lv2-vol1", perPage: 3 },
      extra("isometric", "見取り図の描き方", "立体模写の直前（how-to-draw-isometric）"),
      { kind: "stage", sku: "solid-lv3-vol1", perPage: 1 },
      extra("certificate", "修了証", "名前と日付を書く。特典PDFにも再録"),
      { kind: "answers" },
      extra("trouble", "こんなときは", "動かす課題で手が止まったとき・声かけの例（teaching-point-drawing・weak-at-shapes）"),
      extra("sibling", "もう1冊の紹介", "1冊目「はじめての点描写」の見開き。写すのがまだなら1冊目から", 2, true),
      extra("next-web", "つぎの一冊：Webの続き", "7課題の続き（移動・回転Lv.3 Vol.2、かさね系Lv.3、鏡・立体Lv.4）を縮小の紙面見本で", 2, true),
      extra("next-maker", "つぎの一冊：メーカー", "自分で作る・紙面設定・PDF印刷。無料範囲と料金", 2, true),
      extra("make", "じぶんでつくろう", "空いた盤面。親子で出し合う。メーカーへの橋渡し", 2),
      extra("exam", "小学校受験のペーパーとのつながり", "定番の課題名と本の課題の対応。効果はうたわない（point-drawing-elementary-exam）"),
      extra("afterword", "あとがき", "店主から（tenzu-concept）。実名・写真なし"),
      { kind: "colophon" },
    ],
  },
};

export const FONT_FILES = [
  ["heading", "KleeOne-SemiBold.ttf", "kleeone"],
  ["body", "IBMPlexSansJP-Regular.ttf", "ibmplexsansjp"],
  ["mono", "IBMPlexMono-Regular.ttf", "ibmplexmono"],
] as const;
