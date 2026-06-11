# Phase A 決定 — Q4 (Dark mode) ／ Q2 (Accessibility)

**起票**: 2026-05-26
**ステータス**: 草案（オーナー承認待ち）
**スコープ**: rev.5 全体に波及する基盤判断。これが固まると tokens / typography 禁則 / component spec の自由度が確定する

---

## Q4. Dark mode は rev.5 でスコープインするか

### 結論: **defer（rev.5 では対応しない）**

### 根拠

| # | 理由 | 補強 |
|---|---|---|
| 1 | **書く学習軸との一貫性** — TENZU の R4「書く学習は紙とペン」は **物理的に白い紙の上で線を引く** ことを核に置く。dark mode は「画面の上で読む文脈」を強化する装置で、TENZU の主用途（PDF 印刷準備・親の購買判断・記事読了）と方向が逆 |
| 2 | **PDF substrate `#FFFFFF` と画面の同一性** — visual-identity §1.2「PDF と画面の同一性」原則と直接矛盾する。dark mode を入れると「画面の TENZU」と「紙の TENZU」が別物に見える |
| 3 | **3 階層フォントのコントラスト検証コストが 2 倍になる** — Klee One 600 / Zen Kurenaido は light mode の `#1A1F2A on #FFFFFF` で既にコントラスト限界圏。dark mode で fg/bg を反転すると、これら 2 書体のヒンティング・ストローク濃度が薄くなり再検証が必要 |
| 4 | **個人運営 × スコープ管理** — 5 卒業計画 ②③④⑤ を先に出し切る方が ROI が高い。dark mode は Phase 6 以降の追加トラックに分離 |
| 5 | **顧客プロファイルとの整合** — 親が机に座って判断する文脈（昼間〜夕方の家庭リビング）が中核。深夜の暗い部屋で 1 人で読む文脈は副次 |

### 例外（dark mode を入れない代替で配慮する箇所）

- **OS の `prefers-color-scheme: dark` には反応せず、常時 light を維持する** — `<meta name="color-scheme" content="light">` を明示
- **画面輝度を落としたい層への配慮** — bg `#FFFFFF` の代わりに `bg-3 #FAF8F3`（warm soft white）をオプションとして残す（将来「目に優しい」トグルで使う想定）

### 未来の打ち手

- Phase 6（rev.6 想定）で「reading mode」だけ別軸で導入可能。`/articles/` 長文ページに限定したオプトインダーク。サイト全体の dark mode ではない

---

## Q2. アクセシビリティ — Klee One / Zen Kurenaido の使用禁則

### 前提（コントラスト実測）

| 組み合わせ | 比率 | WCAG AA 通常 (4.5) | WCAG AA 大文字 (3.0) |
|---|---|---|---|
| `#1A1F2A` (fg) on `#FFFFFF` (bg) | **16.93** | ✅ | ✅ |
| `#1A1F2A` (fg) on `#FAF8F3` (bg-3) | **16.04** | ✅ | ✅ |
| `#424955` (fg-2) on `#FFFFFF` | **9.45** | ✅ | ✅ |
| `#767D89` (fg-3) on `#FFFFFF` | **4.45** | ⚠️ | ✅ |
| `#B0B5BD` (fg-4) on `#FFFFFF` | **2.36** | ❌ | ❌（極小ラベル限定） |
| `#2C6E7F` (accent) on `#FFFFFF` | **5.42** | ✅ | ✅ |
| `#FFFFFF` on `#2C6E7F` | **5.42** | ✅ | ✅ |
| `#FFFFFF` on `#1A1F2A` | **16.93** | ✅ | ✅ |

**コントラスト比は規格通りの数値だが、書体のストローク濃度が薄いと体感コントラストは数値より低い。**
Klee One 600 と Zen Kurenaido は線が細い書写体系のため、**最小サイズ・長文・薄色 fg では実質的に視認性が落ちる**。これを禁則として明文化する。

### Klee One 600（① 意味を運ぶ）禁則

| カテゴリ | ルール | 理由 |
|---|---|---|
| **最小サイズ** | **16px 未満では使わない**（仮置き 14px → Plex に降格） | 書写体の入り抜きが潰れる |
| **長文** | 連続 3 段落以上では使わない | 読書疲労（Klee は読ませる文用、読みつぶす文用ではない） |
| **fg 色** | `fg` (`#1A1F2A`) または `accent` (`#2C6E7F`) のみ。`fg-2` (`#424955`) 以下では使わない | ストローク濃度が薄い書体に薄色を載せると判読困難 |
| **bg 色** | `#FFFFFF` か `#FAF8F3` のみ。`#EBE8E1` (bg-2) 以上の濃さの上では使わない | コントラスト不足 |
| **警告・エラー系** | 一切使わない（system message / error / validation はすべて Plex） | 書写体の温度感は警告に不適切 |
| **ボタン文言** | CTA 系では使わない（押せる感は Plex）| ブリーフ §「Klee One を使わない場所」に明記 |
| **数値・記号** | 一切使わない（数値は Plex Mono） | 同上 |
| **letter-spacing** | `+0.01em` 固定（rev.5 ブリーフ §3 指定） | 字間が窮屈に見える対策 |
| **weight** | `600` 固定。`400` は使わない（rev.5 ブリーフ §3 指定） | 書写体は線が細いため一段太く |
| **行間 (line-height)** | 1.5〜1.7（見出し用）| 連続行は前提としない |

