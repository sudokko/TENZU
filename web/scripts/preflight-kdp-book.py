"""Inspect actual PDF objects, not drawing-time assertions.
python scripts/preflight-kdp-book.py [--out PATH] [--render]
Requires pypdf, pdfplumber, Pillow, and pdftoppm on PATH for --render.
"""
import argparse
import hashlib
import itertools
import json
import math
import re
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from pypdf.generic import ContentStream
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PT = 72 / 25.4
parser = argparse.ArgumentParser()
parser.add_argument("--out", type=Path, default=ROOT / "docs/drafts/kdp/first-patterns-216")
parser.add_argument("--render", action="store_true")
args = parser.parse_args()
out = args.out.resolve()
m = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
checks = []
checked_at = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d")


def check(name, ok, detail):
    checks.append({"check": name, "pass": bool(ok), "detail": detail})


def embedded(font):
    font = font.get_object()
    if "/DescendantFonts" in font:
        return all(embedded(f) for f in font["/DescendantFonts"])
    d = font.get("/FontDescriptor")
    return bool(d and any(d.get_object().get(k) for k in ("/FontFile", "/FontFile2", "/FontFile3")))


def gray(value):
    if value is None:
        return True
    v = value if isinstance(value, (tuple, list)) else (value,)
    return len(v) in (1, 3) and max(v) - min(v) < 1e-6 and (max(v) <= 0.900001 or min(v) >= 0.999999)


