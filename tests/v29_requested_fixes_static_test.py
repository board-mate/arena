from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def check(cond,msg):
    if not cond: raise AssertionError(msg)
    print('PASS',msg)

plakoro=read('online-plakoro.html')
v6=read('SUPABASE_PLAKORO_PVP_V6.sql')
common=read('multi-common.js')
app=read('app.js')
fantasy=read('online-fantasy-realms.html')
sw=read('sw.js')
repair=read('SUPABASE_REPAIR_ALL_GAMES_V29.sql')

check("SUPABASE_PLAKORO_PVP_V6.sql" in plakoro, 'Plakoro stale RPC guidance points to V6')
check("raw_attack=any(allowed)" in v6 and "legacy_tail ~ '^[0-6]$'" in v6, 'Plakoro V6 accepts semantic and legacy move IDs')
check("got:=array_append(got,allowed[legacy_idx+1])" in v6, 'Plakoro legacy move IDs normalize to semantic IDs')
check("from public.boardmate_plakoro_setups s" in v6 and "s.seat between 0 and 1" in v6, 'Plakoro setup-pair seat references are qualified')
check("const cancelled=Boolean(st.cancelled)" in common, 'cancel overlay uses actual cancelled boolean')
check("st.yes??st.votes" in common and "st.total??st.members" in common, 'cancel UI supports current and legacy RPC counters')
check("room.status==='finished'" in app and "boardmate_get_cancel_status" in app, 'room screen detects unanimously cancelled finished rooms')
check('captureScrollState' in fantasy and 'restoreScrollState(scrollState)' in fantasy, 'Fantasy Realms preserves scroll across render')
check("pollTimer=setInterval(()=>void syncState(false),10000)" in fantasy, 'Fantasy Realms polling skips unchanged revisions')
check('id="minimizeAction"' in fantasy and 'id="restoreAction"' in fantasy, 'Fantasy Realms action dialog can be minimized/restored')
check("!actionDialogMinimized" in fantasy and "addEventListener('cancel'" in fantasy, 'minimized action dialog stays down during realtime refresh and Esc')
check("multi-common.js?v=29" in fantasy and "multi-common.js?v=29" in plakoro, 'changed games cache-bust multi-common v29')
check("boardmate-shell-v11.4.29" in sw, 'service worker cache bumped to v11.4.29')
check('legacy_idx integer' in repair and 'raw_attack=any(allowed)' in repair, 'V29 full repair includes Plakoro V6 setup compatibility')
print('ALL V29 REQUESTED FIX STATIC TESTS PASSED')
