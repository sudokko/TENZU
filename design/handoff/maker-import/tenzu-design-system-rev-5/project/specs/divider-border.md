# Divider / Border Spec

**version**: rev.5 草案 (2026-05-26)
**前提**: 1.5px solid teal H2 underline / dashed divider / 2px teal left marker は rev.4 末で検証済み

---

## 1. 4 種類だけ。これ以外は使わない

| # | 名前 | 仕様 | 用途 |
|---|---|---|---|
| **D1** | **§section H2 underline** | `1.5px solid var(--accent)` | `<h2>` の下に置く太線。「ここから新セクション」の合図 |
| **D2** | **dashed divider** | `1px dashed var(--line-thin) #E5E3DC` | 既定の区切り。カード境界・行間・list separator 全部これ |
| **D3** | **memo left marker** | `2px solid var(--accent)` | 観察メモ・親へのひとこと・引用ブロックの左マーカー |
| **D4** | **rationale left marker** | `2px solid var(--fg-2) #424955` | T3 選定理由の左マーカー（accent ではない — accent は到達用） |

これら 4 種以外（1px solid box・実線フル枠・double border 等）は **rev.5 では使わない**。

---

## 2. D1 §section H2 underline

```css
.h2-section,
section > h2 {
  display: inline-block;     /* 文字幅に合わせる — 全幅引かない */
  padding-bottom: 6px;
  border-bottom: 1.5px solid var(--accent);
}
```

### ルール

- **必ず inline 幅**（block 幅・100% は使わない）
- 下のコンテンツとの間隔: 24-28px
- H1 には付けない（H1 は文字の存在感だけで成立させる）
- H3 にも付けない
- 真っ直ぐな直線。波線・dashed・double は使わない（rev.4 で却下）

### NG 例

```css
/* ❌ 全幅 underline は「区切り」になってしまい H2 の合図性が消える */
section { border-top: 1.5px solid var(--accent); }

/* ❌ teal dashed underline は意味が混乱する */
h2 { border-bottom: 1.5px dashed var(--accent); }
```

---

## 3. D2 dashed divider

```css
.divider,
.dashed-divider {
  border: none;
  border-top: 1px dashed var(--line-thin);
}

.divider--vertical {
  border: none;
  border-left: 1px dashed var(--line-thin);
}
```

### ルール

- dashed pattern は browser default で OK（明示的指定不要）
- color は **`--line-thin` `#E5E3DC`** 固定（teal や fg-3 は使わない）
- カード境界・list separator・section 内の小区切り 全部これ
- 連続 5 本以上並べない（リストの息抜きが失われる）

### 場所別の使い方

| 場所 | dashed direction |
|---|---|
| 商品カード上下 | top + bottom |
| list-row 間 | bottom（最後は付けない） |
| FAQ 折りたたみアイテム間 | bottom |
| 改訂履歴の row 間 | bottom |
| 2-column grid の column 間 | left（vertical） |
| Hero と本文の境界 | top（本文側に付ける） |

---

## 4. D3 memo left marker（accent）

```css
.memo--observe,
.memo--parents,
blockquote.tenzu-quote {
  border-left: 2px solid var(--accent);
  padding-left: 18px;
}
```

### 用途

- T1 観察メモ
- T4 親へのひとこと
- 一次資料の引用ブロック（記事内）

### 鏡映（RTL や折返し）対応

- `border-inline-start: 2px solid var(--accent)` で書くと将来安全
- 右マーカーは作らない

---

## 5. D4 rationale left marker（fg-2）

```css
.memo--rationale {
  border-left: 2px solid var(--fg-2);
  padding-left: 18px;
}
```

### 用途

- T3 選定理由
- 開発ノート（中長文）

### なぜ accent ではないのか

- accent `#2C6E7F` は「達成・到達・正解」用に温存
- 選定理由は「淡々と論理を述べる」温度なので accent の到達感は不要
- fg-2 を使うことで「事務的」「論文的」に着地する

---

## 6. NG: 使わない border

| ❌ NG | 理由 |
|---|---|
| 1px solid grey 完全枠（card outline） | rev.5 ボックス削減方針と矛盾 |
| 角丸 8px 以上の rounded card 枠 | radius-soft 4px 上限 |
| inset shadow | shadow 系を使わない方針と矛盾 |
| double border | 視覚過多 |
| dotted（dashed ではなく dotted） | 点描写の点と混線 |
| gradient border / animated border | rev.5 anti pattern |
| accent 1.5px solid full-width underline （section 全幅） | D1 と混線 |

---

## 7. 組み合わせ例

### LP の §section header

```html
<section>
  <h2 class="h2-section">家庭での続け方</h2>
  <!-- 28px spacer -->
  <p>本文……</p>
</section>
```

### 商品ページの dashed-bounded card

```html
<article class="product-card">
  <!-- top: 1px dashed -->
  <!-- content rows separated by 1px dashed bottom each -->
  <!-- last row: no bottom rule -->
  <!-- bottom: 1px dashed -->
</article>
```

### 親へのひとこと

```html
<aside class="memo--parents parents-warm">
  <!-- left: 2px solid accent -->
  <!-- bg: --bg-3 -->
  <!-- radius: 0 4px 4px 0 -->
</aside>
```
