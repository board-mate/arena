from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
GAMES = [
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro'
]


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('PASS:', msg)


repair = read('SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql')
for game in GAMES:
    check(f"'{game}'" in repair, f'repair preserves game id {game}')
for fn in [
    'get_boardmate_fantasy_state', 'put_boardmate_fantasy_state',
    'boardmate_social_init', 'boardmate_social_view', 'boardmate_social_action',
    'create_boardmate_room_v10', 'boardmate_turn_seat'
]:
    check(fn in repair, f'repair contains {fn}')
check("p_game='pocketnova'" in repair and "currentPlayer" in repair,
      'repair preserves Pokemon Minima currentPlayer turn field')
check("p_game='powergrid'" in repair and "currentSeat" in repair,
      'repair preserves Power Grid currentSeat turn field')
check(repair.count('begin;') == 1 and re.search(r'\bcommit;\s*$', repair),
      'repair has one complete transaction')
check(repair.count('$$') % 2 == 0, 'repair has balanced dollar-quote delimiters')

for sql_name in [
    'SUPABASE_FANTASY_REALMS_UNIFIED.sql',
    'SUPABASE_SOCIAL_DEDUCTION_V1.sql',
    'SUPABASE_POWERGRID_UNIFIED.sql',
]:
    sql = read(sql_name)
    for game in GAMES:
        check(f"'{game}'" in sql, f'{sql_name} preserves {game}')
    check("p_game='pocketnova'" in sql and 'currentPlayer' in sql,
          f'{sql_name} does not regress Pokemon Minima turn field')
    check("p_game='powergrid'" in sql and 'currentSeat' in sql,
          f'{sql_name} preserves Power Grid turn field')

fantasy = read('online-fantasy-realms.html')
check("multi-common.js?v=20" in fantasy, 'Fantasy cache bust is v20')
check("persist('game-start',{throwOnError:true})" in fantasy,
      'Fantasy initial persistence surfaces RPC failure')
check('SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql' in fantasy,
      'Fantasy shows actionable repair guidance')

werewolf = read('online-one-night-werewolf.html')
check("social-common.js?v=20" in werewolf, 'Werewolf cache bust is v20')
check('function werewolfLoadError' in werewolf and 'SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql' in werewolf,
      'Werewolf shows actionable repair guidance')

sw = read('sw.js')
check("boardmate-shell-v11.4.20" in sw, 'service worker cache bumped to v11.4.20')

verify = read('SUPABASE_VERIFY_FANTASY_WEREWOLF_V20.sql')
for fn in ['get_boardmate_fantasy_state','put_boardmate_fantasy_state','boardmate_social_init','boardmate_social_view','boardmate_social_action']:
    check(fn in verify, f'verification SQL checks {fn}')

print('\nAll Fantasy/Werewolf load-regression checks passed.')
