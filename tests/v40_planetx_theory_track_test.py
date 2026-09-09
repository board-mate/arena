from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'online-planetx.html').read_text()
sw=(ROOT/'sw.js').read_text()
idx=(ROOT/'index.html').read_text()
assert 'v11.4.40' in html
assert '내 가설 배치 확정' not in html
assert 'maybeAutoPlaceTheory' in html
assert 'orbit-lane-ring r1' in html and 'orbit-lane-ring r2' in html and 'orbit-lane-ring r3' in html
assert '바깥=신규 · 중간=1단계 전 · 안쪽=검증 직전' in html
assert '색/숫자 = 제출자' in html
assert 'OBJICON' in html
assert '약자(기록용): A=소행성' in html
assert 'position:sticky;top:66px' not in html
assert 'captureScroll' in html and 'restoreScroll' in html
assert "boardmate-shell-v11.4.40" in sw
assert './app.js?v=40' in idx
assert (ROOT/'HANDOFF_VERSION.txt').read_text().strip()=='v11.4.40'
print('PASS v11.4.40 Planet X theory track/UI checks')
