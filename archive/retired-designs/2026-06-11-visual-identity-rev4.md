> **退避**: rev.5 全面改訂により退避（2026-06-11）。現行は [design/visual-identity.md](../../design/visual-identity.md)。

# Visual Identity — ビジュアル実装ルール

## サマリ

- 本ファイルは「見せ方の実装ルール」担当。ブランド哲学・MISSION・Pillar 5 本柱は [../foundation/brand.md](../foundation/brand.md) を参照
- **3軸コンセプト（案H''）**: **書店**（専門店としての端正さ＝P1 体系・P2 解像度）× **研究室**（知的解像度＝P4 言語化）× **親の手元**（家庭で続く温度＝P5 継続・P3 発見）。旧案W「ミニマルD2C × 図形ラボ × 親向けガイド」を 5 Pillar 対応へ拡張
- **配色（locked・2026-05-24）**: 主色 ink `#1A1F2A` ／ 背景 paper `#F4F2ED` ／ アクセント petroleum teal `#2C6E7F`（「達成・注目」限定）。モノクロ完全機能。`Ink & Slate · 墨と石板`
- **タイポ（locked・2026-05-24）**: Plex × Noto Hybrid。見出し・UI body は IBM Plex Sans JP（500 / 400）／ 長文本文（`/articles/` のみ）は Noto Sans JP 400 ／ 数字は IBM Plex Mono
- **ロゴ（locked・2026-05-24）**: 4-dot square symbol（コーナードット浮き・stroke 2.2）＋ IBM Plex Sans JP weight 500・tracking +0.10em の wordmark（**カスタム Ξ-form E**：縦軸なし 3 横線）
- **主役グラフィック**: 「点・直線・図形」の幾何要素（写真不使用・子どもイラスト不使用・キャラクター不採用）
- **CTA 強度4段階**（弱／中／強／最強）で視覚差。モバイル7割想定
- **ディレクトリレベルで密度を変える**: `/products/` ミニマル・密度高め／`/articles/` ゆとり／`/for-parents/` 余白多め（P5 親の手元軸）
- **AI 全面活用**（[brand.md §3 V4](../foundation/brand.md)）。画像生成 AI・SVG/Canvas コード生成・Claude Design でのロゴ叩き台量産すべて推奨。端正さの担保は**人間レビュー**（[brand.md §8.2 C4](../foundation/brand.md)）
- **ロゴはフル刷新中**: 旧 D0 案B' および旧 4 ドット symbol（案W 残骸）は退避済。Claude Design 側で叩き台再生成 → 選定
- **Tagline 3 段セット必須併記**: コアタグライン ＋ サブコピー ＋ 業態識別句（[brand.md §12](../foundation/brand.md)）

## 詳細

### §1. 配色（locked · 2026-05-24）

`Ink & Slate · 墨と石板` パレット。Laboratory レジスター（書店軸でも親の手元軸でもブレない中庸）。

#### §1.1 確定値

| 役割 | HEX | 名称 | 用途 |
|---|---|---|---|
| **主色（ink）** | `#1A1F2A` | 墨 — near-black ink, cool undertone | ロゴ・見出し・本文・線・主要 UI |
| **背景（paper）** | `#F4F2ED` | 紙 — cool paper-white | サイト背景・PDF 背景・カード地色 |
| **アクセント（teal）** | `#2C6E7F` | 青磁 — petroleum teal | **「達成・注目」に限定** |
| fg-2 | `#424955` | — | 補助テキスト |
| fg-3 | `#767D89` | — | 弱いテキスト（kicker・meta） |
| fg-4 | `#B0B5BD` | — | 最弱テキスト（極小ラベル） |
| bg-2 | `#EBE8E1` | — | sunken paper（matrix header・section divider） |
| bg-3 | `#FAF8F3` | — | raised paper（カード・親向け声かけブロック） |
| bg-pure | `#FFFFFF` | — | PDF substrate（サンプル sheet 表示用） |
| line-thin | `#D8D6CF` | — | 罫線（細） |
| line-mid | `#A8A69E` | — | 罫線（中） |
| line-strong | `#1A1F2A` | — | 罫線（強・主色と同値） |

**Petroleum teal の許容用途**：F3 公式訳カードの左罫線・サンプルカードの Lv チップ・Maker section の kicker bar・CTA 最強（達成完了画面・購入確定）。それ以外には使わない。

#### §1.2 原則

