from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'online-planetx.html').read_text()
sw=(root/'sw.js').read_text()
idx=(root/'index.html').read_text()
assert 'let uiRecordOpen=false;' in html
assert 'private-sheet-box" ${uiRecordOpen?\'open\':\'\'}' in html
assert "sheet.addEventListener('toggle',()=>{uiRecordOpen=sheet.open})" in html
mark_block=html.split("document.querySelectorAll('[data-mark]')",1)[1].split('}',1)[0]
assert 'render()' not in mark_block
assert 'retryTheoryPlace' in html
assert '가설 배치를 자동 재시도합니다.' in html
assert "setTimeout(()=>{if(state?.phase==='theory-place')" in html
assert 'boardmate-shell-v11.4.42' in sw
assert 'app.js?v=42' in idx
print('v11.4.42 Planet X bugfix checks passed')
