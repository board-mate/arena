from pathlib import Path
import re, subprocess, tempfile, sys
ROOT=Path(__file__).resolve().parents[1]
expected={
 'quacks':('online-quacks.html',2,4),
 'mandom':('online-mandom.html',2,4),
 'samurai':('online-samurai.html',2,4),
 'eldorado':('online-eldorado.html',2,4),
 'airlandsea':('online-airlandsea.html',2,2),
}
errors=[]

def ok(cond,msg):
    if not cond: errors.append(msg)

app=(ROOT/'app.js').read_text(encoding='utf-8')
sql=(ROOT/'SUPABASE_REPAIR_ALL_GAMES_V24.sql').read_text(encoding='utf-8')
mc=(ROOT/'multi-common.js').read_text(encoding='utf-8')

for gid,(fn,mn,mx) in expected.items():
    ok((ROOT/fn).exists(),f'missing {fn}')
    ok(re.search(rf"\b{re.escape(gid)}:\{{[^\n]*min:{mn},max:{mx}[^\n]*page:'{re.escape(fn)}'",app) is not None,f'app catalog missing/wrong {gid}')
    ok(f"'{gid}'" in sql,f'SQL missing {gid}')
    ok(f"'{gid}'" in app[app.find("const games=["):app.find("let selected='maskmen'",app.find("const games=["))],f'create room list missing {gid}')

ok((ROOT/'solo-coffee-roaster.html').exists(),'missing solo-coffee-roaster.html')
ok('href="./solo-coffee-roaster.html"' in app,'coffee roaster solo menu link missing')
ok("quacks:{name:'돌팔이 약장수'" in app and "mode:'realtime'" in app[app.find("quacks:{"):app.find("\n",app.find("quacks:{"))], 'quacks must be realtime in app catalog')
ok("when p_game='quacks' then 'realtime'" in sql,'quacks realtime SQL mode missing')
ok("if p_game in ('mandom','airlandsea') then" in sql and "currentTurn" in sql[sql.find("if p_game in ('mandom','airlandsea') then"):sql.find('end if;',sql.find("if p_game in ('mandom','airlandsea') then"))], 'mandom/airlandsea turn helper missing')
ok("if p_game='samurai' then" in sql and "p_state->>'active'" in sql[sql.find("if p_game='samurai' then"):sql.find('end if;',sql.find("if p_game='samurai' then"))], 'samurai turn helper missing')
ok("boardmate-shell-v11.4.24" in (ROOT/'sw.js').read_text(),'service worker version not bumped')
ok('./app.js?v=17' in (ROOT/'index.html').read_text(),'index app cache key not bumped')

exports=set(re.findall(r'export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)',mc))
# export const a=... can have direct capture above; functions too.
for fn,_,_ in expected.values():
    text=(ROOT/fn).read_text(encoding='utf-8')
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*['\"]\.\/multi-common\.js['\"]",text,re.S):
        names=[x.strip().split(' as ')[0].strip() for x in m.group(1).split(',') if x.strip()]
        missing=[n for n in names if n not in exports]
        ok(not missing,f'{fn} imports missing exports: {missing}')

# JS syntax check all inline executable scripts in the six new HTML files.
files=[v[0] for v in expected.values()]+['solo-coffee-roaster.html']
for fn in files:
    text=(ROOT/fn).read_text(encoding='utf-8')
    scripts=re.findall(r'<script([^>]*)>(.*?)</script>',text,re.S|re.I)
    for idx,(attrs,body) in enumerate(scripts):
        if 'src=' in attrs.lower() or 'application/json' in attrs.lower():
            continue
        if not body.strip(): continue
        suffix='.mjs' if ('type="module"' in attrs.lower() or "type='module'" in attrs.lower() or re.search(r'^\s*import\b',body)) else '.js'
        with tempfile.NamedTemporaryFile('w',suffix=suffix,delete=False,encoding='utf-8') as tmp:
            tmp.write(body); path=tmp.name
        r=subprocess.run(['node','--check',path],capture_output=True,text=True)
        Path(path).unlink(missing_ok=True)
        ok(r.returncode==0,f'{fn} script#{idx} syntax error: {r.stderr.strip()}')

if errors:
    print('FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('PASS: v11.4.24 new game integration static checks')
