# 記事執筆スターターキット（ブラウザ起動の入口）

## サマリ

- **用途**: TENZU の文脈をゼロから立ち上げる記事執筆用の**唯一の入口**。ブラウザ（claude.ai/code を GitHub `sudokko/TENZU` に接続）で記事を書くとき、まずこのファイルを読ませる
- **本ファイルは索引**。ルール本体は複製せず一次ソースへリンクで送る（CLAUDE.md 原則④）。定義が要るときは必ずリンク先の SSOT を読む
- **記事は書き始めに出力先で3分岐**: `tenzu`（サイト＝メイン）／`note`（集客）／`ameba`（アメブロ・集客）。craft・ペルソナ・ガードレールは共通、**分岐は最終整形と掲載先だけ**
- **接続だけで効くもの**: プロジェクト `CLAUDE.md`（起動時に README＋brand を読めと指示）／`article-reviewer` エージェント（品質チェックに自動で使える）
- **執筆キット＝12ファイル**（§2 の表）。工程は dump→構成メモ→本文化→レビュー→推敲（§3）
- **ガードレール早見は §4**。衝突時は常に `voice-tone > templates > craft` の順で voice-tone が勝つ
- **専用ツール**: `article-reviewer`・`/llmo`・`/article-decorate`・`/article-image` は**実装済**（§5）。機械検査は `web/scripts/{llmo-check,img-optimize}.mjs`
- 全体設計（MDX 公開パイプライン・LLMO 基盤・外部出力）は本キットの範囲外。詳細は plan ファイル参照（§6 附録）

## 詳細

### §1. 使い方（3ステップ）

1. ブラウザで claude.ai/code を `sudokko/TENZU`・ブランチ `deploy/amplify` に接続する
2. 下のキックオフ・プロンプトを貼り、`出力先` と `テーマ` を埋める
3. あとは §3 のパイプライン順に進む。各工程で §2 の一次ソースを開く

#### キックオフ・プロンプト（コピペ用）

```
TENZU の記事を書きます。まず次を順に読んでください:
  1. content/article-writing-kit.md（この索引）
  2. content/README.md（記事領域の読む順序）
  3. foundation/brand.md（ブランド定義）
  4. foundation/voice-tone.md（表現ルール・最優先）

出力先: 【 tenzu / note / ameba のいずれか 】
テーマ: 【 書きたい記事のテーマ、または対象スラッグ 】

進め方は kit の「記事パイプライン」に従うこと。
content/clusters.md §1.5 で記事化可否を判定 → 構成メモ → 本文化 →
article-reviewer → 推敲 の順。各工程は kit の一次ソース（craft 3冊・
personas・templates）に従い、voice-tone のガードレールを最優先で守ること。
```

### §2. 記事執筆キット 12ファイル（読む順序）

すべて `deploy/amplify` に push 済み。パスは本ファイル（`content/`）からの相対。詳細な読む順序は [README.md](README.md) に委譲。

| Tier | ファイル | 役割 |
|---|---|---|
| 1 必須 | [../foundation/brand.md](../foundation/brand.md) | ブランド定義・MISSION・Anti-Brand・表記階層化 |
| 1 必須 | [../foundation/voice-tone.md](../foundation/voice-tone.md) | 表現置換 NG/OK・温度・**衝突時 最優先** |
| 1 必須 | [structure-craft.md](structure-craft.md) | dump→構成の組み立て |
| 1 必須 | [writing-craft.md](writing-craft.md) | 構成→本文化・膨らませの境界線・装飾/図版の使い所（§3） |
| 1 必須 | [revision-craft.md](revision-craft.md) | 推敲＝表現レベルのみ・メタ/SEO チェック（§3.5） |
| 1 必須 | [personas.md](personas.md) | ペルソナ SSOT |
| 1 必須 | [templates.md](templates.md) | フロントマター§2・11セクション§3・ガードレール§7 |
| 2 企画 | [pillars.md](pillars.md) | Pillar 5本の H2 構成・引用論文 |
| 2 企画 | [clusters.md](clusters.md) | 記事/非記事 振り分け §1.5・確定 16 ページ |
| 2 企画 | [urls.md](urls.md) | スラッグ一元管理・命名規則・内部リンク |
| 3 本文 | [evidence.md](evidence.md) | エビデンス SSOT・引用根拠 |
| 3 本文 | [references-map.md](references-map.md) | 5系譜・論文帰属 |

