#!/usr/bin/env python3
from pathlib import Path
import re, sys
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]

def need(cond,msg):
    if not cond:
        raise SystemExit('FAIL '+msg)

app=(root/'app.js').read_text(encoding='utf-8')
need("powergrid:{name:'파워그리드 독일 β'" in app,'Power Grid Germany app entry missing')
need("min:2,max:6,page:'online-powergrid.html'" in app,'Power Grid 2-6/page entry mismatch')
solo_block=app[app.find('function renderSolo()'):app.find('async function loadRatingMap')]
need('solo-powergrid.html' not in solo_block,'Power Grid solo entry must not exist')
need((root/'online-powergrid.html').exists(),'online-powergrid.html missing')
need(not (root/'solo-powergrid.html').exists(),'solo-powergrid.html must be absent')
need((root/'powergrid/data/germany-map.js').exists(),'Germany map data missing')
need((root/'powergrid/assets/maps/germany.webp').exists(),'Germany board image missing')
plants=list((root/'powergrid/assets/plants').glob('plant_*.webp'))
# 42 numbered plant files + plant_sheet.webp
numbered=[p for p in plants if re.fullmatch(r'plant_\d{2}\.webp',p.name)]
need(len(numbered)==42,f'expected 42 numbered plant images, got {len(numbered)}')
need((root/'powergrid/assets/plants/step3.webp').exists(),'Step 3 image missing')
need((root/'SUPABASE_POWERGRID_UNIFIED.sql').exists(),'Power Grid Supabase migration missing')
need((root/'SUPABASE_VERIFY_POWERGRID.sql').exists(),'Power Grid Supabase verification missing')
mc=(root/'multi-common.js').read_text(encoding='utf-8')
need("event:'state_changed'" in mc or 'state_changed' in mc,'Realtime state_changed marker missing')
need('10000' in mc,'10 second fallback marker missing')
print('PASS verify_powergrid_direct_install: v11.4.8 direct install has all Germany multiplayer runtime files and no Power Grid solo entry')
