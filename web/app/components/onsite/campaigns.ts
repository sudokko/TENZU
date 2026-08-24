/* =========================================================================
   オンサイトメッセージ — Campaign 型（共有 SSOT）＋初期シード配列
   - 配信・運用の SSOT は DynamoDB（ONSITE_TABLE）。編集は管理画面 /admin/onsite
     から行い、保存が即時本番反映される（acquisition/onsite-messaging.md §4/§9）
   - SEED_CAMPAIGNS は初期投入（POST /api/admin/onsite/seed・未存在 id のみ・冪等)
     専用。日常の文言変更をこの配列に書いても本番には反映されない
   - 運用計画・ガードレールの設計 SSOT は acquisition/onsite-messaging.md §2/§8
   - 原則1回。一部だけ休止期間付き最大2回。常時 active は5本以内に厳選する
   - 文言の NG 語彙は管理画面が警告する（SSOT は foundation/voice-tone.md）
   - 停止は active: false（消さない＝既読キー履歴を残す）
   ========================================================================= */

export type MobilePlacement = "floating" | "bottom" | "inline";
export type DesktopPlacement = "corner" | "inline";

export type Campaign = {
  id: string;                 // 既読キーに使う。例 "welcome-2026"
  trigger: "first_visit" | "cart_abandon" | "idle";
  pages: string[];            // 対象パスの前方一致。"/" のみ完全一致扱い。"" は全ページ
  excludePages?: string[];    // 前方一致で除外（pages より優先）
  headline?: string;          // スマホで先に読ませる短い見出し（18 字目安）
  message: string;            // 本文 1〜2 文。"{count}" はカート点数に置換される
  cta?: { label: string; href: string }; // 任意・最大 1 つ（G7）
  image?: { src: string; alt: string };  // 任意。layout.imageVariant="none" なら非表示
  layout?: {
    mobile: MobilePlacement;             // スマホはシナリオ別に中央寄せ／下部／文脈内
    desktop: DesktopPlacement;           // PC は右下または文脈内
    imageVariant?: "side" | "none";     // 画像データを残したまま表示だけ切り替え可
    inlineAnchor?: string;               // inline 時に挿入する data-onsite-anchor の値
  };
  conditions?: {
    minScrollPct?: number;               // first_visit: delaySec と AND で評価
    minProductViews?: number;            // idle: 到達したら idleSec を待たず早期表示
  };
  frequency?: {
    maxImpressions: 1 | 2;               // 表示上限。既定は 1
    cooldownDays?: number;               // 2 回目まで空ける日数
    stopOnClick?: boolean;                // CTA クリック後は終了（既定 true）
  };
  priority: number;           // 同時成立時は小さい方が勝つ（G3）
  delaySec?: number;          // first_visit 用（既定 3・G4）
  idleSec?: number;           // idle 用（既定 60）
  active: boolean;
};

export const SEED_CAMPAIGNS: Campaign[] = [
  {
    // 開店あいさつ＝クリティカルコア「設計図ごと全部公開」の 1 行告知
    id: "welcome-2026",
    trigger: "first_visit",
    pages: ["/", "/articles"],
    headline: "中身を見てから選べます",
    message: "TENZU のプリントは、全問を購入前にご覧いただけます。",
    cta: { label: "プリントの中身を見る", href: "/products" },
    image: {
      src: "/assets/articles/point-drawing-complete-guide/02-learning-order.webp",
      alt: "段階別に並んだ点描写プリント",
    },
    layout: { mobile: "floating", desktop: "corner", imageVariant: "side" },
    conditions: { minScrollPct: 35 },
    frequency: { maxImpressions: 1, stopOnClick: true },
    priority: 10,
    delaySec: 10,
    active: true,
  },
  {
    // 商品ページで迷っている人へ（診断語彙 NG — 「目安」の提案トーン）
    id: "guide-nudge",
    trigger: "idle",
    pages: ["/products"],
    headline: "はじめる位置に迷ったら",
    message: "今の様子から選ぶ目安を、短いガイドにまとめています。",
    cta: { label: "レベル選びガイドを見る", href: "/level-guide" },
    image: {
      src: "/assets/articles/how-to-choose-and-use/01-choose-by-fit.webp",
      alt: "親子で点描写プリントを選んでいる様子",
    },
    layout: { mobile: "floating", desktop: "corner", imageVariant: "side" },
    conditions: { minProductViews: 2 },
    frequency: { maxImpressions: 2, cooldownDays: 30, stopOnClick: true },
    priority: 20,
    idleSec: 30,
    active: true,
  },
  {
    // 工房で固まっている人へ（お知らせのみ・CTA なし）
    id: "maker-hint",
    trigger: "idle",
    pages: ["/maker", "/makers"],
    excludePages: ["/maker-thanks"], // 購入完了画面には出さない
    headline: "練習は紙で",
    message: "作った問題は PDF にして、そのまま印刷できます。",
    image: {
      src: "/assets/articles/how-to-choose-and-use/02-screen-to-paper.webp",
      alt: "画面で作った問題を紙で練習する流れ",
    },
    layout: {
      mobile: "inline",
      desktop: "inline",
      imageVariant: "side",
      inlineAnchor: "maker-pdf",
    },
    frequency: { maxImpressions: 1, stopOnClick: true },
    priority: 30,
    idleSec: 30,
    active: true,
  },
  {
    // カート放置＝事実通知のみ・急かさない（G6）
    id: "cart-keep",
    trigger: "cart_abandon",
    pages: [""], // 全ページ（カートに入っている時だけトリガーが武装される）
    excludePages: ["/cart", "/checkout"], // カート・決済画面では見えている情報なので出さない
    headline: "カートに {count} 巻入っています",
    message: "続きは、いつでもカートから確認できます。",
    cta: { label: "カートを見る", href: "/cart" },
    image: {
      src: "/assets/articles/point-drawing-complete-guide/01-choosing-materials.webp",
      alt: "親子で点描写プリントを見比べている様子",
    },
    layout: { mobile: "bottom", desktop: "corner", imageVariant: "side" },
    frequency: { maxImpressions: 2, cooldownDays: 7, stopOnClick: true },
    priority: 5,
    active: true,
  },
  {
    // 春 LP 案内（1-3 月限定運用）: 1 月第 1 週に active: true・4 月に false
    // href は春 LP 実装時に確定する（acquisition/funnel.md §10）
    id: "spring-lp-2027",
    trigger: "first_visit",
    pages: ["/articles"],
    headline: "春の7枚をまとめました",
    message: "形と位置の練習を、はじめやすい順に選べます。",
    cta: { label: "春の特集を見る", href: "/spring" },
    image: {
      src: "/assets/articles/point-drawing-guide/01-from-classroom-to-home.webp",
      alt: "家庭で点描写プリントに取り組む様子",
    },
    layout: { mobile: "floating", desktop: "corner", imageVariant: "side" },
    conditions: { minScrollPct: 40 },
    frequency: { maxImpressions: 1, stopOnClick: true },
    priority: 15,
    delaySec: 10,
    active: false,
  },
];
