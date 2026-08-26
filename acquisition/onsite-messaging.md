# オンサイトメッセージ（自前 Web 接客）

## サマリ

- サイト内で**条件に合った訪問者にだけ小さなメッセージカードを出す**仕組み。外部 Web 接客 SaaS（Flipdesk 等）は契約せず**自前実装**（React コンポーネント＋DynamoDB＋管理画面）
- シナリオは 3 つだけ: **S1 初回訪問のあいさつ／S2 カート放置の声かけ／S3 迷っている人への案内（アイドル検知）**。これ以上のシナリオ拡張は前提にしない
- **頻度は原則 1 回**。レベル選び・カート通知だけ最大 2 回（7日/30日の休止期間）を許可し、クリック後は終了。localStorage に表示・閉じる・クリックを分けて保存する。同時表示は 1 件・1PV最大 1 件
- **表示形式はスマホでシナリオ別**: 初回案内/レベル選び/春特集＝中央寄せの小型非モーダル、カート＝画面下部、メーカーの初回案内＝画面下部（中央は作図面の真上になるため）、メーカーのヒント＝文脈内。PC は右下または文脈内。全形式で背景オーバーレイ・スクロールロックは禁止
- カードは**見出し＋本文＋任意 CTA 1 つ＋画像**。シードテンプレートすべてに既存ブランド画像を設定し、管理画面で画像表示だけを外せる
- 文言は [voice-tone.md](../foundation/voice-tone.md) 準拠（診断語彙 NG・煽り NG・CTA は任意提案トーン）。管理画面が NG 語彙を編集時に警告する
- キャンペーン定義の SSOT は **DynamoDB（`ONSITE_TABLE`）**。**管理画面 `/admin/onsite`（合言葉認証・本番稼働・§9）**で文言・画像・表示場所を編集し、保存が即時反映（デプロイ不要）。`campaigns.ts` は型定義＋初期シード専用
- 計測は**二重経路（§6）**: first-party 日次カウンタ（`/api/onsite/track` → DynamoDB・管理画面で閲覧・GTM 未接続でも数える）＋ GTM dataLayer（GA4 用 `onsite_msg_*`）
- 画像は管理画面からアップロード → S3（`ONSITE_IMAGE_BUCKET`・公開読み取り）。スマホ102×124px／PC84×104pxの横配置（§7）
- **キャンペーン運用計画は §8**（常設 3 本＋S2＋季節 1 本。「その期・その場で最も価値ある案内」だけを厳選）
- 採用判断の経緯: [decisions.md §5.7](../decisions.md)（SaaS 不採用・自前実装）／[decisions.md §5.15](../decisions.md)（DynamoDB＋管理画面・first-party 計測）

## 詳細

### §1. 位置づけ

- **自前実装**。理由: ①必要機能が 3 シナリオだけで SaaS のセグメント配信・A/B テストは過剰（キャンペーン編集と計数を見る管理画面 §9 だけを最小で自前に持つ）②サイトが Next.js 自前なのでタグ配信レイヤー自体が不要 ③サードパーティスクリプトを置かない方針（V3「広告で邪魔しない」の体験思想と同根・パフォーマンス/プライバシー面でも自前が優位）④固定費ほぼゼロ（DynamoDB/S3 はオンデマンド・個人店規模では実質無料枠内）
- 役割は **CV 導線の補助**。主導線（サンプル直接プレビュー・メーカー・レベル選びガイド／§F2 3 段構造 → [funnel.md §1](funnel.md)）を置き換えるものではなく、「気付いていない人にそっと知らせる」だけ

### §2. ブランドガードレール（実装より優先）

ポップアップは本質的に「邪魔」のリスクを持つ。V1（煽らない）・V3（邪魔しない）を掲げる店として、以下を**機能要件より上位の制約**とする。