all_text = ""
stats = {}
guide_strokes = {}
guide_undashed = []
cover_names = tuple(name for name in ("cover-a", "cover", "cover-c") if name in m["pdfs"])
for name in ("interior", *cover_names, "three-per-page-preview"):
    filename = out / f"{name}.pdf"
    data = filename.read_bytes()
    check(f"{name}: manifest照合", hashlib.sha256(data).hexdigest() == m["pdfs"][name], "PDF SHA-256")
    reader = PdfReader(filename)
    check(f"{name}: ページ数", len(reader.pages) == (m["pageCount"] if name == "interior" else 1 if name in cover_names else 2), str(len(reader.pages)))
    check(f"{name}: ファイル容量", len(data) < 650 * 1024 * 1024, f"{len(data):,} bytes")
    check(f"{name}: 暗号化なし", not reader.is_encrypted, str(reader.is_encrypted))
    check(f"{name}: メタデータなし", not reader.metadata and not reader.trailer["/Root"].get("/Metadata"), "Info / XMP")
    fonts = set()
    unembedded = []
    sizes_bad, bounds_bad, thin, images, annotations, grayscale_bad, nonidentity = [], [], [], [], [], [], []
    strokes, dots, text_sizes = [], [], []
    colored_marks = 0
    extent = {"left": math.inf, "right": math.inf, "top": math.inf, "bottom": math.inf, "inside": math.inf}
    barcode_hits = []
    texts = []
    with pdfplumber.open(filename) as pdf:
        for i, (p, pp) in enumerate(zip(reader.pages, pdf.pages), 1):
            width, height = float(p.mediabox.width), float(p.mediabox.height)
            expected = (m["coverMm"]["width"], m["coverMm"]["height"]) if name in cover_names else (m["interiorMm"]["w"], m["interiorMm"]["h"])
            if abs(width / PT - expected[0]) > 0.01 or abs(height / PT - expected[1]) > 0.01 or p.get("/Rotate", 0): sizes_bad.append(i)
            if p.get("/Annots"): annotations.append(i)
            # This exporter uses only translation matrices (including circle placement).
            # Reject any scale/skew so pdfplumber linewidths remain valid in page points.
            for operands, op in ContentStream(p.get_contents(), reader).operations:
                if op == b"cm":
                    a, b, c, d, _, _ = map(float, operands)
                    if max(abs(a - 1), abs(d - 1), abs(b), abs(c)) > 1e-7: nonidentity.append(i)
            for f in p["/Resources"].get("/Font", {}).values():
                fd = f.get_object()
                fonts.add(str(fd.get("/BaseFont")))
                if not embedded(fd): unembedded.append(str(fd.get("/BaseFont")))
            if pp.images: images.append(i)
            page_text = pp.extract_text() or ""
            texts.append(page_text)
            all_text += page_text + "\n"
            if name == "interior":
                guides = [o for o in pp.lines if o.get("stroke")
                          and o.get("stroking_color") is not None
                          and all(abs(float(v) - 0.65) < 0.001 for v in
                                  (o["stroking_color"] if isinstance(o["stroking_color"], (tuple, list)) else (o["stroking_color"],)))]
                guide_strokes[i] = len(guides)
                if any(not o.get("dash") or len(o["dash"][0]) < 2 or min(o["dash"][0]) <= 0 for o in guides):
                    guide_undashed.append(i)
            margins = m["book"]["margins"]
            compact = (name == "interior" and m["pageKinds"][i - 1] == "problems") or name == "three-per-page-preview"
            l = (margins["inside"] if i % 2 else margins["outside"]) if name not in cover_names else 6.4
            r = (margins["outside"] if i % 2 else margins["inside"]) if name not in cover_names else 6.4
            t = (m["book"]["problemMargins"]["top"] if compact else margins["top"]) if name not in cover_names else 6.4
            btm = (m["book"]["problemMargins"]["bottom"] if compact else margins["bottom"]) if name not in cover_names else 6.4
            objects = pp.chars + pp.lines + pp.curves + pp.rects
            for o in objects:
                char = o["object_type"] == "char"
                stroke = bool(o.get("stroke", False))
                half = float(o.get("linewidth", 0)) / 2 if stroke else 0
                box = (o["x0"] - half, o["top"] - half, o["x1"] + half, o["bottom"] + half)
                # A full-bleed color field is expected on the front cover; text and linework
                # still have to stay inside the safe area.
                decorative_cover_rect = name == "cover" and o["object_type"] == "rect" and not stroke
                if not decorative_cover_rect and (box[0] < l * PT - .01 or box[1] < t * PT - .01 or box[2] > width - r * PT + .01 or box[3] > height - btm * PT + .01):
                    bounds_bad.append({"page": i, "type": o["object_type"], "boxMm": [round(v / PT, 3) for v in box]})
                for key, value in (("left", box[0]), ("right", width - box[2]), ("top", box[1]), ("bottom", height - box[3]), ("inside", box[0] if i % 2 else width - box[2])):
                    extent[key] = min(extent[key], value / PT)
                if stroke:
                    lw = float(o["linewidth"])
                    strokes.append(lw)
                    if lw + 1e-6 < m["book"]["minLineMm"] * PT: thin.append({"page": i, "pt": lw})
                    if not gray(o.get("stroking_color")):
                        if name == "cover": colored_marks += 1
                        else: grayscale_bad.append(i)
                if char:
                    text_sizes.append(o["size"])
                elif o.get("fill"):
                    dots.append(min(o["width"], o["height"]) / PT)
                if (char or o.get("fill")) and not gray(o.get("non_stroking_color")):
                    if name == "cover": colored_marks += 1
                    else: grayscale_bad.append(i)
                if name in cover_names:
                    bc = m["coverMm"]["barcodeBlank"]
                    q = [bc["x"] * PT, bc["y"] * PT, (bc["x"] + bc["width"]) * PT, (bc["y"] + bc["height"]) * PT]
                    if box[0] < q[2] and box[2] > q[0] and box[1] < q[3] and box[3] > q[1]: barcode_hits.append(o["object_type"])
    check(f"{name}: ページ寸法", not sizes_bad, f"{expected[0]:.3f} × {expected[1]:.3f} mm; 異常ページ {sizes_bad}")
    check(f"{name}: 埋め込みフォント", not unembedded and bool(fonts), ", ".join(sorted(fonts)))
    check(f"{name}: ベクターのみ", not images, f"ラスター画像のあるページ {images}")
    check(f"{name}: 注釈なし", not annotations, str(annotations))
    check(f"{name}: 拡縮・傾斜CTMなし", not nonidentity, str(sorted(set(nonidentity))))
    check(f"{name}: 線幅", not thin, f"最小 {min(strokes):.4f} pt ({min(strokes) / PT:.4f} mm)" if strokes else "線分なし")
    check(f"{name}: 点の直径", not dots or min(dots) >= 0.3 - 1e-6, f"最小 {min(dots):.4f} mm" if dots else "点なし")
    check(f"{name}: 文字サイズ", min(text_sizes) >= 7, f"最小 {min(text_sizes):.2f} pt")
    if name == "cover":
        check("cover: フルカラー使用", colored_marks > 0, f"色付きオブジェクト {colored_marks}")
    else:
        check(f"{name}: グレースケール・濃度10%以上", not grayscale_bad, str(sorted(set(grayscale_bad))))
    check(f"{name}: 余白内", not bounds_bad, json.dumps(bounds_bad[:12], ensure_ascii=False) if bounds_bad else "全文字・線・点の外接矩形＋線幅の半分を検査")
    if name in cover_names: check(f"{name}: バーコード用空白", not barcode_hits, f"裏表紙下部43 mm全幅を空白に確保: {len(barcode_hits)} objects")
    if name == "cover":
        check("cover: 年齢・段階・初心者向け", all(s in texts[0] for s in ("4才〜6才向け", "はじめての子も、Lv.1から。", "Lv.1からLv.3へ", "Lv.1", "Lv.2", "Lv.3")), "表表紙の文字を抽出して照合")
    stats[name] = {"minLinePt": min(strokes) if strokes else None, "minFontPt": min(text_sizes), "clearanceMm": extent, "fonts": sorted(fonts)}
    if name == "interior":
        missing = []
        for q in m["questions"]:
            if f'{q["number"]}ばん' not in texts[q["page"] - 1]: missing.append([q["number"], "page"])
            if q["answerPage"] is not None and f'第{q["number"]}問' not in texts[q["answerPage"] - 1]:
                missing.append([q["number"], "answerPage"])
        check(f"全{len(m['questions'])}問: 本文・完成図の番号", not missing, str(missing))
        progress_missing = []
        for q in m["questions"]:
            page_text = re.sub(r"\s+", "", texts[q["page"] - 1])
            if f'{q["number"]}ばん（{q["sourceIndex"] + 1}／12）' not in page_text:
                progress_missing.append(q["number"])
        check("全設問: Lv内の進み具合（1／12〜12／12）", not progress_missing, str(progress_missing))
        answer_refs_missing = [q["number"] for q in m["questions"] if q["answerPage"] is not None
                               and f'こたえ{q["answerPage"]}ページ' not in re.sub(r"\s+", "", texts[q["page"] - 1])]
        check("答えのある設問: 参照ページを表示", not answer_refs_missing, str(answer_refs_missing))
        copy_ref_pages = sorted({q["page"] for q in m["questions"] if q["answerPage"] is None})
        check("模写・欠け補完・立体: 答えの参照表示なし", all("こたえ" not in re.sub(r"\s+", "", texts[pn - 1]) for pn in copy_ref_pages), str(copy_ref_pages))
        index_text = re.sub(r"\s+", "", texts[2])
        headers_missing = []
        for vi in range(len(m["book"]["skus"])):
            qs = [q for q in m["questions"] if q["volumeIndex"] == vi]
            q = qs[0]
            bits = (f'{q["number"]}〜{qs[-1]["number"]}問', f'{q["page"]}〜{qs[-1]["page"]}ページ')
            if any(bit not in index_text for bit in bits): headers_missing.append(vi)
        check(f"全{len(m['book']['skus'])}巻: 目次の問番号・掲載頁", not headers_missing, str(headers_missing))
        check("2ページ目: お子さんに合わせた進め方", "この本の進め方" in texts[1] and "お子さんの今に合わせて" in texts[1], "課題を選ぶ目安を記載")
        check("3ページ目: 課題別の表", m["pageKinds"].count("index") == 1 and all(s in index_text for s in ("もくじ", "Lv.1", "Lv.2", "Lv.3", "3×3", "4×4", "9×9")), "9課題・Lv.1〜3・盤面を1ページに表示")
        ordered_tasks = [q["taskSlug"] for q in m["questions"] if q["sourceIndex"] == 0]
        grouped_tasks = [task for task, _ in itertools.groupby(ordered_tasks)]
        check("問題は課題の種類ごと", len(grouped_tasks) == len(set(grouped_tasks)) == 9, str(ordered_tasks))
        check("本文・表紙にD表記なし", "難易度" not in all_text and not re.search(r"(?<![A-Z0-9])D(?![A-Z0-9])", all_text), "Dは出典manifestにのみ保持")
        check("不要な完成図の省略", all((q["answerPage"] is None) == (q["taskSlug"] in m["book"]["omitAnswerTasks"]) for q in m["questions"]), str(m["book"]["omitAnswerTasks"]))
        answer_questions = [q for q in m["questions"] if q["answerPage"] is not None]
        check("巻末の答え: 144問・12ページ", len(answer_questions) == m["answerCount"] == 144 and m["pageKinds"].count("answers") == 12, f'{len(answer_questions)}問、{m["pageKinds"].count("answers")}ページ')
        check("各課題の直前に説明", len(m["introductionPages"]) == 9 and all(m["pageKinds"][int(p) - 1] == "explanations" and m["pageKinds"][int(p)] == "problems" for p in m["introductionPages"].values()), str(m["introductionPages"]))
        guide_missing = []
        for vi, pn in m["introductionPages"].items():
            task = next(q["taskSlug"] for q in m["questions"] if q["volumeIndex"] == int(vi))
            if re.sub(r"\s+", "", m["guideNotes"][task]) not in re.sub(r"\s+", "", texts[pn - 1]) or guide_strokes.get(pn, 0) < 1:
                guide_missing.append({"task": task, "page": pn, "strokes": guide_strokes.get(pn, 0)})
        check("9課題の書き方説明と灰色点線見本", not guide_missing, str(guide_missing))
        child_copy_bad = []
        for pn in m["introductionPages"].values():
            page_text = texts[pn - 1]
            child_text = page_text.partition("れいだい")[2].partition("おうちの方へ")[0]
            if not child_text or "おうちの方へ" not in page_text or "しつもん" not in child_text or "かいとう" not in child_text or re.search(r"[一-龯]", child_text):
                child_copy_bad.append(pn)
        check("やり方: 親子の説明を分け、子ども欄は漢字なし", not child_copy_bad, str(child_copy_bad))
        stray_guides = [pn for pn, count in guide_strokes.items() if count and pn not in m["introductionPages"].values()]
        check("灰色点線見本は解説ページのみ", not stray_guides, str(stray_guides))
        check("見本の灰色線はすべて点線", not guide_undashed, str(guide_undashed))
        level_missing = []
        regions = {r["volumeIndex"]: r for r in m.get("levelColumnRegions", [])}
        with pdfplumber.open(out / "interior.pdf") as interior:
            for vi, sku in enumerate(m["book"]["skus"]):
                region = regions.get(vi)
                if not region:
                    level_missing.append(sku)
                    continue
                note = re.sub(r"\s+", "", m["levelNotes"][sku])
                p = interior.pages[region["page"] - 1]
                crop = p.crop((region["x"] * PT, region["y"] * PT,
                               (region["x"] + region["width"]) * PT,
                               (region["y"] + region["height"]) * PT))
                if note not in re.sub(r"\s+", "", crop.extract_text() or ""):
                    level_missing.append(sku)
        check("各課題のやり方ページにLv別説明", not level_missing, str(level_missing))
        range_missing = []
        for vi, sku in enumerate(m["book"]["skus"]):
            qs = [q for q in m["questions"] if q["volumeIndex"] == vi]
            first_task_vi = next(int(k) for k in m["introductionPages"] if next(q for q in m["questions"] if q["volumeIndex"] == int(k))["taskSlug"] == qs[0]["taskSlug"])
            pn = m["introductionPages"][str(first_task_vi)]
            label = f'Lv.{qs[0]["level"]}（{qs[0]["page"]}P〜{qs[-1]["page"]}P）'
            if label not in re.sub(r"\s+", "", texts[pn - 1]): range_missing.append(sku)
        check("全18巻: レベルの横に問題ページ範囲", not range_missing, str(range_missing))
        aim_missing = [pn for pn in m["introductionPages"].values() if "この課題のめあて" not in texts[pn - 1]]
        check("9課題: めあてを表示", not aim_missing, str(aim_missing))
        transition_missing = []
        for vi in range(1, len(m["book"]["skus"])):
            current = [q for q in m["questions"] if q["volumeIndex"] == vi]
            previous = [q for q in m["questions"] if q["volumeIndex"] == vi - 1]
            if current[0]["taskSlug"] != previous[0]["taskSlug"]:
                continue
            from_lv, to_lv = previous[0]["level"], current[0]["level"]
            farewell = f'レベル{from_lv}はここまで、おつかれさま＾＾つぎからはレベル{to_lv}だよ！'
            # The printed transition uses Japanese full-width digits.
            farewell = farewell.translate(str.maketrans("123", "１２３"))
            previous_text = re.sub(r"\s+", "", texts[previous[-1]["page"] - 1])
            next_text = re.sub(r"\s+", "", texts[current[0]["page"] - 1])
            if farewell not in previous_text or f'レベル{str(to_lv).translate(str.maketrans("123", "１２３"))}' not in next_text:
                transition_missing.append([previous[-1]["page"], current[0]["page"]])
        check("同じ課題のLv切り替え: 案Bと1行の声かけ", not transition_missing, str(transition_missing))
        level3_missing = []
        for vi, sku in enumerate(m["book"]["skus"]):
            qs = [q for q in m["questions"] if q["volumeIndex"] == vi]
            if qs[0]["level"] == 3 and "レベル３はここまで、おつかれさま＾＾がんばったね！" not in re.sub(r"\s+", "", texts[qs[-1]["page"] - 1]):
                level3_missing.append([sku, qs[-1]["page"]])
        check("全9課題: Lv.3の最終ページに声かけ", not level3_missing, str(level3_missing))
        han_bad = []
        grid_bad = []
        for pn, kind in enumerate(m["pageKinds"], 1):
            if kind != "problems": continue
            if re.search(r"[一-龯]", re.sub(r"^.*?\n", "", texts[pn - 1])): han_bad.append(pn)
            if any(grid in texts[pn - 1] for grid in ("3×3", "4×4", "9×9")): grid_bad.append(pn)
        check("設問本文: 漢字なし", not han_bad, str(han_bad))
        check("設問ページ: 盤面サイズ表示なし", not grid_bad, str(grid_bad))
        check("改ページ: 予定との一致", len(m["pageKinds"]) == len(texts) == m["pageCount"] and len(texts) <= 110 and len(texts) % 2 == 0, f'{m["pageCount"]} pages')

