"""Maintain the owner's designed pages of the book (SERIES.first.design in book.ts).

python scripts/kdp/design-pages.py swap <book page> <pdf> [--from <page in pdf>]   replace one designed page
python scripts/kdp/design-pages.py https                                            prefix printed tenzu.jp URLs with https://
python scripts/kdp/design-pages.py check                                            fonts, broken entries, URLs
python scripts/kdp/design-pages.py renumber                                         rebuild the kept pages from owner-102p.pdf for the 98-page plan
python scripts/kdp/design-pages.py move <old>:<new> ...                             give designed pages new book page numbers
python scripts/kdp/design-pages.py retext <book page> <old text> <new text>          replace a line's text in the same font and size
python scripts/kdp/design-pages.py addtext <book page> <text> <x mm> <baseline mm> [size pt] [bold] [right]   add a line (x is the right edge with `right`)
python scripts/kdp/design-pages.py folios                                           reprint every page number as P<n> in the exporter's place

Run `npx tsx scripts/export-kdp-series.ts --book first` afterwards; the exporter copies these pages into the book.
"""
from pathlib import Path
import json, os, re, sys
import fitz

ROOT = Path(__file__).resolve().parents[3]
BOOK = ROOT / 'docs/drafts/kdp/series-1-hajimete'
DESIGN = BOOK / 'design/explain-pages.pdf'
FONTS = ROOT / 'web/scripts/kdp/fonts'
URL = re.compile(r'(?<![/\w])tenzu\.jp(?:/[\w\-./]*)?')
FOLIO = re.compile(r'^P?\d+$')   # a page number, before (4) or after (P4) the P prefix


def design_pages():
    """Book page numbers of the designed pages, in PDF order (from the last book export)."""
    return json.loads((BOOK / 'manifest.json').read_text(encoding='utf-8'))['book']['design']['pages']


