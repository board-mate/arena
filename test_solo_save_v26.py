from pathlib import Path
R=Path(__file__).resolve().parent
checks=[]
def ok(name,cond): checks.append((name,bool(cond)))
def text(fn): return (R/fn).read_text(encoding='utf-8')
ui=text('solo-save-ui.js')
ok('common save UI has save button','💾 저장' in ui)
ok('common save UI has abandon button','🏳 게임 포기' in ui)
for fn in ['solo-acquire.html','solo-etchinstone.html','solo-maskmen.html','solo-thegame.html','solo-coffee-roaster.html']:
    s=text(fn);ok(fn+' loads common UI','solo-save-ui.js' in s);ok(fn+' installs controls','BoardMateSoloUI.install' in s)
coffee=text('solo-coffee-roaster.html')
ok('coffee save key','boardmate:solo:coffee-roaster:v1' in coffee)
ok('coffee autosave','beforeunload' in coffee and 'boardmateCoffeeSave' in coffee)
ok('coffee abandon removes save','removeItem(BOARDMATE_COFFEE_SAVE)' in coffee)
ok('acquire abandon prevents beforeunload resurrection','__boardmateSoloAbandon' in text('solo-acquire.html'))
ok('maskmen abandon prevents beforeunload resurrection','__boardmateSoloAbandon' in text('solo-maskmen.html'))
ok('Pokemon Minima removed',all(not (R/f).exists() for f in ['pokemon-minima.html','solo-pokemon-minima.html','online-pokemon-minima.html']))
ok('service worker version','boardmate-shell-v11.4.26' in text('sw.js'))
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
if failed: raise SystemExit(1)
print(f'PASS {len(checks)} checks')
