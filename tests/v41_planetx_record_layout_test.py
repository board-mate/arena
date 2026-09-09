from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'online-planetx.html').read_text()
sw=(root/'sw.js').read_text()
idx=(root/'index.html').read_text()
assert 'position:static!important' in html
assert 'private-sheet-box' in html
assert '<details class="reference" open><summary>📚 연구 주제 제목 A–F</summary>' in html
render=html.split("document.querySelector('#app').innerHTML=",1)[1].split('bindGameControls();',1)[0]
assert render.index('<h3>참조표</h3>') < render.index('private-sheet private-sheet-box')
assert render.index('<h3>공개 기록</h3>') < render.index('private-sheet private-sheet-box')
assert 'boardmate-shell-v11.4.41' in sw
assert 'app.js?v=41' in idx
print('v11.4.41 Planet X record layout checks passed')