| # | ルール | 実装 |
|---|---|---|
| G1 | 画面を覆わない | モーダル・背景オーバーレイ・スクロールロック禁止。中央寄せでもカード高はスマホ viewport の30%以下・背景操作を止めない |
| G2 | 出し過ぎない | 原則1回。最大2回のキャンペーンは休止期間を必須化。CTAクリック後は終了。localStorage不可環境では出さない |
| G3 | 同時 1 件・1PV 1 件 | 複数条件が同時成立しても priority 上位 1 件のみ。表示済み PV では他を抑制 |
| G4 | 即時に出さない | first_visit は最低10秒＋スクロール率をAND評価（開いた直後の読み始めを邪魔しない） |
| G5 | 閉じるが第一級 | × ボタン明確・カード外クリックでも消える・閉じた事実は再表示制御に反映 |
| G6 | 文言は提案トーン | 「〜しませんか」「〜もあります」。緊急性演出（残りわずか・今だけ・手遅れ系）禁止。診断語彙 NG（[voice-tone.md §1](../foundation/voice-tone.md)） |
| G7 | CTA は任意 | ボタンなしの「お知らせのみ」を許容。CTA があっても 1 つまで |

### §3. シナリオ 3 種

#### S1. 初回訪問のあいさつ（trigger: `first_visit`）

- **条件**: 対象ページに初めて来た人（該当キャンペーンの既読キーが無い）
- **発火**: ページ表示から `delaySec`（推奨10秒）を経過し、`conditions.minScrollPct`（推奨35〜40%）にも到達した後
- **用途例**: 開店あいさつ（「中身が見える店」の 1 行告知）・新タスクラインのお知らせ・季節 LP への案内・メーカー初回訪問への無料範囲の案内（§8）

#### S2. カート放置の声かけ（trigger: `cart_abandon`）

- **条件**: カートに SKU が入ったまま離脱の予兆がある人
- **発火**: カートを保持したまま対象ページへ来た6秒後。PCの `mouseleave` とモバイルの `visibilitychange` は、唐突な疑似exit intentになるため使わない
- **文言方向**: 「カートに ◯◯ が入っています」の事実通知のみ。急かさない（G6）
- **状態**: トリガー種別として枠を予約。**発火条件・カート状態の参照方法はカート実装（購入フロー P0）と同時に確定**

#### S3. 迷っている人への案内（trigger: `idle`）

- **条件**: 対象ページで `idleSec`（推奨30秒）間、scroll / click / keydown / touch がない人。商品詳細の閲覧数が `conditions.minProductViews` に達した場合は早期表示できる
- **用途例**: 商品一覧・SKU 詳細で固まっている人に「レベル選びガイドもあります」／メーカーで固まっている人に使い方ヒント
- **注意**: 別タブ・離席との区別はしない。`visibilitychange` で非表示中はタイマー停止

### §4. データモデル（DynamoDB ＝ SSOT）

キャンペーン定義と日次カウンタを **DynamoDB テーブル 1 本（`ONSITE_TABLE`・PK/SK 文字列・オンデマンド・GSI なし）**に置く。

| アイテム | PK | SK | 属性 |
|---|---|---|---|
| キャンペーン定義 | `"CAMPAIGN"` | `{id}` | 下記 Campaign 型の全フィールド＋ `createdAt` / `updatedAt` |
| 日次カウンタ | `"STAT"` | `"{yyyy-mm-dd}#{id}"`（JST） | `show` / `click` / `dismiss`（`ADD` でアトミック加算）・`date`・`campaignId` |
| 問い合わせ履歴 | `"CONTACT"` | `"{ISO日時}#{短ID}"` | `company` / `name` / `email` / `phone` / `message`（全部任意）・`id`・`createdAt`。問い合わせフォーム（/contact）が書き、/admin/contact が読む（実装 `web/app/lib/contact-store.ts`・decisions §3.82） |

