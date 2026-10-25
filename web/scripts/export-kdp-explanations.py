"""Extract the nine task-introduction pages from the current KDP interior PDF.

Run from web/: python scripts/export-kdp-explanations.py
The source pages are copied as PDF pages, so fonts and vector drawings stay intact.
"""

import hashlib
import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/drafts/kdp/first-patterns-216"
manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
source = OUT / "interior.pdf"
if hashlib.sha256(source.read_bytes()).hexdigest() != manifest["pdfs"]["interior"]:
    raise SystemExit("interior.pdf does not match manifest.json")

pages = [index + 1 for index, kind in enumerate(manifest["pageKinds"]) if kind == "explanations"]
if len(pages) != 9 or sorted(map(int, manifest["introductionPages"].values())) != pages:
    raise SystemExit(f"Unexpected task-introduction pages: {pages}")

reader = PdfReader(source)
writer = PdfWriter()
for number in pages:
    writer.add_page(reader.pages[number - 1])

target = OUT / "task-explanations.pdf"
with target.open("wb") as file:
    writer.write(file)
print(f"Wrote {target}: {len(pages)} pages from interior pages {pages}")