- **2 色基調 ＋ アクセント 1 色**（4 色目は導入しない）
- **モノクロ完全機能**：主色 `#1A1F2A` 単色だけで全 UI が成立すること（PDF 印刷適性・色覚配慮）
- **アクセントは「達成・注目」専用**。「子の歓び」「楽しい・わくわく」表現には使わない（マスプリント寄り回避）
- **3 軸コンセプトと整合**：書店（端正）／研究室（知的）／親の手元（温度）のいずれにも振り切らない中庸
- **Anti-Brand**：ネオン・グラデーション・蛍光色・暖色装飾過多・キャラクター色 NG
- **PDF と画面の同一性**：印刷時と画面表示で印象が大きく崩れない範囲（彩度抑えめ）

#### §1.3 旧選定（案W・参照のみ）

退避先：[../archive/retired-designs/2026-05-24-case-w-visual-assets/visual-identity.md](../archive/retired-designs/2026-05-24-case-w-visual-assets/visual-identity.md)

| 旧役割 | 旧 HEX |
|---|---|
| 主色（鉄紺） | `#2B3D5A` |
| アクセント（山吹） | `#D9A237` |
| 背景（生成） | `#F7F2E7` |

参照のみ。現在のシステムでは使用しない。

### §2. タイポグラフィ（locked · 2026-05-24）

`Plex × Noto Hybrid` 構成。Laboratory レジスター。

#### §2.1 4 ロール構造（locked）

| ロール | フォント | ウェイト | 用途 |
|---|---|---|---|
| **見出し** | IBM Plex Sans JP | 500 | 全見出し（h1/h2/h3）・UI ラベル・ボタンテキスト |
| **UI body** | IBM Plex Sans JP | 400 | マーケ・商品ページ・アプリ本文・FAQ |
| **Long-form body** | Noto Sans JP | 400 | **`/articles/` 配下のみ**（長文 18-20 本の持続読書） |
| **Numeric** | IBM Plex Mono | 400 | Lv.1〜5・線本数・Vol.・¥ 表示・座標・データテーブル |

**ハイブリッド設計の根拠**: Plex 系で Lab 軸を heading/UI に効かせつつ、長文記事ハブだけ Noto Sans JP に切り替えて日本語 long-form の可読性を確保。マーケ／商品／アプリは Plex 統一でブランド一貫性。

#### §2.2 Wordmark 仕様

- フォント: IBM Plex Sans JP
- ウェイト: 500
- Letter-spacing: **+0.10em**（控えめ・confident specialty retail / antique-bookshop 回避）
- **「E」は カスタム Ξ-form**（縦軸なし・3 横線スタック・SVG 手書きパスで実装）
- 実装: `design/handoff/project/assets/logo-wordmark.png`（PNG）

#### §2.3 タイポグラフィ原則

- **ウェイト運用**：太字訴求を避け、整列とサイズで階層を作る（見出し 500 / 本文 400 / 数字 400 を基本）
- **混植耐性**：日本語＋数字＋欧文略号（PDF・OG・FAQ 等）の混在で破綻しないこと
- **Web フォント**：Google Fonts 経由ロード（現状は SIL OFL 商用ライセンス確認後の正式ファイル差し替え保留）
- **Anti-Brand**：丸ゴシック過多・教科書体・ポップ体・手書き風・装飾セリフ・明朝・筆文字 全 NG

#### §2.4 旧選定（案W・参照のみ）

退避先：[../archive/retired-designs/2026-05-24-case-w-visual-assets/visual-identity.md](../archive/retired-designs/2026-05-24-case-w-visual-assets/visual-identity.md)

| 旧ロール | 旧フォント |
|---|---|
| 見出し | Zen Kaku Gothic New |
| 本文 | Noto Sans JP |
| 数字 | Schibsted Grotesk |

参照のみ。現在のシステムでは使用しない（Noto Sans JP は新システムでも long-form 専用で残留）。

### §3. 主役グラフィック

「点」「直線」「図形」の幾何要素そのものを主役のグラフィック要素として扱う。ドットグリッド・直線・斜線・点の連なり・多角形・レベル別の幾何パターン。この視覚言語を一貫させる。

**写真は使わない**。図版・幾何グラフィックを主役に。手描きの揺らぎ・子どもイラスト・文房具・教室・黒板・木目・紙雑貨・暖色の装飾・キャラクターは不採用（[brand.md §11.1](../foundation/brand.md) Anti-Brand）。

