"""A4版の表紙（案1）を、画像の文字を消して文字データで組み直す（2026-11-03、オーナー決定：題名 M PLUS Rounded 1c、
表・裏・背の文字すべて、背は白地のまま）。絵（波・丸・鉛筆・プリンター・図形の札）は今の画像を使い、文字と、文字の地になる
円・札は PDF に直接描く。寸法は cover-plan1-kdp.py と同じ（A4・106ページ・白い紙）。

使い方: python cover-a4-vector.py <redraw の K=3 出力 cover-A.png> <front8 の K=3 出力 front.png> <outdir>
位置はすべて元画像を 738×1024 に縮めた座標（view px）で書く。表は front.png、裏は cover-A.png の左 738 px。"""
import io, sys
from pathlib import Path
import fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, FRONT_SRC, OUT = sys.argv[1:4]
import os
LOGO = os.environ.get('LOGO', '')   # ''＝今の文字、'A'＝横ロゴ、'B'＝縦ロゴ（案の書き出し用）
ROOT = Path(__file__).resolve().parents[4]
FONTS = ROOT / 'web/scripts/kdp/fonts'
K, DPI = 3, 300
TRIM_W, TRIM_H, BLEED = 210.0, 297.0, 3.2
PAGES = 106
SPINE = PAGES * 0.0572
MM = 72 / 25.4
px = lambda mm: round(mm / 25.4 * DPI)
BACK_X = (0, 738)
BARCODE_BOX = (497, 900, 727, 1019)   # 生成画像のバーコード欄（KDP が自分で置く）
CAP_TOP, CAP_BOTTOM = 39, 890

hexc = lambda h: tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
INK = (0, 0, 0, 1)                      # 黒い文字は K 1色（4色の版ずれでにじまない）
RED, CORAL, WHITE = hexc('#fa4339'), hexc('#fb6b5a'), (1, 1, 1)
BODY, BLUE, GREEN, GRAY = hexc('#33373a'), hexc('#426db1'), None, hexc('#6b6f75')

