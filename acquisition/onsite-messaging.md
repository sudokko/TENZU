# オンサイトメッセージ（自前 Web 接客）

## サマリ

- サイト内で**条件に合った訪問者にだけ小さなメッセージカードを出す**仕組み。外部 Web 接客 SaaS（Flipdesk 等）は契約せず**自前実装**（React コンポーネント＋コード内設定配列）
- シナリオは 3 つだけ: **S1 初回訪問のあいさつ／S2 カート放置の声かけ／S3 迷っている人への案内（アイドル検知）**。これ以上のシナリオ拡張は前提にしない
- **頻度は 1 人 1 メッセージ生涯 1 回**（localStorage 既読管理）。同時表示は 1 件・1 ページビュー最大 1 件
- **表示形式は画面下部の控えめカードのみ**。画面を覆うモーダル・オーバーレイは禁止（V1 煽らない・V3 邪魔しないとの整合が最優先）
- 文言は [voice-tone.md](../foundation/voice-tone.md) 準拠（診断語彙 NG・煽り NG・CTA は任意提案トーン）
- キャンペーン定義は `campaigns.ts` のコード内配列＝SSOT。変更はコード編集→デプロイ（管理画面は持たない）
- 計測は **onShow / onClick / onDismiss のフックだけ先行実装**（中身は no-op）。GA4 導入時に `onsite_msg_*` イベントへ接続
- 導入順序: **S1・S3 が先行**。S2 はトリガー枠だけ予約し、カート実装（購入フロー P0）と同時に発火条件を確定
- 採用判断の経緯: [decisions.md §5.7](../decisions.md)

## 詳細

### §1. 位置づけ

- **自前実装**。理由: ①必要機能が 3 シナリオだけで SaaS の管理画面・セグメント配信・A/B テストは過剰 ②サイトが Next.js 自前なのでタグ配信レイヤー自体が不要 ③サードパーティスクリプトを置かない方針（V3「広告で邪魔しない」の体験思想と同根・パフォーマンス/プライバシー面でも自前が優位）④固定費ゼロ
- 役割は **CV 導線の補助**。主導線（サンプル直接プレビュー・メーカー・レベル選びガイド／§F2 3 段構造 → [funnel.md §1](funnel.md)）を置き換えるものではなく、「気付いていない人にそっと知らせる」だけ

### §2. ブランドガードレール（実装より優先）

ポップアップは本質的に「邪魔」のリスクを持つ。V1（煽らない）・V3（邪魔しない）を掲げる店として、以下を**機能要件より上位の制約**とする。

| # | ルール | 実装 |
|---|---|---|
| G1 | 画面を覆わない | モーダル・背景オーバーレイ・スクロールロック禁止。**画面下部のカード（スリップイン）のみ** |
| G2 | 生涯 1 回 | 既読を localStorage 管理。同じメッセージは二度と出さない |
| G3 | 同時 1 件・1PV 1 件 | 複数条件が同時成立しても priority 上位 1 件のみ。表示済み PV では他を抑制 |
| G4 | 即時に出さない | first_visit でもページ表示から最低 3 秒は待つ（読み始めを邪魔しない） |
| G5 | 閉じるが第一級 | × ボタン明確・カード外クリックでも消える・閉じた事実も既読扱い |
| G6 | 文言は提案トーン | 「〜しませんか」「〜もあります」。緊急性演出（残りわずか・今だけ・手遅れ系）禁止。診断語彙 NG（[voice-tone.md §1](../foundation/voice-tone.md)） |
| G7 | CTA は任意 | ボタンなしの「お知らせのみ」を許容。CTA があっても 1 つまで |

### §3. シナリオ 3 種

#### S1. 初回訪問のあいさつ（trigger: `first_visit`）

- **条件**: 対象ページに初めて来た人（該当キャンペーンの既読キーが無い）
- **発火**: ページ表示から `delaySec`（既定 3 秒）後
- **用途例**: モニター公募の告知・新タスクラインのお知らせ・季節 LP への案内