参考（必要時のみ）: [keyword-research.md](keyword-research.md)／[research.md](research.md)／[faq.md](faq.md)（FAQ 記事のみ）。装飾のビジュアル規定は [../design/visual-identity.md](../design/visual-identity.md) §4-7。**target=note/ameba の整形規約は [external-output.md](external-output.md)**（`/article-export` が参照）。学習素材の原典は `content/sources/udemy-writing/`（craft 3冊の元ネタ・通常は読まない）。

### §3. 記事パイプライン

工程順。構成＝AI提案→オーナー確定／本文化＝AI／推敲＝表現レベルのみ（[README.md](README.md) の役割分担に一致）。

1. **企画・選定** — [clusters.md](clusters.md) §1.5 で記事化可否 → [pillars.md](pillars.md) で Pillar/Cluster → [urls.md](urls.md) でスラッグ → [personas.md](personas.md) でターゲット確認
2. **dump** — 自由形式の素材出し（オーナー）→ `docs/drafts/dumps/<slug>.md`
3. **構成提案** — [structure-craft.md](structure-craft.md) に従い構成メモ案を組み立て（ギャップは明示・足さない）
4. **構成確定** — オーナーが `docs/drafts/memos/<slug>.md` に確定版を保存
5. **本文化** — [writing-craft.md](writing-craft.md) に従い散文化（メモに無い主張・事実・数値を足さない）
6. **確認・推敲** — `article-reviewer` で Critical/High を解消 → [revision-craft.md](revision-craft.md) の手順で推敲

**出力先ごとの終着点**:

| 出力先 | 本文の置き場所 | 掲載 |
|---|---|---|
| `tenzu`（メイン） | `docs/drafts/articles/<slug>.mdx` → 昇格 `web/content/articles/<slug>.mdx` | commit → PR → マージ → Amplify 公開（MDX 公開パイプライン＋LLMO/OG 基盤は実装済＝メタ/canonical/OG 画像/JSON-LD/sitemap/robots 自動生成） |
| `note` | `docs/drafts/external/note/<slug>.md`（`/article-export` が生成・note 貼付用 Markdown） | 本人が note にコピペ＋画像アップ |
| `ameba` | `docs/drafts/external/ameba/<slug>.html`（`/article-export` が生成・Ameba 貼付用 HTML） | 本人が Ameba にコピペ＋画像アップ |

> 補足: `tenzu` 向けの MDX→本番ページ変換（公開パイプライン）と LLMO/OG 基盤は実装済。`web/content/articles/<slug>.mdx` を置けば `/articles/<slug>` が SSG され、メタ/canonical/OG 画像（手動 eyecatch が無ければ動的生成）/JSON-LD/sitemap/robots が自動で付く。frontmatter に `eyecatch`（手動アイキャッチ・public 配下パス）・`faq_schema`（FAQ 記事の FAQPage 用 Q&A）・`published_at` を書けばそれぞれ反映される（キー定義は [templates.md §2.5](templates.md)）。note/ameba は `/article-export` が [external-output.md](external-output.md) の規約で貼付用テキストを生成する（投稿・画像アップは本人が手動）。詳細は §6 の plan 参照。

### §4. ガードレール早見（要点リマインド・定義は一次ソースへ）

衝突時の優先順は `voice-tone > templates > craft`。以下は思い出し用。必ずリンク先で確認する。