changed = [s["file"] for s in m["sources"] if hashlib.sha256((ROOT / s["file"]).read_bytes()).hexdigest() != s["sha256"]]
check("出典JSON: ハッシュ一致", not changed, str(changed))
check("収録: 重複なし", len({q["sourceId"] for q in m["questions"]}) == len(m["questions"]) == len(m["book"]["skus"]) * 12, f"{len(m['book']['skus'])}巻×12問")
cover_sources = [json.loads((ROOT / f'web/app/products/problems/published/{s["sku"]}.json').read_text(encoding="utf-8"))["problems"][s["sourceIndex"]]["id"] == s["sourceId"] for s in m.get("coverSamples", [])]
if cover_names:
    check("旧比較表紙: 9課題の実問題", len(cover_sources) == 9 and all(cover_sources) and len({s["task"] for s in m["coverSamples"]}) == 9, "各枠の出典SKU・問題IDをmanifestで照合")
check("D: 元データ照合", all(json.loads((ROOT / f'web/app/products/problems/published/{q["sku"]}.json').read_text(encoding="utf-8"))["problems"][q["sourceIndex"]]["difficulty"]["value"] == q["difficulty"] for q in m["questions"]), "difficulty.valueは出典照合用manifestに保持")
forbidden = ["診断", "治療", "処方箋", "特効薬", "弱点", "穴を埋める", "鍛える", "修行", "叩き込む", "遊び方", "あそびかた", "®", "™"]
found = [w for w in forbidden if w in all_text]
check("本文・表紙: 禁止表現", not found, str(found))
listing = out / "listing.md"
if not listing.exists():
    listing = out.parent / "listing.md"
