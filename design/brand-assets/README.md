# brand-assets/

TENZU ブランドアセット格納庫。確定済みロゴ・アイコン・配布用素材を置く。

## サマリ

- **現在の収録物**: ロゴ確定版 5 バリアント（コンタクトシート 1 枚に集約）
- **形式**: PNG のみ（Gemini 画像生成 AI 出力・2026-05-26 確定）
- **SVG 化**: 未着手（本実装フェーズで対応・Illustrator または vectorizer.ai 等）
- **個別書き出し**: 未着手（現状はコンタクトシートのみ・Web/印刷で個別参照する段階で実施）
- **採用方針**: ハイブリッド案（既存骨格維持＋鉛筆筆致＋微丸み・[archive/retired-designs/2026-05-26-logo-d0-anb-prime/](../../archive/retired-designs/2026-05-26-logo-d0-anb-prime/) からの差分アップデート）
- **設計意味**: 計 14（Symbol 7 ＋ Wordmark 7）。詳細は [design/handoff/logo-regenerate-brief.md](../handoff/logo-regenerate-brief.md)

## 詳細

### §1. ロゴバリアント一覧

| ID | 名称 | 用途 | 最小サイズ | 状態 |
|---|---|---|---|---|
| **A** | Symbol Only | favicon・SNS アイコン・極小用 | 16px | ✅ 確定 |
| **B** | Vertical Lockup | 名刺・縦長バナー・印鑑的用途 | 64px | ✅ 確定 |
| **C** | Horizontal Lockup | サイトヘッダー・通常用途 | height 32px | ✅ 確定 |
| **D-1** | Full Lockup (Plex 版) | 極小・構造寄り・モノクロ印刷 | height 60px | ✅ 確定 |
| **D-2** | Full Lockup (Klee One 版) | **SNS/OGP/印刷 主用途**（rev.5 3 階層ルール ① と整合・温度寄り） | height 80px | ✅ 確定（**最優先採用**） |

タグライン本体「点と点がつなげるようになったら、点描写を。」はロゴに同梱しない。同梱は業態識別句「点描写プリントの専門店」のみ（D-1／D-2）。

### §2. ファイル

| ファイル | 内容 |
|---|---|
| `logo-lockup-contact-sheet.png` | 5 バリアント全部入りコンタクトシート（Gemini 確定出力・参照マスター） |

### §3. TODO（次フェーズ）

- [ ] 各バリアントの個別 PNG 書き出し（A/B/C/D-1/D-2 を別ファイル化）
- [ ] SVG 化（5 バリアント × カラー版・モノクロ版）
- [ ] favicon 用 ICO 書き出し（16/32/48px）
- [ ] OGP 用 1200×630 テンプレ作成
- [ ] `design/visual-identity.md` rev.5 への正式反映

## 附録

- 旧ロゴ（D0 案B'）: [archive/retired-designs/2026-05-26-logo-d0-anb-prime/](../../archive/retired-designs/2026-05-26-logo-d0-anb-prime/)
- リジェネブリーフ: [design/handoff/logo-regenerate-brief.md](../handoff/logo-regenerate-brief.md)
- 作業フォルダ（Gemini 元素材）: `C:\dev\TENZU\logodesign\`
