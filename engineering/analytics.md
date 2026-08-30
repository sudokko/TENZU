# 計測実装（GA4 / GTM / UTM）

## サマリ

- TENZU の**計測実装 SSOT**（イベント定義・UTM 命名規則・GTM/GA4 コンソール設定の運用手順）。KPI と判断基準は [../launch/measurement.md](../launch/measurement.md)、10 イベントの上位設計は [../acquisition/funnel.md §11](../acquisition/funnel.md)
- **構成**: GTM で Google タグを全ページに読み込み、コードはイベントごとに① GTM 用オブジェクト、② Google タグ用 `gtag('event', ...)` コマンドを dataLayer へ送る（[web/app/analytics.ts](../web/app/analytics.ts)）。これにより、GTM に同名の GA4 イベントタグを追加しなくても GA4 へ届き、将来の広告タグはオブジェクト形式をトリガーにできる。**唯一の別経路＝オンサイトメッセージの first-party 計測**（自前 API → DynamoDB 日次カウンタ・§8）
- **実装済みイベントは 7 つ**: `tool_start`／`generated_pdf`／`product_recommend_click`／`view_item`／`add_to_cart`／`begin_checkout`／`purchase`。通常の `page_view` は Google タグの自動送信
- **本番接続済み**: GTM `GTM-K7KNR7CH` → GA4 `G-KH1BKQLSLH`。主要イベントの本番受信と `generated_pdf`／`purchase` のキーイベント指定を確認済み。残る確認は Search Console 連携・内部トラフィック除外・`begin_checkout` と最初の実購入（§5）
- **アタッチ率**: `purchase` の `item_category`（`paper`/`maker`）と `purchase_kind` で紙→工房転換を GA4 上で集計（§4）
- **ON/OFF は env 1 本**: `NEXT_PUBLIC_GTM_ID`（未設定＝GTM 計測 no-op。dev はこれで良い。オンサイト first-party 計測 §8 だけは GTM_ID と無関係に動く）。Amplify 登録キーは [web/.env.production.example](../web/.env.production.example)
- 流入元識別は **UTM ＋ GA4 自動収集**（コード実装不要）。命名規則は §3 が SSOT
- Google 側コンソール設定（GA4 プロパティ・GTM コンテナ・タグ/トリガー・Search Console 連携）は §5 の手順書どおり（人間作業・約 1 時間）
- **週次レポート自動化（運用ツール⑥）は §7 に方針のみ確定**（GA4 Data API＋Stripe 読み取り専用キー → md 出力 → `/weekly-ops` が読む。実装は静かな開店期以降・データが溜まってから）

## 詳細

### §1. 実装アーキテクチャ

```
コード（web/app/analytics.ts）
  ├─ dataLayer.push({event, ...}) + gtag('event', ...) ← NEXT_PUBLIC_GTM_ID 未設定なら no-op
  │    └─ GTM コンテナ（web/app/Gtm.tsx が root layout に注入）
  │         ├─ Google タグ（G-KH1BKQLSLH）        ← GTM コンソールで管理
  │         └─ （将来）Meta Pixel・Google 広告タグ ← オブジェクト形式を利用
  └─ sendBeacon POST /api/onsite/track（onsite_msg のみ・GTM_ID と無関係・§8）
       └─ DynamoDB ONSITE_TABLE（STAT 日次カウンタ）→ 管理画面 /admin/onsite で閲覧
```

| ファイル | 役割 |
|---|---|
| `web/app/analytics.ts` | track 関数群・GTM_ID ゲート・GA4 測定 ID・購入の二重送信ガード・オンサイト first-party ビーコン |
| `web/app/Gtm.tsx` | GTM スニペット（root layout の body 直下・ID 未設定なら非描画） |
| `web/app/TrackPurchase.tsx` | サンクスページ用の購入計測クライアントコンポーネント |
| `web/app/lib/onsite-store.ts` | オンサイト日次カウンタの永続層（DynamoDB・§8） |

### §2. イベント定義（実装済み 7 つ＋自動 page_view）