```ts
type Campaign = {
  id: string;                 // 既読キーに使う。例 "welcome-2026"（後から変えない）
  trigger: "first_visit" | "cart_abandon" | "idle";
  pages: string[];            // 対象パスの前方一致。["/"] は完全一致扱い・[""] は全ページ
  excludePages?: string[];    // 前方一致で除外（pages より優先）
  headline?: string;          // 短い見出し（18字目安）
  message: string;            // 本文（1〜2 文まで）。"{count}" はカート点数に置換
  cta?: { label: string; href: string };  // 任意・最大 1 つ
  image?: { src: string; alt: string };   // 任意・alt 必須
  layout?: {
    mobile: "floating" | "bottom" | "inline";
    desktop: "corner" | "inline";
    imageVariant?: "side" | "none";
    inlineAnchor?: string;
  };
  conditions?: { minScrollPct?: number; minProductViews?: number };
  frequency?: { maxImpressions: 1 | 2; cooldownDays?: number; stopOnClick?: boolean };
  priority: number;           // 同時成立時は小さい方が勝つ
  delaySec?: number;          // first_visit 用（推奨 10）
  idleSec?: number;           // idle 用（推奨 30）
  active: boolean;            // 停止は false に（削除しない＝既読キー履歴を残す）
};
```

- 型定義と初期シード配列（`SEED_CAMPAIGNS`）は `web/app/components/onsite/campaigns.ts`。**日常の編集は管理画面 §9 から行い、この配列を書き換えても本番には反映されない**
- 永続層の実装: `web/app/lib/onsite-store.ts`（Query / atomic ADD / 期間 Range Query）。問い合わせ履歴のみ `web/app/lib/contact-store.ts`（同テーブル相乗り）
- 全定義取得＝`Query PK="CAMPAIGN"`（常時 5 本規模）。期間統計＝`Query PK="STAT" AND SK BETWEEN`（1 Query）

### §5. 頻度制御・既読管理

- 配信状態キー: `tenzu_om_{id}` を localStorage に保存（JSON: 表示回数・最終表示日時・最終閉じる日時・クリック済み）。旧ISO日時形式は「表示済み1回」として読む
- 原則は表示1回で終了。`frequency.maxImpressions=2` の場合だけ `cooldownDays` 経過後にあと1回表示でき、CTAクリック後は終了
- 1 ページビュー内で 1 件表示したら、そのPVでは他キャンペーンを評価しない
- localStorage 不可環境（プライベートモード等）では**出さない側に倒す**（出し過ぎより出ない方がブランド整合）

### §6. 計測（二重経路）

- **first-party 日次カウンタ（管理画面用・主経路）**: 表示/クリック/閉じるを `POST /api/onsite/track`（`navigator.sendBeacon`・失敗時 fetch keepalive）→ DynamoDB `STAT` アイテムへ ADD 加算。管理画面 §9 の統計タブで閲覧。**GTM/GA4 の接続状態と無関係に数えられる**。`?om_preview` のプレビュー表示は数えない。未知の campaignId は受信側で黙って捨てる
- **GTM dataLayer（GA4 用・併存）**: `onsite_msg_show` / `onsite_msg_click` / `onsite_msg_dismiss`（params: `campaign_id`, `trigger`）を push。`NEXT_PUBLIC_GTM_ID` 未設定時は no-op。GA4 側タグは GTM コンソールで追加する。広告ファネル 10 イベント（[funnel.md §11](funnel.md)）とは別系統の補助イベント扱い
- 重複・ボット除去はしない素朴カウント（最大2回のキャンペーンでは show はユニークリーチと一致しない）。実装の詳細は [../engineering/analytics.md](../engineering/analytics.md)

### §7. 実装形態

