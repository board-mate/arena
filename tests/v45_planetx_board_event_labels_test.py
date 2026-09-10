from pathlib import Path

root=Path(__file__).resolve().parents[1]
html=(root/'online-planetx.html').read_text()
sw=(root/'sw.js').read_text()
idx=(root/'index.html').read_text()

assert 'v11.4.45' in html
assert "version:'11.4.45'" in html
assert 'orbit-event-marker' in html
assert "function theoryEvents(mode){return mode==='expert'?[3,6,9,12,15,18]:[3,6,9,12]}" in html
assert "if(sector===8)return'X1';if(sector===16)return'X2'" in html
assert "else if(sector===10)return'X1'" in html
assert "label=confKey?`${confKey} 회의`:'학술제'" in html
assert "state.mode==='expert'?'X1=8 · X2=16':'X1=10'" in html
assert '📚 학술제(논문 단계)' in html
assert '논문 트랙' in html and '논문 비공개 선택' in html
assert '약자(기록용)' not in html and 'A=소행성' not in html
assert 'abbr-legend' not in html
assert html.count("replace(/\\uAC00\\uC124/g,'논문')") >= 2

render=html.split("document.querySelector('#app').innerHTML=",1)[1].split('bindGameControls();',1)[0]
assert '<section class="card full reference-bottom"><h3>참조표</h3>${referencePanel()}</section>' in render
assert render.index('private-sheet private-sheet-box') < render.index('reference-bottom')
assert render.rfind('reference-bottom') > render.rfind('scorePanel()')
assert '<section class="card"><h3>참조표</h3>${referencePanel()}</section>' not in render

assert 'boardmate-shell-v11.4.45' in sw
assert './app.js?v=45' in idx
assert (root/'HANDOFF_VERSION.txt').read_text().strip()=='11.4.45'
print('v11.4.45 Planet X board event/terminology checks passed')
