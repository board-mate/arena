-- BoardMate Arena v11.4.29 Plakoro Pokemon V6 verification
select 'setup table' as item, to_regclass('public.boardmate_plakoro_setups') is not null as ok
union all select 'actions table', to_regclass('public.boardmate_plakoro_actions') is not null
union all select 'set setup RPC', to_regprocedure('public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean)') is not null
union all select 'status RPC', to_regprocedure('public.boardmate_plakoro_get_setup_status_v2(text,uuid)') is not null
union all select 'self RPC', to_regprocedure('public.boardmate_plakoro_get_setup_self_v2(text,uuid)') is not null
union all select 'pair RPC', to_regprocedure('public.boardmate_plakoro_get_setup_pair_v2(text,uuid)') is not null
union all select 'put action RPC', to_regprocedure('public.boardmate_plakoro_put_action(text,uuid,text,jsonb)') is not null
union all select 'take action RPC', to_regprocedure('public.boardmate_plakoro_take_action(text,uuid,integer)') is not null;
