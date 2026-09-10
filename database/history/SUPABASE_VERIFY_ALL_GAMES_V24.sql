-- BoardMate Arena v11.4.24 verification (read-only)
-- Expected result: every row's ok column is true.

with expected(game,min_players,max_players) as (
  values
    ('maskmen',3,6),('acquire',3,6),('calico',2,4),('cascadia',2,4),
    ('pocketnova',2,2),('thegame',2,5),('kraken',3,8),('fantasyrealms',3,6),
    ('powergrid',3,6),('avalon',5,10),('secrethitler',5,10),('onenightwerewolf',3,10),
    ('plakoro',2,2),('quacks',2,4),('mandom',2,4),('samurai',2,4),
    ('eldorado',2,4),('airlandsea',2,2)
)
select 'catalog:'||game as check_name,
       public.boardmate_game_min(game)=min_players
       and public.boardmate_game_max(game)=max_players as ok
from expected
union all
select 'rooms constraint has quacks',
       position('quacks' in pg_get_constraintdef(oid))>0
from pg_constraint where conname='boardmate_rooms_game_check'
union all
select 'rooms constraint has airlandsea',
       position('airlandsea' in pg_get_constraintdef(oid))>0
from pg_constraint where conname='boardmate_rooms_game_check'
union all
select 'ratings constraint has samurai',
       position('samurai' in pg_get_constraintdef(oid))>0
from pg_constraint where conname='boardmate_ratings_game_check'
union all
select 'create_boardmate_room_v10 exists',
       to_regprocedure('public.create_boardmate_room_v10(text,text,text)') is not null
union all
select 'fantasy get RPC exists',
       to_regprocedure('public.get_boardmate_fantasy_state(text,uuid)') is not null
union all
select 'fantasy put RPC exists',
       to_regprocedure('public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb)') is not null
union all
select 'social init RPC exists',
       to_regprocedure('public.boardmate_social_init(text,uuid,jsonb)') is not null
union all
select 'social view RPC exists',
       to_regprocedure('public.boardmate_social_view(text,uuid)') is not null
union all
select 'social action RPC exists',
       to_regprocedure('public.boardmate_social_action(text,uuid,jsonb)') is not null
union all
select 'plakoro V4 setup RPC exists',
       to_regprocedure('public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean)') is not null
union all
select 'plakoro V4 status RPC exists',
       to_regprocedure('public.boardmate_plakoro_get_setup_status_v2(text,uuid)') is not null
order by 1;
