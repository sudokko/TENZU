# LP Hero H1 修正

_Started 2026-05-27 05:16 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "TENZU Design System rev.5"
Project currently has 9 file(s)
Current date is now May 27, 2026
</system-info>

<default aesthetic>
If no references, art direction or design systems were provided, use this default professional modern, minimal aesthetic as a base. Declare your choice out loud so you stick to it. Guidance:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic>

<pasted_text name="Pasted text (84 lines)">
# rev.5 修正依頼：4 群命名を SSOT に合わせて全面差し替え

rev.5 セッションお疲れ。Chrome 経由で全 35 セクションレビューした結果、**4 群命名が SSOT と乖離**してることが判明したので、修正依頼します。

## 背景：何が起きているか

現在の rev.5 内の 4 群命名:
- CO08 Chips · Category pills: `A 観察 / B 変換 / C 構成 / D 立体`
- CO07 Product card meta: `B · 変換 · Lv.2`（線対称タスク）
- CO09 Pillar row H2: 「変換」
- Product page breadcrumb: `商品 / B 観察と模写 / 模写 Lv.2 — 4×4 まで`
- Product page meta: `B · 観察 · Lv.2`

→ **2 つの問題**:
1. **SSOT 乖離**: SSOT (`product/pack-design.md §13.7`) は **動詞ベース命名**で確定済み。教育用語直接型は採用してない
2. **Design 内部矛盾**: 同じ rev.5 内で B 群が「変換」と「観察と模写」の 2 通りで混在

## ✅ SSOT 確定表（これに揃えてください）

出典: [`product/pack-design.md §13.7`](../product/pack-design.md) ＋ [`foundation/voice-tone.md §1 4 群命名規範`](../foundation/voice-tone.md)

| 群 | 群名（顧客語・SSOT 確定） | 内訳タスク |
|---|---|---|
| **A** | **見て写す** | 模写、欠け補完 |
| **B** | **かたちを動かす** | 線対称、回転、平行移動、拡大縮小 |
| **C** | **重ねる・分ける** | かさね、分解 |
| **D** | **立体でとらえる** | 立体模写 |

### 各群のサブコピー（LP・商品一覧での添え文）

| 群 | サブコピー |
|---|---|
| A 見て写す | 形をそのまま読み取る、いちばんの基礎。 |
| B かたちを動かす | 向き・位置・大きさを変えても、形がそのままだと気づく目を作る。 |
| C 重ねる・分ける | 重なった図形を解きほぐす、組み合わせて考える。 |
| D 立体でとらえる | 平面から立体へ、空間認知の最終ステップ。 |

### 判断理由（参考）
- 「観察 / 変換 / 構成 / 立体」は研究・教科書語彙で、親が日常で子どもに言わない硬さ。Brand Voice（親が子に寄り添う温度）と乖離する
- 「変換 = transform」は心理学・数学用語。「かたちを動かす」が機能の本質を残しつつ温度を出している
- 「観察」は内部辞書側のラベル（§13.6 F3 三要素）であって顧客語ではない

## 🔧 具体的修正対象

### 1. CO08 Chips · Category pills
- 現状: `A 観察 / B 変換 / C 構成 / D 立体`
- 修正: `A 見て写す / B かたちを動かす / C 重ねる・分ける / D 立体でとらえる`
- 説明文「群コード (Mono) + 日本語名 (Plex Sans JP)」は維持
- 群コード（A/B/C/D）は維持。日本語ラベルだけ差し替え

### 2. CO07 Product card
- 現状 meta: `B · 変換 · Lv.2`（線対称タスク）
- 修正 meta: `B · かたちを動かす · Lv.2`
- タスク説明 Pencil「軸を見つけて、向こう側を描き起こす。」は秀逸なので維持

### 3. CO09 Pillar row
- 現状: H2 Klee「変換」/ Pencil「向き・位置・大きさを変えても、形がそのままだと気づく目を作る。」
- 修正: H2 Klee「**かたちを動かす**」/ Pencil はそのまま維持（既に SSOT サブコピーと一致）

### 4. Product page mockup（🔴 群分類自体が間違っている）

現状の Product page は **「模写 Lv.2 — 4×4 まで」というタスクを B 群に配置**してるが、模写は **A 群（見て写す）** が正しい。SSOT §13.7 では:
- A 見て写す = **模写、欠け補完**
- B かたちを動かす = 線対称、回転、平行移動、拡大縮小