| イベント | 発火点（単一） | パラメータ | 備考 |
|---|---|---|---|
| `tool_start` | メーカー共通シェル `MakerHeader` のマウント（全 11 メーカー） | `maker`: copy / mirror / fill / fold / scale / shrink / translate / rotate / overlay / decompose / solid | パスから自動導出（`/maker`→copy） |
| `generated_pdf` | メーカー共通 `exportPdf` の保存直後（全メーカー） | `maker`・`pages` | **北極星指標**。UTM と掛けて「流入元別 generated_pdf」 |
| `product_recommend_click` | PDF 完了画面の商品レコメンドクリック | `currency`・`value`・`item_list_name`・`item_id`・`item_name`・`item_category`（GTM 用 `ecommerce.items[]` も併送） | メーカーから紙商品への送客 |
| `view_item` | 商品詳細ページの表示 | GA4 eコマース標準（`currency`・`value`・`items[]`） | 商品閲覧 |
| `add_to_cart` | 商品詳細で「カートに追加」 | GA4 eコマース標準（`currency`・`value`・`items[]`） | カート追加成功後 |
| `begin_checkout` | Stripe Checkout URL の生成成功後、遷移直前 | GA4 eコマース標準（`currency`・`value`・`items[]`） | 決済開始 |
| `purchase` | `/checkout/success`（紙）・`/maker-thanks`（メーカー）※いずれも paid 確認後 | GA4 eコマース標準（`transaction_id`・`value`・`currency: JPY`・`items[]`）＋独自 `purchase_kind`: paper / maker | `items[].item_category` に paper/maker。再訪・リロードは transaction_id の localStorage ガード＋GA4 側重複排除の二段 |

`page_view` は Google タグが自動送信する。上位設計のうち `lp_view` は `page_view` で代替、`repeat_purchase` は `purchase` 回数から導出する。未実装は `tool_config` と `download_pdf`（`generated_pdf` と役割が重なるため、必要性が出た時だけ追加）。

### §3. UTM 命名規則（SSOT）

全 SNS・広告・メールのリンクに付与。**すべて小文字・ハイフン区切り**。

| パラメータ | 規則 | 値の例 |
|---|---|---|
| `utm_source` | 媒体名 | `pinterest` / `instagram` / `x` / `note` / `ameba` / `newsletter` / `google` / `meta` |
| `utm_medium` | 枠の種類 | `pin` / `carousel` / `reel` / `story` / `post` / `profile` / `dm` / `cpc` / `email` |
| `utm_campaign` | 施策・シーズン | `launch` / `nyugaku-2027`（春 LP）／`tsuyu-2027` / `natsuyasumi-2027` / `monitor-recruit` |
| `utm_content` | 個別クリエイティブ識別 | `copy-lv2-snake` / `pin-p1-copy-lv2-vol1-003` |

- 例: `https://tenzu.jp/maker?utm_source=pinterest&utm_medium=pin&utm_campaign=nyugaku-2027&utm_content=pin-p1-copy-lv2-vol1-003`
- プロフィール経由とストーリーズ経由は **medium を分ける**（[sns-operations §3.4](../acquisition/sns-operations.md)）
- `/atelier/pins` のキャプション CSV は本規則で UTM を焼く。campaign はツール上部のセレクタで選び、content は `pin-{テンプレ}-{sku}-{連番}`（連番は PNG ファイル名と一致するので GA4 とピン実物を突き合わせられる）
- **SKU を `utm_campaign` に入れない**。campaign は季節トラック（[../acquisition/sns-operations.md §5](../acquisition/sns-operations.md)）の比較軸であり、SKU で潰すと入学準備・梅雨・夏休みの効き目が測れなくなる。SKU は content 側に持たせる

### §4. アタッチ率の読み方（GA4）

紙購入者のうちメーカー購入に至った割合（[phase-1-todo](phase-1-todo.md) 旧残実装(B)）。

- 分子・分母とも `purchase` イベントから: `purchase_kind=paper` の購入ユーザー数を分母、そのうち `purchase_kind=maker` も持つユーザー数を分子
- GA4 の **探索（Explorations）→ セグメントの重複**で「paper 購入者」×「maker 購入者」セグメントを重ねるのが最短
- 併せて Stripe ダッシュボードの顧客メール突合でも検算できる（同一メールで paper/maker 両方の Checkout があるか）

