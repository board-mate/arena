-- BoardMate Plakoro V4 verification
select
  public.boardmate_game_min('plakoro') as min_players,
  public.boardmate_game_max('plakoro') as max_players,
  public.boardmate_game_ko('plakoro') as game_name;

select to_regprocedure('public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean)') as setup_rpc,
       to_regprocedure('public.boardmate_plakoro_get_setup_status_v2(text,uuid)') as status_rpc,
       to_regprocedure('public.boardmate_plakoro_get_setup_self_v2(text,uuid)') as self_rpc,
       to_regprocedure('public.boardmate_plakoro_get_setup_pair_v2(text,uuid)') as pair_rpc,
       to_regprocedure('public.boardmate_plakoro_put_action(text,uuid,text,jsonb)') as put_action_rpc,
       to_regprocedure('public.boardmate_plakoro_take_action(text,uuid,integer)') as take_action_rpc;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname='boardmate_rooms_game_check';
