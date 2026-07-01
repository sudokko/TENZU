# 記事公開パイプライン 実装計画

## サマリ

- **目的**: 執筆キット（[../content/article-writing-kit.md](../content/article-writing-kit.md)）が想定する「記事を書く→WEB に載せる」の**後半（WEB アップ側）**を仕組み化する
- **現状 = Step 0**: 試作記事 1 本が手書き `.tsx` で存在するだけ。MDX パイプラインは未実装（依存ゼロ・`web/content/` 無し・記事一覧無し・フロントマター処理無し）
- **配信基盤は稼働済**: Amplify Hosting が `web/` を Next.js SSR でビルド・配信（[amplify.yml](../amplify.yml)・`deploy/amplify` ブランチ）。欠けているのは記事コンテンツの流し込みだけ
- **未決の分岐（Step 1 で決める）**: 記事を **MDX** で持つか、既存踏襲で **手書き tsx** にするか。既存記事は tsx・キット/templates は MDX 前提でねじれている
- **推奨**: MDX 採用。フロントマター（[templates.md §2](../content/templates.md)）・確定スラッグ（[urls.md](../content/urls.md)）・LLMO Schema・量産性が MDX 前提で設計済のため
- **ステップ全体像**（MDX 採用時）:
  - Step 1: 方式決定 ＋ ドラフト置き場の骨組み
  - Step 2: MDX ランタイム導入 ＋ フロントマター型
  - Step 3: 記事コンポーネント実装（Lead/TLDR/InlineCTA/SkuCards/RelatedPosts/References）
  - Step 4: 動的ルート ＋ メタ/OG/構造化データ生成
  - Step 5: 記事一覧ページ ＋ 内部リンク/パンくず
  - Step 6: NG 語 lint ＋ article-reviewer ＋ 公開前チェック
  - Step 7: 既存 tsx 記事を MDX へ移行（パイロット）
  - Step 8: note/ameba 外部出力の整形
- **SSOT 分担**: 「何を書くか」=content 領域／「どう配信するか」=本ファイル（engineering）。運用ルールは [templates.md](../content/templates.md)

## 詳細

### §1. 現状棚卸し（Step 0）

#### 1.1 できているもの

| 項目 | 実体 |
|---|---|
| 配信基盤 | Amplify Hosting・Next.js 16 SSR・`web/` を appRoot にビルド（[amplify.yml](../amplify.yml)） |
| 記事ルート | `web/app/articles/` は存在 |
| 試作記事 1 本 | `web/app/articles/visual-spatial-cognition/page.tsx`（183 行・**手書き tsx**・本文を JSX 直書き） |
| 記事共通 CSS | `web/app/articles/article.css`（bespoke クラス群: `article-meta` `diagram` `tenzu-translate` `article-quote` `article-sidenote` 等） |
| 下書きテンプレ | `docs/drafts/memos/_template.md`（構成メモ雛形） |
| 執筆ルール | craft 3 冊・voice-tone・personas・templates・企画 3 冊（読み込み済） |

#### 1.2 できていないもの（パイプライン本体）

- MDX の仕組みが皆無: `@next/mdx`・`next-mdx-remote`・`gray-matter`・`contentlayer` いずれも `web/package.json` に無し
- `web/content/` ディレクトリ無し（キットが終着点とする `web/content/articles/<slug>.mdx` の置き場が存在しない）
- フロントマター（[templates.md §2.1](../content/templates.md) の必須フィールド）を読む処理が無い
- 記事一覧ページ `web/app/articles/page.tsx` が無い（個別記事への直リンクのみ）
- 構造化データ（HowTo / FAQPage / Article Schema・[urls.md §8](../content/urls.md)）の出力が無い
- 下書き置き場が `memos/` だけ。`dumps/` `articles/` `external/`（note・ameba）が未作成
- NG 語 lint（`scripts/lint-ng-words.sh`・[templates.md §8.4](../content/templates.md)）が未作成

#### 1.3 既存 tsx 記事と templates.md のズレ

既存 `visual-spatial-cognition` は**デザイナー由来の独自レイアウト**（`diagram` `tenzu-translate` `article-quote` `article-sidenote`）で書かれ、[templates.md §3.1](../content/templates.md) の 11 セクション標準スロット（`<Lead>` `<TLDR>` `<SkuCards>` `<RelatedPosts>` `<References>`）とは対応していない。MDX 化の際は**両者の突き合わせ（どの独自ブロックを MDX コンポーネントとして残すか）**が必要。

---

### §2. 未決の分岐（Step 1 の決定事項）

| 方式 | 内容 | 向き/不向き |
|---|---|---|
| **A. MDX パイプライン**（推奨） | `web/content/articles/*.mdx` を置くと自動でページ化。フロントマター・CTA・引用がコンポーネントで効く | ○量産・整合維持・LLMO Schema 自動化 ／ △初期実装コスト |
| **B. 手書き tsx 標準化** | 既存 `visual-spatial-cognition` 方式を踏襲。1 記事 = 1 `page.tsx` | ○初期ゼロ・デザイン自由 ／ ×量産不可・フロントマター/整合が手作業 |

