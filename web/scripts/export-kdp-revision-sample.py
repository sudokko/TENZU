"""Review samples for the KDP book; leaves interior.pdf untouched.

Run from the repository root:
  python web/scripts/export-kdp-revision-sample.py --level-copy-only
  python web/scripts/export-kdp-revision-sample.py --spread-a
  python web/scripts/export-kdp-revision-sample.py --spread-b
  python web/scripts/export-kdp-revision-sample.py
The original pages remain the source of all problem drawings and text.
"""

from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from pathlib import Path
import sys

from PIL import Image
import fitz
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "docs/drafts/kdp/first-patterns-216"
FONTS = ROOT / "web/scripts/kdp/fonts"
QR_SOURCE = BOOK / "qr-products-source.png"
QR_SHA256 = "2ca9f48fcb207c1460d47e2ec45661347c8ee059854013f17f7e6355de445ba1"
MM = 72 / 25.4
PAGE_W, PAGE_H = 182 * MM, 257 * MM
LEVEL_FAREWELL = "レベル２はここまで、おつかれさま＾＾つぎからはレベル３だよ！"


def top_text(pdf: canvas.Canvas, x: float, top: float, value: str, size: float, font: str, color=colors.black) -> None:
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    pdf.drawString(x * MM, PAGE_H - top * MM - size, value)


def top_rect(pdf: canvas.Canvas, x: float, top: float, width: float, height: float, color, border=False) -> None:
    pdf.setFillColor(color)
    if border:
        pdf.setStrokeColor(colors.Color(.45, .45, .45))
        pdf.setLineWidth(.3 * MM)
    pdf.rect(x * MM, PAGE_H - (top + height) * MM, width * MM, height * MM,
             stroke=int(border), fill=1)


def level_badge(pdf: canvas.Canvas, x: float, top: float, width: float, height: float, size: float) -> None:
    """A light level marker shared by the farewell and the next page."""
    pdf.setFillColor(colors.Color(.9, .9, .9))
    pdf.setStrokeColor(colors.Color(.48, .48, .48))
    pdf.setLineWidth(.35 * MM)
    pdf.roundRect(x * MM, PAGE_H - (top + height) * MM,
                  width * MM, height * MM, height * MM / 2, stroke=1, fill=1)
    top_text(pdf, x + 3.5, top + .65, "レベル", size, "Klee", colors.Color(.15, .15, .15))
    diameter = height - 2
    circle_x = x + width - diameter - 1
    pdf.setFillColor(colors.white)
    pdf.circle((circle_x + diameter / 2) * MM,
               PAGE_H - (top + height / 2) * MM,
               diameter * MM / 2, stroke=1, fill=1)
    top_text(pdf, circle_x + diameter * .3, top + 1, "3", size, "Mono", colors.Color(.15, .15, .15))


def qr_modules() -> list[list[int]]:
    if sha256(QR_SOURCE.read_bytes()).hexdigest() != QR_SHA256:
        raise ValueError("The approved QR source changed")
    with Image.open(QR_SOURCE) as im:
        image = im.convert("L")
        if image.size != (186, 186):
            raise ValueError(f"Unexpected QR size: {image.size}")
        if image.point(lambda p: 255 if p < 128 else 0).getbbox() != (18, 18, 168, 168):
            raise ValueError("Unexpected QR content boundary")
        return [[int(image.getpixel((21 + c * 6, 21 + r * 6)) < 128)
                 for c in range(25)] for r in range(25)]


def draw_qr(pdf: canvas.Canvas, x: float, top: float, side: float) -> None:
    # Reproduce the user's QR as vector squares, including four quiet modules.
    matrix = qr_modules()
    top_rect(pdf, x, top, side, side, colors.white)
    module = side / 33
    pdf.setFillColor(colors.black)
    for row, bits in enumerate(matrix):
        for col, black in enumerate(bits):
            if black:
                pdf.rect((x + (col + 4) * module) * MM,
                         PAGE_H - (top + (row + 5) * module) * MM,
                         module * MM, module * MM, stroke=0, fill=1)


