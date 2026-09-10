from pathlib import Path

root=Path(__file__).resolve().parents[1]
html=(root/'online-planetx.html').read_text()
sw=(root/'sw.js').read_text()
idx=(root/'index.html').read_text()

assert 'v11.4.46' in html
assert "version:'11.4.46'" in html
assert 'function recordPoint(angleDeg,radiusPct)' in html
assert '📝 원형 섹터 기록지' in html
assert 'record-wheel-wrap' in html
assert 'record-wheel ${expert?\'expert\':\'standard\'}' in html
assert 'record-sector-no' in html
assert 'record-spoke' in html
assert 'record-mark-icon' in html
assert "objects=['x','empty','gas','dwarf','asteroid',...(allowedComets.has(sec)?['comet']:[])]" in html
assert '미정 → × 없음 → ✓ 있음' in html
assert '혜성은 가능한 섹터에만 표시됩니다.' in html
assert 'data-mark="${sec}:${o}"' in html
assert 'aria-label="${sec}섹터 ${esc(label)} 기록"' in html

# The old rectangular sector-note grid is no longer rendered by privatePanel.
private_panel=html.split('function privatePanel()',1)[1].split('function scorePanel()',1)[0]
assert 'note-grid' not in private_panel
assert 'note-cell' not in private_panel
assert 'record-wheel' in private_panel

# Existing private account persistence / click-state behavior remains intact.
assert 'boardmate_planetx_get_private_sheet' in html
assert 'boardmate_planetx_save_private_sheet' in html
assert "const next=cur===''?'no':cur==='no'?'yes':''" in html

# Both modes and official comet-eligible sector sets remain supported.
assert "return s?.mode==='expert'?[2,3,5,7,11,13,17]:[2,3,5,7,11]" in html
assert "const n=sectorCount(),expert=n===18" in html
assert "expert?'전문가 · 18섹터':'표준 · 12섹터'" in html

assert 'boardmate-shell-v11.4.46' in sw
assert './app.js?v=46' in idx
assert (root/'HANDOFF_VERSION.txt').read_text().strip()=='11.4.46'
print('v11.4.46 Planet X circular record sheet checks passed')
