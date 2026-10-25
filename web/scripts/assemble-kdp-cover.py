"""Assemble approved front and back artwork into one KDP paperback wrap.

The book's dimensions come from the interior export manifest. By default this
rejects artwork below KDP's 300 dpi requirement; --proof allows a visual-only
assembly of the approved reference images.
"""

from __future__ import annotations

import argparse
import io
import json
import math
from pathlib import Path

import fitz
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
BOOK_DIR = ROOT / "docs" / "drafts" / "kdp" / "first-patterns-216"
MM = 72 / 25.4


def panel_dpi(path: Path, panel_w_mm: float, panel_h_mm: float) -> float:
    if path.suffix.lower() == ".pdf":
        with fitz.open(path) as source:
            if source.page_count != 1:
                raise ValueError(f"Expected one page in {path}")
            page = source[0]
            infos = page.get_image_info()
            if not infos:
                return float("inf")  # vector-only panel
            scale_x = panel_w_mm * MM / page.rect.width
            scale_y = panel_h_mm * MM / page.rect.height
            return min(
                min(info["width"] / (info["bbox"][2] - info["bbox"][0]),
                    info["height"] / (info["bbox"][3] - info["bbox"][1])) * 72 / max(scale_x, scale_y)
                for info in infos
            )
    with Image.open(path) as image:
        return min(image.width / (panel_w_mm / 25.4), image.height / (panel_h_mm / 25.4))


def edge_colors(path: Path, side: str, height: int = 500) -> np.ndarray:
    if path.suffix.lower() == ".pdf":
        with fitz.open(path) as source:
            pix = source[0].get_pixmap(matrix=fitz.Matrix(height / source[0].rect.height,
                                                           height / source[0].rect.height), alpha=False)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    else:
        image = Image.open(path).convert("RGB")
    image = image.resize((max(8, round(image.width * height / image.height)), height))
    pixels = np.asarray(image, dtype=np.float32)
    edge = pixels[:, -8:] if side == "right" else pixels[:, :8]
    colors = edge.mean(axis=1)
    padding = np.pad(colors, ((10, 10), (0, 0)), mode="edge")
    return np.stack([padding[i:i + 21].mean(axis=0) for i in range(height)]) / 255


def draw_panel(page: fitz.Page, path: Path, rect: fitz.Rect, resample_dpi: int | None,
               outer_side: str, bleed_mm: float) -> tuple[int, int] | None:
    if path.suffix.lower() == ".pdf":
        with fitz.open(path) as source:
            page.show_pdf_page(rect, source, 0, keep_proportion=False)
        return None
    else:
        if resample_dpi is None:
            page.insert_image(rect, filename=str(path), keep_proportion=False)
            return None
        with Image.open(path) as source:
            pixels = (math.ceil(rect.width / 72 * resample_dpi),
                      math.ceil(rect.height / 72 * resample_dpi))
            bleed_pixels = math.ceil(bleed_mm / 25.4 * resample_dpi)
            trim_pixels = (pixels[0] - bleed_pixels, pixels[1] - 2 * bleed_pixels)
            artwork = source.convert("RGB").resize(trim_pixels, Image.Resampling.LANCZOS)
            side_padding = (bleed_pixels, 0) if outer_side == "left" else (0, bleed_pixels)
            padded = np.pad(np.asarray(artwork),
                            ((bleed_pixels, bleed_pixels), side_padding, (0, 0)),
                            mode="reflect")
            enlarged = Image.fromarray(padded)
            stream = io.BytesIO()
            enlarged.save(stream, format="PNG", optimize=True)
        page.insert_image(rect, stream=stream.getvalue(), keep_proportion=False)
        return pixels


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--book-dir", type=Path, default=BOOK_DIR,
                        help="Book export folder containing manifest.json and interior.pdf")
    parser.add_argument("--front", type=Path)
    parser.add_argument("--back", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--proof", action="store_true", help="Allow low-resolution art for layout review only")
    parser.add_argument("--resample-300", action="store_true",
                        help="Interpolate low-resolution PNGs to 300 dpi; record native quality caveat")
    args = parser.parse_args()
    book_dir = args.book_dir.resolve()
    front = args.front or book_dir / "cover-source" / "front-approved-reference.png"
    back = args.back or book_dir / "cover-source" / "back-approved-reference.png"
    out = args.out or book_dir / "cover-kdp.pdf"

    manifest = json.loads((book_dir / "manifest.json").read_text(encoding="utf-8"))
    trim_w = float(manifest["interiorMm"]["w"])
    trim_h = float(manifest["interiorMm"]["h"])
    bleed = float(manifest["coverMm"]["bleed"])
    with fitz.open(book_dir / "interior.pdf") as interior:
        pages = interior.page_count
    spine = pages * 0.0572  # white-paper KDP formula
    full_w = trim_w * 2 + spine + bleed * 2
    full_h = trim_h + bleed * 2
    expected = manifest["coverMm"]
    if abs(full_w - expected["width"]) > 0.001 or abs(full_h - expected["height"]) > 0.001:
        raise ValueError("Interior page count and manifest cover size disagree")

    dpis = {"front": panel_dpi(front, trim_w, trim_h),
            "back": panel_dpi(back, trim_w, trim_h)}
    low = {name: round(dpi, 1) for name, dpi in dpis.items() if dpi < 300}
    if low and not (args.proof or args.resample_300):
        raise ValueError(f"Source below 300 dpi at cover size: {low}. Use --proof for review or --resample-300 with a quality caveat.")
    if args.resample_300 and (front.suffix.lower() == ".pdf" or back.suffix.lower() == ".pdf"):
        raise ValueError("--resample-300 only accepts raster source panels")

    doc = fitz.open()
    page = doc.new_page(width=full_w * MM, height=full_h * MM)
    back_rect = fitz.Rect(0, 0, (bleed + trim_w) * MM, full_h * MM)
    front_x = bleed + trim_w + spine
    front_rect = fitz.Rect(front_x * MM, 0, full_w * MM, full_h * MM)
    target_dpi = 300 if args.resample_300 else None
    back_pixels = draw_panel(page, back, back_rect, target_dpi, "left", bleed)
    front_pixels = draw_panel(page, front, front_rect, target_dpi, "right", bleed)

    # Sample each panel edge and blend them across the 6 mm spine. No spine text.
    back_edge = edge_colors(back, "right")
    front_edge = edge_colors(front, "left")
    band_mm = 1.0
    steps_y = round(full_h / band_mm) + 1
    steps_x = max(4, round(spine))
    for yi in range(steps_y):
        y0 = yi * full_h / steps_y
        y1 = (yi + 1) * full_h / steps_y
        edge_i = min(499, round((yi + 0.5) * 500 / steps_y))
        for xi in range(steps_x):
            t = (xi + 0.5) / steps_x
            color = tuple(float(v) for v in (1 - t) * back_edge[edge_i] + t * front_edge[edge_i])
            x0 = (bleed + trim_w + xi * spine / steps_x) * MM
            x1 = (bleed + trim_w + (xi + 1) * spine / steps_x) * MM
            page.draw_rect(fitz.Rect(x0, y0 * MM, x1, y1 * MM), color=None, fill=color, overlay=True)

    doc.set_metadata({})
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out, garbage=4, deflate=True)
    doc.close()
    print(json.dumps({"out": str(out), "pages": pages, "coverMm": [full_w, full_h],
                      "spineMm": spine, "nativeSourceDpi": dpis,
                      "embeddedPixels": {"front": front_pixels, "back": back_pixels},
                      "resampled": args.resample_300, "proofOnly": bool(low) and not args.resample_300},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
