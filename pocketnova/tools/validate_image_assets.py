#!/usr/bin/env python3
"""Validate the BoardMate Forknova v11.7 visual asset, source-audit and core-fix patch."""
from __future__ import annotations
import json, re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / 'assets' / 'data.js'
LAYER_JS = ROOT / 'js' / 'image-layer.js'
MATCHER_JS = ROOT / 'js' / 'asset-matcher.js'
OCR_JS = ROOT / 'assets' / 'animal-ocr-index.js'
V3_NAMES_JS = ROOT / 'assets' / 'v3-card-names.js'
CORE_STATUS_JS = ROOT / 'assets' / 'core-fix-status.js'
AUDIT_JS = ROOT / 'assets' / 'source-card-audit.js'
BUILTIN_JS = ROOT / 'assets' / 'builtin-image-mappings.js'
INDEX_HTML = ROOT / 'index.html'
MATCHER_TEST = ROOT / 'tools' / 'test_asset_matcher.mjs'
PROMOTE_TOOL = ROOT / 'tools' / 'promote_image_mappings.py'
CORE_PATCHER = ROOT / 'tools' / 'apply_v11_7_core_fixes.py'
CORE_PATCH_TEST = ROOT / 'tools' / 'test_v11_7_core_patch.py'
CORE_PATCH = ROOT / 'tools' / 'CORE_FIXES_V11_7.patch'


def parse_assignment(path: Path, prefix: str):
    raw = path.read_text(encoding='utf-8').strip()
    if not raw.startswith(prefix):
        raise SystemExit(f'FAIL: {path.name} assignment missing')
    return json.loads(raw[len(prefix):].rstrip(';'))


data = parse_assignment(DATA_JS, 'window.PORKNOVA_DATA = ')
expected_counts = {'animals':234, 'sponsors':81, 'projects':36, 'finals':13, 'maps':24}
for group, expected in expected_counts.items():
    actual = len(data.get(group, []))
    if actual != expected:
        raise SystemExit(f'FAIL: {group} count {actual}, expected {expected}')

known_paths: set[str] = set()
missing: list[str] = []
for group in expected_counts:
    for item in data.get(group, []):
        rel = item.get('img')
        if rel:
            known_paths.add(rel)
            if not (ROOT / rel).is_file(): missing.append(rel)
for action in data.get('actionImages', {}).values():
    for rel in action.values():
        if rel:
            known_paths.add(rel)
            if not (ROOT / rel).is_file(): missing.append(rel)
if missing:
    raise SystemExit('FAIL: missing assets:\n' + '\n'.join(' - '+x for x in missing[:50]))

action_sides = sum(len(v) for v in data.get('actionImages', {}).values())
if action_sides != 10:
    raise SystemExit(f'FAIL: action image side count {action_sides}, expected 10')

# v11.7: final_p07_05/06 are blue action cards retained as source files only,
# not final-scoring cards in the mapping catalog.
false_final_paths = {
    'assets/finals/final_p07_05.webp',
    'assets/finals/final_p07_06.webp',
}
for rel in false_final_paths:
    if not (ROOT / rel).is_file():
        raise SystemExit(f'FAIL: retained source file missing: {rel}')
    if rel in {x.get('img') for x in data['finals']}:
        raise SystemExit(f'FAIL: action card is still classified as final scoring: {rel}')

source_names = [x.get('sourceName') for x in data['finals']]
expected_source_names = {
    '보호 중심 동물원','자연주의파 동물원','인기 있는 동물원','후원 받는 동물원','다양성 중시 동물원',
    '암벽 등반 공원','호수 공원','디자이너 동물원','특화 서식지 동물원','특화 종 동물원',
    '푸드 트럭 동물원','접근성 중심 동물원','국제 동물원',
}
if set(source_names) != expected_source_names or len(source_names) != 13:
    raise SystemExit(f'FAIL: final sourceName labels incomplete/duplicated: {source_names}')

# F13/F15 starter maps were visually verified against imported source pages.
for rel in ('assets/maps/map_01.webp', 'assets/maps/map_02.webp'):
    with Image.open(ROOT / rel) as im:
        if im.width < 800 or im.height < 350:
            raise SystemExit(f'FAIL: starter map unexpectedly small: {rel} {im.size}')

