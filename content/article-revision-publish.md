# TENZU 記事改訂・プレビュー・公開フロー

## サマリ

- 対象は `web/content/articles/*.mdx` の既存記事。タイトルまたは slug から一意に特定する
- 開始時に Git 状態と現在ブランチを確認し、別作業の未コミット変更があれば触れずに報告する
- 本文改訂では既存の内部リンク・商品導線・必要な frontmatter を維持する
- 挿絵は今回の空間認知記事と同系統の温かい手描き水彩調に固定し、配置ごとに1案だけ作る
- 改訂後はビルドし、デスクトップとスマートフォンのローカルプレビューをオーナーへ見せる
- **プレビュー承認前は LLMO・commit・push を行わない**
- 承認後に `/llmo` を対象記事だけへ実行し、ERROR 0 を確認して現在ブランチへ commit/push する
- Amplify の同一ブランチ URL で本文・画像・内部リンクを最終確認する

## 詳細

### §1. 起動条件と対象特定

代表的な依頼は「タイトル『○○』の記事を改訂して」「この記事を画像込みで直して、確認後に公開して」。

1. `git status --short --branch` で現在ブランチと未コミット変更を確認する。
2. `rg -n "^title:.*<タイトル>" web/content/articles -g "*.mdx"` で対象を探す。
3. 複数候補がある場合だけオーナーへ確認する。対象が一意なら、そのまま進める。
4. 作業開始時のブランチを記録し、公開まで切り替えない。

### §2. 改訂前に保持するもの

- `slug`、記事種別、親カテゴリ、対象ペルソナ、対象レベル、SKU、CTA 設定
- パンくず、関連記事、本文中の有効な内部リンク、メーカー・商品への導線
- 根拠、数値、注意書き、公開時期に意味がある TODO

タイトル、description、reading time、updated date は、本文改訂に伴い整合させてよい。削除・変更する導線がある場合は、プレビュー提示時に明記する。

### §3. 本文改訂

1. `README.md`、`foundation/brand.md`、`content/README.md` と対象記事を読む。
2. 読者の疑問へ早く答え、同じ親の目線で、煽らず親しみやすく書く。
3. 元記事と改訂後を比較し、内部リンク、商品導線、frontmatter の欠落がないか確認する。
4. 変更範囲は対象記事と、それを表示するために必要な共通コンポーネント・CSS・画像に限定する。

### §4. 挿絵の固定テイスト

本文挿絵が必要な場合は、配置1か所につき候補1点だけ生成する。A/B比較は行わない。

**視覚リファレンス**:

- `web/public/assets/articles/spatial-recognition/01-everyday-spatial.webp`
- `web/public/assets/articles/spatial-recognition/02-three-lanes.webp`
- `web/public/assets/articles/spatial-recognition/03-dot-copying.webp`
- `web/public/assets/articles/spatial-recognition/04-five-minutes.webp`

**共通指定**:

- 3:2、原則 1536×1024、横長の本文挿絵
- 日本の家庭の日常、自然光、温かい手描き水彩＋色鉛筆の紙質
- クリーム・淡い黄土色を基調に、くすんだ青・teal・緑・赤茶を少量使う
- 穏やかで端正。写実写真、3D、アニメ、マスコット、高彩度、強い陰影は使わない
- 画像内の文字、ロゴ、透かし、UI、説明ラベルは入れない
- 人物の手指・鉛筆・教材・家具の破綻がないか必ず目視する

生成ツールが使える場合は上記4点を参照画像として渡し、記事の該当段落だけを場面指定する。生成ツールがない場合は、この仕様を含むプロンプトを1案だけ作り、画像受領まで停止する。

採用画像は WebP にし、`web/public/assets/articles/<slug>/` へ意味の分かる英字名で置く。MDX では `Illustration` を使い、内容を説明する固有 alt と短いキャプションを付ける。本文幅いっぱい、モバイルは画面幅いっぱいの現行 article CSS を使う。

### §5. プレビューゲート

1. `git diff --check` と変更ファイルの静的検査を行う。
2. `web/` で `npm run build` を実行する。
3. production build をローカル起動し、対象記事をデスクトップとスマートフォンで確認する。
4. タイトル、本文、全挿絵、alt、キャプション、内部リンク、関連記事、商品導線を確認する。
5. ローカルプレビューをオーナーへ見せ、**ここで停止する**。

このゲート前に `/llmo`、Git の stage/commit/push、Amplify 公開確認を行わない。

### §6. 承認後の LLMO

オーナーが「この内容で反映」などと明示承認した後、`.claude/skills/llmo/SKILL.md` を読み、次を対象記事だけへ実行する。

```text
node web/scripts/llmo-check.mjs web/content/articles/<slug>.mdx
```

ERROR は修正して再検査する。WARN が残る場合は理由を報告する。本文に明確な Q&A がある場合は、`/llmo` の判断手順に従って `faq_schema` の要否も確認する。LLMO による変更が表示へ影響する場合は再ビルドする。

### §7. commit・push・Amplify

1. 対象差分だけを stage し、`git diff --cached --check` と staged stat を確認する。
2. 内容が分かる1コミットを作る。
3. push 前に upstream の先行変更を確認する。
4. **作業開始時と同じ現在ブランチだけ**へ push する。別ブランチへは反映しない。
5. Amplify のブランチ URL で更新日、本文、全画像、内部リンクを確認する。

TENZU の `content/article-drafts` は Amplify 上で `content-article-drafts` として公開される。別ブランチや本番統合ブランチへの展開は、このフローには含めない。

### §8. 完了報告

- 対象記事と主な改訂点
- 画像数・保存先・表示確認結果
- LLMO の ERROR/WARN 数
- build 結果と既知の無関係な警告
- commit SHA、push したブランチ、Amplify 確認 URL
