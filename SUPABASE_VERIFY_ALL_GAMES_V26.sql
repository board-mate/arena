-- BoardMate Arena v11.4.26 verification
-- All returned `ok` values should be true.
with expected(game,minp,maxp) as (values
 ('maskmen',3,6),('acquire',2,6),('calico',2,4),('cascadia',2,4),
 ('thegame',2,5),('kraken',3,8),('fantasyrealms',3,6),('powergrid',3,6),
 ('avalon',5,10),('secrethitler',5,10),('onenightwerewolf',3,10),('plakoro',2,2),
 ('quacks',2,4),('mandom',2,4),('samurai',2,4),('eldorado',2,4),('airlandsea',2,2)
)
select game, public.boardmate_game_min(game)=minp and public.boardmate_game_max(game)=maxp as ok
from expected order by game;

select 'plakoro setup table' item, to_regclass('public.boardmate_plakoro_setups') is not null ok
union all select 'plakoro actions table',to_regclass('public.boardmate_plakoro_actions') is not null
union all select 'plakoro set setup RPC',to_regprocedure('public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean)') is not null
union all select 'plakoro status RPC',to_regprocedure('public.boardmate_plakoro_get_setup_status_v2(text,uuid)') is not null
union all select 'plakoro self RPC',to_regprocedure('public.boardmate_plakoro_get_setup_self_v2(text,uuid)') is not null
union all select 'plakoro pair RPC',to_regprocedure('public.boardmate_plakoro_get_setup_pair_v2(text,uuid)') is not null
union all select 'plakoro put action RPC',to_regprocedure('public.boardmate_plakoro_put_action(text,uuid,text,jsonb)') is not null
union all select 'plakoro take action RPC',to_regprocedure('public.boardmate_plakoro_take_action(text,uuid,integer)') is not null
union all select 'social action RPC',to_regprocedure('public.boardmate_social_action(text,uuid,jsonb)') is not null;

-- Legacy compatibility only. The UI no longer offers this game.
select 'legacy pocketnova key still DB-compatible' item, public.boardmate_game_min('pocketnova')=2 as ok;