**確定修正方針**: タスクは **「模写 Lv.2 — 4×4 まで」のまま維持**、breadcrumb と meta を A 群に正しく訂正する。
- breadcrumb: `商品 / B 観察と模写 / 模写 Lv.2 — 4×4 まで` → `商品 / **A 見て写す** / 模写 Lv.2 — 4×4 まで`
- meta: `B · 観察 · Lv.2` → `**A · 見て写す · Lv.2**`

Product card (B 線対称) と Product page (A 模写) で異なるタスク群を見せることで、4 群命名体系の網羅性も同時に示せます。

## 📌 今後のお願い

群名は「使いやすい名前」「UI に馴染む短い名前」で再生成しないでください。SSOT (`pack-design.md §13.7`) の確定表を一次ソースとして固定で参照してください。今後 LP・商品ページ・記事 mockup でも 4 群が出るたびに、必ず上記の表に揃えてください。

## 修正完了の確認方法

修正後、以下 4 箇所を spot check したい:
1. CO08 Chips — 4 pills のラベル
2. CO07 Product card — meta 行
3. CO09 Pillar row — H2 と Pencil の整合
4. Product page mockup — breadcrumb + meta + タスク分類の整合（A 群に統一）

修正後、各セクションのスクショまたはプレビュー URL を共有してください。
</pasted_text>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

SSOT に揃えて 4 箇所修正します。

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

LP も同じ 4 群を扱っているので、SSOT に揃えます。

_[tool: str_replace_edit]_

_[tool: done]_

修正完了です。`done` で 4 群 chips を確認してから商品ページに渡します。

SSOT (`pack-design.md §13.7`) に合わせて 4 群命名を全面差し替え完了しました。

## 修正したファイル

| # | ファイル | 修正内容 |
|---|---|---|
| 1 | `preview/co08-chips.html` | category pills 4 つの日本語ラベルを `見て写す / かたちを動かす / 重ねる・分ける / 立体でとらえる` に。群コード A/B/C/D と説明文は維持 |
| 2 | `preview/co07-product-card.html` | meta: `B · 変換 · Lv.2` → `B · かたちを動かす · Lv.2`。Pencil 説明文「軸を見つけて…」は維持 |
| 3 | `preview/co09-pillar-row.html` | H2: `変換` → `かたちを動かす`。Pencil は SSOT 一致のため維持 |
| 4 | `mockups/product.html` | breadcrumb `B 観察と模写` → `A 見て写す`、meta `B · 観察 · Lv.2` → `A · 見て写す · Lv.2`。Related cards 3 件も同基準で揃え（模写 2 件は A 群、線対称 1 件は B 群）。タスク本文「模写 Lv.2 — 4×4 まで」は維持 |

## ついでに揃えた箇所（LP 内 4 群が直接出る場所）

`mockups/landing.html` §2 の 4 pillar セクション:
- section-lead の列挙「観察・変換・構成・立体」→ SSOT 4 群名に
- 各 pillar の `pillar-cat`（小ラベル）と `pillar-name`（H3 大見出し）を SSOT 群名へ
- HTML コメントも合わせて変更
- **pillar-promise（Pencil サブコピー）は今回触っていません** — 既存文言は LP 用に練られたもので、SSOT サブコピー表とは別軸の文章です。SSOT サブコピーへ全面差し替えるかは判断要なので、必要であれば次のターンで対応します

## 未修整・要相談

- `preview/phase-a-typography-specimen.html` の 2 箇所（typography sample 内に古い `B · 観察と模写` が文字見本として残っています）→ サンプル文字列なので意図的に保留。差し替え希望なら指示ください
- `specs/*.md` / `uploads/*.md` の本文中の 4 群言及 → これらは仕様文書側なので Design rev.5 の修正対象外と判断し触っていません

スクショ確認のためにそれぞれ：
- `preview/co08-chips.html`
- `preview/co07-product-card.html`
- `preview/co09-pillar-row.html`
- `mockups/product.html`
- `mockups/landing.html`

を直接プレビューしてください。

## User

# rev.5 追加修正：LP Hero H1 を rev.4 確定版に戻す

4 群命名修正お疲れ、完璧でした。もう 1 件、`mockups/landing.html` の Hero H1 修正依頼です。

## 背景