def drop_unused_base14(doc):
    """Remove Helvetica/Times references when no text is drawn with them, wherever the font map lives
    (page resources or nested form objects). Rewrites the map itself: setting a key to null leaves
    '(fitz: replace me!)' strings behind, which are broken font references."""
    used = {s['font'] for page in doc for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']}
    targets = set()
    for x in range(1, doc.xref_length()):
        if doc.xref_is_stream(x):
            continue
        src = doc.xref_object(x)
        m = re.search(r'/BaseFont\s*/(Helvetica|Times-Roman)', src)
        if m and '/Type /Font' in src.replace('/Type/Font', '/Type /Font') and m.group(1) not in used:
            targets.add(x)
    if not targets:
        return 0
    ref = re.compile(r'\s*/[^\s/<>\[\]()]+\s+(?:' + '|'.join(map(str, targets)) + r')\s+0\s+R')
    removed = 0
    for x in range(1, doc.xref_length()):
        if doc.xref_is_stream(x):
            kind, value = doc.xref_get_key(x, 'Resources/Font')
            if kind == 'dict':
                new, n = ref.subn('', value)
                if n:
                    doc.xref_set_key(x, 'Resources/Font', new); removed += n
            continue
        src = doc.xref_object(x)
        new, n = ref.subn('', src)
        if n:
            doc.update_object(x, new); removed += n
    return removed


def save(doc, path):
    tmp = str(path) + '.tmp'
    doc.save(tmp, garbage=4, deflate=True)
    doc.close()
    os.replace(tmp, path)


def problems(doc):
    """Anything KDP would reject or a reader would miss: broken or unembedded fonts, URLs without https://."""
    out = []
    for x in range(1, doc.xref_length()):
        if not doc.xref_is_stream(x) and 'replace me' in doc.xref_object(x):
            out.append(f'broken font entry in object {x}')
    pages = design_pages()
    for i, page in enumerate(doc):
        for f in page.get_fonts(full=True):
            if f[1] == 'n/a':
                out.append(f'p{pages[i]}: font {f[3]} is not embedded')
        for url in URL.findall(page.get_text()):
            out.append(f'p{pages[i]}: {url} has no https://')
    return out


def swap(book_page, pdf, from_page=1):
    pages = design_pages()
    if book_page not in pages:
        sys.exit(f'Book page {book_page} is not a designed page: {pages}')
    src = fitz.open(pdf)
    page = src[from_page - 1]
    size = (round(page.rect.width / 72 * 25.4, 1), round(page.rect.height / 72 * 25.4, 1))
    if size != (182.0, 257.0):
        sys.exit(f'Page is {size} mm, not B5 182x257')
    doc = fitz.open(DESIGN)
    at = pages.index(book_page)
    doc.delete_page(at)
    doc.insert_pdf(src, from_page=from_page - 1, to_page=from_page - 1, start_at=at)
    removed = drop_unused_base14(doc)
    save(doc, DESIGN)
    print(f'Replaced book page {book_page}; removed {removed} unused font entries.')


def check():
    issues = problems(fitz.open(DESIGN))
    print('\n'.join(issues) or 'OK: fonts embedded, no broken entries, every URL has https://')
    return issues


def add_https():
    """Reprint each bare tenzu.jp URL as https://… in the same font, size and colour, and extend its underline.
    Room is judged on the rendered page (design files keep hidden, clipped objects): grow right if that is blank,
    else grow left keeping the right edge, else shrink to the blank width."""
    doc = fitz.open(DESIGN)
    mono = str(FONTS / 'IBMPlexMono-Regular.ttf')
    font = fitz.Font(fontfile=mono)
    pages = design_pages()
    done = []
    for i, page in enumerate(doc):
        jobs = []
        for b in page.get_text('rawdict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    text = ''.join(c['c'] for c in s['chars'])
                    for m in URL.finditer(text):
                        cs = s['chars'][m.start():m.end()]
                        jobs.append((m.group(), s, fitz.Rect(cs[0]['bbox']) | fitz.Rect(cs[-1]['bbox']), cs[0]['origin']))
        if not jobs:
            continue
        pix = page.get_pixmap(dpi=150)
        scale = 150 / 72

        def blank(r):
            r = fitz.IRect(r.x0 * scale, r.y0 * scale, r.x1 * scale, r.y1 * scale) & fitz.IRect(0, 0, pix.width, pix.height)
            if r.is_empty:
                return False
            return all(min(pix.pixel(x, y)) > 235 for y in range(r.y0, r.y1) for x in range(r.x0, r.x1, 2))

        right_edge = page.rect.width - (12 if pages[i] % 2 else 18) * 72 / 25.4   # outer margin on odd pages
        left_edge = (18 if pages[i] % 2 else 12) * 72 / 25.4
        drawings = page.get_drawings()
        for url, span, rect, origin in jobs:
            size, color, new = span['size'], fitz.sRGB_to_pdf(span['color']), 'https://' + url
            width = font.text_length(new, fontsize=size)
            band = lambda x0, x1: fitz.Rect(x0, rect.y0 + 1, x1, rect.y1 - 1)
            x = origin[0]
            if x + width <= right_edge and blank(band(rect.x1 + 1, x + width + 2)):
                pass
            elif rect.x1 - width >= left_edge and blank(band(rect.x1 - width - 2, rect.x0 - 1)):
                x = rect.x1 - width
            else:
                room = rect.x1
                while room + 2 < right_edge and blank(band(room, room + 2)):
                    room += 2
                size *= (room - x) / width
                width = font.text_length(new, fontsize=size)
            # The URL's own underline spans exactly the old URL; dividers nearby are longer or offset.
            under = sorted((d for d in drawings if d['rect'].height < 1.5 and 0 < d['rect'].y0 - rect.y1 + 2 < 5
                            and abs(d['rect'].x0 - rect.x0) < 2 and abs(d['rect'].x1 - rect.x1) < 2),
                           key=lambda d: d['rect'].y0 - rect.y1)
            page.add_redact_annot(fitz.Rect(rect.x0, rect.y0 + 0.5, rect.x1, rect.y1 - 0.5))
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
            page.insert_text((x, origin[1]), new, fontname='PlexMono', fontfile=mono, fontsize=size, color=color)
            for d in under[:1]:
                r = d['rect']
                if d.get('type') == 's':   # a stroked rule: same colour and width, now under the whole URL
                    page.draw_line((min(x, r.x0), r.y0), (max(x + width, r.x1), r.y0), color=d['color'], width=d['width'])
                else:
                    page.draw_rect(fitz.Rect(min(x, r.x0), r.y0, max(x + width, r.x1), r.y1), color=None, fill=d.get('fill'), width=0)
            done.append(f'p{pages[i]}: {new} at {size:.1f}pt, x {x / 72 * 25.4:.1f}-{(x + width) / 72 * 25.4:.1f}mm')
    save(doc, DESIGN)
    print('\n'.join(done))

# The owner's design as delivered for the 102-page book; renumber() derives the kept pages from it.
SOURCE = BOOK / 'design/owner-102p.pdf'
SOURCE_PAGES = list(range(1, 9)) + [61] + list(range(88, 103))
# 98-page plan (2026-10-25, the explanation page of every volume after the first carries its first two problems; 2026-10-27, 料金とクーポン added at 83): new page, page in the 102-page design, text changes. A changed footer line is reset whole,
# so every item on it shares one weight (the repo has Plex Sans JP Bold, not the design's SemiBold).
# The owner's first page (この本の使い方) is not used: page 1 is drawn by the exporter (点図形とは). 2026-10-27: the 目次 spread is 2–3, so the route page (design 2) moves to 5.
RENUMBER = [
    # The route page (design 2) is drawn by the exporter since 2026-10-27 (to add how difficulty is measured), so it is not rebuilt here.
    (6, 4, []),
    (57, 61, [('特典PDF  4ページ', '特典PDF  6ページ'), ('紙面を変える  5ページ', '紙面を変える  7ページ'), ('困ったとき  100ページ', '目次  2ページ')]),
    # じぶんでつくろう: the 4th page (maker bridge) is dropped; the child's line drops こうたい (2026-10-25).
    (93, 89, [('/ 1 / 4', '/ 1 / 3')]),
    (94, 90, [('/ 2 / 4', '/ 2 / 3'), ('もんだいを つくって、こうたいしよう。', 'もんだいを つくってみよう。')]),
    (95, 91, [('/ 3 / 4', '/ 3 / 3'), ('もんだいを つくって、こうたいしよう。', 'もんだいを つくってみよう。')]),
    # The afterword and colophon (102 in the design) are drawn by the exporter: the owner's new afterword is longer.
]


def font_file(name):
    if 'Mono' in name:
        return str(FONTS / 'IBMPlexMono-Regular.ttf')
    if 'Klee' in name:
        return str(FONTS / 'KleeOne-SemiBold.ttf')
    return str(FONTS / ('IBMPlexSansJP-Bold.ttf' if ('Bold' in name or 'SmBld' in name) else 'IBMPlexSansJP-Regular.ttf'))


def renumber():
    """Rebuild explain-pages.pdf for the 98-page plan: retext page references, move page numbers, and shift a page
    whose side changes (odd pages have the 18mm inside margin on the left, even pages on the right)."""
    src = fitz.open(SOURCE)
    out = fitz.open()
    mm = 72 / 25.4
    for new, old, changes in RENUMBER:
        work = fitz.open()
        work.insert_pdf(src, from_page=SOURCE_PAGES.index(old), to_page=SOURCE_PAGES.index(old))
        page = work[0]
        spans = [s for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']]
        redo = []
        for s in spans:
            text = s['text']
            if s['bbox'][1] > 240 * mm and FOLIO.match(text.strip()):      # the page number
                page.add_redact_annot(fitz.Rect(s['bbox']))
                folio = s
                continue
            for a, b in changes:
                if a in text:
                    text = text.replace(a, b)
            if text != s['text'] or any(a == b and a in s['text'] for a, b in changes):
                page.add_redact_annot(fitz.Rect(s['bbox'][0], s['bbox'][1] + 0.5, s['bbox'][2], s['bbox'][3] - 0.5))
                redo.append((s, text))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
        for s, text in redo:
            page.insert_text(s['origin'], text, fontname='F' + str(abs(hash(s['font'])) % 997), fontfile=font_file(s['font']),
                             fontsize=s['size'], color=fitz.sRGB_to_pdf(s['color']))
        target = out.new_page(width=page.rect.width, height=page.rect.height)
        dx = 0 if (new % 2) == (old % 2) else (-3.9 if old % 2 else 3.9) * mm   # odd → even moves left by 18 − 14.1 mm
        target.show_pdf_page(page.rect + (dx, 0, dx, 0), work, 0)
        folio_at(target, new)
        missing = [a for a, b in changes if not any(a in s['text'] for s in spans)]
        if missing:
            sys.exit(f'Page {old}: text not found {missing}')
    save(out, DESIGN)
    print(f'Rebuilt {len(RENUMBER)} pages: ' + ', '.join(f'{o}→{n}' for n, o, _ in RENUMBER))


def folio_at(page, number):
    """Print the page number as the exporter's folio() does: "P<n>", 10 pt Plex Mono, 40% gray, ending 14.1 mm from the
    paper's right edge on odd and even pages alike, baseline 247.1 mm."""
    mm = 72 / 25.4
    label, size, mono = f'P{number}', 10, str(FONTS / 'IBMPlexMono-Regular.ttf')
    width = fitz.Font(fontfile=mono).text_length(label, fontsize=size)
    x = 167.9 * mm - width
    page.insert_text((x, 247.1 * mm), label, fontname=unused_font_name(page, 'Folio'), fontfile=mono, fontsize=size,
                     color=(0.4, 0.4, 0.4))


def folios():
    """Reprint the page number of every designed page in place (the exporter draws the same on its own pages)."""
    pages = design_pages()
    doc = fitz.open(DESIGN)
    mm = 72 / 25.4
    for book_page, page in zip(pages, doc):
        spans = [s for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']
                 if s['bbox'][1] > 240 * mm and s['text'].strip() in (str(book_page), f'P{book_page}')]
        if len(spans) != 1:
            sys.exit(f'Page {book_page}: expected one page number, found {len(spans)}')
        page.add_redact_annot(fitz.Rect(spans[0]['bbox']))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
        folio_at(page, book_page)
    removed = drop_unused_base14(doc)
    save(doc, DESIGN)
    print(f'Reprinted page numbers on {len(pages)} pages: {pages}; removed {removed} unused font entries.')


def unused_font_name(page, stem):
    """A font resource name the page does not use yet: reusing one prints the wrong glyphs."""
    used = {f[4] for f in page.get_fonts(full=True)}
    return next(n for n in (f'{stem}{i}' for i in range(1000)) if n not in used)


def retext(book_page, old, new):
    """Replace text on a designed page in place, keeping the span's position, font, size and colour."""
    pages = design_pages()
    if book_page not in pages:
        sys.exit(f'Book page {book_page} is not a designed page: {pages}')
    doc = fitz.open(DESIGN)
    page = doc[pages.index(book_page)]
    spans = [s for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans'] if old in s['text']]
    if not spans:
        sys.exit(f'Page {book_page}: text not found: {old}')
    for s in spans:
        page.add_redact_annot(fitz.Rect(s['bbox'][0], s['bbox'][1] + 0.5, s['bbox'][2], s['bbox'][3] - 0.5))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
    if any(old in t for t in [page.get_text()]):
        sys.exit(f'Page {book_page}: the old text survived redaction')
    for s in spans:
        page.insert_text(s['origin'], s['text'].replace(old, new), fontname=unused_font_name(page, 'Retext'),
                         fontfile=font_file(s['font']), fontsize=s['size'], color=fitz.sRGB_to_pdf(s['color']))
    save(doc, DESIGN)
    print(f'Page {book_page}: {len(spans)} line(s) now read {new}')


def addtext(book_page, label, x_mm, y_mm, size=9.3, bold=False, right=False):
    """Add a line of text to a designed page, in the book's Plex Sans JP (x from the left edge, or the right edge of the text with `right`)."""
    pages = design_pages()
    if book_page not in pages:
        sys.exit(f'Book page {book_page} is not a designed page: {pages}')
    doc = fitz.open(DESIGN)
    page = doc[pages.index(book_page)]
    mm = 72 / 25.4
    fontfile = str(FONTS / ('IBMPlexSansJP-Bold.ttf' if bold else 'IBMPlexSansJP-Regular.ttf'))
    x = x_mm * mm - (fitz.Font(fontfile=fontfile).text_length(label, fontsize=size) if right else 0)
    page.insert_text((x, y_mm * mm), label, fontname=unused_font_name(page, 'Addtext'), fontfile=fontfile, fontsize=size,
                     color=(0.1, 0.1, 0.1) if bold else (0.25, 0.25, 0.25))
    save(doc, DESIGN)
    print(f'Page {book_page}: added "{label}"')


def move(pairs):
    """Give designed pages new book page numbers without going back to owner-102p.pdf, so pages swapped in since
    renumber() are kept. The folio is reprinted and a page whose side changes shifts by the margin difference."""
    pages = design_pages()
    mapping = dict(pairs)
    unknown = [o for o in mapping if o not in pages]
    if unknown:
        sys.exit(f'Not designed pages: {unknown} (designed: {pages})')
    src = fitz.open(DESIGN)
    out = fitz.open()
    mm = 72 / 25.4
    for i, old in enumerate(pages):
        new = mapping.get(old, old)
        work = fitz.open()
        work.insert_pdf(src, from_page=i, to_page=i)
        page = work[0]
        spans = [s for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']]
        folios = [s for s in spans if s['bbox'][1] > 240 * mm and s['text'].strip() in (str(old), f'P{old}')]
        if len(folios) != 1:
            sys.exit(f'Page {old}: expected one page number, found {len(folios)}')
        folio = folios[0]
        page.add_redact_annot(fitz.Rect(folio['bbox']))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
        if any(s['text'].strip() in (str(old), f'P{old}') and s['bbox'][1] > 240 * mm
               for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']):
            sys.exit(f'Page {old}: the old page number survived redaction')
        target = out.new_page(width=page.rect.width, height=page.rect.height)
        dx = 0 if (new % 2) == (old % 2) else (-3.9 if old % 2 else 3.9) * mm
        target.show_pdf_page(page.rect + (dx, 0, dx, 0), work, 0)
        folio_at(target, new)
    src.close()   # Windows will not replace a file that is still open
    save(out, DESIGN)
    print('Moved ' + ', '.join(f'{o}→{n}' for o, n in pairs) + '. Update design.pages in book.ts, then export.')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['swap'] and len(args) >= 3:
        swap(int(args[1]), args[2], int(args[args.index('--from') + 1]) if '--from' in args else 1)
        check()
    elif args[:1] == ['renumber']:
        renumber()
    elif args[:1] == ['move'] and len(args) >= 2:
        move([tuple(int(n) for n in a.split(':')) for a in args[1:]])
    elif args[:1] == ['folios']:
        folios()
        check()
    elif args[:1] == ['retext'] and len(args) == 4:
        retext(int(args[1]), args[2], args[3])
        check()
    elif args[:1] == ['addtext'] and len(args) >= 5:
        addtext(int(args[1]), args[2], float(args[3]), float(args[4]), float(args[5]) if len(args) > 5 and args[5][0].isdigit() else 9.3,
                'bold' in args[5:], 'right' in args[5:])
        check()
    elif args[:1] == ['check']:
        sys.exit(1 if check() else 0)
    elif args[:1] == ['https']:
        add_https()
        check()
    else:
        sys.exit(__doc__)
