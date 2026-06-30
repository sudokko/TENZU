# TENZU 画面遷移マップ（流入チャネル起点）

## サマリ

- 画面遷移の**正本（SSOT）**。流入チャネル → 着地（玄関）→ 中間（体験・選定）→ 商品 → 購入フロー の5ステージで全画面の繋がりを示す。
- 形式は **Mermaid**（テキスト＝プロンプト編集前提・座標計算なし）。GitHub・VS Code・Claude アーティファクト・`tools/build-html` すべてで描画される。
- 全ページの**俯瞰ワイヤー**は [pages-overview.html](./pages-overview.html)（同ディレクトリ・単独HTML）。
- 凡例：🟢実装済 / 🔴未実装P0 / 🟡未実装後続 / ★最重要 / 破線＝ナビ・後続導線。
- 確定事項：①流入は「直接・ブランド/SEO情報/SEO取引・広告・ブロガーDM/紹介波及」（MailerLite リピーターは当面スコープ外）②**TOP がブランドハブ、商品一覧 `/products` は独立ハブ**（3層構造：TOP → /products → /products/{task} → SKU詳細）。**SEO取引意図は TOP でなく専用ファセットLPが受ける**（無料/プリント本丸/むずかしい/やさしい/年齢/立体・**有償一本・メーカー非訴求**／無料LPのみ絵柄サンプル印刷可）③広告は独立LPを持たず **/maker?from=ad モード**で一発着地（取引LPの流し先にはしない）④**購入フロー（/cart → Stripe → /checkout/success）は実装済**（sk_test キーで Checkout 到達確認済・Webhook → SES メール配送まで一気通貫）⑤**レベル選びガイド `/level-guide` は実装済**（6問・2軸出力。商品リンク配線済・サンプルPDFリンクのみ未配線 href="#"）⑥**メーカー完了画面は実装済**（案A・動的レコメンド）⑦**メーカーは公開商品ライン化**（公開ハブ `/makers` indexed＋ツール10種 noindex・ヘッダー/フッター/TOP から到達・§2-3.5）⑧未実装の鍵画面：サンプルPDFプレビュー（modal）・**SEO取引ファセットLP群**。
- **メーカー有償化（会員・課金）フロー＝実装済・test mode で一気通貫実証済（git未コミット・[§6](#6-会員-課金-メーカー有償化-フロー)）**：2段サブスク（**¥480 スタンダード＝1図形操作 / ¥980 フル＝2図形・座標変換**）＋無料ゲスト。タスク幅の段階解放 SSOT＝`MAKER_MIN_TIER`。**DBなし署名cookie**（HMAC・2層exp ログイン30d / tier再検証24h）で entitlement、信頼ソースは Stripe。`/pricing`→Stripe Checkout→`/api/auth/verify`→cookie の即ログイン、`/login`→**OTP（6桁）再ログイン**（マジックリンクは webhook 裏で温存）、`/api/me` の24h tier再検証、`/account`→Billing Portal 解約まで通し。各 `/maker-*` は `MakerGate`（ページ階層ゲート・未契約は App 非マウント）。**段階3＝完了（全9メーカー外部公開・ゲート化）。未＝本番化（live価格・SES脱サンドボックス・Upstash・AUTH_SECRET本番値）**。
- 変遷：旧正本は draw.io（`screen-flow.drawio`）。プロンプト編集に不向きなため 2026-06-06 にテキスト系へ移行（→ 附録）。2026-06-16 実装状況を全面反映。2026-06-21 会員・課金フロー（§6）追加。2026-06-25 メーカー10種を外部公開（公開ハブ /makers）・tier 再線引き（スタンダード＝1図形/フル＝2図形）・再ログインを OTP 化を全面反映。

## 詳細

### §1. 遷移マップ

```mermaid
flowchart LR
  classDef inflow fill:#dae8fc,stroke:#6c8ebf,color:#1a1f2a;
  classDef done   fill:#d5e8d4,stroke:#82b366,color:#1a1f2a;
  classDef p0     fill:#f8cecc,stroke:#b85450,color:#1a1f2a;
  classDef key    fill:#ffe6cc,stroke:#d79b00,color:#1a1f2a;
  classDef later  fill:#fff2cc,stroke:#d6b656,color:#1a1f2a;

  subgraph IN[流入チャネル]
    direction TB
    F_direct["直接・ブランド<br/>検索・ナビ"]
    F_seotrans["SEO取引意図<br/>プリント無料<br/>年長/立体"]
    F_seoinfo["SEO情報意図<br/>点描写/公文<br/>入学準備"]
    F_ad["Meta / X 広告"]
    F_blogdm["ブロガーDM"]
    F_blogref["ブロガー紹介の波及<br/>（読者・フォロワー）"]
  end

  subgraph LAND[着地（玄関）]
    direction TB
    G_top["TOP<br/>ブランドハブ<br/>🟢"]
    G_article["記事<br/>Pillar/Cluster<br/>🟢1/16"]
  end

  subgraph SEOLP[SEO取引LP（有償一本・メーカー非訴求）]
    direction TB
    L_free["★ 無料LP<br/>絵柄サンプル印刷可<br/>4Lv×3問=12問<br/>🔴"]
    L_print["プリント本丸LP<br/>点描写プリント1,600<br/>🔴"]
    L_facet["ファセットLP群<br/>むずかしい/やさしい<br/>年齢/立体<br/>🔴"]
  end

  subgraph MID[中間（体験・選定）]
    direction TB
    M_sample["サンプルPDF<br/>プレビュー(modal)<br/>🔴"]
    M_guide["レベル選びガイド<br/>/level-guide 6問<br/>🟢商品リンク配線済<br/>サンプルPDFのみ未配線"]
    M_makerdone["メーカー完了画面<br/>案A・動的レコメンド<br/>🟢"]
  end

  subgraph MAKER[メーカー（10 種・サブスク商品 §6）]
    direction TB
    M_makers["★ メーカーハブ<br/>/makers 🟢indexed<br/>10 種カード＋プランバッジ"]
    M_maker["模写メーカー<br/>/maker 🟢無料・ゲート無"]
    M_gated["他 9 メーカー<br/>/maker-mirror … translate<br/>🟢noindex・MakerGate ロック"]
  end

  subgraph PROD[商品]
    direction TB
    P_hub["商品一覧ハブ<br/>/products<br/>🟢"]
    P_task["タスク別一覧<br/>/products/{task}<br/>🟢10タスク"]
    P_detail["商品詳細<br/>/products/{task}-lv{n}-vol{m}<br/>🟢25/68 live"]
    P_bundle["バンドルSKU 🟡"]
  end

  subgraph BUY[購入フロー（単発¥200・既存）]
    direction TB
    C_cart["カート /cart<br/>🟢"]
    C_stripe["Stripe Checkout<br/>（外部）🟢"]
    C_thanks["サンクス<br/>/checkout/success<br/>🟢PDF DL＋SES配送"]
  end

  subgraph MEMBER[会員・課金（メーカー有償化）§6]
    direction TB
    MB_pricing["プラン /pricing<br/>無料 / ¥480 スタンダード / ¥980 フル<br/>🟢"]
    MB_login["ログイン /login<br/>OTP 6 桁<br/>🟢"]
    MB_account["会員 /account<br/>Billing Portal<br/>🟢"]
  end

  F_direct --> G_top
  F_seotrans --> L_free
  F_seotrans --> L_print
  F_seotrans --> L_facet
  F_seoinfo --> G_article
  F_ad -->|?from=ad| M_maker
  F_blogdm -->|全員メーカーへ| M_maker
  F_blogref --> M_maker

  L_free -->|有償へ・絵柄続き＋図形| P_detail
  L_print --> P_detail
  L_facet --> P_detail
  L_free -.->|ぜんぶ見る| P_hub
  L_print -.-> P_hub
  L_facet -.-> P_hub

  G_top -->|品ぞろえ→タスク別| P_task
  G_top -->|帯CTA/ヘッダー/フッター| M_guide
  G_top -->|メーカー（ナビ/フッター/TOP節）| M_makers
  G_top -->|ヘッダー/フッター| P_hub
  G_article --> M_sample
  G_article --> M_guide
  M_sample --> P_detail
  M_guide -->|★最初の一冊| P_detail
  M_guide -.->|全部見る| P_hub
  M_makers -->|無料カード| M_maker
  M_makers -->|9 カード| M_gated
  M_makers -.->|プランを見る| MB_pricing
  M_maker -->|tool_start→generated_pdf| M_makerdone
  M_makerdone -->|次はこの3枚| P_detail
  M_makerdone --> P_bundle
  M_maker -.->|🔒機能ロック click| MB_pricing
  M_gated -.->|🔒MakerGate（未契約は App 非マウント）| MB_pricing
  M_makerdone -.->|ゲスト訴求| MB_pricing
  MB_pricing -->|申込→Stripe→即ログイン| M_maker
  MB_login -->|OTP 6 桁| M_maker
  MB_account -.->|プラン変更| MB_pricing
  P_hub --> P_task
  P_task -->|Lvアンカー→SKU| P_detail
  P_detail -->|add_to_cart| C_cart
  P_bundle --> C_cart
  C_cart --> C_stripe
  C_stripe -->|purchase| C_thanks

  class F_direct,F_seotrans,F_seoinfo,F_ad,F_blogdm,F_blogref inflow;
  class G_top,G_article,M_guide,M_maker,M_gated,M_makerdone,P_hub,P_task,P_detail,C_cart,C_stripe,C_thanks done;
  class M_makers key;
  class MB_pricing,MB_login,MB_account done;
  class M_sample,L_print,L_facet,L_free p0;
  class P_bundle later;
```

### §2. 確定事項

1. **流入チャネル**：直接・ブランド検索・ナビ／SEO情報意図（点描写・公文・入学準備）／SEO取引意図（プリント無料・年長・立体）／Meta・X広告／ブロガーDM／ブロガー紹介の波及。MailerLite リピーター導線は当面スコープ外。
2. **TOP はブランドハブ、商品一覧は3層構造**：TOP `/` はブランドハブ＋品ぞろえ概観。商品は `/products`（一覧ハブ・帯グラフ＋3群タスク行）→ `/products/{task}`（タスク別一覧10本・Lvアンカー着地・準備中巻も非リンク陳列）→ `/products/{task}-lv{n}-vol{m}`（SKU詳細）の3層。現在25 SKU live（copy 8/fill 8/mirror 6/motif 0/solid 0/他3）、43 scaffold。**SEO取引意図は TOP で受けない**——専用ファセットLP群に直接着地させる（[decisions.md §5.6](../../decisions.md)）。
2.5. **SEO取引ファセットLPは有償一本・メーカー非訴求**：FV に実問題サンプル（クエリ即応）→ 有償商品紹介、が共通テンプレ。無料完結を避けるためメーカーへは流さない。**無料LP のみ「絵柄（模写）のレベル別サンプル PDF（入門〜発展の4Lv×各3問＝12問）を印刷可」**で無料意図に応え、続きは図形ライン中心の有償へ橋渡し（[pack-design.md §25](../../product/pack-design.md)・[§14.6](../../product/pack-design.md)）。**この SEO取引LP からはメーカーへ流さない**（無料完結回避）。メーカー自体の公開商品ライン化は §3.5。
3. **広告は独立LPを持たない**：`/maker?from=ad` の同一URL・モード出し分けで一発着地。冷たい Meta 流入の補助。X・ブロガーは素の `/maker` で十分。
3.5. **メーカーは公開商品ライン（10 種・サブスク）**：当初「模写以外は内部用（noindex・ゲート無し＝URL 直打ちで無料使い放題）」を方針転換し外部公開。公開ハブ `/makers`（**indexed**・5 群カード＋プランバッジ）が店先、各ツールは noindex（SEO はハブに集約）。導線＝ヘッダー/フッター「メーカー」＋ TOP 従属セクション。`/maker`（模写）は無料ゲート無、他 9 種は `MakerGate`（ページ階層ゲート）で包み未契約は App 非マウント＝ロック画面＋ `/pricing` 導線。tier 線引き＝スタンダード ¥480（模写＋鏡・回転・欠け補完＝1 図形）/ フル ¥980（＋重ね・折り重ね・分解・拡大・縮小・平行移動＝2 図形・座標変換）。SSOT は `MAKER_MIN_TIER`（[capabilities.ts](../../web/app/products/capabilities.ts)）。詳細フローは §6。
4. **購入フローは実装済**：`/cart`（CartProvider＋複数巻まとめ買い）→ Stripe Checkout（`/api/checkout` でセッション生成）→ `/checkout/success`（Stripe session_id 検証＋SkuPrintPreview でPDF DL＋ClearCartOnSuccess）。Webhook（`/api/stripe/webhook`・checkout.session.completed）→ Amazon SES でマジックリンク再DLメール配送。**DBなし・リンク＝既存サンクスURL**。本番化にはオーナー側で SES 検証＋ whsec_ 投入＋ SES サンドボックス脱出が必要。
5. **レベル選びガイドは実装済**：`/level-guide`（Next.js 自前ページ・6問＝最後任意・2軸出力＝軸A「はじめる位置」Lv1-5＋軸B「最初の一冊」具体SKU）。TOP帯グラフ下CTA・Hero/Close ゴースト・ヘッダー・フッターの5箇所から到達。**商品リンク配線済。サンプルPDFリンクのみ未配線**（href="#"・PDF整備待ち）。設計詳細は [funnel.md §3](../../acquisition/funnel.md)。
6. **メーカー完了画面は実装済**：案A・動的レコメンド方式。PDF書き出し後に模写（図形）8段ラダーから次の一冊を提案。
7. **未実装の鍵画面**：サンプルPDFプレビュー（modal）／**SEO取引ファセットLP群**（無料/プリント本丸/ファセット）。
8. **開発専用ツール**（公開サイトには露出しない）：`/atelier`（問題検品・候補生成→採用→publish。本番は notFound()）＋ `/api/atelier/*`（generate/candidates/publish）。

### §3. CV イベントと導線の対応

| 区間 | イベント | フェーズ |
|---|---|---|
| /maker → メーカー完了画面 | `tool_start` → `generated_pdf` | Phase 0-1 の主 CV |
| 商品詳細 → カート | `add_to_cart` | Phase 2-3 |
| Stripe → サンクス | `purchase` | Phase 2-3 の主 CV |

### §4. 全ルート一覧（実装状況）

| ルート | 画面 | 状態 |
|---|---|---|
| `/` | TOP（ブランドハブ・品ぞろえ概観） | 🟢 |
| `/products` | 商品一覧ハブ（帯グラフ＋3群タスク行） | 🟢 |
| `/products/{task}` | タスク別一覧（10タスク・Lvアンカー） | 🟢 |
| `/products/{task}-lv{n}-vol{m}` | SKU詳細（25 live / 43 scaffold） | 🟢/🚧 |
| `/level-guide` | レベル選びガイド（6問・2軸出力） | 🟢 |
| `/makers` | メーカー公開ハブ（店先・10 種カード＋プランバッジ・**indexed**） | 🟢 |
| `/maker` | 模写メーカー（無料・ゲート無・PDF出力） | 🟢 |
| `/maker-{mirror,rotate,fill,overlay,fold,decompose,scale,shrink,translate}` | 他 9 メーカー（MakerGate ゲート・noindex） | 🟢 |
| `/maker-index` | メーカー内部リンク集（noindex・内部用） | 🟢 |
| `/pricing` | プラン比較（無料/¥480 スタンダード/¥980 フル・申込） | 🟢 |
| `/login` | 会員ログイン（メアド→OTP 6 桁） | 🟢 |
| `/account` | 会員ページ（Billing Portal・ログアウト） | 🟢 |
| `/cart` | カート（複数巻まとめ買い） | 🟢 |
| `/checkout/success` | サンクス（Stripe検証＋PDF DL） | 🟢 |
| `/articles/{slug}` | 記事（1/16実装） | 🟢/🚧 |
| `/atelier`, `/atelier/{sku}` | 問題検品ツール（dev限定） | 🟢dev |
| SEO取引ファセットLP群 | 無料/本丸/ファセット | 🔴 |
| サンプルPDFプレビュー | modal | 🔴 |

### §5. API ルート一覧

| エンドポイント | 用途 | 状態 |
|---|---|---|
| `/api/checkout` | Stripe セッション生成（skus → checkout URL・単発¥200） | 🟢 |
| `/api/stripe/webhook` | Webhook 検証 → SES メール配送（購入＋サブスク作成） | 🟢 |
| `/api/subscribe` | サブスク Checkout 生成（plan → checkout URL） | 🟢 |
| `/api/auth/request-otp` | OTP 6 桁発行（Stripe照会→SES送信・列挙対策で常にok・60秒スロットル＋1h上限） | 🟢 |
| `/api/auth/verify-otp` | OTP 照合 → 署名cookie 発行（5 回失敗でlock・単回使用） | 🟢 |
| `/api/auth/verify` | マジックリンク/Checkout復帰 → 署名cookie 発行（webhook・recover の予備経路） | 🟢 |
| `/api/auth/login-link` | 会員へマジックリンク送信（SES・予備経路／`/login` は OTP 一本化） | 🟢 |
| `/api/auth/logout` | セッション cookie 失効 | 🟢 |
| `/api/me` | 現 tier 返却＋24h tier再検証（Stripe再照会→cookie再発行） | 🟢 |
| `/api/billing-portal` | Stripe Billing Portal セッション生成（解約・支払変更） | 🟢 |
| `/api/atelier/generate` | 問題生成（Lv+grid → SVG） | 🟢dev |
| `/api/atelier/candidates` | 候補一覧取得 | 🟢dev |
| `/api/atelier/publish` | 候補 → published 昇格 | 🟢dev |

### §6. 会員・課金（メーカー有償化）フロー

> ⚠️ **2026-06-26 方針転換**（[decisions.md §4.6](../../decisions.md)）: サブスク 3 tier → **per-maker 買い切り ¥980**・サブスク廃止・有料ゲートは **PDF 書き出し**へ。**下記フロー図・表は再設計前の現行実装**（コード反映は次パス＝capabilities.ts/pricing/billing/MakerGate/webhook の作り替え待ち）。

メーカー 10 種（公開ハブ `/makers` ＋各ツール）のサブスク有償化。2 段サブスク（¥480 スタンダード / ¥980 フル）＋無料ゲスト。タスクの幅は `MAKER_MIN_TIER`（capabilities.ts）で段階解放＝**ゲスト=模写 / スタンダード=＋鏡・回転・欠け補完（1 図形）/ フル=＋重ね・折り重ね・分解・拡大・縮小・平行移動（2 図形・座標変換）**。`/maker`（模写）はゲート無の無料、他 9 種は `MakerGate` で包み未契約は App 非マウント。**DB なし署名 cookie**で entitlement を持ち、信頼ソースは Stripe。再ログインは `/login` の **OTP（6 桁）一本化**（マジックリンクは webhook・recover の予備として温存）。test mode で①〜④を一気通貫実証済み（git 未コミット）。

```mermaid
flowchart TB
  classDef done  fill:#d5e8d4,stroke:#82b366,color:#1a1f2a;
  classDef owner fill:#fff2cc,stroke:#d6b656,color:#1a1f2a;
  classDef todo  fill:#f8cecc,stroke:#b85450,color:#1a1f2a;
  classDef tierbox fill:#eef2f7,stroke:#9bb0c9,color:#1a1f2a;

  subgraph A["① 新規申込（同ブラウザで即ログイン）"]
    direction TB
    A1["/pricing 申込"] --> A2["POST /api/subscribe<br/>Checkout(mode:subscription)"]
    A2 --> A3{{"Stripe Checkout（外部）<br/>テストカード 4242"}}
    A3 --> A4["GET /api/auth/verify?session_id<br/>顧客→resolveTier→署名cookie"]
  end

  subgraph B["② 再ログイン（別端末・メール・OTP 一本化）"]
    direction TB
    B1["/login メアド入力"] --> B2["POST /api/auth/request-otp<br/>会員のみ送信・列挙対策で常にok<br/>60秒スロットル＋1h上限"]
    B2 --> B3["SES 確認コード<br/>（6 桁・TTL 10 分）"]
    B3 --> B4["POST /api/auth/verify-otp<br/>照合（5 回失敗でlock・単回使用）<br/>→resolveTier→署名cookie"]
  end

  COOKIE["署名cookie tenzu_session<br/>HMAC・2層exp ログイン30d / tier24h<br/>DBなし・信頼ソースは Stripe"]
  A4 --> COOKIE
  B4 --> COOKIE

  subgraph C["③ 利用・再検証"]
    direction TB
    C1["/maker・/maker-*<br/>page.tsx: readTier → MakerGate<br/>AuthContext → capabilities(tier)"]
    C2["GET /api/me<br/>tier 24h切れ→Stripe再照会→cookie再発行"]
    C1 -.->|マウント時 / 24h毎| C2
    C2 -.-> C1
  end
  COOKIE --> C1
  C1 -.->|🔒MakerGate / 機能ロック / DoneScreen訴求| A1

  subgraph D["④ 管理・解約"]
    direction TB
    D1["/account"] --> D2["POST /api/billing-portal"]
    D2 --> D3["Stripe Billing Portal（外部）<br/>解約→≤24hでゲストに"]
  end
  COOKIE --> D1

  WH["webhook customer.subscription.created<br/>→ SES マジックリンク（予備・温存）"]
  A3 -.->|webhook| WH -.->|GET /api/auth/verify?token| COOKIE

  subgraph T["tier ゲート SSOT（capabilities.ts: MAKER_MIN_TIER）"]
    direction LR
    T1["ゲスト<br/>模写のみ・5×5・3問・A4・1日5枚"]
    T2["¥480 スタンダード<br/>＋鏡・回転・欠け補完（1 図形）<br/>8×8・12問・B4/A3・記名・保存∞"]
    T3["¥980 フル<br/>＋重ね・折り重ね・分解・拡大・縮小・平行移動<br/>（2 図形・座標変換）"]
  end
  T -.->|MAKER_MIN_TIER / canUseMaker| C1

  class A1,A2,A3,A4,B1,B2,B4,COOKIE,C1,C2,D1,D2,D3 done;
  class B3,WH owner;
  class T1,T2,T3 tierbox;
```

凡例：🟩 実装済（test mode 実証済）／🟨 動くがオーナー本番化待ち（SES 脱サンドボックス・stripe listen）／🟥 未実装。

**実装の構成（どう作っているか）**

| レイヤ | ファイル | 役割 |
|---|---|---|
| 機能ゲート SSOT | `web/app/products/capabilities.ts` | tier（guest/entry/full）× 機能（グリッド/問数/用紙/点/記名/保存/DL）＋ **`MAKER_MIN_TIER`**（どのメーカーをどの tier で開けるか）・`canUseMaker` の単一定義 |
| メーカーメタ SSOT | `web/app/products/makers.ts` | 公開 10 メーカーの表示名・説明・グループ・ルート（ハブ・MakerGate・導線が共用） |
| ページゲート | `web/app/maker/MakerGate.tsx` | 各 `/maker-*` page.tsx が `readTier`→ラップ。未契約は子（XApp）を**非マウント**にしてロック画面を表示（App 内部は不変） |
| 公開ハブ | `web/app/makers/page.tsx` | 店先（**indexed**）。5 群カード＋プランバッジ。各ツールは noindex（SEO はハブに集約） |
| 認証 | `web/app/lib/auth.ts` | Node `crypto` の HMAC 署名 cookie（**jose 不使用＝依存ゼロ**）・2 層 exp・マジックリンク／**OTP（6 桁・10 分 TTL）** 発行・検証 |
| OTP ストア | `web/app/lib/otp-store.ts` | `OtpStore` 抽象（Upstash 本番／dev メモリを env 有無で自動切替）・送信スロットル・試行回数 |
| Stripe 照会 | `web/app/lib/billing.ts` | `resolveTier`（有効サブの price→tier）・`findCustomerIdByEmail` |
| クライアント状態 | `web/app/AuthContext.tsx` | `/api/me` で現 tier 取得（マウント時・24h 再検証） |
| サーバー注入 | `web/app/maker/page.tsx`・各 `/maker-*` | cookie から初期 tier を読み props 注入（フラッシュ回避） |
| 課金 | `/api/subscribe`・webhook | Stripe subscription mode。既存 ¥200 単発（payment mode）は温存・別フロー共存 |

**実装できていない / 残務**

- 🟩 **段階3＝完了**：フルの他タスクメーカー（鏡・回転・欠け補完・重ね・折り重ね・分解・拡大・縮小・平行移動）を全て外部公開＋ `MakerGate` で会員ゲート化（旧 todo を解消）。立体メーカーは未実装のため tier 表から削除。
- 🟨 **本番化（オーナー作業）**：live Price 作成 → env 投入／`AUTH_SECRET` 本番値／**SES 脱サンドボックス（★最優先）**（任意宛先へ送るため・OTP メールが「届かない端末がある」真因）／**Upstash アカウント＋env**（OTP ストア本番・未設定時は dev メモリで動作）／webhook を Amplify の実エンドポイントへ（dev は `stripe listen` 要・現在未起動）。
- 🟨 **方針転換（2026-06-26・実装待ち）**：`decisions.md §4.6`＝サブスク tier → **per-maker 買い切り ¥980**・サブスク廃止・有料ゲート＝PDF 書き出し・クロスセル位置づけ。文書 SSOT（decisions §4.6・pack-design §23.9・README）反映済。**本 §6 の図表とコード（capabilities.ts 等）は旧サブスクモデルのまま＝再設計が次パスの残務**。
- ⬜ **git 未コミット**（試行・簡単に戻せる状態）。

## 附録

- 全ページ俯瞰ワイヤー: [pages-overview.html](./pages-overview.html)
- レベル選びガイドの質問・分岐パターン詳細: [level-guide-flow.html](./level-guide-flow.html)
- 変遷: [archive/retired-structures/2026-06-06-screen-flow-drawio.md](../../archive/retired-structures/2026-06-06-screen-flow-drawio.md)（旧 draw.io 正本の退避記録）