### §5. コンソール設定手順（人間作業・初回のみ）

> 所要 約 1 時間。アカウントは普段の Google アカウントで良い。

#### §5.1 本番の確定状態

| 項目 | 現在の状態 |
|---|---|
| GA4 ウェブストリーム | ストリーム名 `TENZU`／URL `https://tenzu.jp`／ストリーム ID `15255884396`／測定 ID `G-KH1BKQLSLH` |
| GTM | 公開コンテナ `GTM-K7KNR7CH`。Google タグだけを Initialization - All Pages で発火。同名の GA4 イベントタグは置かない |
| 本番受信確認 | `page_view`／`tool_start`／`generated_pdf`／`product_recommend_click`／`view_item`／`add_to_cart` を GA4 リアルタイムまたは標準イベントレポートで確認済み |
| キーイベント | `generated_pdf` と `purchase` を有効化済み。`purchase` は実購入データ待ち |
| 未確認・未設定 | Stripe 遷移を伴う `begin_checkout`、最初の実購入と Stripe の突合、Search Console 連携、内部トラフィック除外 |
| 通常レポート用の追加設定 | `maker`・`purchase_kind` 等を軸に常設集計する場合は、GA4 管理のカスタム定義へイベントスコープのカスタムディメンションとして登録する。`pages` はカスタム指標候補 |

本番実装と初回検証の経緯・検証値は [2026-08-23 GA4 本番導入セッション](../archive/sessions/2026-08/2026-08-23-ga4-production-setup.md) を参照。

#### §5.2 初回設定手順