ocr = parse_assignment(OCR_JS, 'window.PORKNOVA_ANIMAL_OCR = ')
if len(ocr) != 234:
    raise SystemExit(f'FAIL: animal OCR record count {len(ocr)}, expected 234')

v3_src = V3_NAMES_JS.read_text(encoding='utf-8')
for kind, expected in {'sponsors':64, 'projects':32, 'finals':11}.items():
    match = re.search(rf"{kind}\s*:\s*\[(.*?)\]\s*(?:,|\n\s*}})", v3_src, re.S)
    if not match:
        raise SystemExit(f'FAIL: v3-card-names.js missing {kind} array')
    names = re.findall(r"'([^']*)'", match.group(1))
    if len(names) != expected or len(names) != len(set(names)):
        raise SystemExit(f'FAIL: v3 {kind} count/uniqueness {len(names)}/{len(set(names))}, expected {expected}')

builtin_src = BUILTIN_JS.read_text(encoding='utf-8')
verified_final_srcs = re.findall(r"src:\s*'(assets/finals/[^']+)'", builtin_src)
expected_verified = {
    'assets/finals/final_p06_02.webp',
    'assets/finals/final_p06_03.webp',
    'assets/finals/final_p06_05.webp',
}
if set(verified_final_srcs) != expected_verified or len(verified_final_srcs) != 3:
    raise SystemExit(f'FAIL: conservative built-in finals changed unexpectedly: {verified_final_srcs}')
for rel in verified_final_srcs:
    if rel not in known_paths or not (ROOT / rel).is_file():
        raise SystemExit(f'FAIL: built-in mapping points outside known assets: {rel}')
if "confidence: 'verified-after-core-fix'" not in builtin_src or "requiresCoreFix: '11.7'" not in builtin_src:
    raise SystemExit('FAIL: dowsing built-in mapping is not gated on v11.7 core fix')

# Source audit must explicitly expose verified and mismatch cases without
# promoting mismatches into built-in automatic mappings.
audit_src = AUDIT_JS.read_text(encoding='utf-8')
status_counts = {
    'verified': len(re.findall(r"status:\s*'verified'", audit_src)),
    'verified-after-core-fix': len(re.findall(r"status:\s*'verified-after-core-fix'", audit_src)),
    'mismatch': len(re.findall(r"status:\s*'mismatch'", audit_src)),
}
if status_counts != {'verified':2, 'verified-after-core-fix':1, 'mismatch':3}:
    raise SystemExit(f'FAIL: source audit status counts changed: {status_counts}')
for rel in ('assets/finals/final_p06_07.webp','assets/finals/final_p06_06.webp','assets/finals/final_p06_04.webp'):
    if rel in verified_final_srcs:
        raise SystemExit(f'FAIL: mismatch source was auto-promoted: {rel}')

layer = LAYER_JS.read_text(encoding='utf-8')
required_markers = [
    "const IMAGE_LAYER_VERSION = '11.7'",
    "const USER_MAPPING_KEY = 'boardmate:pocketnova:image-mapping:v2'",
    "const LEGACY_USER_MAPPING_KEY = 'boardmate:pocketnova:image-mapping:v1'",
    "const MAPPING_CHANNEL_NAME = 'boardmate:pocketnova:image-mapping'",
    "BroadcastChannel",
    "window.addEventListener('storage'",
    "findBestOcrMatch",
    "disableAutoMapping",
    "sourceAuditFor",
    "sourceAuditFinals",
    "coreFixStatus",
    "builtin.requiresCoreFix",
    "item.sourceName || item.name",
    "selfTest",
    "assets/maps/map_01.webp",
    "assets/maps/map_02.webp",
]
for marker in required_markers:
    if marker not in layer:
        raise SystemExit(f'FAIL: image-layer.js missing marker: {marker}')

# Visual layer must not import game/network state modules.
for forbidden in ('./state.js', './engine.js', './network', 'supabase'):
    if re.search(rf"import\s+.*{re.escape(forbidden)}", layer, re.I):
        raise SystemExit(f'FAIL: visual layer imports forbidden game/network dependency: {forbidden}')