- 表示: `web/app/components/onsite/OnsiteMessenger.tsx`（client component・layout に 1 か所マウント）。マウント時に配信 API `GET /api/onsite/campaigns`（active のみ・`Cache-Control: no-store`＝管理画面の保存が即時反映）から定義を取得。**取得失敗・`ONSITE_TABLE` 未設定時は「出さない側」に倒す**（§5 と同方向）。`/admin`・`/atelier` 配下では動かない
- 永続層: `web/app/lib/onsite-store.ts`（§4）。個人単位の配信状態はlocalStorageだけに置き、サーバーへは送らない
- 画像: 管理画面からアップロード → クライアント縮小（canvas・長辺512px・webp/jpeg）→ S3。カードではスマホ102×124px／PC84×104pxの横配置・alt必須
- 文脈内表示: `layout.inlineAnchor` と同じ `data-onsite-anchor` を持つ要素へ React Portal で挿入。メーカーは `maker-pdf` を使用
- 見た目は rev.5 Design System 準拠（[../design/visual-identity.md](../design/visual-identity.md)）: 純白カード・背景暗転なし・44pxの閉じる/CTA・opacityだけの控えめな表示アニメーション
- 検証: `?om_preview={id}` クエリで既読・active を無視して強制表示できるプレビューモードを持つ（既読は焼かず・first-party 計測に数えない）
- 必要 env: `ONSITE_TABLE`・`ONSITE_IMAGE_BUCKET`・`APP_AWS_ACCESS_KEY_ID` / `APP_AWS_SECRET_ACCESS_KEY`・`ADMIN_SECRET`（一覧と注釈は [web/.env.production.example](../web/.env.production.example)・amplify.yml の whitelist と一致させる）

### §8. キャンペーン運用計画（期別・2026-07-11 策定）

**キャンペーンは常時5本以内に厳選**し、「その期・そのページで最も価値ある案内」だけを置く。

#### §8.1 キャンペーン一覧

| id | 位置・条件 | 見出し / 本文 | 画像・CTA | 頻度 |
|---|---|---|---|---|
| `welcome-2026` | スマホ中央寄せ・10秒＋35%scroll | **中身を見てから選べます** / TENZUのプリントは、全問を購入前にご覧いただけます。 | 段階別プリント / プリントの中身を見る | 1回 |
| `guide-nudge` | スマホ中央寄せ・idle 30秒または2商品閲覧 | **はじめる位置に迷ったら** / 今の様子から選ぶ目安を、短いガイドにまとめています。 | 親子で選ぶ画像 / レベル選びガイドを見る | 30日休止・最大2回 |
| `maker-welcome` | `/maker` のみ・スマホ下部/PC右下・12秒（scroll 条件なし） | **4×4 までは無料でつくれます** / まずは 4×4 で作って、PDF にして印刷してみてください。5×5〜8×8 は、サイズを選ぶと ¥980 の買い切りで解放できます。 | 画面→紙の画像 / CTAなし | 1回 |
| `maker-hint` | `maker-pdf`文脈内・idle 30秒 | **練習は紙で** / 作った問題はPDFにして、そのまま印刷できます。 | 画面→紙の画像 / CTAなし | 1回 |
| `cart-keep` | スマホ下部・カートありで対象ページ6秒 | **カートに{count}巻入っています** / 続きは、いつでもカートから確認できます。 | 親子で見比べる画像 / カートを見る | 7日休止・最大2回 |
| `spring-lp-2027` | スマホ中央寄せ・10秒＋40%scroll | **春の7枚をまとめました** / 形と位置の練習を、はじめやすい順に選べます。 | 家庭学習画像 / 春の特集を見る | 1シーズン1回 |

- 常時 active は 5 本（`welcome-2026`／`guide-nudge`／`maker-welcome`／`maker-hint`／`cart-keep`）。`spring-lp-2027` は季節のみ active 化するので上限には数えない
- `welcome-2026` と季節キャンペーンが同時成立した場合は welcome を priority 上位（店の自己紹介が先）
- 本格化（12 月）で専用キャンペーンは追加しない（PR 経由の新規流入には `welcome-2026` がそのまま働く。クーポンは DM 経由読者限定のためオンサイトに出さない）

#### §8.2 スケジュール（マスタースケジュール連動）

