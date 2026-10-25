"""Shrink the reader PDFs of「はじめての点図形（点描写）」by subsetting their fonts (python scripts/subset-book-benefits.py).
Run after export-book-benefits.ts: that script embeds the full Japanese fonts (6-13 MB per file), which the hosting rejects
as a response over ~5.7 MB (HTTP 413). Subsetting is checked pixel-for-pixel against the original before it replaces it,
then the manifest hash and size are rewritten so preflight-book-benefits.py and check-book-http.ts keep matching."""
from pathlib import Path
import hashlib, json, sys
import fitz

ROOT=Path(__file__).resolve().parents[2]
MANIFEST=ROOT/'docs/drafts/kdp/series-1-hajimete/benefits-manifest.json'
PRIVATE=ROOT/'web/private/book-hajimete'
LIMIT=4*1024*1024  # well under the ~5.7 MB response limit
manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
for id,info in manifest['files'].items():
    path=PRIVATE/info['filename']
    if path.stat().st_size<=LIMIT:
        print(f'{id}: {path.stat().st_size//1024} KB, already small'); continue
    src=fitz.open(path); out=PRIVATE/(info['filename']+'.tmp')
    src.subset_fonts()
    src.save(out,garbage=4,deflate=True,deflate_fonts=True,use_objstms=1); src.close()
    a=fitz.open(path); b=fitz.open(out)
    if len(a)!=len(b): raise SystemExit(f'{id}: page count changed')
    for i in range(len(a)):
        if a[i].get_text()!=b[i].get_text(): raise SystemExit(f'{id} p{i+1}: text changed')
        pa=a[i].get_pixmap(dpi=110); pb=b[i].get_pixmap(dpi=110)
        if pa.samples!=pb.samples and sum(1 for x,y in zip(pa.samples,pb.samples) if abs(x-y)>8): raise SystemExit(f'{id} p{i+1}: rendering changed')
    a.close(); b.close()
    data=out.read_bytes()
    if len(data)>LIMIT: raise SystemExit(f'{id}: still {len(data)//1024} KB')
    out.replace(path)
    info['sha256']=hashlib.sha256(data).hexdigest(); info['bytes']=len(data)
    print(f"{id}: -> {len(data)//1024} KB")
MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
