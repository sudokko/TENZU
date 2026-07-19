# FAQ 運用設計（C+案：長短ハイブリッド型）

## サマリ

- FAQ は「追加が大前提」の運用形態。長短ハイブリッド表示で両立
- 長い FAQ は個別ページ＋集約／短い FAQ は集約のみ
- MDXフロントマターで `faq_format: long/short` 分岐
- SEO・UI・メンテの3観点を統合
- 段階的公開: 開店時 long 2本（温存記事の週 1 公開枠で拡充）／本格化までに long 4本＋ `/faq/` 集約ページ完成（§8）
- 親ファイル: [README.md](README.md)

## 詳細

### §1. 設計の背景

### 1.1 FAQ運用の特殊性

| 観点 | 通常記事 | FAQ |
|---|---|---|
| 制作タイミング | 計画的・事前作成 | **逐次追加が大前提**（ユーザー問い合わせ・モニターQAから抽出） |
| 文字数 | 1,500-3,000字程度（標準） | 短いもの（1-3行）と長いもの（数千字）が**混在** |
| SEO最適化 | 1記事1KW最適化 | KWありと無しの混在 |
| UI要件 | 単独閲覧前提 | 一覧性・検索性が重要 |

### 1.2 検討した3案の比較（2026-05-08 議論経緯）

| 案 | 構造 | SEO | UI | メンテ | 結論 |
|---|---|---|---|---|---|
| A. 個別ページ完全分離 | 1問1ページ | ◎ | ○ | ○ | 短いFAQが薄いコンテンツ扱いリスク |
| B. 集約1ページ集中 | カテゴリ別アコーディオン1ページ | △ | ◎ | △ | 個別KW最適化弱い |
| **C+. 長短ハイブリッド** ⭐ | 長いFAQは個別ページ＋集約／短いFAQは集約のみ | ◎ | ◎ | ◎ | **採用** |

→ ユーザー視点：「短いFAQが単独ページだと微妙」という直感を解消するためC+案を採用。

### 1.3 AWS等の専用サービス導入は不採用

- Bedrock Knowledge Base / Kendra / Lex / DynamoDB等は**オーバースペック**
- TENZU は1人運営・小規模のため、Next.js 標準MDX運用で十分
- FAQ件数100件超えてからAlgolia等の検索特化SaaSを検討する余地

---

## §2. URL設計

### 2.1 個別FAQページ（◎空き地KWのみ）

3階層フラット維持：

| 種別 | URL | 役割 |
|---|---|---|
| 個別FAQ（long） | `/{slug}/` | SEO狙い・KW別最適化 |

例（開店時〜静かな開店期で予定）：
- `/faq-commercial-use/` — KW: 「点描写 商業利用」
- `/faq-classroom-use/` — KW: 「点描写 教室 利用」

例（本格化までに予定）：
- `/faq-teacher-license/` — KW: 「点描写 ライセンス 教員」

### 2.2 集約一覧ページ

| URL | 役割 |
|---|---|
| `/faq/` | カテゴリ別アコーディオン・検索バー・ロングテール集約 |

---

## §3. メタデータ設計（MDX フロントマター）

### 3.1 短いFAQ（個別URLなし・集約ページのみ）

```yaml
---
type: "faq"
faq_format: "short"
faq_category: "shipping"
faq_question: "領収書は発行されますか？"
faq_answer: "Stripe決済の領収書が自動でメール送付されます。"
priority: 1
phase: "post-launch"   # public / post-launch / pre-launch / draft
---
```

### 3.2 長いFAQ（個別URL＋集約ページに見出し）

```yaml
---
slug: "faq-commercial-use"
type: "faq"
faq_format: "long"
faq_category: "product"
faq_question: "TENZUの点描写は商業利用できますか？"
faq_answer_summary: "個人利用は可能。商業利用は要相談..."
seo_target_kw: "点描写 商業利用"
priority: 1
phase: "pre-launch"
---

（本文：1,500-3,000字の解説）
```

### 3.3 フィールド一覧

| フィールド | 必須/任意 | 説明 |
|---|---|---|
| `type` | 必須 | `"faq"` 固定 |
| `faq_format` | 必須 | `"short"` or `"long"` |
| `faq_category` | 必須 | product / payment / shipping / support の4分類 |
| `faq_question` | 必須 | 質問文（共通） |
| `faq_answer` | short のみ | 短い回答（1-3行） |
| `faq_answer_summary` | long のみ | 集約ページ表示用の要約（1-2行） |
| `slug` | long のみ | 個別URLのスラッグ |
| `seo_target_kw` | long のみ | SEO狙いKW |
| `priority` | 必須 | 集約ページ表示順（1から昇順） |
| `phase` | 必須 | 公開フラグ（draft / pre-launch / post-launch / public） |

---

## §4. カテゴリ分類（初期4分類）

| カテゴリ | 内容例 |
|---|---|
| **product**（商品関連） | 商業利用・教室利用・教員ライセンス・著作権・モチーフ・難易度 |
| **payment**（決済関連） | 領収書・支払い方法・返金・クーポン |
| **shipping**（配送・印刷関連） | コンビニ印刷・PDF品質・印刷不具合 |
| **support**（その他サポート） | 問い合わせ・アカウント・操作不明 |

→ 必要に応じて追加可能（例：`account`, `app`, `bulk` 等）

---

## §5. UI設計

### 5.1 配置と表示

