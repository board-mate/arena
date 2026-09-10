from pathlib import Path

root=Path(__file__).resolve().parents[1]
html=(root/'online-planetx.html').read_text()
sw=(root/'sw.js').read_text()
idx=(root/'index.html').read_text()

assert 'v11.4.47' in html
assert "version:'11.4.47'" in html
assert "const RECORD_LAYOUT_KEY='boardmate:planetx:record-layout'" in html
assert 'function initialRecordLayout()' in html
assert 'let uiRecordLayout=initialRecordLayout()' in html
assert 'data-record-layout="circle"' in html
assert 'data-record-layout="square"' in html
assert '>◯ 원형<' in html
assert '>▦ 기존 네모<' in html
assert 'function circularRecordSheet()' in html
assert 'function squareRecordSheet()' in html
assert 'uiRecordLayout===\'square\'?squareRecordSheet():circularRecordSheet()' in html
assert 'localStorage.setItem(RECORD_LAYOUT_KEY,next)' in html

# Both layouts edit the same private mark map / data-mark behavior.
assert html.count('data-mark="${sec}:${o}"') >= 2
assert "const next=cur===''?'no':cur==='no'?'yes':''" in html
assert 'boardmate_planetx_save_private_sheet' in html
assert 'boardmate_planetx_get_private_sheet' in html

# Emoji footnote explicitly decodes the on-screen glyphs.
assert '※ 이모지 각주' in html
for label in ['소행성','혜성','왜소행성','가스 구름','비어 보임','행성 X','× 없음','✓ 있음']:
    assert label in html
assert '${OBJICON.asteroid} 소행성' in html
assert '${OBJICON.comet} 혜성' in html
assert '${OBJICON.x} 행성 X' in html

# Existing mode-dependent circular sheet and comet constraints remain.
assert "expert?'전문가 · 18섹터':'표준 · 12섹터'" in html
assert "return s?.mode==='expert'?[2,3,5,7,11,13,17]:[2,3,5,7,11]" in html

assert 'boardmate-shell-v11.4.47' in sw
assert './app.js?v=47' in idx
assert (root/'HANDOFF_VERSION.txt').read_text().strip()=='11.4.47'
print('v11.4.47 Planet X record layout toggle + emoji footnote checks passed')
