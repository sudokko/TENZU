"""表紙案（cover-plan1-v2-source.webp）を直す。図形＝公開済みの実問題・背の題名・裏の2パネル（案A/案B）。
座標はすべて元画像（1536×1024）の px。K 倍で書き出すと、元画像は拡大し、描き直す部分は K 倍の解像度で描く。
使い方: python cover-plan1-redraw.py <src> <published_dir> <outdir> [K]"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, PUB, OUT = sys.argv[1:4]
K = int(sys.argv[4]) if len(sys.argv) > 4 else 1
SS = max(5, 2 * K)
CARD = (254, 254, 252)
PAGE = (254, 253, 250)
INK = (20, 20, 20)
RED = (238, 72, 84)
BLUE = (30, 150, 225)
GREEN = (32, 170, 80)
FONT = "C:/Windows/Fonts/NotoSansJP-VF.ttf"
BLUE_BG, GREEN_BG = (229, 243, 254), (228, 251, 229)
BLUE_T, GREEN_T = (33, 118, 214), (30, 140, 64)


def font(px, w=700):
    f = ImageFont.truetype(FONT, round(px))
    f.set_variation_by_axes([w])
    return f


def problem(sku, rank):
    """本と同じ D 昇順（同点は元の順）で rank 番目（1始まり）の問題。"""
    ps = json.load(open(f"{PUB}/{sku}.json", encoding="utf-8"))["problems"]
    p = sorted(enumerate(ps), key=lambda t: (t[1]["difficulty"]["value"], t[0]))[rank - 1][1]
    gap = {tuple(map(tuple, e)) for e in (p.get("answer") or {}).get("edges", [])}
    edges = [tuple(map(tuple, e)) for e in p["edges"]]
    return p["grid"]["n"], [e for e in edges if e not in gap], [e for e in edges if e in gap]


def dashed(d, a, b, color, w, on=2.6, off=2.0):
    L = math.dist(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    t = 0
    while t < L:
        e = min(t + on * w, L)
        d.line([(a[0] + ux * t, a[1] + uy * t), (a[0] + ux * e, a[1] + uy * e)], fill=color, width=round(w))
        t = e + off * w


def draw_problem(d, ox, oy, span, n, solid, gap, color, gap_color, dot_r, line_w, dots=True):
    """(ox,oy) から span 四方に n×n の点と線を描く（座標は描画先の倍率で渡す）。"""
    p = span / (n - 1)
    pt = lambda q: (ox + q[0] * p, oy + q[1] * p)
    for a, b in solid:
        d.line([pt(a), pt(b)], fill=color, width=round(line_w))
    for q in {q for e in solid for q in e}:
        x, y = pt(q); r = line_w / 2
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    for a, b in gap:
        dashed(d, pt(a), pt(b), gap_color, line_w)
    if dots:
        for r in range(n):
            for c in range(n):
                x, y = pt((c, r))
                d.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=INK)


def figure_tile(size, n, solid, gap, color, gap_color, dot_r, line_w, span, bg=CARD):
    S = size * SS
    img = Image.new("RGBA", (S, S), bg + (255,) if bg else (0, 0, 0, 0))
    off = (S - span * SS) / 2
    draw_problem(ImageDraw.Draw(img), off, off, span * SS, n, solid, gap, color, gap_color, dot_r * SS, line_w * SS)
    return img


im = Image.open(SRC).convert("RGB")
if K > 1:
    im = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.0 * K, percent=70, threshold=2))
dr = ImageDraw.Draw(im)

# ---- 裏：6段階カード（どれも本に入っている「うつす」の問題）----
ladder = [
    ((48, 148), ("copy-lv1-vol1", 12), RED),
    ((155, 256), ("copy-lv2-vol1", 4), BLUE),
    ((263, 366), ("copy-lv3-vol1", 1), GREEN),
    ((373, 477), ("copy-lv3-vol2", 1), RED),
    ((484, 589), ("copy-lv4-vol1", 2), BLUE),
    ((596, 700), ("copy-lv4-vol2", 11), GREEN),
]
Y0, Y1 = 383, 474
for (x0, x1), src, color in ladder:
    n, solid, gap = problem(*src)
    dr.rectangle([(x0 + 5) * K, Y0 * K, (x1 - 5) * K, Y1 * K], fill=CARD)
    size = Y1 - Y0 - 2
    span = {3: 58, 4: 68, 5: 74}[n]
    tile = figure_tile(size, n, solid, gap, color, color, dot_r=2.3, line_w=2.6, span=span)
    im.paste(tile.resize((size * K, size * K), Image.LANCZOS).convert("RGB"),
             (round(((x0 + x1) / 2 - size / 2) * K), (Y0 + 1) * K))

# ---- 表：傾いた2枚（左＝たす、右＝うつす）----
fronts = [  # カードの4隅（実測）・角度・問題・図の幅
    ([(907, 647), (1122, 620), (1150, 837), (932, 867)], 7.2, ("fill-lv2-vol1", 8), 128, 6.0, 5.6),
    ([(1182, 617), (1420, 650), (1395, 885), (1150, 850)], -8.0, ("copy-lv4-vol2", 3), 146, 4.4, 4.8),
]
for quad, ang, src, span, dot_r, line_w in fronts:
    cx = round(sum(q[0] for q in quad) / 4); cy = round(sum(q[1] for q in quad) / 4)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).polygon([((cx + (x - cx) * 0.93) * K, (cy + (y - cy) * 0.93) * K) for x, y in quad], fill=255)
    ImageDraw.Draw(mask).rectangle([1394 * K, 0, im.size[0], im.size[1]], fill=0)  # 右カードに重なる鉛筆を残す
    im.paste(CARD, mask=mask)
    n, solid, gap = problem(*src)
    color = RED if gap else GREEN
    inner = span + 30
    tile = figure_tile(inner, n, solid, gap, color, BLUE, dot_r, line_w, span, bg=None)
    tile = tile.rotate(ang, resample=Image.BICUBIC, expand=True)
    w = round(tile.size[0] / SS * K)
    tile = tile.resize((w, w), Image.LANCZOS)
    im.paste(tile.convert("RGB"), (cx * K - w // 2, cy * K - w // 2), tile)

# ---- 背：「はじめての点図形（点描写）」を全部黒・同じ大きさで縦に ----
SPINE_X, SPINE_TOP = 768, 278
dr.rectangle([750 * K, 258 * K, 787 * K, 705 * K], fill=CARD)
title = "はじめての点図形（点描写）"
EM = 32
f = font(EM * SS * 0.94, 900)
y = SPINE_TOP
for ch in title:
    paren = ch in "（）"
    adv = EM * 0.62 if paren else EM
    g = Image.new("RGBA", (EM * SS, EM * SS), (0, 0, 0, 0))
    ImageDraw.Draw(g).text((EM * SS / 2, EM * SS / 2), ch, font=f, fill=INK + (255,), anchor="mm")
    if paren:
        g = g.rotate(-90, resample=Image.BICUBIC)
    g = g.resize((EM * K, EM * K), Image.LANCZOS)
    top = y - (EM - adv) / 2
    im.paste(g, (round((SPINE_X - EM / 2) * K), round(top * K)), g)
    y += adv
print("spine title ends at y", round(y))

im.save(f"{OUT}/base.png")


# ---- 裏の2パネル ----
TXT, SUB, LINE = (35, 38, 42), (95, 100, 108), (200, 205, 212)


class Panel:
    """角丸パネルを SS 倍で描いて貼る。座標は元画像の px で渡す。"""
    def __init__(self, x0, y0, x1, y1, bg, r=15):
        self.x0, self.y0, self.w, self.h = x0, y0, x1 - x0, y1 - y0
        self.img = Image.new("RGBA", (self.w * SS, self.h * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.d.rounded_rectangle([0, 0, self.w * SS - 1, self.h * SS - 1], r * SS, fill=bg + (255,))

    def text(self, x, y, s, px, color=TXT, w=700, anchor="mm"):
        self.d.text((x * SS, y * SS), s, font=font(px * SS, w), fill=color, anchor=anchor)

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, width=1, r=0):
        self.d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], r * SS, fill=fill, outline=outline, width=round(width * SS))

    def problem(self, x, y, span, src, dots=True, lines=True, color=INK, line_w=1.0, dot_r=0.9):
        n, solid, gap = src
        draw_problem(self.d, x * SS, y * SS, span * SS, n, solid + gap if lines else [], [], color, color, dot_r * SS, line_w * SS, dots)

    def arrow(self, x, y, len_=12, color=GREEN_T):
        self.d.line([(x - len_ / 2) * SS, y * SS, (x + len_ / 2 - 3) * SS, y * SS], fill=color, width=round(2 * SS))
        tx = (x + len_ / 2) * SS
        self.d.polygon([(tx, y * SS), (tx - 5 * SS, (y - 3.6) * SS), (tx - 5 * SS, (y + 3.6) * SS)], fill=color)

    def paste(self, base):
        small = self.img.resize((self.w * K, self.h * K), Image.LANCZOS)
        base.paste(small, (self.x0 * K, self.y0 * K), small)


HOUSE = problem("copy-lv2-vol1", 4)
PX0, PY0, PX1, PY1 = 269, 655, 712, 816  # 青と緑の2枚が占める範囲
BX1, GX0 = 500, 510


def sheet(p, x, y, w, h, rows, cols, stacked=False):
    """A4縦のミニ紙面に、見本→書く欄の組を rows×cols 置く。stacked は見本の下に書く欄。"""
    p.rect(x, y, x + w, y + h, fill=(255, 255, 255, 255), outline=LINE, width=0.8, r=1.5)
    pad = 4
    cw, ch = (w - pad * 2) / cols, (h - pad * 2) / rows
    pane = min((ch - 4) / 2.25, cw * 0.8) if stacked else min(ch * 0.78, (cw - 4) / 2.25)
    for r in range(rows):
        for c in range(cols):
            cx = x + pad + cw * c + cw / 2
            cy = y + pad + ch * r + ch / 2
            gap = pane * 0.25
            for k, dots_only in ((0, False), (1, True)):
                if stacked:
                    px, py = cx - pane / 2, cy - pane - gap / 2 + k * (pane + gap)
                else:
                    px, py = cx - pane - gap / 2 + k * (pane + gap), cy - pane / 2
                p.rect(px, py, px + pane, py + pane, outline=(225, 228, 232), width=0.4)
                ins = pane * 0.18
                n, solid, gp = HOUSE
                draw_problem(p.d, (px + ins) * SS, (py + ins) * SS, (pane - ins * 2) * SS, n,
                             [] if dots_only else solid + gp, [], INK, INK,
                             max(0.35, pane * 0.035) * SS, max(0.45, pane * 0.05) * SS)


def variant_a(base):
    """案A：仕上がりの紙面を見せる（2枚のまま、中身を実物に近い図へ）。"""
    b = Panel(PX0, PY0, BX1, PY1, BLUE_BG)
    W = BX1 - PX0
    b.text(W / 2, 19, "1枚の問題数を選べる", 15.5, BLUE_T, 800)
    sw, sh, top = 46, 65, 36
    xs = [W / 2 - 72, W / 2, W / 2 + 72]
    for x, (rows, cols), num, sub in zip(xs, [(1, 1), (3, 1), (3, 2)], ["1問", "3問", "6問"], ["大きく", "ふつう", "たくさん"]):
        sheet(b, x - sw / 2, top, sw, sh, rows, cols, stacked=rows == 1)
        b.text(x, top + sh + 13, num, 13.5, TXT, 800)
        b.text(x, top + sh + 28, sub, 9.5, SUB, 500)
    b.paste(base)

    g = Panel(GX0, PY0, PX1, PY1, GREEN_BG)
    W = PX1 - GX0
    g.text(W / 2, 19, "点なしでも印刷できる", 15.5, GREEN_T, 800)
    pane, rowy = 38, [37, 84]
    for (y, label, dots) in zip(rowy, ["点あり", "点なし"], [True, False]):
        g.text(44, y + pane / 2, label, 11, GREEN_T if not dots else SUB, 800)
        x1 = 70
        g.rect(x1, y, x1 + pane, y + pane, fill=(255, 255, 255, 255), outline=LINE, width=0.7, r=2)
        g.problem(x1 + 7, y + 7, pane - 14, HOUSE, dots=dots, line_w=1.6, dot_r=1.3)
        g.arrow(x1 + pane + 12, y + pane / 2)
        x2 = x1 + pane + 24
        g.rect(x2, y, x2 + pane, y + pane, fill=(255, 255, 255, 255), outline=LINE, width=0.7, r=2)
        if dots:
            g.problem(x2 + 7, y + 7, pane - 14, HOUSE, dots=True, lines=False, dot_r=1.3)
    g.text(W / 2, 140, "形だけを見て、白紙に写す練習に。", 10.5, TXT, 700)
    g.paste(base)


def chip(p, x, y, label, sel, color, h=17, px=10.5, minw=0):
    w = max(minw, len(label) * px + 12)
    if sel:
        p.rect(x, y, x + w, y + h, fill=color + (255,), r=h / 2)
        p.text(x + w / 2, y + h / 2, label, px, (255, 255, 255), 800)
    else:
        p.rect(x, y, x + w, y + h, fill=(255, 255, 255, 255), outline=(190, 205, 222), width=0.8, r=h / 2)
        p.text(x + w / 2, y + h / 2, label, px, TXT, 600)
    return x + w + 4


def variant_b(base):
    """案B：設定を Web の画面と同じ言葉で並べる（2枚を1枚にまとめる）。"""
    ImageDraw.Draw(base).rectangle([(BX1 - 2) * K, (PY0 - 3) * K, (PX1 + 5) * K, (PY1 + 3) * K], fill=PAGE)
    p = Panel(PX0, PY0, PX1, PY1, BLUE_BG)
    W = PX1 - PX0
    p.text(14, 19, "問題数も点も、自分で選べる。", 15.5, BLUE_T, 800, anchor="lm")
    col = [14, W / 2 + 6]
    rows = [38, 86]
    items = [
        (col[0], rows[0], "1枚の問題数", [("1問", True), ("2問", False), ("3問", False), ("4問", False), ("6問", False)]),
        (col[1], rows[0], "背景の点", [("つける", False), ("とる（白紙）", True)]),
        (col[0], rows[1], "点の大きさ", None),
        (col[1], rows[1], "名前・日付の欄", [("つける", True), ("つけない", False)]),
    ]
    for x, y, label, chips in items:
        p.text(x, y + 6, label, 10.5, SUB, 700, anchor="lm")
        cx = x
        if chips is None:  # 点の大きさは点そのもので見せる
            for i, (lab, r) in enumerate([("小", 1.6), ("中", 2.4), ("大", 3.3)]):
                sel = i == 1
                w = 40
                p.rect(cx, y + 15, cx + w, y + 32, fill=(BLUE_T + (255,)) if sel else (255, 255, 255, 255),
                       outline=None if sel else (190, 205, 222), width=0.8, r=8.5)
                dc = (255, 255, 255) if sel else INK
                p.d.ellipse([(cx + 11 - r) * SS, (y + 23.5 - r) * SS, (cx + 11 + r) * SS, (y + 23.5 + r) * SS], fill=dc)
                p.text(cx + 26, y + 23.5, lab, 10.5, (255, 255, 255) if sel else TXT, 800 if sel else 600)
                cx += w + 4
        else:
            for lab, sel in chips:
                cx = chip(p, cx, y + 15, lab, sel, BLUE_T, minw=30)
    p.d.line([W / 2 * SS, 34 * SS, W / 2 * SS, 124 * SS], fill=(205, 220, 236), width=SS)
    p.text(W / 2, 143, "選んだとおりの紙面で、PDFを何度でも印刷できます。", 10.5, TXT, 700)
    p.paste(base)


for name, fn in (("A", variant_a), ("B", variant_b)):
    img = Image.open(f"{OUT}/base.png").convert("RGB")
    fn(img)
    img.save(f"{OUT}/cover-{name}.png")
