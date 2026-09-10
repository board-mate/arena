-- BoardMate Arena v11.4.30 targeted verification
select to_regprocedure('public.get_boardmate_fantasy_state(text,uuid)') is not null as fantasy_get_ok;
select to_regprocedure('public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb)') is not null as fantasy_put_ok;
select to_regprocedure('public.claim_boardmate_fantasy_controller(text,uuid)') is not null as fantasy_claim_ok;
select to_regprocedure('public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean)') is not null as plakoro_setup_ok;
select to_regprocedure('public.boardmate_plakoro_get_setup_pair_v2(text,uuid)') is not null as plakoro_pair_ok;
select to_regprocedure('public.boardmate_plakoro_put_action(text,uuid,text,jsonb)') is not null as plakoro_action_ok;
select to_regprocedure('public.boardmate_get_cancel_status(text,uuid)') is not null as cancel_status_ok;
select to_regprocedure('public.boardmate_set_cancel_vote(text,uuid,boolean)') is not null as cancel_vote_ok;