# ---- 1. 画像から文字を消す（view px の箱。'k'＝地の色と違う画素、'dark'＝暗い画素だけ、'fill'＝箱ごと地の色）
def clean(img, boxes):
    a = np.asarray(img.convert('RGB')).astype(np.float32).copy()
    for (x0, y0, x1, y1, mode) in boxes:
        X0, Y0, X1, Y1 = x0 * K, y0 * K, x1 * K, y1 * K
        reg = a[Y0:Y1, X0:X1]
        per = np.concatenate([reg[0], reg[-1], reg[:, 0], reg[:, -1]])
        bg = np.median(per, axis=0)
        if mode == 'fill':
            reg[:] = bg
            continue
        m = ((reg.max(-1) - reg.min(-1) < 45) & (reg.sum(-1) < 660)) if mode == 'darkv' else (reg.sum(-1) < 330) if mode == 'dark' else (np.abs(reg - bg).sum(-1) > 20)
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13))) > 0
        if mode == 'edge':
            # 丸の縁をまたぐ文字：箱の上下の行から縁の点を拾って円をあてはめ、箱の中の縁を円で引き直す（折れ線にしない）
            def edge_x(yy):
                g = a[yy, :X1, 1]
                return int(np.argmax(g > 150)) if (g > 150).any() else None
            pts = [(edge_x(yy), yy) for yy in list(range(Y0 - 30 * K, Y0, 3)) + list(range(Y1, min(Y1 + 60 * K, a.shape[0]), 3))]
            pts = np.array([(x, y) for x, y in pts if x is not None], dtype=float)
            A = np.c_[2 * pts[:, 0], 2 * pts[:, 1], np.ones(len(pts))]
            cx, cy, c = np.linalg.lstsq(A, (pts ** 2).sum(1), rcond=None)[0]
            r = np.sqrt(c + cx ** 2 + cy ** 2)
            patch = a[Y0 - 12 * K:Y0, 10 * K:max(int(edge_x(Y0 - 12 * K)) - 6, 10 * K + 4)].reshape(-1, 3)
            coral = np.median(patch, axis=0)
            noise_sd = 3.0
            rng = np.random.default_rng(3)
            tex = np.asarray(Image.fromarray(((rng.standard_normal(reg.shape[:2]) * 40 + 128).clip(0, 255)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)
            tex = (tex - tex.mean()) / (tex.std() + 1e-6)
            cream = np.median(a[Y0, X1 - 20:X1], axis=0)
            xs = np.arange(reg.shape[1])
            for rr in range(reg.shape[0]):
                yy = Y0 + rr
                e = (cx + np.sqrt(max(r ** 2 - (yy - cy) ** 2, 0)) - X0)
                t = np.clip((xs - e) / 3 + 0.5, 0, 1)[:, None]
                reg[rr] = (coral + tex[rr][:, None] * noise_sd) * (1 - t) + cream * t
            a[Y0:Y1, X0:X1] = reg
            continue
        if mode == 'darkv':
            # 丸の縁にかかる文字は、同じ列の上下の消していない画素から埋める（横に埋めると縁がにじむ）
            for c in range(reg.shape[1]):
                col, mk = reg[:, c], m[:, c]
                if not mk.any():
                    continue
                keep = np.nonzero(~mk)[0]
                idx = np.arange(len(col))
                for ch in range(3):
                    col[mk, ch] = np.interp(idx[mk], keep, col[keep, ch])
            a[Y0:Y1, X0:X1] = reg
            continue
        # 消した画素は、同じ行の左右の消していない画素から線形に埋める（地のグラデーションや丸の縁を残す）
        for r in range(reg.shape[0]):
            row, mk = reg[r], m[r]
            if not mk.any():
                continue
            keep = np.nonzero(~mk)[0]
            if not len(keep):
                row[:] = bg
                continue
            idx = np.arange(len(row))
            for ch in range(3):
                row[mk, ch] = np.interp(idx[mk], keep, row[keep, ch])
        a[Y0:Y1, X0:X1] = reg
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

FRONT_BOXES = [((110, 44, 565, 74, 'fill') if LOGO else (270, 44, 400, 74, 'k')), (85, 108, 604, 160, 'k'), (64, 176, 664, 306, 'k'), (4, 304, 712, 458, 'k'),
               # The original circle spans view x 550–705, y 460–610: erase a little wider, filling from the background around it
               (42, 488, 524, 564, 'k'), (540, 448, 724, 622, 'k'), (178, 850, 672, 922, 'k')]
PILLS = [(64, 293, 143, 318), (170, 293, 250, 318), (279, 293, 355, 318), (389, 293, 468, 318), (492, 293, 576, 318), (602, 293, 688, 318)]
BACK_BOXES = [(64, 44, 674, 158, 'k'), (64, 154, 714, 216, 'k'), (54, 230, 704, 283, 'k')] + \
    [(50, 484, 155, 526, 'fill'), (588, 484, 700, 526, 'fill'),
     (132, 552, 632, 598, 'k'), (132, 598, 704, 650, 'k'),
     (78, 664, 222, 696, 'k'), (298, 664, 470, 696, 'k'), (522, 664, 700, 696, 'k'),
     (52, 786, 75, 806, 'k'), (100, 781, 122, 801, 'k'), (157, 776, 178, 796, 'k'), (204, 795, 250, 814, 'k'),
     (292, 790, 324, 812, 'k'), (368, 790, 401, 812, 'k'), (444, 790, 476, 812, 'k'),
     (286, 814, 330, 830, 'k'), (362, 814, 408, 830, 'k'), (436, 814, 486, 830, 'k'),
     (518, 712, 568, 735, 'k'), (518, 775, 568, 798, 'k'), (514, 826, 704, 847, 'k'), (44, 962, 232, 1004, 'edge')]

hi = Image.open(SRC).convert('RGB')
assert hi.size == (1536 * K, 1024 * K), hi.size
src_back = hi.crop((BACK_X[0] * K, 0, BACK_X[1] * K, hi.height))
fa = np.asarray(src_back).astype(int)
def sample(box, cond):
    x0, y0, x1, y1 = [v * K for v in box]
    r = fa[y0:y1, x0:x1].reshape(-1, 3)
    return tuple(np.median(r[cond(r)], axis=0) / 255)
GREEN = sample((527, 670, 695, 690), lambda r: (r[:, 1] > r[:, 0] + 40) & (r[:, 1] > r[:, 2] + 20))
BLUE2 = sample((303, 670, 464, 690), lambda r: (r[:, 2] > r[:, 0] + 60))
RED2 = sample((82, 670, 216, 690), lambda r: (r[:, 0] > 180) & (r[:, 1] < 120))
GRAY2 = sample((286, 817, 330, 828), lambda r: r.sum(1) < 600)
ImageDraw.Draw(hi).rectangle([v * K for v in BARCODE_BOX], fill=(254, 253, 249))
back_art = clean(hi.crop((BACK_X[0] * K, 0, BACK_X[1] * K, hi.height)), BACK_BOXES)
# レベルのカードの帯（ピンクの地・白いカードの上半分）は、きれいに描き直す：絵からは地の色だけを敷き、カードは PDF に角丸の白で重ねる
CARDS_X = [(47.7, 148.3), (154.7, 256.3), (263, 366.3), (372.7, 477.3), (484, 588.7), (595.3, 700.7)]
BAND_Y0, BAND_Y1 = 284, 384
_sa = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
PINK = tuple(np.median(_sa[290 * K:380 * K, 150 * K:153 * K].reshape(-1, 3), axis=0))
CARD_WHITE = tuple(np.median(_sa[386 * K:392 * K, 50 * K:53 * K].reshape(-1, 3), axis=0) / 255)
_b = np.asarray(back_art).copy()
_b[BAND_Y0 * K:BAND_Y1 * K, 38 * K:710 * K] = np.array(PINK, dtype=np.uint8)
back_art = Image.fromarray(_b)
front_art = clean(Image.open(FRONT_SRC).convert('RGB'), FRONT_BOXES)

# ---- 2. 絵を塗り足しつきで並べる（cover-plan1-kdp.py と同じ）
def pad(art, left=0, right=0):
    b = px(BLEED)
    return Image.fromarray(np.pad(np.asarray(art), ((b, b), (left, right), (0, 0)), mode='reflect'))
back = pad(back_art.resize((px(TRIM_W), px(TRIM_H)), Image.LANCZOS), left=px(BLEED))
front = pad(front_art.resize((px(TRIM_W) + px(BLEED), px(TRIM_H)), Image.LANCZOS))
full_w, full_h = TRIM_W * 2 + SPINE + BLEED * 2, TRIM_H + BLEED * 2
doc = fitz.open()
page = doc.new_page(width=full_w * MM, height=full_h * MM)
def put(img, x0, w):
    buf = io.BytesIO(); img.save(buf, format='PNG', dpi=(DPI, DPI))
    page.insert_image(fitz.Rect(x0 * MM, 0, (x0 + w) * MM, full_h * MM), stream=buf.getvalue(), keep_proportion=False)
SX0, FX0 = BLEED + TRIM_W, BLEED + TRIM_W + SPINE
put(back, 0, BLEED + TRIM_W)
put(front, FX0, TRIM_W + BLEED)

# ---- 3. 文字
FONT = {k: (fitz.Font(fontfile=str(FONTS / f)), n) for k, (f, n) in {
    'black': ('MPLUSRounded1c-Black.ttf', 'MRBlack'), 'medium': ('MPLUSRounded1c-Medium.ttf', 'MRMedium'),
    'plexb': ('IBMPlexSansJP-Bold.ttf', 'PlexBold'), 'plex': ('IBMPlexSansJP-Regular.ttf', 'PlexReg')}.items()}
for k, (font, name) in FONT.items():
    page.insert_font(fontname=name, fontfile=str(FONTS / {'black': 'MPLUSRounded1c-Black.ttf', 'medium': 'MPLUSRounded1c-Medium.ttf',
        'plexb': 'IBMPlexSansJP-Bold.ttf', 'plex': 'IBMPlexSansJP-Regular.ttf'}[k]))
def base(face, lh=1.0):
    """CSS の line-height の箱の上端から、文字の基準線までの比（文字の大きさに対して）。"""
    f = FONT[face][0]
    return (lh + f.ascender + f.descender) / 2
def adv(ch, size_mm, face, tr):
    return FONT[face][0].text_length(ch, fontsize=size_mm * MM) / MM + tr * size_mm
def width(items, gap):
    return sum(sum(adv(ch, it['s'], it.get('f', 'black'), it.get('tr', 0)) for ch in it['t']) for it in items) + gap * (len(items) - 1)
def draw(items, x, top=None, cy=None, gap=0.0, rotate=0):
    """items を左から並べる。top を渡すと基準線そろえ、cy を渡すと縦の中心そろえ（どちらも mm）。"""
    if top is not None:
        bl = top + max(base(it.get('f', 'black')) * it['s'] * it.get('sy', 1) for it in items)
    for it in items:
        face, s, sy = it.get('f', 'black'), it['s'], it.get('sy', 1)
        y = bl if top is not None else cy - s / 2 + base(face) * s
        for ch in it['t']:
            tr = it.get('trch', {}).get(ch, it.get('tr', 0))
            morph = (fitz.Point(x * MM, (y - base(face) * s * sy) * MM), fitz.Matrix(1, 0, 0, sy, 0, 0)) if sy != 1 else None
            yy = (y - base(face) * s * sy + base(face) * s) if sy != 1 else y
            page.insert_text(fitz.Point(x * MM, yy * MM), ch, fontsize=s * MM, fontname=FONT[face][1], color=it['c'], morph=morph)
            x += adv(ch, s, face, tr)
        x += gap
    return x
def centered(items, cx, top=None, cy=None, gap=0.0):
    return draw(items, cx - width(items, gap) / 2, top=top, cy=cy, gap=gap)
def pill(x, y, w, h, fill):
    page.draw_rect(fitz.Rect(x * MM, y * MM, (x + w) * MM, (y + h) * MM), color=None, fill=fill, radius=0.5)

# 表（1cqw＝表の面の幅 213.2mm の 1%。縦も同じ cqw を元画像の比で mm にする）
UF, UFy = (TRIM_W + BLEED) / 100, TRIM_H / 138.75
fx = lambda c: FX0 + c * UF
fy = lambda c: BLEED + c * UFy
fs = lambda c: c * UF
if not LOGO:
    centered([{'t': 'T E N Z U', 's': fs(3), 'c': INK, 'f': 'plexb', 'tr': 0.1}], fx(45.4), top=fy(6.4))
centered([{'t': '運筆ができるようになったらこの一冊', 's': fs(3.85), 'c': INK}], fx(45.8), top=fy(15.7))
draw([{'t': 'はじめての', 's': fs(15.2), 'c': INK}], fx(10.4), top=fy(25.2))
draw([{'t': '点図形(点描写)', 's': fs(13.4), 'c': RED, 'sy': 1.2, 'tr': -0.02, 'trch': {'(': -0.12, ')': -0.12}}], fx(1.6), top=fy(42.6))
draw([{'t': 'たす', 's': fs(6.4), 'c': INK}, {'t': '→', 's': fs(6.4), 'c': RED}, {'t': 'うつす', 's': fs(6.4), 'c': INK},
      {'t': '144', 's': fs(8.6), 'c': RED}, {'t': '問', 's': fs(6.4), 'c': INK}], fx(6.4), top=fy(67.4) - 2.5, gap=fs(6.4) * 0.12)   # 帯（view y 479.5〜567.5）の縦中央にそろえる
# Same center and size as the original circle (view x 627.5, y 535, radius 77.5 → cqw = view / 7.38)
ccx, ccy, cr = fx(627.5 / 7.38), fy(535 / 7.38), fs(77.5 / 7.38)
page.draw_circle(fitz.Point(ccx * MM, ccy * MM), cr * MM, color=None, fill=CORAL)
line1, line2 = [{'t': '4', 's': fs(7.4), 'c': WHITE}, {'t': '才', 's': fs(5.4), 'c': WHITE}], [{'t': 'ごろから', 's': fs(3.4), 'c': WHITE}]
stack_top = ccy - (fs(7.4) + fs(0.9) + fs(3.4)) / 2
centered(line1, ccx, top=stack_top)
centered(line2, ccx, top=stack_top + fs(7.4) + fs(0.9))
dl = [{'t': 'ダウンロード特典', 's': fs(4.7), 'c': INK, 'tr': -0.06}, {'t': 'PDF', 's': fs(7.8), 'c': RED, 'tr': -0.01},
      {'t': 'つき', 's': fs(5.8), 'c': INK, 'tr': -0.04}]
w = width(dl, fs(4.7) * 0.2)
if w > fs(92 - 25.6):
    raise SystemExit(f'ダウンロード特典PDFつき が帯からはみ出す: {w:.1f} mm')
draw(dl, fx(25.6), cy=fy(119.9), gap=fs(4.7) * 0.2)

# 裏（1cqw＝裏の面の幅 210mm の 1%。下半分は view px を 7.38 で割って cqw にする）
UB, UBy = TRIM_W / 100, TRIM_H / 138.75
bx = lambda c: BLEED + c * UB
by = lambda c: BLEED + c * UBy
bs = lambda c: c * UB
v = lambda p: p / 7.38
draw([{'t': '迷いやすいところを先回り', 's': bs(5.2), 'c': RED}, {'t': 'した、', 's': bs(5.2), 'c': INK}], bx(10.2), top=by(6.9))
draw([{'t': 'はじめてのための設計。', 's': bs(5.2), 'c': INK}], bx(10.2), top=by(13.9))
for i, l in enumerate(['点図形がはじめてのお子さまと、はじめて見守るおうちの方のために。', '段階を細かく分け、見る・考える・書くを少しずつ育てる一冊です。']):
    draw([{'t': l, 's': bs(2.7), 'c': BODY, 'f': 'medium'}], bx(10.2), top=by(21.3 + i * 2.7 * 1.36) + (1.36 - 1) / 2 * bs(2.7))
draw([{'t': '3×3', 's': bs(5.4), 'c': RED}, {'t': 'から', 's': bs(3.6), 'c': INK}, {'t': '5×5', 's': bs(5.4), 'c': RED},
      {'t': 'まで。', 's': bs(3.6), 'c': INK}, {'t': 'むずかしさを、ひとつずつ。', 's': bs(3.75), 'c': RED}], bx(8.4), top=by(32.3), gap=bs(0.2))
for (cx0, cx1) in CARDS_X:
    # 上の角だけ丸く：角丸の箱を上に、まっすぐの箱を下に重ねる（下は絵のカードの白につなぐ）
    page.draw_rect(fitz.Rect(bx(v(cx0)) * MM, by(v(BAND_Y0)) * MM, bx(v(cx1)) * MM, by(v(BAND_Y0 + 40)) * MM), color=None, fill=CARD_WHITE, radius=0.12)
    page.draw_rect(fitz.Rect(bx(v(cx0)) * MM, by(v(BAND_Y0 + 20)) * MM, bx(v(cx1)) * MM, by(v(BAND_Y1 + 0.5)) * MM), color=None, fill=CARD_WHITE)
PILL_FILL = ['#f45a4d', '#fdd25d', '#a2f1c6', '#8addfa', '#babafd', '#c3c0fd']
for i, (x0, y0, x1, y1) in enumerate(PILLS):
    pill(bx(v(x0)), by(v(y0)), bs(v(x1 - x0)), bs(v(y1 - y0)), hexc(PILL_FILL[i]))
    centered([{'t': ['Lv.1', 'Lv.2', 'Lv.3-1', 'Lv.3-2', 'Lv.4-1', 'Lv.4-2'][i], 's': bs(2.5), 'c': WHITE if i == 0 else INK}],
             bx(v((x0 + x1) / 2)), cy=by(v((y0 + y1) / 2)))
CARDS = [(104.5, '3×3', INK, ['たて・よこ']), (209.5, '3×3', INK, ['ななめ']), (317.5, '4×4', BLUE, ['線が交わる']),
         (430.5, '4×4', BLUE, ['45°でない', 'ななめ']), (537.5, '5×5', BLUE, ['盤面が5×5']), (646.5, '5×5', BLUE, ['45°でない', 'ななめ'])]
for cxv, g, gc, lines in CARDS:
    t = by(43.8)
    centered([{'t': g, 's': bs(2.3), 'c': gc}], bx(v(cxv)), top=t + (1.25 - 1) / 2 * bs(2.3))
    for li, l in enumerate(lines):
        ls = 1.8 if len(lines) > 1 else 2.05     # 2行のカードは小さくして、下の図との間をあける
        lh = 1.15 if len(lines) > 1 else 1.25
        lt = t + bs(2.3) * 1.25 + bs(0.6) + li * bs(ls) * lh
        centered([{'t': l, 's': bs(ls), 'c': INK}], bx(v(cxv)), top=lt + (lh - 1) / 2 * bs(ls))
for (x0, y0, x1, y1), label, fill in [((58, 488, 153, 520), 'やさしい', hexc('#f56255')), ((592, 488, 695, 520), 'むずかしい', hexc('#6396fa'))]:
    pill(bx(v(x0)), by(v(y0)), bs(v(x1 - x0)), bs(v(y1 - y0)), fill)
    centered([{'t': label, 's': bs(2.6), 'c': WHITE}], bx(v((x0 + x1) / 2)), cy=by(v((y0 + y1) / 2)))
# 裏の下半分（view px の位置で）
draw([{'t': '特典PDF', 's': bs(v(38)), 'c': RED}, {'t': 'で', 's': bs(v(28)), 'c': INK}, {'t': '何度でもプリントできる。', 's': bs(v(32)), 'c': RED}],
     bx(v(135)), top=by(v(556)), gap=bs(v(6)))
# 2行目は今の画像の行の右端（view 700）までに収める。この書体は元の字より幅があるので、はみ出すぶんだけ小さくする
body_w = bs(v(700 - 135))
for t, s, top in [('本と同じ144問を、ご家庭で何度でも印刷できます。', 17, 601), ('用紙サイズや1枚の問題数も選べて、お子さまのペースでくり返し練習できます。', 16.5, 628)]:
    size = bs(v(s))
    size *= min(1, body_w / width([{'t': t, 's': size, 'f': 'medium'}], 0))
    draw([{'t': t, 's': size, 'c': BODY, 'f': 'medium'}], bx(v(135)), top=by(v(top)))
for cxv, t, c in [(149, '選べる用紙サイズ', RED2), (384, '1枚の問題数を選べる', BLUE2), (611, '点なしでも印刷できる', GREEN)]:
    centered([{'t': t, 's': bs(v(17.5)), 'c': c}], bx(v(cxv)), cy=by(v(680)))
for cxv, cyv, t in [(63, 796, 'A4'), (111, 791, 'B4'), (167.5, 786, 'A3'), (227, 805.5, 'A4よこ')]:
    centered([{'t': t, 's': bs(v(12.5)), 'c': INK}], bx(v(cxv)), cy=by(v(cyv)))
for cxv, t, s in [(308, '1問', '大きく'), (385, '3問', 'ふつう'), (460, '6問', 'たくさん')]:
    centered([{'t': t, 's': bs(v(18)), 'c': INK}], bx(v(cxv)), cy=by(v(802)))
    centered([{'t': s, 's': bs(v(14)), 'c': GRAY2, 'f': 'medium'}], bx(v(cxv)), cy=by(v(822)))
for cyv, t in [(723.5, '点あり'), (786, '点なし')]:
    centered([{'t': t, 's': bs(v(15)), 'c': GREEN}], bx(v(543)), cy=by(v(cyv)))
centered([{'t': '形だけを見て、白紙に写す練習に。', 's': bs(v(11.5)), 'c': INK}], bx(v(609)), cy=by(v(836.5)))
if not LOGO:
    draw([{'t': 'TENZU / tenzu.jp', 's': bs(v(16.5)), 'c': INK, 'f': 'plex', 'tr': 0.08}], bx(v(50)), cy=by(v(983.5)))

# ---- 3b. ロゴ案（LOGO=A 横ロゴ／B 縦ロゴ）：表の上の TENZU と、裏の左下の TENZU / tenzu.jp をロゴに置き換える
def logo(path, cx, top, h):
    # 白地を焼き込んだ原本でも使えるよう、明るさをそのまま透明度にする（鉛筆の粒はそのまま・色は墨1色）
    g = np.asarray(Image.open(ROOT / 'logodesign' / path).convert('RGBA').convert('L')).astype(np.float32)
    alpha = np.clip((235 - g) / (235 - 60), 0, 1)
    rgba = np.zeros(g.shape + (4,), np.uint8); rgba[..., :3] = (38, 38, 40); rgba[..., 3] = (alpha * 255).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    w = h * im.width / im.height
    im = im.resize((round(im.width * 4), round(im.height * 4)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, format='PNG')
    page.insert_image(fitz.Rect((cx - w / 2) * MM, top * MM, (cx + w / 2) * MM, (top + h) * MM), stream=buf.getvalue(), keep_proportion=False)
    return w
if LOGO == 'A':
    logo('HORIZONTALLOOKUP.png', fx(45.4), 13.5, 17.0)                 # 表：横ロゴ（幅 約51mm）
    w = logo('HORIZONTALLOOKUP.png', 46 + 20, 276.5, 13.0)             # 裏：横ロゴ（幅 約39mm）＋ URL
    draw([{'t': 'tenzu.jp', 's': 3.6, 'c': INK, 'f': 'plex', 'tr': 0.08}], 46 + 40 + 5, cy=283)
if LOGO == 'B':
    logo('VerticalLockup.png', fx(45.4), 11.5, 21.0)                   # 表：縦ロゴ（高さ21mm）
    w = logo('VerticalLockup.png', 46 + 11, 273.5, 19.0)               # 裏：縦ロゴ（高さ19mm）＋ URL
    draw([{'t': 'tenzu.jp', 's': 3.6, 'c': INK, 'f': 'plex', 'tr': 0.08}], 46 + 24, cy=287)

# ---- 4. 背：白地・上下の赤い帯・TENZU・短い赤線・題名（K 1色・太さ700。かっこも同じ大きさ、縦書きの向き）
y_mm = lambda src_y: BLEED + src_y / 1024 * TRIM_H
CAP = (243 / 255, 98 / 255, 83 / 255)
page.draw_rect(fitz.Rect(SX0 * MM, 0, (SX0 + SPINE) * MM, full_h * MM), color=None, fill=(254 / 255, 254 / 255, 252 / 255))
page.draw_rect(fitz.Rect(SX0 * MM, 0, (SX0 + SPINE) * MM, y_mm(CAP_TOP) * MM), color=None, fill=CAP)
page.draw_rect(fitz.Rect(SX0 * MM, y_mm(CAP_BOTTOM) * MM, (SX0 + SPINE) * MM, full_h * MM), color=None, fill=CAP)
scx = SX0 + SPINE / 2
def vertical(text, top, em, face, size_ratio=0.94, upright=True, rotate_chars='', tracking=0.0):
    """縦に1字ずつ置く。rotate_chars の字（かっこ）は右に90度回して、縦書きの向きにする。"""
    y = top
    for ch in text:
        s = em * size_ratio
        wch = adv(ch, s, face, 0)
        if ch in rotate_chars or not upright:
            # 字の中心のまわりで時計回りに90度。横文字（TENZU）は字の幅ずつ、かっこは1字ぶん進む
            step = em if upright else wch + tracking
            cxm, cym = scx, y + step / 2
            page.insert_text(fitz.Point((cxm - wch / 2) * MM, (cym - s / 2 + base(face) * s) * MM), ch, fontsize=s * MM,
                             fontname=FONT[face][1], color=INK, morph=(fitz.Point(cxm * MM, cym * MM), fitz.Matrix(-90)))
            y += step
        else:
            page.insert_text(fitz.Point((scx - wch / 2) * MM, (y + (em - s) / 2 + base(face) * s) * MM), ch, fontsize=s * MM,
                             fontname=FONT[face][1], color=INK)
            y += em
    return y
yy = vertical('TENZU', BLEED + 20, 2.6, 'plexb', size_ratio=0.95, upright=False, tracking=1.0)
yy += 4
page.draw_line(fitz.Point(scx * MM, yy * MM), fitz.Point(scx * MM, (yy + 6) * MM), color=CAP, width=0.35 * MM)
yy += 6 + 5
em = SPINE - 3.2
vertical('はじめての点図形（点描写）', yy, em, 'plexb', rotate_chars='（）')

doc.set_metadata({})
out = Path(OUT); out.mkdir(parents=True, exist_ok=True)
doc.save(out / 'cover-a4-vector.pdf', garbage=4, deflate=True)
pv = doc[0].get_pixmap(dpi=60); pv.save(out / 'cover-a4-vector-preview.png')
print({'coverMm': [round(full_w, 4), round(full_h, 4)], 'spineMm': round(SPINE, 4), 'spineEm': round(em, 3),
       'colors': {'green': GREEN, 'blue2': BLUE2, 'red2': RED2, 'gray2': GRAY2}})