#### §3.1 Pillar 5 本柱の視覚翻訳

[brand.md §7.4](../foundation/brand.md) の Pillar 視覚翻訳を実装ルールに落とし込む。

| Pillar | 視覚翻訳 | 主な実装場所 |
|---|---|---|
| **P1 体系** | 9×5 グリッド・段階接続を示す**直交格子**。ステップが線でつながる構造図 | 商品一覧・レベル選びガイド・Pillar Page 階層図 |
| **P2 解像度** | サンプル開示の透過レイヤー・**メタデータの可視化**（タスク名・難度根拠の図解）・薄いガイド線 | 商品ページ・サンプル PDF プレビュー・記事内図解 |
| **P3 発見** | ドットの組み替えから新しい図形が生まれる**動的モチーフ**（アニメーションは控えめ・ホバーで線が伸びる程度） | App ファーストビュー・OG 画像・記事カードの shape glyph |
| **P4 言語化** | **タスク × 能力対応表**・図と注釈の端正な共存。注釈は本文と同等の重みで配置（小さく逃がさない） | 記事内図表・evidence.md 引用ブロック・pack-design.md 図 |
| **P5 継続** | **余白を残した PDF レイアウト**・親向け声かけブロック（淡い枠線で本文と分離・脅さない温度）・進め方の目安アイコン | PDF フッター・`/for-parents/` 配下・商品ページの「続け方」ブロック |

#### §3.2 ディレクトリレベルの密度設計

| パス | 密度 | 軸の主役 |
|---|---|---|
| `/products/` | ミニマル・密度高め | 書店（端正な棚） |
| `/articles/` | ゆとり・余白多め | 研究室（知的解像度） |
| `/for-parents/` | 余白最大・読み物体 | 親の手元（P5 継続） |
| `/app/`（おためし点描写メーカー） | 機能的・装飾極小 | 書店＋親の手元（「作るのは画面、練習は紙」明示） |

### §4. ロゴ（locked · 2026-05-24）

**4-dot square symbol**（コーナードット浮き）＋ **IBM Plex Sans JP wordmark with custom Ξ-form E** で確定。Claude Design rev.4 で finalize。

#### §4.1 シンボル仕様

- **形状**: 細い正方形フレーム（4 本の独立線）＋ 四隅の 4 ドット（線の外側に浮く・visible gap）
- **viewBox**: 64 × 64
- **正方形 stroke**: 2.2px（square cap）
- **正方形座標**: 上辺 (18,12)→(46,12)・下辺 (18,52)→(46,52)・左辺 (12,18)→(12,46)・右辺 (52,18)→(52,46)
- **ドット**: 半径 4・cx/cy = (12,12) (52,12) (12,52) (52,52)
- **fill / stroke**: 主色 `#1A1F2A` モノクロ（モノクロ完全機能）
- **意味論**: 4 ドット = 点描写の起点 ／ 正方形線 = 点と点を結ぶ直線 ／ visible gap = 「点」と「線」がまだつながっていない瞬間
- **格納先**: `design/handoff/project/assets/logo-square.svg`（実プロジェクトの SSOT）

#### §4.2 Wordmark 仕様

§2.2 参照。要点：
- IBM Plex Sans JP 500・letter-spacing +0.10em
- **カスタム Ξ-form E**（縦軸なし・3 横線のみ・SVG path で手書き実装）
- 格納先: `design/handoff/project/assets/logo-wordmark.png`

#### §4.3 既知の限界

現状のロゴ SVG は**機能的プレースホルダー**（agent-drawn・ジオメトリは厳密だが手仕上げの精度はデザイナー仕上げに劣る）。後で実デザイナーが描き起こした最終版に差し替える方針。意味論・ジオメトリ仕様は本節を SSOT として継承。

#### §4.4 退避物

- 旧 D0 案B'（正方形枠＋ドットグリッド＋斜線・TZ 風）: [../archive/retired-designs/2026-05-11-logo-b-prime.md](../archive/retired-designs/2026-05-11-logo-b-prime.md)
- 旧 4 ドット symbol（案W 版・ギャップなし・stroke 2.5）: [../archive/retired-designs/2026-05-24-case-w-visual-assets/tenzu-symbol.svg](../archive/retired-designs/2026-05-24-case-w-visual-assets/tenzu-symbol.svg)

