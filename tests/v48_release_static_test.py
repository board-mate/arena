#!/usr/bin/env python3
from pathlib import Path
import re, hashlib
ROOT=Path(__file__).resolve().parents[1]
APP=(ROOT/'app.js').read_text(encoding='utf-8')
INDEX=(ROOT/'index.html').read_text(encoding='utf-8')
SW=(ROOT/'sw.js').read_text(encoding='utf-8')

def need(c,m):
    if not c: raise AssertionError(m)
    print('PASS',m)

need((ROOT/'HANDOFF_VERSION.txt').read_text().strip()=='11.4.48','handoff version 11.4.48')
need('boardmate-shell-v11.4.48' in SW,'service worker cache v11.4.48')
need('app.js?v=48' in INDEX and 'styles.css?v=28' in INDEX,'hub assets cache-busted')
need('포켓몬 미니마' not in APP and 'pocketnova:{' not in APP,'Pokemon Minima absent from active UI')
for f in ['online-pokemon-minima.html','solo-pokemon-minima.html','pokemon-minima.html','online-pocketnova.html','solo-pocketnova.html']:
    need(not (ROOT/f).exists(),f'Pokemon Minima runtime absent: {f}')
need('./solo-etchinstone.html' in APP and '에친스톤' in APP,'Etchinstone solo entry restored')

m=re.search(r'function gameInfo\(game\)\{\s*const map=\{(.*?)\n\s*\};',APP,re.S)
need(bool(m),'gameInfo map found')
body=m.group(1)
entries=[]
for key,obj in re.findall(r'^\s*([a-z0-9]+):\{([^\n]+)\},?\s*$',body,re.M):
    pm=re.search(r"page:'([^']+)'",obj)
    page=pm.group(1) if pm else f'online-{key}.html'
    entries.append((key,page))
full_tree=(ROOT/'online-maskmen.html').exists()
if full_tree:
    missing=[(k,p) for k,p in entries if not (ROOT/p).exists()]
    need(not missing,f'all {len(entries)} active multiplayer entries resolve to files')
    solo=[r for r in re.findall(r'href="\./([^"?#]+\.html)',APP) if '${' not in r]
    missing_solo=[p for p in solo if not (ROOT/p).exists()]
    need(not missing_solo,f'all {len(set(solo))} explicit solo/local links resolve to files')
else:
    print('SKIP full-site link checks (patch-overlay tree)')

# Runtime regression guard: only Calico is allowed to change among multiplayer game HTML;
# Etchinstone itself was already present and remains byte-identical.
BASE=Path('/mnt/data/work_v47')
if BASE.exists() and full_tree:
    changed=[]
    for p in list(BASE.glob('online-*.html'))+list(BASE.glob('solo-*.html')):
        if p.name=='online-calico.html': continue
        q=ROOT/p.name
        if not q.exists() or hashlib.sha256(p.read_bytes()).digest()!=hashlib.sha256(q.read_bytes()).digest():
            changed.append(p.name)
    need(not changed,'all unrelated online/solo game HTML unchanged from v11.4.47')
print('ALL V11.4.48 STATIC TESTS PASSED')
