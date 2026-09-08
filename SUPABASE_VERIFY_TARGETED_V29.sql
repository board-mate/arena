-- Verify v11.4.29 targeted repair
select to_regprocedure('public.boardmate_get_cancel_status(text,uuid)') as cancel_get_rpc,
       to_regprocedure('public.boardmate_set_cancel_vote(text,uuid,boolean)') as cancel_set_rpc,
       to_regprocedure('public.boardmate_plakoro_get_setup_pair_v2(text,uuid)') as plakoro_pair_rpc;
select to_regclass('public.boardmate_game_cancel_votes') as cancel_votes_table;
select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conname in ('boardmate_rooms_game_check','boardmate_ratings_game_check') order by conname;