1. **GA4 プロパティ作成**: [analytics.google.com](https://analytics.google.com) → プロパティ作成「TENZU」→ タイムゾーン日本・通貨 JPY → データストリーム（ウェブ）`https://tenzu.jp` → **測定 ID（G-XXXX…）を控える**。拡張計測（ページビュー・スクロール等）は ON のまま
2. **GTM コンテナ作成**: [tagmanager.google.com](https://tagmanager.google.com) → コンテナ「tenzu.jp」（ウェブ）→ **コンテナ ID（GTM-XXXX…）を控える**
3. **GTM に GA4 設定タグ**: タグ新規 →「Google タグ」→ タグ ID に測定 ID（G-…）→ トリガー「Initialization - All Pages」
4. **イベントタグは追加しない**: アプリが Google タグ用 `gtag('event', ...)` を直接 dataLayer に積むため、GTM に同名の GA4 イベントタグを作ると二重送信になる。広告タグを追加するときだけ、同時に積まれるオブジェクト形式のカスタムイベントをトリガーにする
5. **プレビュー検証 → 公開**: GTM の「プレビュー」でサイトを開き、メーカー起動→ PDF 書き出し→商品閲覧→カート追加でイベントが飛ぶことを確認 →「公開」
6. **GA4 キーイベント指定**: GA4 管理 → イベント → `generated_pdf` と `purchase` を**キーイベント**に（`tool_start` は指標としてだけ見る）
7. **Search Console**: [search.google.com/search-console](https://search.google.com/search-console) → ドメインプロパティ `tenzu.jp` を DNS TXT で所有権確認 → GA4 管理 →「Search Console のリンク」で接続
8. **env 設定**: Amplify コンソール → Environment variables → `NEXT_PUBLIC_GTM_ID=GTM-XXXX…` を追加して再デプロイ。TENZU の main は `amplify.yml` に公開コンテナ `GTM-K7KNR7CH` の安全側フォールバックも持つ（コンソール値があればそちらを優先）。ローカルで動作を見たいときは `web/.env.local` に同じ値
9. **（開店後の広告開始時・後で可）**: Google 広告アカウントを GA4 にリンク／Meta Pixel を GTM 経由で追加（コード変更不要）

### §6. プライバシー対応（公開前に 1 回）

- 特商法・プライバシーポリシーページに**外部送信（Google アナリティクス / Google タグマネージャー）の記載**を追加する（電気通信事業法の外部送信規律対応。利用目的＝アクセス解析・送信先＝Google LLC・オプトアウト手段を明記）
- クッキーバナーは現状不要の判断（日本法・GA4 のみ）。EU 向け配信を始める場合は再検討

### §7. 週次レポート自動化（運用ツール⑥・方針のみ・実装は静かな開店期以降）

**目的**: `/weekly-ops` 手順 1（数値チェック）の手動貼り付けを自動化し、B1 の数値確認を 15 分 → 5 分にする。

**構成（実装時の設計図）**:

```
web/scripts/weekly-report.mjs（Node・週 1 手動実行から始める）
 ├─ GA4 Data API（runReport）
 │    generated_pdf × utm_source（直近 7 日 vs 前 7 日）／tool_start × maker
 │    purchase × purchase_kind（paper/maker）／流入チャネル別セッション
 ├─ Stripe API（読み取り専用 restricted key）
 │    paid の Checkout Sessions（7 日）→ 件数・金額・paper/maker 内訳（GA4 の検算用）
 └─ Search Console API：クリック・表示・上位クエリ（直近 7 日）
 → 出力: docs/ops/weekly-report-<date>.md（ops-log.md の行形式と互換の表＋前週比）
 → /weekly-ops 手順 1 が「オーナーの貼り付け」の代わりにこのファイルを読む
```

**認証・env（実装時に追加するもの）**:

| 項目 | 方針 |
|---|---|
| GA4 / Search Console | Google Cloud のサービスアカウント 1 本を GA4 プロパティと SC プロパティに「閲覧者」で追加。`GA4_PROPERTY_ID`＋キー JSON（**ローカルのみ・コミット禁止・Amplify には置かない**） |
| Stripe | **読み取り専用 restricted key**（Checkout Sessions read のみ許可）。本番 secret key をスクリプトに使い回さない |
| 実行 | まず手動 `npm run weekly-report`。運用が安定したら Claude Code の scheduled task で週 1 自動化を検討 |

**実装の前提条件（これを満たすまで着手しない）**: ①GA4 に 2 週間以上のデータ ②主要イベントが安定して記録されている ③`/weekly-ops` の手動運用を 2-3 回回して「見たい数字」が固まっている。

**やらないこと**: Looker Studio 等のダッシュボード構築（見るのは北極星 3 つだけ・時系列は [ops-log.md](../launch/ops-log.md) が SSOT）／リアルタイム監視／日次実行。

### §8. オンサイトメッセージの first-party 計測

「コード → dataLayer → GTM」一方向原則の**唯一の例外**。オンサイトメッセージ（`onsite_msg_show` / `click` / `dismiss`）だけは dataLayer と**並列**に自前経路でも数える。目的は GA4/GTM の接続状態と無関係に、管理画面で表示数/クリック数を見られるようにすること（運用判断用。GA4 側は広告文脈の補助）。

- 送信: `trackOnsiteMsg`（analytics.ts）が `navigator.sendBeacon`（失敗時 fetch keepalive）で `POST /api/onsite/track` → DynamoDB `ONSITE_TABLE` の STAT アイテム（`PK="STAT", SK="{yyyy-mm-dd}#{campaignId}"`・JST 日次）へ show / click / dismiss を ADD 加算
- `?om_preview` のプレビュー表示は first-party 側だけ数えない（dataLayer へは従来どおり流れる）
- 重複・ボット除去はしない素朴カウント。未知の campaignId は受信側で捨てる
- 閲覧: 管理画面 `/admin/onsite` の統計タブ（期間指定・日別・click 率）
- 設計 SSOT: [../acquisition/onsite-messaging.md §6/§9](../acquisition/onsite-messaging.md)／判断ログ: [../decisions.md §5.15](../decisions.md)
- GTM 側タグ（`onsite_msg_*`）は従来計画どおり静かな開店期に追加してよい（二重経路は意図的）

## 附録

- 導入記録: [2026-08-23 GA4 本番導入セッション](../archive/sessions/2026-08/2026-08-23-ga4-production-setup.md)
- 関連: [../acquisition/funnel.md §11-§12](../acquisition/funnel.md)（10 イベント・6 オーディエンスの上位設計）／[../launch/measurement.md](../launch/measurement.md)（KPI）／[../acquisition/sns-operations.md §3.4](../acquisition/sns-operations.md)（計測の配線）／[../launch/operations.md §8](../launch/operations.md)（ツール整備ロードマップ）
