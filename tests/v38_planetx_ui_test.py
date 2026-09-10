from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'online-planetx.html').read_text()
sql=(ROOT/'SUPABASE_PLANETX_RESEARCH_TOPICS_V2.sql').read_text()
full=(ROOT/'SUPABASE_PLANETX_PVP_V1.sql').read_text()

assert 'v11.4.38' in html
assert "version:'11.4.38'" in html

# Research topic titles: public titles only, rules still returned only by research RPC.
assert 'boardmate_planetx_research_topics' in html
assert 'async function openResearch()' in html
assert "topicKo(topics?.[x]||'')" in html
assert '주제 제목은 공개 정보' in html
assert '📚 연구 주제 제목 A–F' in html
assert 'boardmate_planetx_research_topics' in sql
assert 'boardmate_planetx_research_topics' in full
fn=sql.split('create or replace function public.boardmate_planetx_research_topics',1)[1]
assert "cards->'A'->>'topic'" in fn and "cards->'F'->>'topic'" in fn
# The title RPC return object must not expose rules/board.
ret=fn.split('return jsonb_build_object(',1)[1].split(');',1)[0]
assert "'rule'" not in ret.lower()
assert "board" not in ret.lower()

# Comet note sectors.
assert "function cometSectors(s=state){return s?.mode==='expert'?[2,3,5,7,11,13,17]:[2,3,5,7,11]}" in html
assert "...(allowedComets.has(sec)?['comet']:[])" in html
assert '🌠 혜성 가능' in html
assert 'const allowed=cometSectors();' in html

# Circular board and exact opposite-sector relationship.
assert 'function oppositeSector(sec,s=state)' in html
assert 'function orbitPanel()' in html
assert 'class="orbit-board' in html
assert '↔ 맞은편 ${oppositeSector(sec)}' in html
assert '정반대 = +${n/2}섹터' in html

# Cache/version bumps.
assert "boardmate-shell-v11.4.38" in (ROOT/'sw.js').read_text()
assert 'app.js?v=38' in (ROOT/'index.html').read_text()
assert (ROOT/'HANDOFF_VERSION.txt').read_text().strip()=='v11.4.38'

print('PASS v11.4.38 Planet X UI static checks')
