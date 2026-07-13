# オンサイトメッセージ（自前 Web 接客）

## サマリ

- サイト内で**条件に合った訪問者にだけ小さなメッセージカードを出す**仕組み。外部 Web 接客 SaaS（Flipdesk 等）は契約せず**自前実装**（React コンポーネント＋DynamoDB＋管理画面）
- シナリオは 3 つだけ: **S1 初回訪問のあいさつ／S2 カート放置の声かけ／S3 迷っている人への案内（アイドル検知）**。これ以上のシナリオ拡張は前提にしない
- **頻度は 1 人 1 メッセージ生涯 1 回**（localStorage 既読管理）。同時表示は 1 件・1 ページビュー最大 1 件
- **表示形式は画面下部の控えめカードのみ**（本文＋任意 CTA 1 つ＋任意 64px サムネイル画像）。画面を覆うモーダル・オーバーレイは禁止（V1 煽らない・V3 邪魔しないとの整合が最優先）
- 文言は [voice-tone.md](../foundation/voice-tone.md) 準拠（診断語彙 NG・煽り NG・CTA は任意提案トーン）。管理画面が NG 語彙を編集時に警告する
- キャンペーン定義の SSOT は **DynamoDB（`ONSITE_TABLE`）**。**管理画面 `/admin/onsite`（合言葉認証・本番稼働・§9）**で文言・画像・表示場所を編集し、保存が即時反映（デプロイ不要）。`campaigns.ts` は型定義＋初期シード専用
- 計測は**二重経路（§6）**: first-party 日次カウンタ（`/api/onsite/track` → DynamoDB・管理画面で閲覧・GTM 未接続でも数える）＋ GTM dataLayer（GA4 用 `onsite_msg_*`）
- 画像は管理画面からアップロード → S3（`ONSITE_IMAGE_BUCKET`・公開読み取り）。カードは 64px サムネイル固定＝G1 整合（§7）
- **キャンペーン運用計画は §8**（常設 3 本＋S2＋季節 1 本・生涯 1 回なので「その期に最も価値ある 1 言」だけを厳選）
- 採用判断の経緯: [decisions.md §5.7](../decisions.md)（SaaS 不採用・自前実装）／[decisions.md §5.15](../decisions.md)（DynamoDB＋管理画面・first-party 計測）

## 詳細

### §1. 位置づけ

- **自前実装**。理由: ①必要機能が 3 シナリオだけで SaaS のセグメント配信・A/B テストは過剰（キャンペーン編集と計数を見る管理画面 §9 だけを最小で自前に持つ）②サイトが Next.js 自前なのでタグ配信レイヤー自体が不要 ③サードパーティスクリプトを置かない方針（V3「広告で邪魔しない」の体験思想と同根・パフォーマンス/プライバシー面でも自前が優位）④固定費ほぼゼロ（DynamoDB/S3 はオンデマンド・個人店規模では実質無料枠内）
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
- **用途例**: 開店あいさつ（「中身が見える店」の 1 行告知）・新タスクラインのお知らせ・季節 LP への案内（§8）

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

### §4. データモデル（DynamoDB ＝ SSOT）

キャンペーン定義と日次カウンタを **DynamoDB テーブル 1 本（`ONSITE_TABLE`・PK/SK 文字列・オンデマンド・GSI なし）**に置く。

| アイテム | PK | SK | 属性 |
|---|---|---|---|
| キャンペーン定義 | `"CAMPAIGN"` | `{id}` | 下記 Campaign 型の全フィールド＋ `createdAt` / `updatedAt` |
| 日次カウンタ | `"STAT"` | `"{yyyy-mm-dd}#{id}"`（JST） | `show` / `click` / `dismiss`（`ADD` でアトミック加算）・`date`・`campaignId` |

```ts
type Campaign = {
  id: string;                 // 既読キーに使う。例 "welcome-2026"（後から変えない）
  trigger: "first_visit" | "cart_abandon" | "idle";
  pages: string[];            // 対象パスの前方一致。["/"] は完全一致扱い・[""] は全ページ
  excludePages?: string[];    // 前方一致で除外（pages より優先）
  message: string;            // 本文（1〜2 文まで）。"{count}" はカート点数に置換
  cta?: { label: string; href: string };  // 任意・最大 1 つ
  image?: { src: string; alt: string };   // 任意・カード内 64px サムネイル（alt 必須）
  priority: number;           // 同時成立時は小さい方が勝つ
  delaySec?: number;          // first_visit 用（既定 3）
  idleSec?: number;           // idle 用（既定 60）
  active: boolean;            // 停止は false に（削除しない＝既読キー履歴を残す）
};
```

- 型定義と初期シード配列（`SEED_CAMPAIGNS`）は `web/app/components/onsite/campaigns.ts`。**日常の編集は管理画面 §9 から行い、この配列を書き換えても本番には反映されない**
- 永続層の実装: `web/app/lib/onsite-store.ts`（Query / atomic ADD / 期間 Range Query）
- 全定義取得＝`Query PK="CAMPAIGN"`（常時 5 本規模）。期間統計＝`Query PK="STAT" AND SK BETWEEN`（1 Query）