現在の `mockups/landing.html` Hero H1: 「**図形の基礎は、点描写から。**」

これは Klee Tier ① の typography specimen で使われている例文ですが、**LP Hero H1 として採用する判断は確定していません**。

2026-05-25 セッション ([decisions.md §3.36](../decisions.md)) でオーナーが Hero を「**業態主役**」へ刷新し、以下を確定済みです:
- **Hero H1**: 「**点描写プリントの、専門店です。**」（業態識別句を H1 が直接担う）
- お品書き 2 行（模写・回転・重ね・立体／1 セット 12 枚 200 円）
- Tagline trio → 2 段に縮約
- promise-sub 削除
- F3 公式訳カードを Hero → §5 ARTICLES 内へ移動

## 修正依頼

### Hero H1 を rev.4 確定版に戻す
- 現状: 「図形の基礎は、点描写から。」
- 修正: 「**点描写プリントの、専門店です。**」
- フォント・スケールは現状の Klee 大見出し（rev.5 type scale H1 30）維持

### 2026-05-25 確定の他要素も rev.5 Hero に反映されているか確認＆未反映なら追加
1. **お品書き 2 行**:
   - 1 行目: 「模写・回転・重ね・立体」（4 群を 1 行で予告）
   - 2 行目: 「1 セット 12 枚 200 円」（価格訴求）
2. **Tagline trio → 2 段に縮約**:
   - 業態識別句「点描写プリントの専門店 TENZU」は H1 が吸収済みなので Hero 内では不要
   - 残す Tagline: 「点と点がつなげるようになったら、点描写を。」＋サブコピー「空間認知の土台をつくる。」
3. **promise-sub 削除**: H1 と重複する説明文があれば削除
4. **F3 公式訳カード**: Hero に置かず、§5 ARTICLES の中へ配置（既に正しく配置されていれば OK）

## 修正完了確認

修正後、`mockups/landing.html` の Hero 部分のスクショまたはプレビュー URL を共有してください。

## Assistant

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

rev.4 確定版に揃えて Hero を刷新しました。

## 修正内容（`mockups/landing.html`）

| 要素 | Before | After |
|---|---|---|
| **H1** | 図形の基礎は、点描写から。 | **点描写プリントの、専門店です。**（Klee 44px 維持） |
| **お品書き** | （なし） | 「模写・回転・重ね・立体」（Plex Sans JP 14px）<br>「1 セット 12 枚 200 円」（Plex Mono 13px / 価格訴求トーン） |
| **Tagline** | promise-sub「模写から対称・回転・立体まで。空間認知の土台を、家庭で着実に。」+ ident-full | **「点と点がつなげるようになったら、点描写を。」**（Pencil 19px）<br>**「空間認知の土台をつくる。」**（Pencil 15px / fg-2） |
| **ident-full** | 「点図形（点描写）プリントの専門店 TENZU」 | **削除**（H1 が業態識別句を吸収） |
| **promise-sub** | あり | **削除**（H1 と機能重複のため） |
| **actions / icon-strip** | — | 維持 |
| `<title>` | 図形の基礎は、点描写から。 | 点描写プリントの、専門店です。 |

## F3 公式訳カードについて

現状の rev.5 `landing.html` には Hero 内に **F3 公式訳カードは存在しません**。§1 WHY セクション内に `.why-evidence` aside があり「TENZU 訳：…」を含みますが、これは F3 公式訳カードとは別物で、もとから §1 配置です。

§5 ARTICLES セクション自体が現状の rev.5 LP にはまだ無いため、F3 公式訳カードの「§5 への移動」は **§5 ARTICLES セクションを新設するタイミング** で対応する形になります。今すぐ §5 セクションを新設して F3 カードを置く必要があれば、別タスクとして指示ください。

## 未確認事項

- お品書きの組版は 2 段スタック（左揃え）にしています。横並びでドット区切り「模写・回転・重ね・立体　·　1 セット 12 枚 200 円」が希望なら指示ください
- お品書き 1 行目を Plex Sans JP（情報のトーン）、2 行目を Plex Mono（価格のトーン）に分けています。両方同フォントが希望なら指示ください
- 価格表記は「1 セット 12 枚 200 円」のままにしました（「¥200」スタイルでない、rev.4 確定の自然言語表記を尊重）

## User

Verifier agent check completed

## Assistant

Verifier も clean。Hero 刷新完了です。

