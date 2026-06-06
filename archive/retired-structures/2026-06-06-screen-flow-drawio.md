# 退避記録: 画面遷移の正本 draw.io → テキスト系（2026-06-06）

## 概要

画面遷移・サイトマップの正本を **draw.io（`design/navigation/screen-flow.drawio`）から Mermaid ＋ 単独HTML へ移行**したことに伴う退避記録。

## 退避物

- `2026-06-06-screen-flow-drawio.drawio` … 旧正本（2ページ構成：遷移マップ／高精度ワイヤー・43KB）

## 移行理由

実編集をほぼプロンプト経由で行うため、draw.io の本質（`mxCell` に絶対座標 x/y/w/h を手打ちする XML）はプロンプト編集と相性が最悪だった。箱を1つ動かすたびに座標を計算し矢印を追従させる必要があり、ハーネス上でのレンダリング確認もできなかった。「二重保守しない」狙いが編集コストで別の負債を生んでいた。

## 移行先（新正本）

- 遷移マップ → [design/navigation/screen-flow.md](../../design/navigation/screen-flow.md)（Mermaid・座標計算ゼロ・各種ビューアで描画）
- 全ページ俯瞰ワイヤー → [design/navigation/pages-overview.html](../../design/navigation/pages-overview.html)（単独HTML・`preview` で検証可）

確定方針は decisions.md §5.5 に反映済み。