#### S2. カート放置の声かけ（trigger: `cart_abandon`）

- **条件**: カートに SKU が入ったまま離脱の予兆がある人
- **発火（PC）**: `mouseleave` でカーソルがビューポート上端へ抜けた時（タブ閉じ・戻るの予兆）
- **発火（モバイル）**: exit intent が物理的に存在しないため、`visibilitychange`（タブ離脱→復帰時に表示）または「カートあり＋無操作」をアイドル扱いで代替
- **文言方向**: 「カートに ◯◯ が入っています」の事実通知のみ。急かさない（G6）
- **状態**: トリガー種別として枠を予約。**発火条件・カート状態の参照方法はカート実装（購入フロー P0）と同時に確定**

#### S3. 迷っている人への案内（trigger: `idle`）

- **条件**: 対象ページで `idleSec`（既定 60 秒）間、scroll / click / keydown / touch がない人
- **用途例**: 商品一覧・SKU 詳細で固まっている人に「レベル選びガイドもあります」／メーカーで固まっている人に使い方ヒント
- **注意**: 別タブ・離席との区別はしない（生涯 1 回なので誤爆コストは低い）。`visibilitychange` で非表示中はタイマー停止

### §4. データモデル（campaigns.ts ＝ SSOT）

```ts
type Campaign = {
  id: string;                 // 既読キーに使う。例 "monitor-recruit-2026"
  trigger: "first_visit" | "cart_abandon" | "idle";
  pages: string[];            // 対象パスの前方一致。例 ["/products"]・["/"] は完全一致扱い
  message: string;            // 本文（1〜2 文まで）
  cta?: { label: string; href: string };  // 任意・最大 1 つ
  priority: number;           // 同時成立時は小さい方が勝つ
  delaySec?: number;          // first_visit 用（既定 3）
  idleSec?: number;           // idle 用（既定 60）
  active: boolean;            // 停止はコードで false に（配列から消さない＝既読キー履歴を残す）
};
```

- 配置: `web/app/components/onsite/campaigns.ts`
- 文言は [voice-tone.md](../foundation/voice-tone.md) の NG grep を通してから追加する

### §5. 頻度制御・既読管理

- 既読キー: `tenzu_om_{id}` を localStorage に保存（値は表示日時）。**表示した時点で既読**（閉じる操作を待たない）
- 1 ページビュー内で 1 件表示したら、そのPVでは他キャンペーンを評価しない
- localStorage 不可環境（プライベートモード等）では**出さない側に倒す**（出し過ぎより出ない方がブランド整合）

### §6. 計測フック

- コンポーネントは `onShow(id)` / `onClick(id)` / `onDismiss(id)` を発火する。実体は当面 no-op（dev では console）
- GA4 導入時に `onsite_msg_show` / `onsite_msg_click` / `onsite_msg_dismiss`（params: `campaign_id`, `trigger`）へ 1 行で接続。広告ファネル 10 イベント（[funnel.md §11](funnel.md)）とは別系統の補助イベント扱い

### §7. 実装形態

- `web/app/components/onsite/OnsiteMessenger.tsx`（client component・layout に 1 か所マウント）＋ `campaigns.ts`
- 見た目は rev.5 Design System 準拠（[../design/visual-identity.md](../design/visual-identity.md)）: 純白カード・dashed divider・accent は CTA 到達系のみ・アニメは控えめなスリップインだけ
- dev 検証: `?om_preview={id}` クエリで既読を無視して強制表示できるプレビューモードを持つ
- 導入順序: **S1・S3（＋計測フック・プレビューモード）を先行実装**。S2 はカート実装と同時

## 附録

- 採用判断（Flipdesk 等 SaaS 不採用・自前実装）: [decisions.md §5.7](../decisions.md)