#### §4.5 Tagline との並置ルール

ロゴ＋ Tagline 3 段セット（[brand.md §12](../foundation/brand.md)）の標準配置：

```
[LOGO]
点と点がつなげるようになったら、点描写を。
空間認知の土台をつくる。
─────────────────────
点図形（点描写）プリントの専門店 TENZU
```

- LP ヒーロー・OG 画像・名刺・スライド表紙では 3 段セット必須
- ロゴ単独運用（ファビコン・ヘッダー小サイズ）では Tagline 省略可
- 業態識別句はフッターまたはヘッダー側で別配置も可

#### §4.6 SVG 格納先（locked）

| 配置 | パス | 用途 |
|---|---|---|
| Design SSOT | `design/handoff/project/assets/logo-square.svg`・`logo-wordmark.png` | デザイン側の正本 |
| Code 配信用 | `web/public/assets/logo-square.svg`・`logo-wordmark.png` | Next.js 配信 |
| Watermark grid | `web/public/assets/watermark-grid.svg` | 9×5 ドット透かし（hero 用） |

将来 `design/brand-assets/` にデザイナー仕上げの最終版 SVG（symbol / wordmark / lockup horizontal / lockup vertical の 4 本セット）を配置予定。

### §5. コンポーネント

ボタン・カード・スライダー・トグル・**親向け声かけブロック**（P5 新設）が必須。

#### §5.1 CTA 強度 4 段階

| 強度 | スタイル | 用途 |
|---|---|---|
| 弱 | テキストリンク（下線・主色） | 関連記事・FAQ・本文中リンク |
| 中 | アウトライン（主色枠・背景色地） | サブ CTA・「他のレベルを見る」等 |
| 強 | ベタ主色・背景色文字 | 主 CTA（「サンプル PDF を見る」「カートへ」等） |
| 最強 | ベタアクセント・主色文字 | 購入確定・達成完了画面のみ。LP ヒーローでは使わない |

**Hero CTA は装飾なし**。グラデーション・アニメーション・矢印アイコンの動きは排除。

#### §5.2 Difficulty Badges

**図形タイプ別**（年齢非依存）。記事カードには shape glyph（三角・四角・五角形等）を識別子として配置。

#### §5.3 親向け声かけブロック（P5 新設）

`/for-parents/` 配下および商品ページの「続け方」セクションで使用。

- 主色の細枠線（1px）＋背景色で本文から軽く分離
- 見出しは「親へのひとこと」「次の一手の目安」等の落ち着いた表現
- **「〜してあげましょう」「〜が大切です」型の指導語彙は禁止**（同じ親の目線・[voice-tone.md §3](../foundation/voice-tone.md)）
- アクセントは使わない（達成・注目限定）

### §6. 3軸コンセプトの場所別配分

旧案W「ミニマルD2C × 図形ラボ × 親向けガイド」を案H'' で 3 軸に再整理。

| 軸 | 場所 | 表現 |
|---|---|---|
| **書店（専門店としての端正さ）** | `/products/`・トップヘッダー・OG 画像 | 棚のような整列・余白・タイポ階層で「専門店」を語る。商品名の前に「TENZU」を冠さない（屋号は控えめに） |
| **研究室（知的解像度）** | `/articles/`・Pillar Page・evidence.md 引用ブロック | カテゴリ名「考察」、難易度を「分類」と表現。図表は注釈と等価で配置。論文引用は静かに置く |
| **親の手元（家庭で続く温度）** | `/for-parents/`・PDF フッター・完了画面・マイクロコピー | 同じ親の目線。「親への配慮」を装飾でなく構造で出す。脅さない・指導しない |

3軸はサイト全体で常時混在ではなく、**ディレクトリ／コンポーネント単位で主役を切り替える**。トップページは 3 軸を順に通過する情報設計（書店＝商品 → 研究室＝記事 → 親の手元＝続け方）。

### §7. マイクロコピー

構造で温度を出すため、ボタン周り・フォームのプレースホルダー・404・完了画面・エラーメッセージなどに専門家としての配慮と人間味を仕込む。

P5 継続（親の手元軸）の追加で、温度を半段上げる：

- 旧例：「PDF の準備ができました。」
- 新例：「PDF の準備ができました。今日の 1 枚が、図形を見る目を少し育てますように。」

**NG 表現**：「がんばろう」「やりきろう」「できた！」型の達成煽り。「お疲れさまでした」「次は明日でも大丈夫です」型の落ち着いた声かけを採用。

