/* =========================================================================
   オンサイトメッセージ — Campaign 型（共有 SSOT）＋初期シード配列
   - 配信・運用の SSOT は DynamoDB（ONSITE_TABLE）。編集は管理画面 /admin/onsite
     から行い、保存が即時本番反映される（acquisition/onsite-messaging.md §4/§9）
   - SEED_CAMPAIGNS は初期投入（POST /api/admin/onsite/seed・未存在 id のみ・冪等)
     専用。日常の文言変更をこの配列に書いても本番には反映されない
   - 運用計画・ガードレールの設計 SSOT は acquisition/onsite-messaging.md §2/§8
   - 生涯 1 回（localStorage 既読）なので、常時 active は 5 本以内に厳選する
   - 文言の NG 語彙は管理画面が警告する（SSOT は foundation/voice-tone.md）
   - 停止は active: false（消さない＝既読キー履歴を残す）
   ========================================================================= */

export type Campaign = {
  id: string;                 // 既読キーに使う。例 "welcome-2026"
  trigger: "first_visit" | "cart_abandon" | "idle";
  pages: string[];            // 対象パスの前方一致。"/" のみ完全一致扱い。"" は全ページ
  excludePages?: string[];    // 前方一致で除外（pages より優先）
  message: string;            // 本文 1〜2 文。"{count}" はカート点数に置換される
  cta?: { label: string; href: string }; // 任意・最大 1 つ（G7）
  image?: { src: string; alt: string };  // 任意・カード内 64px サムネイル（G1: カードは大きくしない）
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
    message: "プリントの中身は、全問購入前にご覧いただけます。",
    cta: { label: "品ぞろえを見る", href: "/products" },
    priority: 10,
    delaySec: 3,
    active: true,
  },
  {
    // 商品ページで迷っている人へ（診断語彙 NG — 「目安」の提案トーン）
    id: "guide-nudge",
    trigger: "idle",
    pages: ["/products"],
    message: "レベル選びに迷ったら、はじめる位置の目安もあります。",
    cta: { label: "レベル選びガイドへ", href: "/level-guide" },
    priority: 20,
    idleSec: 60,
    active: true,
  },
  {
    // 工房で固まっている人へ（お知らせのみ・CTA なし）
    id: "maker-hint",
    trigger: "idle",
    pages: ["/maker", "/makers"],
    excludePages: ["/maker-thanks"], // 購入完了画面には出さない
    message: "作るのは画面、練習は紙。作った問題は PDF にして印刷できます。",
    priority: 30,
    idleSec: 60,
    active: true,
  },
  {
    // カート放置＝事実通知のみ・急かさない（G6）
    id: "cart-keep",
    trigger: "cart_abandon",
    pages: [""], // 全ページ（カートに入っている時だけトリガーが武装される）
    excludePages: ["/cart", "/checkout"], // カート・決済画面では見えている情報なので出さない
    message: "カートにプリントが {count} 巻入っています。",
    cta: { label: "カートを見る", href: "/cart" },
    priority: 5,
    active: true,
  },
  {
    // 春 LP 案内（1-3 月限定運用）: 1 月第 1 週に active: true・4 月に false
    // href は春 LP 実装時に確定する（acquisition/funnel.md §10）
    id: "spring-lp-2027",
    trigger: "first_visit",
    pages: ["/articles"],
    message: "春から始める形と位置の練習、特集ページがあります。",
    cta: { label: "入学準備の特集へ", href: "/spring" },
    priority: 15,
    delaySec: 3,
    active: false,
  },
];
