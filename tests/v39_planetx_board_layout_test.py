from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'online-planetx.html').read_text()

assert 'v11.4.39' in html
assert "version:'11.4.39'" in html
assert 'function privateObservationPanel()' in html
assert '🔒 내 비공개 조사 기록' in html
assert '${privateObservationPanel()}' in html
assert 'class="card private private-sheet"' in html
assert html.index('${privateObservationPanel()}') < html.index('<aside class="game-side">')
assert 'function orbitPanel()' in html
assert 'orbit-spoke' in html
assert 'orbit-sun' in html
assert 'orbit-pawns' in html
assert 'orbit-theories' in html
assert '🧩 섹터 상세 · 가설 트랙' in html
assert 'sector-detail-box' in html
assert "function captureScroll()" in html and "function restoreScroll(snap)" in html
assert "...(allowedComets.has(sec)?['comet']:[])" in html
assert '↔ 맞은편 ${oppositeSector(sec)}' in html
assert "boardmate-shell-v11.4.39" in (ROOT/'sw.js').read_text()
assert 'app.js?v=39' in (ROOT/'index.html').read_text()
assert (ROOT/'HANDOFF_VERSION.txt').read_text().strip()=='v11.4.39'
print('PASS v11.4.39 Planet X board-centric layout checks')
