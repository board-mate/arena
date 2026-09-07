-- Verification for BoardMate current game catalog + Plakoro
select
  public.boardmate_game_min('plakoro') as plakoro_min_players,
  public.boardmate_game_max('plakoro') as plakoro_max_players,
  public.boardmate_game_ko('plakoro') as plakoro_name,
  public.boardmate_game_min('pocketnova') as pokemon_min_players,
  public.boardmate_game_max('pocketnova') as pokemon_max_players,
  public.boardmate_game_ko('pocketnova') as pokemon_name;

select
  to_regclass('public.boardmate_plakoro_setups') as plakoro_setup_table,
  to_regprocedure('public.boardmate_plakoro_set_setup(text,uuid,text,jsonb,boolean)') as set_setup_rpc,
  to_regprocedure('public.boardmate_plakoro_get_setup_status(text,uuid)') as setup_status_rpc,
  to_regprocedure('public.boardmate_plakoro_get_setup_self(text,uuid)') as setup_self_rpc,
  to_regprocedure('public.boardmate_plakoro_get_setup_pair(text,uuid)') as setup_pair_rpc,
  to_regprocedure('public.create_boardmate_room_v10(text,text,text)') as create_room_rpc;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('boardmate_rooms_game_check','boardmate_ratings_game_check')
order by conname;
