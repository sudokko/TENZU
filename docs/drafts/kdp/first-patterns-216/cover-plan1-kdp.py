"""採用表紙（案1・A）を KDP 入稿用の1枚の PDF に組む。
cover-plan1-redraw.py を K=3 で書き出した画像から裏・表を切り出し、B5（182×257mm）の仕上がりへ合わせて
300dpi に置く。背（108ページ・白い紙＝6.1776mm）は元画像の背が太すぎるため、ここで描き直す。
使い方: python cover-plan1-kdp.py <redraw の K=3 出力 cover-A.png> <outdir>"""
import io, sys
import fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1:3]
K = 3
DPI = 300
TRIM_W, TRIM_H, BLEED = 182.0, 257.0, 3.2
SPINE = 108 * 0.0572
MM = 72 / 25.4
px = lambda mm: round(mm / 25.4 * DPI)

PAGE = (254, 253, 249)
SPINE_BG = (254, 254, 252)
CAP = (243, 98, 83)
INK = (20, 20, 20)
FONT = "C:/Windows/Fonts/NotoSansJP-VF.ttf"

# 元画像（1536×1024）での位置
BACK_X = (0, 738)
FRONT_X = (796, 1536)
BARCODE_BOX = (497, 900, 727, 1019)  # 生成画像のバーコード欄の枠と文字（KDP が自分で置くので消す）
CAP_TOP, CAP_BOTTOM = 39, 890

hi = Image.open(SRC).convert("RGB")
assert hi.size == (1536 * K, 1024 * K), hi.size
ImageDraw.Draw(hi).rectangle([v * K for v in BARCODE_BOX], fill=PAGE)


def panel(x0, x1, outer):
    """切り出し → 仕上がり寸法へ → 外側・上下に塗り足し（端の折り返し）。"""
    art = hi.crop((x0 * K, 0, x1 * K, hi.height)).resize((px(TRIM_W), px(TRIM_H)), Image.LANCZOS)
    b = px(BLEED)
    side = (b, 0) if outer == "left" else (0, b)
    return Image.fromarray(np.pad(np.asarray(art), ((b, b), side, (0, 0)), mode="reflect"))


back = panel(*BACK_X, "left")
front = panel(*FRONT_X, "right")


def font(size, w):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([w])
    return f


def spine():
    """背：上下の赤い帯・TENZU・短い赤線・題名（縦・全部黒・同じ大きさ）。文字は左右 1.6mm 以上あける。"""
    W, H = px(SPINE), px(TRIM_H + BLEED * 2)
    SS = 4
    img = Image.new("RGB", (W * SS, H * SS), SPINE_BG)
    d = ImageDraw.Draw(img)
    y_mm = lambda src_y: BLEED + src_y / 1024 * TRIM_H  # 元画像の y → 塗り足し込みの mm
    d.rectangle([0, 0, W * SS, px(y_mm(CAP_TOP)) * SS], fill=CAP)
    d.rectangle([0, px(y_mm(CAP_BOTTOM)) * SS, W * SS, H * SS], fill=CAP)
    cx = W * SS / 2

    # TENZU（横倒し・上から下へ読む）
    t = Image.new("RGBA", (px(14) * SS, px(4) * SS), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((t.width / 2, t.height / 2), "T E N Z U", font=font(px(2.5) * SS, 600),
                           fill=INK + (255,), anchor="mm")
    t = t.rotate(-90, expand=True)
    top = px(BLEED + 20) * SS
    img.paste(t, (round(cx - t.width / 2), top), t)
    y = top + t.height + px(4) * SS
    d.line([cx, y, cx, y + px(6) * SS], fill=CAP, width=round(px(0.35) * SS))
    y += px(6) * SS + px(5) * SS

    em = px(2.9) * SS  # 文字幅 2.9mm（背 6.18mm − 左右 1.6mm）
    f = font(round(em * 0.94), 900)
    for ch in "はじめての点図形（点描写）":
        paren = ch in "（）"
        adv = em * 0.62 if paren else em
        g = Image.new("RGBA", (em, em), (0, 0, 0, 0))
        ImageDraw.Draw(g).text((em / 2, em / 2), ch, font=f, fill=INK + (255,), anchor="mm")
        if paren:
            g = g.rotate(-90, resample=Image.BICUBIC)
        img.paste(g, (round(cx - em / 2), round(y - (em - adv) / 2)), g)
        y += adv
    return img.resize((W, H), Image.LANCZOS)


sp = spine()

full_w = TRIM_W * 2 + SPINE + BLEED * 2
full_h = TRIM_H + BLEED * 2
doc = fitz.open()
page = doc.new_page(width=full_w * MM, height=full_h * MM)


def put(img, x0_mm, w_mm):
    buf = io.BytesIO()
    img.save(buf, format="PNG", dpi=(DPI, DPI))
    page.insert_image(fitz.Rect(x0_mm * MM, 0, (x0_mm + w_mm) * MM, full_h * MM), stream=buf.getvalue(),
                      keep_proportion=False)


put(back, 0, BLEED + TRIM_W)
put(sp, BLEED + TRIM_W, SPINE)
put(front, BLEED + TRIM_W + SPINE, TRIM_W + BLEED)
doc.set_metadata({})
doc.save(f"{OUT}/cover-plan1-kdp.pdf", garbage=4, deflate=True)

preview = Image.new("RGB", (back.width + sp.width + front.width, back.height), "white")
preview.paste(back, (0, 0)); preview.paste(sp, (back.width, 0)); preview.paste(front, (back.width + sp.width, 0))
preview.resize((preview.width // 3, preview.height // 3), Image.LANCZOS).save(f"{OUT}/cover-plan1-kdp-preview.png")
print({"coverMm": [round(full_w, 4), round(full_h, 4)], "spineMm": round(SPINE, 4),
       "pixels": {"back": back.size, "spine": sp.size, "front": front.size}})
