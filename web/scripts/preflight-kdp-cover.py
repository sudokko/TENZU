"""Check the assembled KDP wrap and record the source-image limitation."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "docs" / "drafts" / "kdp" / "first-patterns-216"
MM = 72 / 25.4


def source_info(path: Path, panel_w: float, panel_h: float) -> tuple[str, float]:
    with Image.open(path) as image:
        size = f"{image.width}×{image.height}px"
        dpi = min(image.width / (panel_w / 25.4), image.height / (panel_h / 25.4))
    return size, dpi


def main() -> None:
    manifest = json.loads((BOOK / "manifest.json").read_text(encoding="utf-8"))
    trim_w = float(manifest["interiorMm"]["w"])
    trim_h = float(manifest["interiorMm"]["h"])
    bleed = float(manifest["coverMm"]["bleed"])
    with fitz.open(BOOK / "interior.pdf") as interior:
        pages = interior.page_count
    spine = pages * 0.0572
    expected_w = trim_w * 2 + spine + bleed * 2
    expected_h = trim_h + bleed * 2
    cover_path = BOOK / "cover-kdp.pdf"
    with fitz.open(cover_path) as cover:
        assert not cover.is_encrypted
        assert cover.page_count == 1
        page = cover[0]
        actual_w = page.rect.width / MM
        actual_h = page.rect.height / MM
        assert abs(actual_w - expected_w) < 0.01
        assert abs(actual_h - expected_h) < 0.01
        infos = page.get_image_info()
        assert len(infos) == 2, f"Expected two cover panels, found {len(infos)} images"
        embedded_dpis = []
        for info in infos:
            x0, y0, x1, y1 = info["bbox"]
            dpi = min(info["width"] / ((x1 - x0) / 72),
                      info["height"] / ((y1 - y0) / 72))
            embedded_dpis.append(dpi)
            assert dpi >= 300, f"Embedded image is {dpi:.1f} dpi"
        assert page.get_fonts() == []  # all lettering is part of the raster panels
        assert not page.get_text().strip()
        assert all(page.rect.contains(d["rect"]) for d in page.get_drawings())

    front = BOOK / "cover-source" / "front-approved-reference.png"
    back = BOOK / "cover-source" / "back-approved-reference.png"
    front_size, front_dpi = source_info(front, trim_w, trim_h)
    back_size, back_dpi = source_info(back, trim_w, trim_h)
    assert front_dpi < 300 and back_dpi < 300, "Update this report if native 300 dpi art is supplied"
    front_hash = hashlib.sha256(front.read_bytes()).hexdigest()
    back_hash = hashlib.sha256(back.read_bytes()).hexdigest()
    result = f"""# KDP 表紙PDF 検査結果

対象: `cover-kdp.pdf` / 本文: `interior.pdf`。本文は {pages} ページ、B5（{trim_w:g}×{trim_h:g}mm）、白黒・白い紙。表紙は左から裏表紙・背・表表紙の並び（登録時は「左から右に読む」を選択する前提）。

| 項目 | 結果 |
|---|---|
| 見開きPDF | 1ページ、{actual_w:.4f}×{actual_h:.4f}mm。計算値 {expected_w:.4f}×{expected_h:.4f}mm と一致 |
| 背幅 | {spine:.4f}mm（{pages}ページ×白い紙 0.0572mm）・背文字なし |
| 塗り足し | 採用画像をB5仕上がり面に配置し、上下と外側の背景を各 {bleed:g}mm延長 |
| 埋め込み画像 | 2枚、実効 {embedded_dpis[0]:.1f} / {embedded_dpis[1]:.1f}dpi。300dpi以上を機械確認 |
| フォント | PDF内にフォントなし。表裏の文字は画像の一部 |
| セキュリティ・はみ出し | 暗号化なし、描画オブジェクトはページ内 |
| ファイルサイズ | {cover_path.stat().st_size / 1024 / 1024:.1f}MiB |

## 画質上の留保

採用された原画像は **表 {front_size} / 原寸 {front_dpi:.1f}dpi、裏 {back_size} / 原寸 {back_dpi:.1f}dpi**。PDFの埋め込み画像はLanczos補間で300dpi以上にしたもので、元画像にない細部は増えていない。KDPのファイル上の解像度チェックは満たすが、原画像が300dpiで作られたことを意味しない。細い点線と小さな文字の印刷品質は、KDPプレビューと校正刷りで確認する。

表裏の素材はリポジトリ内を正本とする。SHA-256: 表 `{front_hash}`、裏 `{back_hash}`。

## 目視確認と登録時の確認

- `cover-kdp-preview.png` を確認。背のつなぎ目は淡い水色のグラデーションで、背文字はない。表と裏の文字・主要図は断裁線にかからない配置。
- 裏表紙右下の白い領域はKDP自動バーコード用。バーコードはPDFに入れていない。実際の自動配置との重なりはKDPプレビューで確認する。
- 元画像はRGB。印刷時の色変化は校正刷りで確認する。
- 公式仕様: [ペーパーバックの表紙の作成](https://kdp.amazon.co.jp/ja_JP/help/topic/G201953020)、[バーコード](https://kdp.amazon.co.jp/ja_JP/help/topic/G5HDYGP4BXLX4RUW)。
"""
    report = BOOK / "cover-kdp-preflight.md"
    report.write_text(result, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
