/* =========================================================================
   web/app/articles/genres.ts（新規）
   記事一覧のジャンル分け＆「よく読まれる記事」の SSOT。
   - ジャンル所属は slug で管理（frontmatter を汚さない）
   - 「よく読まれる」は当面 手動選定（POPULAR_SLUGS）。
     GA4 計測開始後、Data API 集計（過去 RANKING_WINDOW_DAYS 日の PV 上位）
     に差し替える。→ マスタースケジュール 10月タスク参照
   ========================================================================= */

/** 将来 GA4 Data API 集計に切り替える際の集計窓（日数）。env で上書き可。 */
export const RANKING_WINDOW_DAYS = Number(
  process.env.RANKING_WINDOW_DAYS ?? 14,
);

/**
 * よく読まれる記事（表示順＝順位）。
 * 開店前はアクセスデータが無いため、戦略上の主力 3 本を手動選定。
 * GA4 切替後はこの定数を fetchPopularSlugs() の結果に置き換える。
 */
export const POPULAR_SLUGS: string[] = [
  "point-drawing-guide", // P1 正規まとめ
  "how-to-train-spatial-recognition", // C4-2 最大エンジン
  "how-to-draw-isometric", // C3-1 ブルーオーシャン
];

/**
 * 記事一覧（ジャンル箱）に出さない slug。
 * tenzu-concept はヘッダーの About から遷移（2026-07-14 決定）。
 */
export const EXCLUDED_FROM_INDEX: string[] = ["tenzu-concept"];

export type Genre = {
  id: string;
  emoji: string;
  name: string;
  lead: string;
  /** 表示順どおりに並べる。存在しない slug はビルド時に自動スキップ。 */
  slugs: string[];
};

export const GENRES: Genre[] = [
  {
    id: "intro",
    emoji: "🚪",
    name: "点描写を知る",
    lead: "定義から、何が育つのかまで。",
    slugs: [
      "point-drawing-guide",
      "figure-copy-vs-point-drawing",
      "point-drawing-effects",
      "visuospatial-and-learning",
    ],
  },
  {
    id: "spatial",
    emoji: "🧠",
    name: "空間認知を家庭で育てる",
    lead: "毎日の中でできる、力の伸ばし方。",
    slugs: [
      "how-to-train-spatial-recognition",
      "family-shape-spatial-qa",
      "how-to-draw-isometric",
    ],
  },
  {
    id: "care",
    emoji: "🆘",
    name: "つまずきに寄り添う",
    lead: "つまずきに気づいたときの戻り道。",
    slugs: [
      "from-copying-shapes",
      "weak-at-shapes",
      "grade-4-math-stuck",
      "kumon-math-shape",
      "point-drawing-elementary-exam",
    ],
  },
  {
    id: "choose",
    emoji: "🛒",
    name: "選ぶ・教える",
    lead: "どれを、どの順で、どう伝えるか。",
    slugs: [
      "how-to-choose-and-use",
      "point-drawing-complete-guide",
      "teaching-point-drawing",
    ],
  },
  {
    id: "print",
    emoji: "🖨",
    name: "印刷とご利用のルール",
    lead: "印刷の設定から、商用・教室利用まで。",
    slugs: [
      "print-settings-guide",
      "convenience-store-print",
      "faq-commercial-use",
      "faq-teacher-license",
    ],
  },
];
