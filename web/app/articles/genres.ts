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
    id: "start",
    emoji: "🚪",
    name: "はじめての点描写",
    lead: "「点描写って何？」という方の入口。",
    slugs: ["point-drawing-guide"],
  },
  {
    id: "effects",
    emoji: "🧠",
    name: "効果・空間認知を知る",
    lead: "何が育つのか、根拠とあわせて。",
    slugs: [
      "point-drawing-effects",
      "how-to-train-spatial-recognition",
      "family-shape-spatial-qa",
    ],
  },
  {
    id: "care",
    emoji: "🆘",
    name: "苦手・つまずきケア",
    lead: "つまずきに気づいたときの戻り道。",
    slugs: [
      "from-copying-shapes",
      "figure-copy-vs-point-drawing",
      "how-to-draw-isometric",
      "weak-at-shapes",
      "grade-4-math-stuck",
      "visuospatial-and-learning",
    ],
  },
  {
    id: "kumon",
    emoji: "🏫",
    name: "公文との並走",
    lead: "公文家庭の「図形の席」の埋め方。",
    slugs: ["kumon-math-shape"],
  },
  {
    id: "choose",
    emoji: "🛒",
    name: "教材の選び方",
    lead: "比較・順番・冊数の疑問に。",
    slugs: [
      "how-to-choose-and-use",
      "point-drawing-complete-guide",
      "print-settings-guide",
    ],
  },
  {
    id: "teach",
    emoji: "🤝",
    name: "親の教え方・伴走",
    lead: "泣いた日・○つけの日の実践。",
    slugs: ["teaching-point-drawing"],
  },
  {
    id: "rules",
    emoji: "⚖️",
    name: "ご利用のルール",
    lead: "商用利用・教室利用・著作権について。",
    slugs: ["faq-commercial-use", "faq-teacher-license"],
  },
];