### §5. 頻度制御・既読管理

- 既読キー: `tenzu_om_{id}` を localStorage に保存（値は表示日時）。**表示した時点で既読**（閉じる操作を待たない）
- 1 ページビュー内で 1 件表示したら、そのPVでは他キャンペーンを評価しない
- localStorage 不可環境（プライベートモード等）では**出さない側に倒す**（出し過ぎより出ない方がブランド整合）

### §6. 計測（二重経路）

- **first-party 日次カウンタ（管理画面用・主経路）**: 表示/クリック/閉じるを `POST /api/onsite/track`（`navigator.sendBeacon`・失敗時 fetch keepalive）→ DynamoDB `STAT` アイテムへ ADD 加算。管理画面 §9 の統計タブで閲覧。**GTM/GA4 の接続状態と無関係に数えられる**。`?om_preview` のプレビュー表示は数えない。未知の campaignId は受信側で黙って捨てる
- **GTM dataLayer（GA4 用・併存）**: `onsite_msg_show` / `onsite_msg_click` / `onsite_msg_dismiss`（params: `campaign_id`, `trigger`）を push。`NEXT_PUBLIC_GTM_ID` 未設定時は no-op。GA4 側タグは GTM コンソールで追加する。広告ファネル 10 イベント（[funnel.md §11](funnel.md)）とは別系統の補助イベント扱い
- 重複・ボット除去はしない素朴カウント（生涯 1 回表示なので show ≒ ユニークリーチ）。実装の詳細は [../engineering/analytics.md](../engineering/analytics.md)

### §7. 実装形態

- 表示: `web/app/components/onsite/OnsiteMessenger.tsx`（client component・layout に 1 か所マウント）。マウント時に配信 API `GET /api/onsite/campaigns`（active のみ・`Cache-Control: no-store`＝管理画面の保存が即時反映）から定義を取得。**取得失敗・`ONSITE_TABLE` 未設定時は「出さない側」に倒す**（§5 と同方向）。`/admin`・`/atelier` 配下では動かない
- 永続層: `web/app/lib/onsite-store.ts`（§4）。既読（生涯 1 回）は引き続き localStorage＝サーバーに個人単位の記録は持たない
- 画像: 管理画面からアップロード → クライアント縮小（canvas・長辺 512px・webp/jpeg）→ S3 `ONSITE_IMAGE_BUCKET` の `onsite/{uuid}.*`（`onsite/*` プレフィックスのみ公開読み取り・immutable キャッシュ）。カードには **64px サムネイル固定**で表示（G1: カードを大きくしない・`max-width: 420px` 不変・alt 必須）
- 見た目は rev.5 Design System 準拠（[../design/visual-identity.md](../design/visual-identity.md)）: 純白カード・dashed divider・accent は CTA 到達系のみ・アニメは控えめなスリップインだけ
- 検証: `?om_preview={id}` クエリで既読・active を無視して強制表示できるプレビューモードを持つ（既読は焼かず・first-party 計測に数えない）
- 必要 env: `ONSITE_TABLE`・`ONSITE_IMAGE_BUCKET`・`APP_AWS_ACCESS_KEY_ID` / `APP_AWS_SECRET_ACCESS_KEY`・`ADMIN_SECRET`（一覧と注釈は [web/.env.production.example](../web/.env.production.example)・amplify.yml の whitelist と一致させる）

### §8. キャンペーン運用計画（期別・2026-07-11 策定）

生涯 1 回制約の下では「出せる弾が 1 人 1 メッセージ」＝**キャンペーンは常時 5 本以内に厳選**し、「その期・そのページで最も価値ある 1 言」だけを置く。

#### §8.1 キャンペーン一覧

| id | trigger | 対象ページ | 稼働期 | メッセージ方向（文言は実装時に NG grep 通し） | CTA |
|---|---|---|---|---|---|
| `welcome-2026` | S1 first_visit | TOP・記事 | 開店〜常設 | 「プリントの中身は、全問購入前にご覧いただけます」＝クリティカルコア（設計図ごと全部公開）の 1 行告知 | サンプルを見る（F2 メイン導線へ送客） |
| `guide-nudge` | S3 idle 60s | 商品一覧・SKU 詳細 | 開店〜常設 | 「レベル選びに迷ったら、はじめる位置の目安もあります」 | レベル選びガイドへ |
| `maker-hint` | S3 idle 60s | /maker 系 | 開店〜常設 | 「作るのは画面、練習は紙。作った問題は PDF にして印刷できます」 | なし（お知らせのみ可） |
| `cart-keep` | S2 cart_abandon | カートあり全頁 | 開店後〜常設 | 「カートに ◯◯ が入っています」（事実通知のみ・急かさない） | カートへ |
| `spring-lp-2027` | S1 first_visit | 年齢別記事・関連 Cluster | **1-3 月限定**（1 月第 1 週 active 化・4 月 false） | 「春から始める形と位置の練習、特集ページがあります」 | 春 LP へ |