### Zen Kurenaido（② 人の温度）禁則

| カテゴリ | ルール | 理由 |
|---|---|---|
| **最小サイズ** | **15px 未満では使わない**（14px → Plex に降格） | 鉛筆筆致が潰れる |
| **長文** | 連続 5 段落以上では使わない（短い blurb・1 行プロミス・メモ本文用） | 鉛筆筆致は短文の温度演出用 |
| **fg 色** | `fg` (`#1A1F2A`) または `fg-2` (`#424955`) のみ。`fg-3` 以下では使わない | 鉛筆筆致の濃淡が薄色に飲まれる |
| **bg 色** | `#FFFFFF` または `#FAF8F3` のみ | 同上 |
| **警告・エラー系** | 一切使わない | 警告の硬さに合わない |
| **ボタン文言・数値・記号** | 一切使わない | 同上 |
| **見出し** | 使わない（見出しは Klee One が ①、Plex が ③）| 役割の越境 |
| **letter-spacing** | `+0.01em` 固定 | rev.5 ブリーフ §3 指定 |
| **行間 (line-height)** | **`1.85`**（rev.5 ブリーフ §3「行間 +0.15」） | 鉛筆筆致は文字面積が小さく、密に見えるため広めに |
| **weight** | `400` 固定（Zen Kurenaido は 1 ウェイトのみ） | — |

### Plex（③ 構造・機能）が必ず勝つ場所

| 役割 | 強制 Plex | 理由 |
|---|---|---|
| 数値・記号・座標・¥価格・Lv 番号・Vol 数 | **Plex Mono** | `tnum`/`zero` で揃え |
| タグ・ラベル・カテゴリ（観察・基礎・変換 etc） | **Plex Sans JP 400** | カウント可能 / 操作 UI |
| CTA ボタン文言（「カートへ」「サンプルを見る →」） | **Plex Sans JP 500** | 押せる感 |
| 長文本文（3 段落以上） | **Plex Sans JP 400** | 読書疲労防止 |
| 警告・エラー・バリデーション | **Plex Sans JP 400** | 硬さ・速読性 |
| パンくず・ナビゲーション | **Plex Sans JP 400** | 機能 UI |
| フォーム placeholder / label | **Plex Sans JP 400** | 機能 UI |
| URL・パス・コード表示 | **Plex Mono** | monospace |
| `meta` / `small` / `figcaption` | **Plex Sans JP 400** | 機能 UI |

### Tier 越境を許す例外（明示ケース）

- **店主メモブロック**: ラベル＝Klee One ①、本文＝Zen Kurenaido ②、日付＝Plex Mono ③（3 階層が 1 ブロック内で共存）
- **商品カード上のレベルチップ**: 周囲は Plex ③ だが「次の一手」など一文プロミスのみ Klee One ① 可
- **記事 H2 アンダーライン下のリード文**: Klee One ① 不可。Zen Kurenaido ② か Plex ③ のみ

### 禁則の運用方法

- `colors_and_type.css` に **`.tier-1-klee` / `.tier-2-pencil` / `.tier-3-plex`** ユーティリティクラスを定義
- 各クラスに **`min-size` 違反の visual fallback** を入れる：`@media (max-width: 374px)` で Klee→Plex 自動降格、`@container` 単位の min-size guard を component spec で個別実装
- 開発側で **lint ルール（外部 doc に記載）**: `font-family: var(--font-warm)` を `font-size < 16px` セレクタ内で使ったら警告

---

## このフェーズ完了で確定するもの

1. **tokens.css の `--font-*` 定義 3 系統**（warm / pencil / heading-body / num）の用途が固定される
2. **dark mode 関連の変数（`--bg-dark` 等）を tokens.css に入れない**ことが確定 → token 表が約 30% 軽くなる
3. **typography spec の禁則表が確定** → component spec 内のフォント指定が一意になる
4. 次フェーズ（Phase B: 点格子）の素地が `#FFFFFF`（画面）／`#FFFFFF`（PDF substrate）に固定された前提で進められる

---

## オーナー確認お願いします

1. **Q4 defer で OK か** （勧告: defer）
2. **Q2 禁則表で OK か** （特に Klee One 16px 下限 / Zen Kurenaido 15px 下限 / 長文 NG の数値）
3. **`prefers-color-scheme: dark` を無視する `<meta name="color-scheme" content="light">` 強制で OK か**