listing_found = [w for w in forbidden if listing.exists() and w in listing.read_text(encoding="utf-8")]
check("商品ページ下書き: 禁止表現", listing.exists() and not listing_found, str(listing_found))
urls = re.findall(r"(?:https?://|www\.)\S+|[a-zA-Z0-9-]+\.(?:jp|com|net|org)(?:/\S*)?", all_text)
check("本文・表紙: URL", set(urls) <= {"tenzu.jp", "tenzu.jp/products", "tenzu.jp/makers", "tenzu.jp/book/216", "tenzu.jp/contact"}, str(urls))
check("購入者特典: 仮表示・固定期限なし", not any(s in all_text for s in ("仮URL", "特典URL用", "2026年12月31日")), "採用本文の特典案内")
check("日本語テキスト抽出", "点図形（点描写）" in all_text and "もくじ" in all_text and "\ufffd" not in all_text, "埋め込みフォントのToUnicode確認")
qr_source = out / "qr-products-source.png"
if not qr_source.exists():
    qr_source = out.parent / "qr-products-source.png"
qr_code = (ROOT / "web/scripts/kdp/qr-products.ts").read_text(encoding="utf-8")
qr_rows = re.findall(r'"([01]{25})"', qr_code)
if qr_source.exists():
    with Image.open(qr_source) as im:
        original = im.convert("L")
        expected_qr = ["".join("1" if original.getpixel((21 + c * 6, 21 + r * 6)) < 128 else "0" for c in range(25)) for r in range(25)]
    qr_ok = original.size == (186, 186) and hashlib.sha256(qr_source.read_bytes()).hexdigest() == "2ca9f48fcb207c1460d47e2ec45661347c8ee059854013f17f7e6355de445ba1" and qr_rows == expected_qr
