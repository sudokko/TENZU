# Shopkeeper Traces — 店主の痕跡 運用ルール

**version**: rev.5 草案 (2026-05-26)
**前提**: brand.md §9 P3「同じ親として先に気付いた立場」／ voice-tone.md NG 語彙

---

## 1. 痕跡 5 種

| ID | 種別 | 内容 | 字数目安 | 主フォント |
|---|---|---|---|---|
| **T1** | 観察メモ | 「ここを見てください」型のタスク観察 | 40-80 字 | Klee ① label + Pencil ② body |
| **T2** | 改訂履歴 | 「v1.3 — 線太さを 0.5pt 増」 | 20-40 字 + 日付 | Plex Mono ③ |
| **T3** | 選定理由 | この SKU/Lv に置いた根拠 | 60-120 字 | Pencil ② |
| **T4** | 親へのひとこと | 一文の声かけ | 30-50 字 | Klee ① label + Pencil ② body |
| **T5** | 開発ノート | サイト全体の決定ログ | 制限なし | Plex ③ |

## 2. 場所別配分表（locked）

| 場所 | T1 | T2 | T3 | T4 | T5 | 上限 |
|---|---|---|---|---|---|---|
| LP（全体） | ✕ | ✕ | ✕ | ✕ | ✕ | **0** |
| LP §「家庭での続け方」 | ✕ | ✕ | ✕ | ◯ 1 | ✕ | 1 |
| 商品ページ | ◯ 1 | ◯ 1 | ◯ 1 | ◯ 1 | ✕ | 4 |
| 記事ページ（サイドバー） | ✕ | ✕ | ✕ | ✕ | △ 1 | 1 |
| レベル選びガイド | ✕ | ✕ | ◯ Lv ごと 1 | ✕ | ✕ | Lv 数 |
| Maker App onboarding | △ 1 | ✕ | ✕ | ✕ | ✕ | 1 |
| About | ✕ | ✕ | ✕ | ✕ | ◯ メイン | — |
| 改訂履歴ページ | ✕ | ◯ 集約 | ✕ | ✕ | ◯ サブ | — |
| PDF L2 パッケージ面 | ◯ 1 | ◯ 1 行 | ✕ | ◯ 1 | ✕ | 3 |
| PDF L1 作業面 | ✕ | ✕ | ✕ | ✕ | ✕ | **0** |

## 3. トーン規則

### 必ず守る

- 一人称: **「店主」**（または無記名）
- 「私たち」「弊社」「TENZU では」は使わない（TENZU は店の名前であって一人称ではない）
- 日付・改訂は **数値**（Plex Mono ③）。「先日」「最近」は使わない
- 観察対象は **figure / level / task のみ**。親の心配や子の出来不出来には触れない

### 禁則語彙（brand.md §11.2 と整合）

| ❌ 使わない | 代替（◯） |
|---|---|
| 〜してあげましょう | （命令を含まない単一文 — 「〜が見やすくなります」） |
| 〜が大切です | （根拠を添える — 「TENZU では…という理由で…」） |
| 処方箋／特効薬／弱点／診断 | 観察・基礎・解像度・段階 |
| がんばろう／やりきろう／できた！ | お疲れさまでした／今日の 1 枚 |
| 点つなぎを卒業 | 点つなぎの次に／点つなぎを楽しんだ後に |
| 研究によると…／専門家が… | TENZU では…という根拠で… |
| 鍛える／修行／叩き込む | 練習／写す／繰り返す |

## 4. T1 観察メモ — テンプレ

```html
<aside class="shopkeeper-memo memo--observe">
  <div class="memo-label">ここを見てください</div>          <!-- Klee ① 17px -->
  <p class="memo-body">
    このレベルの〈線対称タスク〉は、鏡を渡すよりも軸を       <!-- Pencil ② 16px -->
    見つけてもらうほうが先です。手本を見るときの目の動きが
    変わります。
  </p>
  <div class="memo-date">2026-05-12</div>                  <!-- Mono ③ 11px -->
</aside>
```

