from pathlib import Path
import re, subprocess, tempfile, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(c,m):
    if not c: errors.append(m)

app=(ROOT/'app.js').read_text(encoding='utf-8')
sw=(ROOT/'sw.js').read_text(encoding='utf-8')
idx=(ROOT/'index.html').read_text(encoding='utf-8')
repair=(ROOT/'SUPABASE_REPAIR_ALL_GAMES_V24.sql').read_text(encoding='utf-8')
verify=(ROOT/'SUPABASE_VERIFY_ALL_GAMES_V24.sql').read_text(encoding='utf-8')

expected={
 'quacks':('online-quacks.html',2,4),
 'mandom':('online-mandom.html',2,4),
 'samurai':('online-samurai.html',2,4),
 'eldorado':('online-eldorado.html',2,4),
 'airlandsea':('online-airlandsea.html',2,2),
}
for gid,(fn,mn,mx) in expected.items():
    check((ROOT/fn).exists(),f'missing {fn}')
    check(re.search(rf"\b{gid}:\{{[^\n]*min:{mn},max:{mx}[^\n]*page:'{re.escape(fn)}'",app) is not None,f'app catalog wrong {gid}')
    check(f"'{gid}'" in repair,f'repair missing {gid}')
check((ROOT/'solo-coffee-roaster.html').exists(),'missing coffee roaster')
check('solo-coffee-roaster.html' in app,'coffee roaster menu missing')
check("boardmate-shell-v11.4.24" in sw,'cache is not v11.4.24')
check('app.js?v=17' in idx,'index cache query is not v17')
check("boardmate_social_action(text,uuid,jsonb)" in repair,'repair social action signature wrong')
check("boardmate_social_action(text,uuid,jsonb)" in verify,'verify social action signature wrong')
check("boardmate_social_action(text,uuid,text,jsonb)" not in verify,'old 4-arg social action check remains')

# Every catalog-normalizing SQL must keep all 18 games.
all_games=['maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken','fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado','airlandsea']
for name in ['SUPABASE_REPAIR_ALL_GAMES_V24.sql','SUPABASE_SOCIAL_DEDUCTION_V1.sql','SUPABASE_FANTASY_REALMS_UNIFIED.sql','SUPABASE_POWERGRID_UNIFIED.sql','SUPABASE_BOARDMATE_GAME_CATALOG_V2.sql']:
    text=(ROOT/name).read_text(encoding='utf-8')
    for gid in all_games:
        check(f"'{gid}'" in text,f'{name} drops {gid}')
    check("p_game='pocketnova'" in text and 'currentPlayer' in text,f'{name} regresses Pokemon turn field')
    check("p_game='powergrid'" in text and 'currentSeat' in text,f'{name} regresses PowerGrid turn field')

# v23 update markers preserved.
social=(ROOT/'social/social-common.js').read_text(encoding='utf-8')
check('mountCancelControl' in social and 'boardmate_get_cancel_status' in social,'v23 social cancel control missing')
fant=(ROOT/'online-fantasy-realms.html').read_text(encoding='utf-8')
check('multi-common.js?v=24' in fant and 'ownHand' in fant,'v23 Fantasy update/cache missing')
plak=(ROOT/'online-plakoro.html').read_text(encoding='utf-8')
check('boardmate_plakoro_set_setup_v2' in plak or 'set_setup_v2' in plak,'Plakoro V4 client marker missing')
check((ROOT/'SUPABASE_PLAKORO_PVP_V4.sql').exists(),'Plakoro V4 SQL missing')
kr=(ROOT/'online-kraken.html').read_text(encoding='utf-8')
check('overlay' in kr.lower(),'Kraken overlay update missing')
sh=(ROOT/'online-secret-hitler.html').read_text(encoding='utf-8')
check('executive' in sh.lower() or '파시스트' in sh,'Secret Hitler v23 update marker missing')

# multi-common imports from new HTML files must exist.
mc=(ROOT/'multi-common.js').read_text(encoding='utf-8')
exports=set(re.findall(r'export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)',mc))
for fn,_,_ in expected.values():
    text=(ROOT/fn).read_text(encoding='utf-8')
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*['\"]\.\/multi-common\.js['\"]",text,re.S):
        names=[x.strip().split(' as ')[0].strip() for x in m.group(1).split(',') if x.strip()]
        miss=[n for n in names if n not in exports]
        check(not miss,f'{fn} missing exports {miss}')

# Syntax check executable inline JS for all merged/newly updated pages.
htmls=['online-quacks.html','online-mandom.html','online-samurai.html','online-eldorado.html','online-airlandsea.html','solo-coffee-roaster.html',
       'online-fantasy-realms.html','online-one-night-werewolf.html','online-plakoro.html','online-kraken.html','online-secret-hitler.html','online-pokemon-minima.html']
for fn in htmls:
    text=(ROOT/fn).read_text(encoding='utf-8')
    for i,(attrs,body) in enumerate(re.findall(r'<script([^>]*)>(.*?)</script>',text,re.S|re.I)):
        if 'src=' in attrs.lower() or 'application/json' in attrs.lower() or not body.strip(): continue
        suffix='.mjs' if ('type="module"' in attrs.lower() or "type='module'" in attrs.lower() or re.search(r'^\s*import\b',body)) else '.js'
        with tempfile.NamedTemporaryFile('w',suffix=suffix,delete=False,encoding='utf-8') as t:
            t.write(body); p=t.name
        r=subprocess.run(['node','--check',p],capture_output=True,text=True)
        Path(p).unlink(missing_ok=True)
        check(r.returncode==0,f'{fn} script#{i} syntax: {r.stderr.strip()}')

if errors:
    print('FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('PASS: v11.4.24 integrated static checks')
