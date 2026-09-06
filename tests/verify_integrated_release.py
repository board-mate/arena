#!/usr/bin/env python3
from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def need(cond,msg):
    if not cond:
        errors.append(msg)

def read(rel):
    return (ROOT/rel).read_text(encoding='utf-8')

config=read('config.js')
need('supabaseUrl: ""' not in config, 'config.js supabaseUrl is blank')
need('supabaseAnonKey: ""' not in config, 'config.js supabaseAnonKey is blank')
need('service_role' not in config.lower(), 'config.js must not contain a service_role key')

multi=read('multi-common.js')
need("state_changed" in multi, 'Realtime state_changed broadcast missing')
need("options.interval||10000" in multi, '10s polling fallback missing')
need("payload:{revision:Number(revision)}" in multi.replace(' ',''), 'Broadcast revision-only payload missing')

app=read('app.js')
need('fantasyrealms' in app, 'Fantasy Realms missing from app.js')
need("포크노바 β" in app, 'Porknova beta/development label missing')
need("파워그리드 독일 β" in app, 'Power Grid Germany multiplayer entry missing')
need('solo-powergrid.html' not in app, 'Power Grid must not appear in solo library')

cal=read('online-calico.html')
need('boardFitShell' in cal and 'calico-mobile-board-fit' in cal, 'Calico mobile fit layer missing')
need(".board-viewport{overflow:hidden" in cal, 'Calico mobile overflow override missing')
need('repair-invalid-cat-tokens' in cal, 'Calico V8 repair hook missing')
need('EDGE_CATALOG_VERSION=7' in cal, 'Calico static edge catalog missing')
start=cal.find('const CALICO_EDGE_CATALOG')
end=cal.find('function validateEmbeddedEdgeCatalog',start)
need(start>=0 and end>start, 'Calico edge catalog block missing')
if start>=0 and end>start:
    catalog=cal[start:end]
    for board in ('blue','green','purple','yellow'):
        m=re.search(rf'{board}:Object\.freeze\(\{{(.*?)\}}\)',catalog,re.S)
        need(bool(m), f'Calico {board} edge catalog missing')
        if m:
            keys=re.findall(r"'(-?\d+,-?\d+)'\s*:",m.group(1))
            need(len(keys)==22 and len(set(keys))==22, f'Calico {board} edge count != 22')

need((ROOT/'online-fantasy-realms.html').exists(), 'online-fantasy-realms.html missing')
need((ROOT/'SUPABASE_FANTASY_REALMS_UNIFIED.sql').exists(), 'Fantasy migration SQL missing')
need((ROOT/'SUPABASE_VERIFY_INTEGRATED_V11_4_8.sql').exists(), 'Integrated Supabase verification SQL missing')

pidx=read('pocketnova/index.html')
need('image-layer.css' in pidx and 'image-layer.js' in pidx, 'Porknova v11.7 image layer missing')
core=read('pocketnova/assets/core-fix-status.js')
need('applied: true' in core, 'Porknova v11.7 core fixes are not marked applied')
need((ROOT/'pocketnova/assets/animal-ocr-index.js').exists(), 'Porknova OCR index missing')
need((ROOT/'pocketnova/tools/validate_image_assets.py').exists(), 'Porknova asset validator missing')

need((ROOT/'pensterdam_board.jpg').exists(), 'legacy pensterdam_board.jpg lost during overlay')
need((ROOT/'pensterdam_play.jpg').exists(), 'legacy pensterdam_play.jpg lost during overlay')

pg_online=read('online-powergrid.html')
pg_engine=read('powergrid/engine.js')
pg_map=read('powergrid/data/germany-map.js')
need('powergrid-v3-germany-boardmate' in pg_engine, 'Power Grid Germany v3 state kind missing')
need('PowerGridGermanyMap' in pg_map, 'Power Grid Germany map data missing')
need('42도시 · 83연결' in read('powergrid/ui.js'), 'Power Grid Germany automatic graph UI missing')
need('solo-powergrid.html' not in app and not (ROOT/'solo-powergrid.html').exists(), 'Power Grid solo file/entry must be removed')
need('option value="usa"' not in pg_online and 'option value="korea"' not in pg_online, 'Power Grid setup must be Germany-only')

handoff=read('HANDOFF_VERSION.txt')
need('INTEGRATED v11.4.10' in handoff, 'handoff version is not integrated v11.4.10')

if errors:
    print('FAIL integrated release verification')
    for e in errors:
        print(' -',e)
    sys.exit(1)

print('PASS integrated release verification')
print(' - Realtime revision broadcast + 10s fallback')
print(' - Fantasy Realms unified files')
print(' - Calico V8 88 static edges + repair + mobile full-board fit')
print(' - Porknova v11.7 image/core checkpoint')
print(' - operational Supabase config preserved')
print(' - legacy overlay-only assets preserved')
print(' - Power Grid Germany beta v3 multiplayer-only graph integration')