- `welcome-2026` と季節キャンペーンが同時成立した場合は welcome を priority 上位（店の自己紹介が先）
- 本格化（12 月）で専用キャンペーンは追加しない（PR 経由の新規流入には `welcome-2026` がそのまま働く。クーポンは DM 経由読者限定のためオンサイトに出さない）

#### §8.2 スケジュール（マスタースケジュール連動）

| 時期 | タスク |
|---|---|
| ~~W4~~ **実装済み（2026-07-11 前倒し）** | OnsiteMessenger.tsx＋campaigns.ts＋layout マウント＋プレビューモード＋計測フック（`web/app/analytics.ts` の `trackOnsiteMsg`・GTM_ID 未設定時 no-op）。**S2 カート放置含む全 5 キャンペーン実装・動作検証済み**（first_visit 3 秒遅延→表示時既読→再訪非表示→× で消滅・`{count}` 置換・guide/cart の CTA 遷移先） |
| W5（8/10-8/16） | 開店キャンペーン文言の**オーナー最終確認**（たたき台はシード投入済み・管理画面 /admin/onsite から差し替え可＝デプロイ不要）・NG 語彙警告の確認 |
| W6（8/17-8/23） | テスト（P1 に追加）: `?om_preview` で全キャンペーン表示・生涯 1 回・モーダル無し・スマホ実機のカード表示・×で消える |
| 9 月 | GA4 接続: `onsite_msg_show/click/dismiss`（GTM にタグ・トリガー追加。補助イベント扱い・3 イベントの後でよい） |
| 10 月〜 | 月次チェックに show→click 率・dismiss 率を追加。click 率が低い文言は差し替え（B3 で対応） |
| 11 月 | `spring-lp-2027` の文言準備（春 LP 制作と同時） |
| 1 月第 1 週 | `spring-lp-2027` active 化（春 LP 公開と同時デプロイ） |
| 3 月末 | 春総括でオンサイト効果検証（show→click→遷移先 `generated_pdf`/ガイド完了の接続率） |

#### §8.3 判断指標（虚栄指標にしない）

- 見るのは **click 率（show→click・5% 前後で良好目安）と dismiss 率**のみ。show 数は母数であって成果ではない
- 効果の最終判定は「click → 遷移先の北極星（`generated_pdf`・ガイド完了・purchase）に繋がったか」。北極星の定義は変えない（補助イベント）
- 3 ヶ月（10-12 月）観察して click 率 1% 未満が続くキャンペーンは文言差し替え → それでも動かなければ active: false（枠は §3 の 3 シナリオから増やさない・減らすのは自由）

### §9. 管理画面（/admin/onsite）

**本番稼働のオーナー専用画面**。キャンペーンの登録・編集・停止と、表示数/クリック数の閲覧を行う。保存は DynamoDB へ即時反映＝**文言・画像・表示場所の差し替えにデプロイ不要**（季節キャンペーンの active 切替も画面から）。

- **認証**: 合言葉方式。`ADMIN_SECRET`（env）をタイミングセーフ比較 → HMAC 署名 cookie `tenzu_admin`（30 日・実装は `web/app/lib/auth.ts`）。レート制限は持たず**十分長いランダム合言葉のエントロピーで守る**（失敗時 400ms 待ち）。atelier と違い NODE_ENV ガードは付けない＝本番で使う画面
- **一覧**: active トグル（即時停止/再開）・直近 7 日の表示/クリック小計・プレビューリンク（`{対象ページ}?om_preview={id}`・別タブ）・編集
- **編集フォーム**: 全フィールド。id は新規作成時のみ入力可（既読キーのため後から変えない）・trigger に連動して delaySec / idleSec を出し分け・CTA はラベル＋リンク先のペア（G7=1 つまでをフォーム構造で担保）・画像はアップロード＋**alt 必須**（無いと保存不可）
- **NG 語彙警告**: [voice-tone.md](../foundation/voice-tone.md) §1／§7.6 の grep パターンを移植した配列（`web/app/admin/onsite/ng-words.ts`）で本文・CTA ラベルを検査。**警告のみ・保存はブロックしない**。voice-tone.md 側を更新したら ng-words.ts も同期する
- **統計タブ**: 期間指定（既定 直近 14 日）の日別・キャンペーン別 show / click / dismiss と click 率。判断指標は §8.3 のとおり（show は母数であって成果ではない）
- **シード**: `campaigns.ts` の `SEED_CAMPAIGNS` を未存在 id のみ投入（冪等・既存アイテムには触れない）
- **削除**は入力ミスの後始末専用。**運用上の停止は active: false**（既読キー履歴を残す）
- クローラ対策: ページ noindex ＋ robots.txt の `/admin` Disallow

## 附録

- 採用判断（Flipdesk 等 SaaS 不採用・自前実装）: [decisions.md §5.7](../decisions.md)
- DynamoDB＋管理画面運用への移行・first-party 計測導入: [decisions.md §5.15](../decisions.md)
- §8 運用計画の策定: 2026-07-11（8/30 開店体系・[decisions.md §3.76](../decisions.md) に連動。旧用途例「モニター公募の告知」は公開後モニター化に伴い削除）