| 配置 | 内容 |
|---|---|
| ヘッダー/フッター | 「よくある質問」リンク（→ `/faq/`） |
| `/faq/` 集約ページ | カテゴリ別アコーディオン＋検索バー＋人気FAQ TOP5 |
| 個別FAQページ | 質問→回答→関連FAQ→お問い合わせ導線 |
| 全記事ページのフッター | 「関連するよくある質問」（カテゴリ別TOP3） |
| 商品詳細ページ | 該当カテゴリのFAQ TOP3を埋め込み |

### 5.2 集約ページ構造

```
/faq/
├── ヘッダー：検索バー
├── 人気FAQ TOP5（priority 順 or アクセス数順）
├── カテゴリ別アコーディオン
│   ├── product
│   │   ├── 短いFAQ（アコーディオン展開）
│   │   └── 長いFAQ（要約＋「詳しく読む」リンク）
│   ├── payment
│   ├── shipping
│   └── support
└── お問い合わせ導線
```

### 5.3 個別FAQページ構造（long のみ）

```
/{faq-slug}/
├── パンくず：ホーム > よくある質問 > {category} > {質問}
├── H1：質問文
├── 本文：回答（1,500-3,000字）
├── 関連FAQ（同category 上位3-5件）
└── お問い合わせ導線
```

---

## §6. 実装ロジック（Next.js getStaticProps）

### 6.1 集約ページ生成

```
1. /content/faq/ 全MDXを収集
2. faq_format で分岐：
   ├─ short → 集約ページにアコーディオン表示・個別URL生成しない
   └─ long  → 集約ページに見出し＋「詳しく読む」リンク
              ＋ 個別URL `/{slug}/` で個別ページ生成
3. faq_category でグルーピング
4. priority 順にソート
5. phase が "public" or 該当フェーズの記事のみ表示
```

### 6.2 個別URL制御（getStaticPaths）

```
const longFaqs = allMdx.filter(m =>
  m.type === "faq" && m.faq_format === "long"
);
return { paths: longFaqs.map(...) };
// short FAQは個別URL生成されない
```

### 6.3 集約ページの自動生成

- React component が frontmatter を parse して動的レンダリング
- ビルド時に静的ページ化
- 標準的な Next.js MDX パターン・専用CMS不要

---

## §7. メンテフロー

### 7.1 新規FAQ追加の判断フロー

```
ユーザー問い合わせ／モニターQA
    ↓
1) ◎KW空き地ありか？
    YES → 個別FAQ作成（faq_format: long）
    NO  → 集約ページに追記（faq_format: short）
2) 既存FAQに似たQ&Aあるか？
    YES → 既存ページに統合 or リライト
    NO  → 新規作成
```

### 7.2 追加フロー（Claude Code → git → Amplify）

**短いFAQ追加**:
```
Claude Code 起動
    ↓ 「短いFAQ追加：Q『領収書は？』 A『Stripeから自動発行』 カテゴリ shipping」
MDX 1本生成（frontmatter のみ・本文なし）
    ↓
git commit & push
    ↓
Amplify ビルド → /faq/ ページに自動追加・個別URLは作られない
```

**長いFAQ追加**:
```
Claude Code 起動
    ↓ 「長いFAQ追加：Q『商業利用OK？』 KW『点描写 商業利用』」
MDX 1本生成（frontmatter＋本文）
    ↓
git commit & push
    ↓
Amplify ビルド → 集約ページに見出し＋個別URL `/faq-commercial-use/` 生成
```

**所要時間**:
- 短いFAQ：2-3分（frontmatter のみ）
- 長いFAQ：5-10分（本文込み）

### 7.3 月次レビュー

- 月1回、過去1ヶ月の問い合わせ・モニターQAから新規ネタ抽出
- 重複・類似は既存FAQに統合
- アクセス数の少ないFAQは見直し（カテゴリ変更・統合・リライト）

---

## §8. 段階別公開計画（期対応・[decisions.md §3.76](../decisions.md)）

| 期 | 公開するFAQ | 想定本数 |
|---|---|---|
| **開店時（8/30）** | 個別FAQ（long）2本：#59 商業利用・#60 教室利用 | 2 |
| **静かな開店期**（週 1 段階公開の枠内） | + 個別 FAQ（long）2 本：#64・#65 | +2 |
| **本格化（12 月第 1 週）** | 個別FAQ（long）4本（#59/#60/#64/#65）＋ `/faq/` 集約ページ完成 | 4＋集約 |
| **本格化以降 運用** | 月次2-4本ペース（公開後モニター/サポートQAから抽出） | 月+2-4 |

---

## §9. 拡張シナリオ

### 9.1 FAQ件数100件超えた場合

- Algolia 等の検索特化SaaS導入を検討
- 月$0〜（無料枠あり）
- 個別URL生成の閾値見直し（短いFAQでも検索ヒット率高ければ個別化検討）

### 9.2 多言語対応（将来）

- frontmatter に `lang` フィールド追加
- 集約ページを言語別に分岐
- 現時点では日本語のみ

---

## §10. 残課題

| 項目 | 内容 |
|---|---|
| 集約ページのUIデザイン | アコーディオン・検索バー・カテゴリTabs の見た目は C-4 Priority Guides で確定 |
| 関連FAQ自動生成ロジック | 同category 上位3-5件・category なしの場合は全体上位 等のルール詳細 |
| お問い合わせ導線 | Tally / Google Form / メール直接 のどれか・C-3 service-blueprint と整合 |
