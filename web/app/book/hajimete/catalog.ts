/** 書籍と特典の収録順。問題の実体は公開済みSKUのJSON。本の書き出し（scripts/kdp/book.ts の SERIES.first）と同じ並びを保つ。 */
export const BOOK = {
  slug: "hajimete",
  title: "はじめての点図形（点描写）",
  subtitle: "4才ごろからの　図形を写す練習 144問",
  author: "TENZU",
  total: 144,
  /** 売り場の表示価格（税込）。kdp-paperback.md §4 */
  price: 1320,
  /** Amazon の商品ページ。発売までは空で、紹介ページ（/book）は購入ボタンを「近日発売」にして検索に出さない。 */
  amazonUrl: "",
  lpHref: "/book",
  cover: "/assets/book/hajimete-cover.jpg",
  /** The page of the book that prints the receiving code (the owner's benefit page). */
  codePage: 6,
  edition: "1.0",
  updatedAt: "2026-10-22",
  href: "/book/hajimete",
  url: "https://tenzu.jp/book/hajimete",
} as const;

export const BOOK_TASKS = {
  fill: { child: "たす", name: "欠け補完" },
  copy: { child: "うつす", name: "模写" },
} as const;
export type BookTask = keyof typeof BOOK_TASKS;

type Volume = { sku: string; task: BookTask; lv: number; vol: number; grid: string; standIn?: string };
/** standIn: まだ公開していない巻。公開までは本の下書きと同じ代わりの巻で場所を取る（kdp-paperback §1）。 */
const VOLUMES: Volume[] = [
  { sku: "fill-lv1-vol1", task: "fill", lv: 1, vol: 1, grid: "3×3", standIn: "fill-lv2-vol1" },
  { sku: "copy-lv1-vol1", task: "copy", lv: 1, vol: 1, grid: "3×3" },
  { sku: "fill-lv2-vol1", task: "fill", lv: 2, vol: 1, grid: "3×3" },
  { sku: "copy-lv2-vol1", task: "copy", lv: 2, vol: 1, grid: "3×3" },
  { sku: "fill-lv3-vol1", task: "fill", lv: 3, vol: 1, grid: "4×4" },
  { sku: "copy-lv3-vol1", task: "copy", lv: 3, vol: 1, grid: "4×4" },
  { sku: "fill-lv3-vol2", task: "fill", lv: 3, vol: 2, grid: "4×4", standIn: "fill-lv3-vol1" },
  { sku: "copy-lv3-vol2", task: "copy", lv: 3, vol: 2, grid: "4×4" },
  { sku: "fill-lv4-vol1", task: "fill", lv: 4, vol: 1, grid: "5×5", standIn: "fill-lv4-vol2" },
  { sku: "copy-lv4-vol1", task: "copy", lv: 4, vol: 1, grid: "5×5" },
  { sku: "fill-lv4-vol2", task: "fill", lv: 4, vol: 2, grid: "5×5" },
  { sku: "copy-lv4-vol2", task: "copy", lv: 4, vol: 2, grid: "5×5" },
];

/** 12問ごとの本の範囲。受取ページの詳細設定で選ぶ単位。 */
export const BOOK_VOLUMES = VOLUMES.map((v, index) => ({
  ...v, label: `${BOOK_TASKS[v.task].child}（${BOOK_TASKS[v.task].name}）Lv.${v.lv} Vol.${v.vol}`,
  from: index * 12 + 1, to: (index + 1) * 12,
}));
export const BOOK_SKUS = BOOK_VOLUMES.map((v) => v.sku);

export const BOOK_FILES = [
  { id: "all", filename: "tenzu-hajimete-144-a4.pdf", label: "144問の問題PDF", detail: "本と同じ順番・問題番号。1枚3問。" },
  { id: "fill", filename: "tenzu-hajimete-tasu-a4.pdf", label: "たす（欠け補完）", detail: "72問。Lv.1〜Lv.4の「たす」だけ。" },
  { id: "copy", filename: "tenzu-hajimete-utsusu-a4.pdf", label: "うつす（模写）", detail: "72問。Lv.1〜Lv.4の「うつす」だけ。" },
  { id: "sheets", filename: "tenzu-hajimete-sheets-a4.pdf", label: "じぶんでつくろう", detail: "親子で問題を出し合う、空いた盤面。本の103〜105ページと同じ紙面。" },
] as const;

/** 本を終えたあとの案内（kdp-paperback §6）。どれも本に入っていない巻。 */
export const BOOK_NEXT = {
  tasks: [
    { sku: "mirror-lv2-vol1", child: "かがみ", name: "鏡" },
    { sku: "translate-lv2-vol1", child: "うごかす", name: "移動" },
    { sku: "rotate-lv2-vol1", child: "まわす", name: "回転" },
    { sku: "overlay-lv2-vol1", child: "かさねる", name: "かさね" },
    { sku: "decompose-lv2-vol1", child: "とりのぞく", name: "分解" },
    { sku: "fold-lv2-vol1", child: "おりかさねる", name: "折り重ね" },
    { sku: "solid-lv3-vol1", child: "りったい", name: "立体模写" },
  ],
  more: [
    { sku: "copy-lv5-vol1", child: "うつす", name: "模写" },
    { sku: "copy-lv5-vol2", child: "うつす", name: "模写" },
    { sku: "copy-lv5-vol3", child: "うつす", name: "模写" },
    { sku: "fill-lv5-vol1", child: "たす", name: "欠け補完" },
  ],
} as const;
