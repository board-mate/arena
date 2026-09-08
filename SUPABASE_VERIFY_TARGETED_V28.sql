-- BoardMate Arena v11.4.28 targeted verification
select
  to_regprocedure('public.boardmate_plakoro_get_setup_pair_v2(text,uuid)') is not null as plakoro_pair_rpc_ok,
  to_regprocedure('public.boardmate_get_cancel_status(text,uuid)') is not null as cancel_status_rpc_ok,
  to_regprocedure('public.boardmate_set_cancel_vote(text,uuid,boolean)') is not null as cancel_vote_rpc_ok,
  to_regclass('public.boardmate_game_cancel_votes') is not null as cancel_vote_table_ok;

select
  public.boardmate_game_min('plakoro') = 2 as plakoro_min_ok,
  public.boardmate_game_max('plakoro') = 2 as plakoro_max_ok;