**推奨理由（A）**: [templates.md](../content/templates.md) のフロントマター・[urls.md](../content/urls.md) の確定スラッグ・[clusters.md](../content/clusters.md) の 16 ページ・FAQPage/HowTo Schema が**すべて MDX 前提で設計済**。B は 16 本を手書きし続ける負債が大きい。デザインの豊かさ（§1.3 の独自ブロック）は MDX のカスタムコンポーネントとして温存できる。

---

### §3. ステップ計画（MDX 採用時）

各ステップは独立に検証可能な単位。上から順に積む。

#### Step 1: 方式決定 ＋ ドラフト置き場の骨組み
- A/B を確定（本ファイル §2）
- `docs/drafts/` に `dumps/` `articles/` `external/note/` `external/ameba/` を作成（`.gitkeep`）
- 完了条件: 執筆フロー（[article-writing-kit.md §3](../content/article-writing-kit.md)）の各置き場が存在

#### Step 2: MDX ランタイム導入 ＋ フロントマター型
- `@next/mdx`（or `next-mdx-remote`）＋ `gray-matter` を `web/` に追加
- フロントマターの TypeScript 型を [templates.md §2.1](../content/templates.md) の必須フィールドから定義（`slug` `title` `description` `parent_pillar` `article_type` `phase` `cta_mode` `target_skus` `references` 等）
- enum バリデーション（[templates.md §2.2](../content/templates.md)）
- 完了条件: `web/content/articles/*.mdx` を 1 本読んで型付きオブジェクトが得られる

#### Step 3: 記事コンポーネント実装
- [templates.md §3.2](../content/templates.md) のスロットを React コンポーネント化: `<Lead>` `<TLDR>` `<InlineCTA>` `<SkuCards />` `<RelatedPosts />` `<References />` `<Toc />`
- 既存 `article.css` の独自ブロック（`diagram` `tenzu-translate` `article-quote` `article-sidenote`）も MDX 提供コンポーネントとして採用（§1.3 の突き合わせ結果を反映）
- `<SkuCards />` は phase ガード（[templates.md §3.3](../content/templates.md)・`phase-1` は非表示）
- 完了条件: MDX 本文からこれらが呼べる

#### Step 4: 動的ルート ＋ メタ/OG/構造化データ
- `web/app/articles/[slug]/page.tsx` ＋ `generateStaticParams`（`web/content/articles/` を走査）
- `generateMetadata`（title/description/OG・descriptor 必須セット [voice-tone.md §1](../foundation/voice-tone.md)）
- JSON-LD 出力: Pillar=HowTo／FAQ・LLMO=FAQPage／C3-4・C4-1=Article（[urls.md §8](../content/urls.md)）
- 完了条件: MDX 1 本が正しい URL・メタ・Schema で表示される

#### Step 5: 記事一覧ページ ＋ 内部リンク/パンくず
- `web/app/articles/page.tsx`（Pillar 別グルーピング [pillars.md](../content/pillars.md)）
- パンくず（[urls.md §4](../content/urls.md) の仮想階層）・`<RelatedPosts>` 自動算出（同 `parent_category`→`parent_pillar`→product-family）
- 完了条件: 一覧から各記事へ回遊でき、内部リンク密度 7 本以下（[urls.md §6](../content/urls.md)）

#### Step 6: NG 語 lint ＋ article-reviewer ＋ 公開前チェック
- `scripts/lint-ng-words.sh`（[voice-tone.md §1](../foundation/voice-tone.md)・[templates.md §7.7](../content/templates.md) の grep 集約）
- `article-reviewer` エージェント連携（本文完成後に Critical/High 解消）
- 任意: Amplify preBuild or CI で lint を走らせ、NG 語ヒット時に警告
- 完了条件: 執筆完了時セルフチェック（[templates.md §7.7](../content/templates.md)）が半自動で回る

#### Step 7: 既存 tsx 記事を MDX へ移行（パイロット）
- `visual-spatial-cognition` を MDX へ書き直し、独自ブロックの移植を検証
- URL・SEO 資産を維持（[urls.md §9](../content/urls.md)）
- 完了条件: 手書き tsx 版と MDX 版が同一表示・tsx 版を撤去

#### Step 8: note/ameba 外部出力の整形
- `docs/drafts/external/note/<slug>.md`（貼付用 Markdown）・`ameba/<slug>.html`（貼付用 HTML）の整形規約
- 完了条件: 同一本文から 3 出力先（tenzu/note/ameba）が生成できる

---

### §4. Step 依存関係

```
Step 1（決定・骨組み）
  └─ Step 2（MDX ランタイム・型）
       └─ Step 3（コンポーネント）
            └─ Step 4（動的ルート・Schema）
                 ├─ Step 5（一覧・内部リンク）
                 └─ Step 7（既存記事 MDX 移行）
Step 6（lint・レビュー）は Step 2 以降いつでも並行可
Step 8（外部出力）は Step 3 以降に着手可（tenzu 本線と独立）
```

「最短で 1 本を tenzu に公開」だけなら **Step 1→2→3→4** で到達。一覧・外部出力・移行は後追いで足せる。

## 附録

- 執筆側の入口: [../content/article-writing-kit.md](../content/article-writing-kit.md)
- 運用ルール（フロントマター・CTA・Schema）: [../content/templates.md](../content/templates.md)
- スラッグ・構造化データ: [../content/urls.md](../content/urls.md)
- 実装 TODO 全体: [phase-1-todo.md](phase-1-todo.md)（本ファイルは記事パイプラインを切り出した詳細）