index_src = INDEX_HTML.read_text(encoding='utf-8')
required_scripts = [
    'assets/data.js', 'assets/animal-ocr-index.js', 'assets/v3-card-names.js',
    'assets/core-fix-status.js', 'assets/source-card-audit.js', 'assets/builtin-image-mappings.js', './js/image-layer.js'
]
for required in required_scripts:
    if required not in index_src:
        raise SystemExit(f'FAIL: index.html does not load {required}')
order = [index_src.index(x) for x in required_scripts]
if order != sorted(order):
    raise SystemExit(f'FAIL: index script order is unsafe: {required_scripts}')

# Do not relabel placeholder animal metadata as verified names.
animal_names = [x.get('name') for x in data.get('animals', [])]
if len(animal_names) != len(set(animal_names)):
    raise SystemExit('FAIL: duplicate animal catalog labels')
verified_animals = [x for x in data['animals'] if not x.get('manual')]
placeholder_animals = [x for x in data['animals'] if x.get('manual')]
if len(verified_animals) != 18 or len(placeholder_animals) != 216:
    raise SystemExit(f'FAIL: animal metadata trust boundary changed: {len(verified_animals)}/{len(placeholder_animals)}')

# Syntax + pure matcher + core patch regression tests.
status_src = CORE_STATUS_JS.read_text(encoding='utf-8')
if "version: '11.7'" not in status_src or not re.search(r'applied:\s*(?:false|true)', status_src):
    raise SystemExit('FAIL: core-fix-status.js malformed')

for js in (LAYER_JS, MATCHER_JS, CORE_STATUS_JS, AUDIT_JS, BUILTIN_JS):
    subprocess.run(['node', '--check', str(js)], check=True, capture_output=True, text=True)
for py in (PROMOTE_TOOL, CORE_PATCHER, CORE_PATCH_TEST):
    subprocess.run([sys.executable, '-m', 'py_compile', str(py)], check=True, capture_output=True, text=True)
subprocess.run(['node', str(MATCHER_TEST)], check=True)
subprocess.run([sys.executable, str(CORE_PATCH_TEST)], check=True)
if not CORE_PATCH.is_file() or 'card.type ? [card.type]' not in CORE_PATCH.read_text(encoding='utf-8'):
    raise SystemExit('FAIL: human-readable core patch missing')

# Promotion tool: valid local mapping succeeds; external path is rejected.
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    good = td / 'good.json'
    good.write_text(json.dumps({
        'version':2,
        'mappings': {'animals':{}, 'sponsors':{}, 'projects':{}, 'finals':{
            '지도': {'cardName':'지도','src':'assets/finals/final_p06_02.webp','assetId':'final_06_02'}
        }}
    }, ensure_ascii=False), encoding='utf-8')
    out = td / 'out.js'
    subprocess.run([sys.executable, str(PROMOTE_TOOL), str(good), '--root', str(ROOT), '--out', str(out)], check=True, capture_output=True, text=True)
    if '지도' not in out.read_text(encoding='utf-8'):
        raise SystemExit('FAIL: promotion tool did not preserve card name')
    bad = td / 'bad.json'
    bad.write_text(json.dumps({'mappings':{'finals':{'x':{'cardName':'x','src':'https://example.com/x.webp'}}}}), encoding='utf-8')
    proc = subprocess.run([sys.executable, str(PROMOTE_TOOL), str(bad), '--root', str(ROOT)], capture_output=True, text=True)
    if proc.returncode == 0:
        raise SystemExit('FAIL: promotion tool accepted external asset path')

print(f'PASS: catalog asset counts {expected_counts}; retained false-final action images excluded=2')
print(f'PASS: {action_sides} action-card side images')
print('PASS: 13 final source labels + F13/F15 map assets')
print(f'PASS: animal trust boundary verified={len(verified_animals)}, placeholders={len(placeholder_animals)}, OCR={len(ocr)}')
print('PASS: v3 workbench names sponsors=64, projects=32, finals=11')
print(f'PASS: source-rule audit {status_counts}; automatic final mappings remain exactly 3 conservative entries')
print('PASS: v11.7 mapping v2 migration + storage/BroadcastChannel sync + source-audit UI + core-fix-dependent art gate')
print('PASS: matcher, promotion path validation, and fail-closed/idempotent core patch regression tests')
