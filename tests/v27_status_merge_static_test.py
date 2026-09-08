from pathlib import Path
root=Path(__file__).resolve().parents[1]
app=(root/'app.js').read_text()
css=(root/'styles.css').read_text()
idx=(root/'index.html').read_text()
sw=(root/'sw.js').read_text()
social=(root/'social/social-common.js').read_text()
checks=[]
def ok(name,cond):
    checks.append((name,bool(cond)))
    print(('PASS' if cond else 'FAIL'),name)

ok('top-right install button exists', 'id="topInstallBtn"' in app and '📲 앱 설치' in app)
ok('install prompt handler exists', 'beforeinstallprompt' in app and 'installBoardMate' in app)
ok('static webmanifest link exists', 'rel="manifest"' in idx)
ok('desktop game picker uses 4 columns', 'grid-template-columns:repeat(4,minmax(0,1fr))' in css)
ok('compact cards have reduced height', 'min-height:126px' in css)
for g in ['samurai','eldorado','quacks']:
    ok(f'{g} marked alpha', f"{g}:" in app and "tier:'alpha'" in app[app.find(f'{g}:'):app.find(f'{g}:')+220])
for g in ['airlandsea','cascadia']:
    ok(f'{g} marked beta', f"{g}:" in app and "tier:'beta'" in app[app.find(f'{g}:'):app.find(f'{g}:')+220])
ok('stable/alpha/beta grouped picker', all(x in app for x in ['정상 작동 게임','ALPHA · 보완 필요','BETA · 보완 중']))
ok('Plakoro Pokemon rename preserved', "plakoro:{name:'프라코로 포켓몬'" in app)
ok('Samurai rename preserved', "samurai:{name:'사무라이'" in app)
ok('Pokemon Minima removed from app', '포켓몬 미니마' not in app and 'online-pokemon-minima' not in app)
for f in ['online-pokemon-minima.html','online-pocketnova.html','pokemon-minima.html','solo-pokemon-minima.html','solo-pocketnova.html']:
    ok(f'{f} removed', not (root/f).exists())
ok('Pocketnova directory removed', not (root/'pocketnova').exists())
ok('El Dorado long map preserved', "arena:{name:'아레나 장거리 코스'" in (root/'online-eldorado.html').read_text())
ok('Quacks track preserved', 'function trackHtml()' in (root/'online-quacks.html').read_text() and '냄비 점수 트랙' in (root/'online-quacks.html').read_text())
ok('Mandom revised flow preserved', 'pendingDraws' in (root/'online-mandom.html').read_text() and 'function actionDrawMonster' in (root/'online-mandom.html').read_text())
ok('Samurai map v2 preserved', 'const GAME_VERSION=2;' in (root/'online-samurai.html').read_text() and '겹치는 좌표를 제거' in (root/'online-samurai.html').read_text())
ok('cancel status RPC client exists', 'boardmate_get_cancel_status' in social)
ok('cancel vote RPC client exists', 'boardmate_set_cancel_vote' in social)
for f in ['online-avalon.html','online-secret-hitler.html','online-one-night-werewolf.html']:
    t=(root/f).read_text()
    ok(f'{f} mounts cancel control', 'mountSocialCancelControl' in t)
sql=(root/'SUPABASE_REPAIR_ALL_GAMES_V27.sql').read_text()
ok('combined repair includes cancel table', 'boardmate_game_cancel_votes' in sql)
ok('combined repair includes cancel status RPC', 'boardmate_get_cancel_status' in sql)
ok('combined repair includes cancel vote RPC', 'boardmate_set_cancel_vote' in sql)
ok('combined repair preserves Plakoro V5', 'boardmate_plakoro_set_setup_v2' in sql)
ok('service worker bumped to v11.4.27', 'boardmate-shell-v11.4.27' in sw)
ok('PowerGrid V32 Germany map preserved', 'germany-map.js?v=32' in (root/'online-powergrid.html').read_text() and (root/'powergrid/map-rules-v30.js').exists())
failed=[n for n,c in checks if not c]
if failed:
    raise SystemExit('FAILED: '+', '.join(failed))
print(f'ALL {len(checks)} V27 MERGE CHECKS PASSED')
