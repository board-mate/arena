from pathlib import Path
import re, subprocess, tempfile, json, sys
ROOT=Path(__file__).resolve().parents[1]
fail=[]
def check(cond,msg):
    print(('PASS' if cond else 'FAIL'),msg)
    if not cond: fail.append(msg)
app=(ROOT/'app.js').read_text()
check("plakoro:{name:'프라코로 포켓몬'" in app,'Plakoro display name renamed')
check("samurai:{name:'사무라이'" in app,'Samurai display name renamed')
check('포켓몬 미니마' not in app and 'pocketnova:{' not in app,'Pokemon Minima removed from Arena UI')
for rel in ['online-pokemon-minima.html','online-pocketnova.html','pokemon-minima.html','solo-pokemon-minima.html','solo-pocketnova.html','pocketnova']:
    check(not (ROOT/rel).exists(),f'Pokemon Minima deploy artifact removed: {rel}')

pl=(ROOT/'online-plakoro.html').read_text();sql=(ROOT/'SUPABASE_PLAKORO_PVP_V5.sql').read_text()
check('create table if not exists public.boardmate_plakoro_setups' in sql,'Plakoro V5 creates setup table itself')
check('boardmate_plakoro_get_setup_self_v2' in sql and 'boardmate_plakoro_get_setup_pair_v2' in sql,'Plakoro setup RPCs included')
check('if(!setupChoice){' in pl,'Plakoro default setup choice initialized')
check('준비 DB 누락 · V5 SQL 필요' in pl,'Plakoro missing-DB diagnostic included')

el=(ROOT/'online-eldorado.html').read_text()
check("arena:{name:'아레나 장거리 코스'" in el,'El Dorado long default map enabled')
m=re.search(r"arena:\{name:'아레나 장거리 코스'.*?gates:\[([^\]]+)\],rows:\[(.*?)\]\n  \]\},",el,re.S)
check(bool(m),'El Dorado arena map block found')
if m:
    gates=[x.strip() for x in m.group(1).split(',') if x.strip()]
    rows=re.findall(r"\[(.*?)\]",m.group(2),re.S)
    lens=[len(re.findall(r"(?:'[^']*'|null)",r)) for r in rows]
    check(len(gates)>=4,'El Dorado has at least four blockade lines')
    check(min(lens)>=20,'El Dorado default map is at least 20 columns long')
check('.gate-line' in el and "content:'봉쇄선'" in el,'El Dorado blockade line is visually explicit')

qu=(ROOT/'online-quacks.html').read_text()
check('function trackHtml()' in qu and '냄비 점수 트랙' in qu,'Quacks visual score/pot track added')
check('function bagInventoryHtml' in qu and '다음 라운드 주머니 구성' in qu,'Quacks end-of-round bag composition added')
check('for(let pos=1;pos<=34;pos++)' in qu,'Quacks track covers 1 through 34')

ma=(ROOT/'online-mandom.html').read_text()
for needle,msg in [
    ('turnOrder','Mandom agreed turn order stored'),('function actionDrawMonster','Mandom draw-then-decide flow added'),
    ('pendingDraws','Mandom pending seen monster stored'),('몬스터 목록 카드 · 🔴 빨간 테두리','Mandom first failure red-border state'),
    ('remaining.length === 1','Mandom last non-passer becomes challenger'),('data-order','Mandom host turn-order controls added')]:
    check(needle in ma,msg)
check('덱 소진: 강제 도전자 결정' not in ma,'Mandom no longer forces challenger immediately when deck empties')

sa=(ROOT/'online-samurai.html').read_text()
check('const GAME_VERSION=2;' in sa,'Samurai map version bumped to 2')
check('겹치는 좌표를 제거' in sa,'Samurai v2 map redesign present')
# Extract buildMap with brace matching and execute in Node to verify coords/slots.
pos=sa.index('function buildMap(playerCount){')
brace=sa.index('{',pos);depth=0;end=None
for i in range(brace,len(sa)):
    if sa[i]=='{': depth+=1
    elif sa[i]=='}':
        depth-=1
        if depth==0:
            end=i+1;break
fn=sa[pos:end]
node=f"""{fn}\nfor (const n of [2,3,4]){{const c=buildMap(n);const coords=c.map(x=>x.col+','+x.row);const dup=coords.length-new Set(coords).size;const setts=c.filter(x=>['village','city','edo'].includes(x.type));const slots=setts.reduce((s,x)=>s+(x.type==='edo'?3:x.type==='city'?2:1),0);console.log(JSON.stringify({{n,count:c.length,dup,slots,sett:setts.length}}));}}"""
r=subprocess.run(['node','-e',node],capture_output=True,text=True)
check(r.returncode==0,'Samurai buildMap executes')
if r.returncode==0:
    rows=[json.loads(x) for x in r.stdout.splitlines() if x.strip()]
    expected={2:21,3:30,4:39}
    for x in rows:
        check(x['dup']==0,f"Samurai {x['n']}p has no overlapping coordinates")
        check(x['slots']==expected[x['n']],f"Samurai {x['n']}p figure slots match supply ({expected[x['n']]})")
else: print(r.stderr)

repair=(ROOT/'SUPABASE_REPAIR_ALL_GAMES_V26.sql').read_text()
check('create table if not exists public.boardmate_plakoro_setups' in repair,'All-games V26 repair includes Plakoro setup table')
check("when 'plakoro' then '프라코로 포켓몬'" in repair,'V26 SQL display name: Plakoro Pokemon')
check("when 'samurai' then '사무라이'" in repair,'V26 SQL display name: Samurai')

if fail:
    print(f'\n{len(fail)} failure(s)');sys.exit(1)
print('\nALL V26 GAME POLISH STATIC TESTS PASSED')
