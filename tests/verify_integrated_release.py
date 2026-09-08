#!/usr/bin/env python3
from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def need(cond,msg):
    if not cond: errors.append(msg)
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')

config=read('config.js')
need('supabaseUrl: ""' not in config, 'config.js supabaseUrl is blank')
need('supabaseAnonKey: ""' not in config, 'config.js supabaseAnonKey is blank')
need('service_role' not in config.lower(), 'config.js must not contain a service_role key')

multi=read('multi-common.js')
need('state_changed' in multi, 'Realtime state_changed broadcast missing')
need('options.interval||10000' in multi, '10s polling fallback missing')

app=read('app.js')
need('fantasyrealms' in app, 'Fantasy Realms missing from app.js')
need('pocketnova:{' not in app and '포켓몬 미니마' not in app, 'Pokemon Minima must be removed from Arena UI')
for g in ('avalon','secrethitler','onenightwerewolf'):
    need(f'{g}:{{' in app, f'{g} missing from app.js')
need('create_boardmate_room_v10' in app, 'Social room creator v10 missing')
need('solo-powergrid.html' not in app, 'Power Grid must not appear in solo library')

# Fresh arena regressions we intentionally preserve.
cal=read('online-calico.html')
need('boardFitShell' in cal and 'calico-mobile-board-fit' in cal, 'Calico mobile fit layer missing')
need('repair-invalid-cat-tokens' in cal, 'Calico V8 repair hook missing')
need('EDGE_CATALOG_VERSION=12' in cal, 'Calico static edge catalog missing')
need((ROOT/'online-fantasy-realms.html').exists(), 'online-fantasy-realms.html missing')
need((ROOT/'SUPABASE_FANTASY_REALMS_UNIFIED.sql').exists(), 'Fantasy migration SQL missing')
need((ROOT/'online-powergrid.html').exists(), 'online-powergrid.html missing')
need((ROOT/'powergrid').exists(), 'powergrid directory missing')
need((ROOT/'pensterdam_board.jpg').exists(), 'legacy pensterdam_board.jpg lost')
need((ROOT/'pensterdam_play.jpg').exists(), 'legacy pensterdam_play.jpg lost')

# Pocket Nova runtime must be gone; `pocketnova` remains only as an internal DB key.
need(not (ROOT/'pocketnova').exists(), 'legacy pocketnova runtime directory still exists')
need(not (ROOT/'online-pocketnova.html').exists(), 'legacy online-pocketnova.html still exists')
need(not (ROOT/'solo-pocketnova.html').exists(), 'legacy solo-pocketnova.html still exists')
need(not (ROOT/'SOURCE_UPLOADS/pocketnova-v3.zip').exists(), 'legacy pocketnova source zip still exists')

# Pokemon Minima is removed from the deploy package/UI in v11.4.26.
for f in ('pokemon-minima.html','solo-pokemon-minima.html','online-pokemon-minima.html','online-pocketnova.html','solo-pocketnova.html'):
    need(not (ROOT/f).exists(), f'{f} should be removed in v11.4.26')

# Social deduction package and SQL.
for f in ('online-avalon.html','online-secret-hitler.html','online-one-night-werewolf.html',
          'social/social-common.js','social/social-deduction.css','SUPABASE_SOCIAL_DEDUCTION_V1.sql',
          'SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql','tests/social_deduction_static_test.cjs'):
    need((ROOT/f).exists(), f'{f} missing')
sql=read('SUPABASE_SOCIAL_DEDUCTION_V1.sql')
need("when p_game='pocketnova' then 2" in sql, 'Supabase Pokemon max-player helper is not 2')
need("when p_game='pocketnova' then 2" in sql, 'legacy pocketnova DB compatibility missing')
need('revoke all on table public.boardmate_social_games' in sql, 'Social secret table client lock-down missing')

handoff=read('HANDOFF_VERSION.txt')
need('v11.4.26' in handoff, 'handoff version is not v11.4.26')

if errors:
    print('FAIL final integrated release verification')
    for e in errors: print(' -',e)
    sys.exit(1)
print('PASS final integrated release verification')
print(' - fresh arena-main regressions preserved')
print(' - legacy Pocket Nova runtime removed')
print(' - Pokemon Minima removed from UI/package; legacy DB key retained')
print(' - Avalon / Secret Hitler / One Night Werewolf present')
print(' - Supabase social migration and private-state protection present')