else:
    qr_ok = False
check("巻末QR: 添付元画像とベクター升目の一致", qr_ok, "25×25升目と元画像SHA-256を照合")

if args.render:
    render_dir = out / "pages"
    render_dir.mkdir(exist_ok=True)
    # Only generated files in these exact output directories; no recursive deletion.
    for folder, pattern in ((render_dir, "page-*.png"), (out, "detail-*.png"), (out, "contact-*.png"), (out, "trial-*.png")):
        for old in folder.glob(pattern):
            if old.is_file() and old.resolve().parent == folder.resolve():
                old.unlink()
    subprocess.run(["pdftoppm", "-r", "90", "-png", str(out / "interior.pdf"), str(render_dir / "page")], check=True, capture_output=True)
    for name in cover_names:
        preview = "cover-preview" if name == "cover" else f"{name}-preview"
        subprocess.run(["pdftoppm", "-r", "120", "-singlefile", "-png", str(out / f"{name}.pdf"), str(out / preview)], check=True, capture_output=True)
    cover_sheet = Image.new("RGB", (3 * 900, 1330), "#e8e8e8")
    cover_draw = ImageDraw.Draw(cover_sheet)
    for i, name in enumerate(cover_names):
        preview = "cover-preview" if name == "cover" else f"{name}-preview"
        with Image.open(out / f"{preview}.png") as im:
            # Crop the front from the full wrap, retaining outer bleed for comparison.
            cut = round(im.width * (m["coverMm"]["bleed"] + m["interiorMm"]["w"] + m["coverMm"]["spine"]) / m["coverMm"]["width"])
            front = im.crop((cut, 0, im.width, im.height))
            if name == "cover":
                front.save(out / "cover-front-preview.png")
            front.thumbnail((840, 1230))
            cover_sheet.paste(front, (i * 900 + (900 - front.width) // 2, 42))
            cover_draw.text((i * 900 + 30, 10), ("A  /  大きな見本", "B  /  9つの課題", "C  /  3段階")[i], fill="black")
    if cover_names:
        cover_sheet.save(out / "cover-options.png")
    paths = sorted(render_dir.glob("page-*.png"))
    paths = [p for p in paths if int(p.stem.split("-")[-1]) <= m["pageCount"]]
    check("全ページ画像", len(paths) == m["pageCount"], str(len(paths)))
    for batch_start in range(0, len(paths), 40):
        batch = paths[batch_start:batch_start + 40]
        sheet = Image.new("RGB", (5 * 204, math.ceil(len(batch) / 5) * 302), "#e8e8e8")
        draw = ImageDraw.Draw(sheet)
        for i, p in enumerate(batch):
            with Image.open(p) as im:
                im.thumbnail((190, 268))
                x, y = (i % 5) * 204 + 7, (i // 5) * 302 + 7
                sheet.paste(im, (x, y))
                draw.text((x + 3, y + 271), f"p.{batch_start + i + 1}", fill="black")
        sheet.save(out / f"contact-{batch_start + 1:03}-{batch_start + len(batch):03}.png")
    subprocess.run(["pdftoppm", "-r", "150", "-png", str(out / "three-per-page-preview.pdf"), str(out / "trial")], check=True, capture_output=True)
    detail_pages = {1, 2, 3, m["pageCount"], m["pageCount"] - 1, m["answerStart"]}
    detail_pages.update(int(p) for p in m["introductionPages"].values())
    detail_pages.update(q["page"] for q in m["questions"] if q["sourceIndex"] == 0)
    transition_pairs = []
    for vi in range(1, len(m["book"]["skus"])):
        previous = [q for q in m["questions"] if q["volumeIndex"] == vi - 1]
        current = [q for q in m["questions"] if q["volumeIndex"] == vi]
        if previous[0]["taskSlug"] == current[0]["taskSlug"]:
            transition_pairs.append((previous[-1]["page"], current[0]["page"]))
            detail_pages.add(previous[-1]["page"])
    for pn in sorted(detail_pages):
        subprocess.run(["pdftoppm", "-f", str(pn), "-l", str(pn), "-r", "150", "-singlefile", "-png", str(out / "interior.pdf"), str(out / f"detail-{pn:03}")], check=True, capture_output=True)
    transition_sheet = Image.new("RGB", (3 * 354, 3 * 276), "#e8e8e8")
    transition_draw = ImageDraw.Draw(transition_sheet)
    for i, (last_pn, first_pn) in enumerate(transition_pairs):
        xx, yy = (i % 3) * 354 + 5, (i // 3) * 276 + 5
        for side, pn in enumerate((last_pn, first_pn)):
            with Image.open(out / f"detail-{pn:03}.png") as im:
                im.thumbnail((165, 235))
                transition_sheet.paste(im, (xx + side * 172, yy))
        transition_draw.text((xx, yy + 240), f"p.{last_pn} -> p.{first_pn}", fill="black")
    transition_sheet.save(out / "level-transition-contact.png")
    intro_sheet = Image.new("RGB", (3 * 390, 3 * 570), "#e8e8e8")
    intro_draw = ImageDraw.Draw(intro_sheet)
    for j, pn in enumerate(m["introductionPages"].values()):
        with Image.open(out / f"detail-{pn:03}.png") as im:
            im.thumbnail((370, 525))
            xx, yy = (j % 3) * 390 + 10, (j // 3) * 570 + 10
            intro_sheet.paste(im, (xx, yy))
            intro_draw.text((xx + 3, yy + 530), f"p.{pn}", fill="black")
    intro_sheet.save(out / "intro-contact.png")

result = {"pass": all(c["pass"] for c in checks), "checkedAt": checked_at, "stats": stats, "checks": checks}
(out / "preflight.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
lines = ["# KDP 入稿前検査", "", f'確認日: {checked_at} / 機械検査: {"PASS" if result["pass"] else "FAIL"}', "", "検査対象は書き出されたPDFです。余白は描画オブジェクトの座標と文字外接矩形から検査し、線端の太さも含めます。拡縮CTMは拒否するため、線幅を座標変換で誤判定しません。文字の字形自体の細い画線は線幅判定の対象外です。", "", "| 検査 | 結果 | 実測・内容 |", "|---|---|---|"]
lines += [f'| {c["check"]} | {"PASS" if c["pass"] else "FAIL"} | {c["detail"]} |' for c in checks]
lines += ["", "## 実測最小余白", ""]
for name, st in stats.items(): lines.append(f'- {name}: ' + ", ".join(f"{k} {v:.2f} mm" for k, v in st["clearanceMm"].items()))
lines += ["", "## 目視確認と公式基準", "", "目視記録は [visual-review.md](visual-review.md)、確認したKDP基準と未確認事項は [kdp-sources.md](../kdp-sources.md) を参照。購入者特典PDFの検査は [benefits-preflight.json](benefits-preflight.json) を参照。表紙はオーナー制作で、この本文検査の対象外。", "", "[本文PDF](interior.pdf)", "", f"全ページ一覧: [1〜40](contact-001-040.png) / [41〜80](contact-041-080.png) / [81〜{m['pageCount']}](contact-081-{m['pageCount']:03}.png)", "", "再現手順は [README.md](README.md) を参照。KDP側の印刷プレビューと実製本の開き具合はこの機械検査では確認できません。"]
if (out / "kdp-sources.md").exists():
    lines = [s.replace("(../kdp-sources.md)", "(kdp-sources.md)") for s in lines]
if not (out / "benefits-preflight.json").exists():
    lines = [s.replace("[benefits-preflight.json](benefits-preflight.json)", "購入者特典PDFの検査は未実行") for s in lines]
(out / "preflight.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(json.dumps({"pass": result["pass"], "failed": [c for c in checks if not c["pass"]]}, ensure_ascii=True))
raise SystemExit(0 if result["pass"] else 1)