def overlay(page_number: int, variant: str | None = None) -> bytes:
    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    charcoal = colors.Color(.15, .15, .15)
    pale = colors.Color(.9, .9, .9)
    if page_number == 62:
        # Same font size for the child-facing name and the formal task name.
        x = 12
        top_rect(pdf, x, 33, 152, 19, charcoal)
        top_text(pdf, x + 5, 37, "07", 14, "Mono", colors.white)
        top_text(pdf, x + 22, 36, "とりのぞく（分解）", 18, "Klee", colors.white)
    elif page_number == 66:
        # The last diagram ends at 228.6 mm; the existing footer starts at 246.9 mm.
        x = 12
        line_width = pdfmetrics.stringWidth(LEVEL_FAREWELL, "Klee", 13) / MM
        if line_width > 152:
            raise ValueError("The level farewell exceeds the text area")
        top_text(pdf, x + (152 - line_width) / 2, 234, LEVEL_FAREWELL, 13, "Klee", charcoal)
    elif page_number == 67:
        x = 18
        top_rect(pdf, x, 6.5, 152, 12, colors.white)
        top_text(pdf, x, 8, "分解", 10, "Sans", charcoal)
        if variant == "a":
            label = "レベル３"
            width = pdfmetrics.stringWidth(label, "Klee", 15) / MM
            xx = x + 152 - width
            top_text(pdf, xx, 6.9, label, 15, "Klee", charcoal)
            pdf.setStrokeColor(charcoal)
            pdf.setLineWidth(.35 * MM)
            pdf.line(xx * MM, PAGE_H - 17.5 * MM, (x + 152) * MM, PAGE_H - 17.5 * MM)
        elif variant == "b":
            faded = colors.Color(.55, .55, .55)
            top_text(pdf, x + 91, 8.6, "レベル２", 9.5, "Klee", faded)
            pdf.setStrokeColor(faded)
            pdf.setLineWidth(.3 * MM)
            pdf.line((x + 112.5) * MM, PAGE_H - 13 * MM,
                     (x + 120.5) * MM, PAGE_H - 13 * MM)
            pdf.line((x + 117.5) * MM, PAGE_H - 11.3 * MM,
                     (x + 120.5) * MM, PAGE_H - 13 * MM)
            pdf.line((x + 117.5) * MM, PAGE_H - 14.7 * MM,
                     (x + 120.5) * MM, PAGE_H - 13 * MM)
            top_text(pdf, x + 123, 7.7, "レベル３", 12.5, "Klee", charcoal)
            pdf.setStrokeColor(charcoal)
            pdf.setLineWidth(.35 * MM)
            pdf.line((x + 123) * MM, PAGE_H - 17.5 * MM,
                     (x + 152) * MM, PAGE_H - 17.5 * MM)
        else:
            level_badge(pdf, x + 106, 8, 46, 10.5, 11)
    elif page_number == 105:
        x = 18
        top_rect(pdf, x, 164, 152, 67, colors.white)
        top_rect(pdf, x, 167, 152, 62, pale, border=True)
        top_rect(pdf, x, 167, 3, 62, charcoal)
        top_text(pdf, x + 8, 173, "もっと難しい問題へ。", 15, "Klee", charcoal)
        top_text(pdf, x + 8, 187, "この本の次に進みたくなったら、", 9.5, "Sans", charcoal)
        top_text(pdf, x + 8, 193, "TENZUのウェブサイトへ。", 9.5, "Sans", charcoal)
        top_text(pdf, x + 8, 203, "Lv.4・Lv.5を含むプリントから、", 9.5, "Sans", charcoal)
        top_text(pdf, x + 8, 209, "今のお子さんに合う一枚を選べます。", 9.5, "Sans", charcoal)
        top_text(pdf, x + 8, 219, "tenzu.jp/products", 10.5, "Mono", charcoal)
        draw_qr(pdf, x + 108, 177, 40)
        top_text(pdf, x + 113, 218, "サイトをひらく", 8, "Sans", charcoal)
    else:
        raise ValueError(page_number)
    pdf.showPage()
    pdf.save()
    return stream.getvalue()


def main() -> None:
    pdfmetrics.registerFont(TTFont("Klee", str(FONTS / "KleeOne-SemiBold.ttf")))
    pdfmetrics.registerFont(TTFont("Sans", str(FONTS / "IBMPlexSansJP-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("Mono", str(FONTS / "IBMPlexMono-Regular.ttf")))
    if "--level-copy-only" in sys.argv:
        source = PdfReader(BOOK / "interior.pdf")
        writer = PdfWriter()
        page = source.pages[65]
        page.merge_page(PdfReader(BytesIO(overlay(66))).pages[0])
        writer.add_page(page)
        target = BOOK / "level-transition-copy-sample.pdf"
        with target.open("wb") as handle:
            writer.write(handle)
        print(f"Wrote {target}: one page from interior page 66")
        return
    variant = "a" if "--spread-a" in sys.argv else "b" if "--spread-b" in sys.argv else None
    if variant:
        with fitz.open(BOOK / "interior.pdf") as source_pdf:
            source_pdf.select([65, 66])
            source_pdf[1].add_redact_annot(
                fitz.Rect(18 * MM, 6.5 * MM, 170 * MM, 18.5 * MM), fill=(1, 1, 1))
            source_pdf[1].apply_redactions(images=0, graphics=0, text=0)
            source = PdfReader(BytesIO(source_pdf.tobytes(garbage=3, deflate=True)))
        writer = PdfWriter()
        for index, page_number in enumerate((66, 67)):
            page = source.pages[index]
            page.merge_page(PdfReader(BytesIO(overlay(page_number, variant))).pages[0])
            writer.add_page(page)
        target = BOOK / f"level-transition-spread-{variant}.pdf"
        with target.open("wb") as handle:
            writer.write(handle)
        print(f"Wrote {target}: pages 66–67, design {variant.upper()}")
        return
    selected = (62, 66, 67, 105)
    # Remove the original text behind replaced headings and the new back-page card.
    # The problem drawings and the rest of each source page remain untouched.
    with fitz.open(BOOK / "interior.pdf") as source_pdf:
        source_pdf.select([number - 1 for number in selected])
        replaced = {62: (12, 33, 152, 19), 67: (18, 6.5, 152, 12),
                    105: (18, 164, 152, 67)}
        for index, page_number in enumerate(selected):
            if page_number not in replaced:
                continue
            x, top, width, height = replaced[page_number]
            source_pdf[index].add_redact_annot(
                fitz.Rect(x * MM, top * MM, (x + width) * MM, (top + height) * MM),
                fill=(1, 1, 1),
            )
            source_pdf[index].apply_redactions(images=0, graphics=0, text=0)
        source = PdfReader(BytesIO(source_pdf.tobytes(garbage=3, deflate=True)))
    writer = PdfWriter()
    for index, page_number in enumerate(selected):
        page = source.pages[index]
        page.merge_page(PdfReader(BytesIO(overlay(page_number))).pages[0])
        writer.add_page(page)
    target = BOOK / "revision-sample.pdf"
    with target.open("wb") as handle:
        writer.write(handle)
    print(f"Wrote {target}: source pages {selected}")


if __name__ == "__main__":
    main()
