"""Validate and render the reader PDFs of「はじめての点図形（点描写）」(python scripts/preflight-book-benefits.py [--skip-reader-render])."""
from pathlib import Path
import hashlib, json, re, subprocess, sys
from pypdf import PdfReader
from PIL import Image, ImageDraw
import pdfplumber

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/drafts/kdp/series-1-hajimete'
PRIVATE=ROOT/'web/private/book-hajimete'
PT=72/25.4
TOTAL=144
manifest=json.loads((OUT/'benefits-manifest.json').read_text(encoding='utf-8'))
checks=[]
def check(name,ok,detail=''):
    checks.append(dict(check=name,passed=bool(ok),detail=detail))
def embedded(font):
    f=font.get_object()
    if '/DescendantFonts' in f:return all(embedded(x) for x in f['/DescendantFonts'])
    descriptor=f.get('/FontDescriptor')
    return bool(descriptor and any(descriptor.get_object().get(k) for k in ('/FontFile','/FontFile2','/FontFile3')))
def page_fonts(reader):
    # Designed pages arrive as form XObjects, so fonts are collected from nested resources too.
    seen=[]
    def walk(res):
        if not res:return
        obj=lambda v: v.get_object() if hasattr(v,'get_object') else v
        res=obj(res)
        for f in obj(res.get('/Font',{})).values():seen.append(f)
        for x in obj(res.get('/XObject',{})).values():
            x=x.get_object()
            if x.get('/Subtype')=='/Form':walk(x.get('/Resources'))
    for p in reader.pages:walk(p.get('/Resources'))
    return seen
for src in manifest['sources']:
    check(f"source {src['sku']}",hashlib.sha256((ROOT/src['file']).read_bytes()).hexdigest()==src['sha256'])
for id,info in manifest['files'].items():
    file=PRIVATE/info['filename']; reader=PdfReader(file)
    check(f'{id} hash',hashlib.sha256(file.read_bytes()).hexdigest()==info['sha256'])
    check(f'{id} pages',len(reader.pages)==info['pages'])
    check(f'{id} fonts embedded',all(embedded(f) for f in page_fonts(reader)))
    expected=info.get('numbers'); extracted=[];bad=[]
    with pdfplumber.open(file) as pdf:
        for pn,p in enumerate(pdf.pages,1):
            check(f'{id} p{pn} A4',abs(p.width-210*PT)<.01 and abs(p.height-297*PT)<.01)
            if expected is None:continue  # the sheets are the book's designed pages, checked with the book
            t=p.extract_text() or ''
            extracted.extend(map(int,re.findall(r'(\d+)ばん',t)))
            check(f'{id} p{pn} text',bool(t) and '�' not in t)
            for c in p.chars:
                if c['size']<7.49 or c['x0']<12*PT or c['x1']>198*PT or c['top']<8*PT or c['bottom']>287*PT:bad.append((pn,c['text']))
    if expected is not None:
        check(f'{id} numbers',extracted==expected,{'count':len(extracted)})
        check(f'{id} typography',not bad,str(bad[:10]))
    folder=OUT/'reader-review'/id;folder.mkdir(parents=True,exist_ok=True)
    if '--skip-reader-render' not in sys.argv:
        subprocess.run(['pdftoppm','-scale-to','600','-png',str(file),str(folder/'page')],check=True,capture_output=True)
    pngs=sorted(folder.glob('page-*.png'));rows=max(1,(len(pngs)+7)//8)
    sheet=Image.new('RGB',(8*160,rows*237),'#e9e9e9');draw=ImageDraw.Draw(sheet)
    for i,png in enumerate(pngs):
        with Image.open(png) as im:
            im.thumbnail((150,212));x=(i%8)*160+5;y=(i//8)*237+3;sheet.paste(im,(x,y));draw.text((x,y+215),f'{id} p{i+1}',fill='black')
    sheet.save(OUT/f'reader-contact-{id}.png')
check(f'{TOTAL} questions',manifest['files']['all']['numbers']==list(range(1,TOTAL+1)))
check('たす+うつす coverage',sorted(manifest['files']['fill']['numbers']+manifest['files']['copy']['numbers'])==list(range(1,TOTAL+1)))
report={'passed':all(c['passed'] for c in checks),'checks':checks}
(OUT/'benefits-preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':report['passed'],'checks':len(checks),'failed':[c for c in checks if not c['passed']]},ensure_ascii=True))
raise SystemExit(0 if report['passed'] else 1)
