# TENZU 画面遷移マップ（流入チャネル起点）

## サマリ

- 画面遷移の**正本（SSOT）**。流入チャネル → 着地（玄関）→ 中間（体験・選定）→ 商品 → 購入フロー の5ステージで全画面の繋がりを示す。
- 形式は **Mermaid**（テキスト＝プロンプト編集前提・座標計算なし）。GitHub・VS Code・Claude アーティファクト・`tools/build-html` すべてで描画される。
- 全ページの**俯瞰ワイヤー**は [pages-overview.html](./pages-overview.html)（同ディレクトリ・単独HTML）。
- 凡例：🟢実装済 / 🔴未実装P0 / 🟡未実装後続 / ★最重要 / 破線＝ナビ・後続導線。
- 確定事項：①流入は「直接・ブランド/SEO情報/SEO取引・広告・ブロガーDM/紹介波及」（MailerLite リピーターは当面スコープ外）②**TOP が玄関兼カタログ**（商品一覧 /products を吸収・メーカーCTAは Hero 非掲載でナビ/フッター経由）③広告は独立LPを持たず **/maker?from=ad モード**で一発着地 ④購入フロー（/cart→Stripe→/thanks）は現状ゼロ＝**最優先P0** ⑤サンプルPDFプレビュー・レベル選びガイド・メーカー完了画面・サンクスが未実装の鍵画面。
- 変遷：旧正本は draw.io（`screen-flow.drawio`）。プロンプト編集に不向きなため 2026-06-06 にテキスト系へ移行（→ 附録）。

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
    G_top["TOP<br/>ブランドハブ＋商品玄関<br/>🟢要強化<br/>商品一覧を吸収"]
    G_article["記事<br/>Pillar/Cluster<br/>🟢1/16"]
  end

  subgraph MID[中間（体験・選定）]
    direction TB
    M_sample["サンプルPDF<br/>プレビュー(modal)<br/>🔴"]
    M_guide["レベル選びガイド<br/>5-7問 🔴"]
    M_maker["おためしメーカー<br/>/maker 🟢"]
    M_makerdone["★ メーカー完了画面<br/>（サンクス相当）<br/>🔴"]
  end

  subgraph PROD[商品]
    direction TB
    P_detail["商品詳細<br/>/products/sku<br/>🟢1/149"]
    P_bundle["バンドルSKU 🟡"]
  end

  subgraph BUY[購入フロー]
    direction TB
    C_cart["カート /cart 🔴"]
    C_stripe["Stripe Checkout<br/>（外部）🔴"]
    C_thanks["★ サンクス<br/>/thanks 🔴"]
  end

  F_direct --> G_top
  F_seotrans --> G_top
  F_seoinfo --> G_article
  F_ad -->|?from=ad| M_maker
  F_blogdm -->|全員メーカーへ| M_maker
  F_blogref --> M_maker

  G_top -->|品ぞろえ→個別| P_detail
  G_top -.->|ナビ/フッター| M_maker
  G_article --> M_sample
  G_article --> M_guide
  M_sample --> P_detail
  M_guide --> P_detail
  M_maker -->|tool_start→generated_pdf| M_makerdone
  M_makerdone -->|次はこの3枚| P_detail
  M_makerdone --> P_bundle
  P_detail -->|add_to_cart| C_cart
  P_bundle --> C_cart
  C_cart --> C_stripe
  C_stripe -->|purchase| C_thanks

  class F_direct,F_seotrans,F_seoinfo,F_ad,F_blogdm,F_blogref inflow;
  class G_top,G_article,M_maker,P_detail done;
  class M_sample,M_guide,C_cart,C_stripe p0;
  class M_makerdone,C_thanks key;
  class P_bundle later;
```

### §2. 確定事項

1. **流入チャネル**：直接・ブランド検索・ナビ／SEO情報意図（点描写・公文・入学準備）／SEO取引意図（プリント無料・年長・立体）／Meta・X広告／ブロガーDM／ブロガー紹介の波及。MailerLite リピーター導線は当面スコープ外。
2. **TOP が玄関兼カタログ**：商品一覧 `/products` を TOP に吸収。SEO取引意図も TOP で受ける。メーカーCTAは Hero 非掲載＝ナビ/フッター経由で到達（オーナー判断）。
3. **広告は独立LPを持たない**：`/maker?from=ad` の同一URL・モード出し分けで一発着地。冷たい Meta 流入の補助。X・ブロガーは素の `/maker` で十分。
4. **購入フロー（/cart → Stripe → /thanks）は現状ゼロ**。`purchase` を取る線が1画面も無く、**最優先P0**。
5. **未実装の鍵画面**：サンプルPDFプレビュー（modal）／レベル選びガイド／★メーカー完了画面／★サンクス。

### §3. CV イベントと導線の対応

| 区間 | イベント | フェーズ |
|---|---|---|
| /maker → メーカー完了画面 | `tool_start` → `generated_pdf` | Phase 0-1 の主 CV |
| 商品詳細 → カート | `add_to_cart` | Phase 2-3 |
| Stripe → サンクス | `purchase` | Phase 2-3 の主 CV |

## 附録

- 全ページ俯瞰ワイヤー: [pages-overview.html](./pages-overview.html)
- 変遷: [archive/retired-structures/2026-06-06-screen-flow-drawio.md](../../archive/retired-structures/2026-06-06-screen-flow-drawio.md)（旧 draw.io 正本の退避記録）