| 時期 | タスク |
|---|---|
| ~~W4~~ **実装済み（2026-07-11、2026-08-24スマホ改訂）** | 自前配信・プレビュー・計測に加え、シナリオ別配置、見出し、画像5本、行動条件、最大2回＋休止期間、管理画面実寸プレビューを実装 |
| W5（8/10-8/16） | 開店キャンペーン文言の**オーナー最終確認**（たたき台はシード投入済み・管理画面 /admin/onsite から差し替え可＝デプロイ不要）・NG 語彙警告の確認 |
| W6（8/17-8/23） | テスト（P1 に追加）: `?om_preview` で全キャンペーン表示・モーダル無し・スマホ実機の3配置・×/カード外で消える・休止期間 |
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
- **編集フォーム**: 見出し・本文・CTA・画像、スマホ/PC配置、画像表示、行動条件、最大表示回数/休止日数を編集。390px実寸プレビューへ即時反映。画像はalt必須
- **画像アップロード**: クライアント縮小（長辺512px webp/jpeg）→ `POST /api/admin/onsite/image` → S3。**成否は画像欄の直下にも表示する**（フォームが長く、画面最上部のバナーだけでは視界に入らないため）。サーバー側は想定外の例外も JSON（`code: UNEXPECTED`）で返し、`[onsite-image]` 付きでログへ残す＝素の 500 で手掛かりが消えるのを防ぐ
- **S3 への PUT は `@aws-sdk/client-s3` を使わず自前 SigV4**（`web/app/lib/s3-put.ts`）。理由: 同 SDK は Next.js の既定 `serverExternalPackages` に入っていてバンドルされず生の `node_modules` 参照として残るが、Amplify は `artifacts: .next` しか本番へ運ばないためランタイムで解決できず、**import しただけでこのルートが全リクエスト 500 になる**（`client-ses` / `client-dynamodb` は既定リスト外なのでバンドルされ、同じ構成で動く）。`transpilePackages` では戻せない。署名の正しさは `npm run check:sigv4`（`scripts/verify-sigv4.mjs`）で AWS 公式実装 `@smithy/signature-v4` とのバイト一致を確認する（AWS 通信なし）
- ⚠️ 上記の結果、**画像アップロードは `APP_AWS_ACCESS_KEY_ID` / `APP_AWS_SECRET_ACCESS_KEY` の明示指定が必須**。SDK を外したため既定の認証チェーン（Amplify コンピュートロール等）へはフォールバックせず、未設定なら `S3_CREDENTIALS_MISSING` を返す。DynamoDB / SES 側の挙動は従来どおり
- **NG 語彙警告**: [voice-tone.md](../foundation/voice-tone.md) §1／§7.6 の grep パターンを移植した配列（`web/app/admin/onsite/ng-words.ts`）で本文・CTA ラベルを検査。**警告のみ・保存はブロックしない**。voice-tone.md 側を更新したら ng-words.ts も同期する
- **統計タブ**: 期間指定（既定 直近 14 日）の日別・キャンペーン別 show / click / dismiss と click 率。判断指標は §8.3 のとおり（show は母数であって成果ではない）
- **推奨テンプレート反映**: `campaigns.ts` の `SEED_CAMPAIGNS` で同じidを明示確認後にupsert。既存の個別編集を上書きするため確認ダイアログ必須
- **削除**は入力ミスの後始末専用。**運用上の停止は active: false**（既読キー履歴を残す）
- クローラ対策: ページ noindex ＋ robots.txt の `/admin` Disallow

## 附録

- 採用判断（Flipdesk 等 SaaS 不採用・自前実装）: [decisions.md §5.7](../decisions.md)
- DynamoDB＋管理画面運用への移行・first-party 計測導入: [decisions.md §5.15](../decisions.md)
- §8 運用計画の策定: 2026-07-11（8/30 開店体系・[decisions.md §3.76](../decisions.md) に連動。旧用途例「モニター公募の告知」は公開後モニター化に伴い削除）