- **Klee ラベル** 17px / weight 600 / color fg
- **Pencil 本文** 16px / line-height 1.85 / color fg
- **Mono 日付** 11px / color fg-3 / letter-spacing 0.06em
- bg: var(--bg-3) `#FAF8F3`
- 左 border: 2px solid var(--accent) `#2C6E7F`
- padding: 20px 24px
- border-radius: 0 var(--radius-soft) var(--radius-soft) 0

## 5. T2 改訂履歴 — テンプレ

```html
<dl class="shopkeeper-memo memo--revision">
  <div class="rev-row">
    <dt class="rev-version">v1.3</dt>                        <!-- Mono 13px -->
    <dd class="rev-date">2026-05-12</dd>                     <!-- Mono 11px fg-3 -->
    <dd class="rev-note">線太さを 0.5pt 増しました</dd>      <!-- Plex 14px -->
  </div>
  <div class="rev-row">
    <dt class="rev-version">v1.2</dt>
    <dd class="rev-date">2026-04-30</dd>
    <dd class="rev-note">第 3 問の dot 配置を 1 段下げました</dd>
  </div>
</dl>
```

- 罫線: 1px dashed line-thin で各 row を区切る
- left-border: なし（リスト形式のため）
- 全段 Mono または Plex のみ。Klee / Pencil は使わない（事務記録）

## 6. T3 選定理由 — テンプレ

```html
<section class="shopkeeper-memo memo--rationale">
  <h3 class="memo-label">なぜ Lv.2 にこの SKU が来るか</h3>   <!-- Klee 18px -->
  <p class="memo-body">
    点と点の距離を測る目を作るには、4×4 までの規則的な
    配置が必要です。3×3 では情報が足りず、5×5 では距離の
    比較対象が増えすぎる。Lv.2 は「距離を測ること」だけに
    集中できる範囲として置きました。
  </p>
</section>
```

- bg: transparent or var(--bg-3)
- left-border: 2px solid var(--fg-2)（accent を使わない — accent は「達成」用）
- 日付なし（選定理由は SKU 寿命の間ずっと有効）

## 7. T4 親へのひとこと — テンプレ

```html
<aside class="shopkeeper-memo memo--parents parents-warm">
  <div class="memo-label">親へのひとこと</div>               <!-- Klee 16px -->
  <p class="memo-body">
    このレベルは「写す前に、どこを見るか」を一緒に           <!-- Pencil 16px -->
    確認してみてください。
  </p>
</aside>
```

- `.parents-warm` を併用 → bg-3 + line-height 1.85
- 点格子 OFF（`.no-dot-grid` 親要素）
- 文末は **「みてください」「いかがでしょうか」「お疲れさまでした」**等の柔らかい体言止め

## 8. T5 開発ノート — フォーマット

About / 改訂履歴ページに集約。記事と同じ Plex Sans JP 400 16px の長文体。痕跡というより「読み物としての decision log」。月 1 程度の更新頻度。

## 9. ページ単位の上限ルール（再掲）

**1 ページに同時表示できる痕跡は最大 4 個（商品ページのみ）／他は最大 1 個**。これを超えると「個人運営の手作り感」に転落する。

## 10. 痕跡を「載せない」場所

- LP の Hero（コアタグライン直下）
- 商品一覧（list view — 一覧は痕跡を載せない、痕跡は個別 SKU に）
- 検索結果
- 404 / エラー
- カート / 決済フロー
- PDF L1 作業面
- フォーム / settings 画面

## 11. 痕跡 ≠ レビュー

TENZU はユーザーレビュー機能を持たない。痕跡はすべて **店主一人称** から発する。第三者レビュー UI を将来作る場合も、店主の痕跡と物理的に分離する（フォント・場所・bg を分ける）。