- **voice-tone が最優先** — 表現の可否は [../foundation/voice-tone.md](../foundation/voice-tone.md) §1 が最終権威
- **「足さない」三層** — 構成([structure-craft.md](structure-craft.md) §2)／本文([writing-craft.md](writing-craft.md) §2)／推敲([revision-craft.md](revision-craft.md) §2)。メモ・dump に無い主張/事実/数値を足さない
- **表記階層化「点図形（点描写）」** — H1・屋号紹介は並記／概念語は「点図形」優先／SKU・URL は「点描写」維持（[templates.md](templates.md) §7.0）
- **「空間認知／空間認識」二刀流** — ブランド軸・学術 RTB は「空間認知」固定／SEO 例外(P4・LLMO)のみ「空間認識」（[../foundation/voice-tone.md](../foundation/voice-tone.md) §1・[evidence.md](evidence.md) §3.1）
- **NG→OK 置換** — 処方箋/特効薬/治療/弱点診断/穴を埋める → 練習プラン/次の一手/戻り道/抜けを補う。診断語彙は概念レベルで Anti-Brand（[templates.md](templates.md) §7.1・[../foundation/voice-tone.md](../foundation/voice-tone.md) §1）
- **お店路線・傷つきにくさ・LLMO** — 「教える/先生/特訓/級・段」不可・欠陥フレーム→特性フレーム・結論先出し/箇条書き/出典明示（[templates.md](templates.md) §7.2/§7.3/§7.4）
- **article_type 別トーン** — pillar は硬め・cluster-symptom は近い等、タイプで5軸スコアが変わる（[pillars.md](pillars.md) §3.1・[templates.md](templates.md) §4.3）

### §5. 専用ツールの呼び方

| ツール | 状態 | 用途 / 当面の代替 |
|---|---|---|
| `article-reviewer`（エージェント） | **実装済** | 本文完成後に呼ぶ。Voice/Tone/NG/LLMO/日本語品質を Severity 分類でチェック（`docs/drafts/memos/<slug>.md` があればメモ照合込み） |
| `/article-decorate`（スキル） | **実装済** | 内容から装飾ブロック（`<Diagram><TenzuTranslate><Quote><SideNote><LeadGraf>`）を過装飾ガード内で配置。target=note/ameba はネイティブ要素へ翻訳。SSOT= [writing-craft.md](writing-craft.md) §3・[../design/visual-identity.md](../design/visual-identity.md) §4 |
| `/llmo`（スキル＋スクリプト） | **実装済** | **構造化データ(JSON-LD/meta/OG)のフィーダー専用**＝`faq_schema` 生成＋frontmatter 完全性の確認だけ（`web/scripts/llmo-check.mjs` で検査）。**本文の 8原則・見出し・箇条書き・NG語は `article-reviewer`（§H）が担当**。JSON-LD は frontmatter から自動生成。target=tenzu のみ |
| `/article-image`（スキル＋スクリプト） | **実装済** | 手動画像を `web/public/assets/articles/` へ配置・`eyecatch` 更新・`web/scripts/img-optimize.mjs` で寸法/容量検査・alt 付与。**画像生成は本人が Gemini で手動**。eyecatch 未指定なら OG 動的生成にフォールバック（静かな開店期に実装）。SSOT= [revision-craft.md](revision-craft.md) §3.5 |
| `/article-export`（スキル） | **実装済** | target=note/ameba の貼付用テキストを `docs/drafts/external/{note,ameba}/` へ生成。独自ブロックをネイティブ要素へ翻訳・LLMO/メタ/内部リンク/SKU は外す。投稿・画像アップは本人。SSOT= [external-output.md](external-output.md) |

### §6. 附録

- 全体設計（MDX 公開パイプライン・LLMO/OG 基盤・専用ツール・外部出力）と実行フェーズ: plan `記事執筆 ブラウザ移行 ＋ マルチ出力` を参照
- 親領域索引: [README.md](README.md)
- 執筆体制の役割分担: [../decisions.md](../decisions.md) §3.49