### §8. トランジション

- 決済（硬）→ 完了画面（温）への移行時に唐突感が出ないよう、完了画面冒頭は事務的に入り、スクロールするにつれて「TENZU からのメッセージ」が現れる**情報階層化**
- ページ間遷移はフェードのみ。スライドイン・パララックスは採用しない
- ホバーは線が伸びる・色が薄く乗る程度。バウンス・拡大は使わない

### §9. AI 生成物の運用ルール

[brand.md §3 V4](../foundation/brand.md)「AI を全面活用して企業並みの品質を出す」に基づき、**画像生成 AI・SVG/Canvas コード生成・Claude Design でのロゴ叩き台量産すべて推奨**。「個人の手作り感」を売りにせず、AI で企業並みの密度を出す。

#### §9.1 担保メカニズム

端正さ・同一性の担保は使用ツールの制限ではなく、**人間レビュー**と**パーツライブラリ化**で行う：

- **人間レビュー必須**（[brand.md §8.2 C4](../foundation/brand.md)）：AI 生成物は運営者が確認してから公開
- **パーツライブラリ化**：反復使用するグラフィックは都度生成せず、確定版を `design/brand-assets/` に格納してそこから参照
  - グリッド背景パターン／斜線パターン／レベル別多角形モチーフ
  - 404 用の崩れた点描写／完了画面用の完成図形
  - OGP 固定テンプレート／記事カテゴリ別の抽象図版
  - **P5 用：親向け声かけブロックの淡い装飾線**（新規）
  - **ロゴ系一式**（symbol / wordmark / lockup×2）

#### §9.2 ツール使い分けの目安

担保が効く前提で、用途に応じて適材適所：

| 用途 | 適性ツール | 理由 |
|---|---|---|
| ロゴ叩き台量産 | Claude Design・画像生成 AI | 案出しの幅を確保。確定版は SVG コード化して `brand-assets/` 格納 |
| 商品サムネ・OGP の固定テンプレ | 画像生成 AI でビジュアル → SVG/コード化 or 高解像度書き出しで固定運用 | 同一性は「確定版を使い回す」で担保 |
| ドットグリッド・直線・レベル別多角形（数値座標が必要） | SVG/Canvas コード生成（AI に書かせる） | ピクセル AI では座標精度が出ない |
| 記事内の抽象図版・背景パターン | 画像生成 AI 自由 | 揺らぎが許容範囲 |
| 親向け声かけブロックの装飾線 | どちらも可 | 確定版をライブラリ化 |

「ピクセル画像での運用」と「SVG コードでの運用」は最終出力形式の違いとして区別する。ピクセル運用の場合は**確定版を再生成しない**（差し替え時は新版として履歴管理）。

### §10. 資産アップロード

| 枠 | 状態 | 内容／後続予定 |
|---|---|---|
| Link code on GitHub | ⬜ 空欄 | D-5 Tokens 抽出 → コード化以降に連携 |
| Link code from your computer | ⬜ 空欄 | 同上 |
| Upload .fig file | ⬜ 空欄 | Figma 資産を作る予定なし |
| Add fonts, logos and assets | 🚧 刷新中 | **新ロゴ確定後にアップロード**。フォントは §2 指定で十分 |

## 附録

- 変遷:
  - 旧 `design/brand-brief.md` 一枚運用 → 本ファイル ＋ [../foundation/brand.md](../foundation/brand.md) へ分離: [../archive/retired-designs/2026-05-21-brand-brief-monolith.md](../archive/retired-designs/2026-05-21-brand-brief-monolith.md)
  - 旧 D0 案B' 破棄: [../archive/retired-designs/2026-05-11-logo-b-prime.md](../archive/retired-designs/2026-05-11-logo-b-prime.md)
  - 旧案W 視覚資産（旧 visual-identity.md ＋ 4 ドット symbol ＋ brand-spec.md）退避: [../archive/retired-designs/2026-05-24-case-w-visual-assets.md](../archive/retired-designs/2026-05-24-case-w-visual-assets.md)
- 関連 SSOT: [../foundation/brand.md §7 Pillars](../foundation/brand.md)・[§10.1 CEP](../foundation/brand.md)・[§11.3 Brand Architecture](../foundation/brand.md)・[§12 Tagline 3 段](../foundation/brand.md)
