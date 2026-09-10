from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'online-planetx.html').read_text()
sql=(root/'SUPABASE_PLANETX_PRIVATE_SHEET_V4.sql').read_text()
sw=(root/'sw.js').read_text()
idx=(root/'index.html').read_text()
assert "version:'11.4.44'" in html
assert "let theoryPlacing=false,theoryAutoKey=''" in html
assert 'retryTheoryPlace' not in html
assert '자동 재시도합니다' not in html
assert '별도 확정은 필요 없습니다.' in html
assert 'boardmate_planetx_get_private_sheet' in html
assert 'boardmate_planetx_save_private_sheet' in html
assert 'localStorage.setItem(PRIVATE_KEY()' not in html
assert 'localStorage.getItem(legacyKey)' in html and 'localStorage.removeItem(legacyKey)' in html
assert '로그인 계정에 비공개로 저장됩니다.' in html
assert 'create table if not exists public.boardmate_planetx_private_sheets' in sql
assert 'revoke all on public.boardmate_planetx_private_sheets from public, anon, authenticated' in sql
assert 'primary key(room_id,user_id)' in sql
assert 'boardmate-shell-v11.4.44' in sw
assert './app.js?v=44' in idx
# v43 rule stays: duplicate check is sector+object, not sector-only
assert "new Set(choices.map(x=>`${x.sector}:${x.object}`)).size!==choices.length" in html
print('v11.4.44 Planet X account-sheet + placement rollback checks passed')
