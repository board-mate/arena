-- BoardMate Arcade integrated v11.4.8 verification
-- Read-only verification. It does not modify data.

select
  to_regclass('public.boardmate_room_state') is not null as room_state_table_exists,
  to_regprocedure('public.put_boardmate_room_state(text,uuid,bigint,jsonb)') is not null as put_state_rpc_exists,
  to_regprocedure('public.get_boardmate_room_state(text,uuid)') is not null as get_state_rpc_exists,
  to_regclass('public.boardmate_game_private_states') is not null as fantasy_private_table_exists,
  to_regprocedure('public.get_boardmate_fantasy_state(text,uuid)') is not null as fantasy_get_rpc_exists,
  to_regprocedure('public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb)') is not null as fantasy_put_rpc_exists;

select
  public.boardmate_game_min('fantasyrealms') as fantasy_min_players,
  public.boardmate_game_max('fantasyrealms') as fantasy_max_players,
  public.boardmate_game_ko('fantasyrealms') as fantasy_name;

select
  has_function_privilege(
    'anon',
    'public.get_boardmate_room_state(text,uuid)',
    'EXECUTE'
  ) as anon_can_get_room_state,
  has_function_privilege(
    'anon',
    'public.put_boardmate_room_state(text,uuid,bigint,jsonb)',
    'EXECUTE'
  ) as anon_can_put_room_state,
  has_function_privilege(
    'anon',
    'public.get_boardmate_fantasy_state(text,uuid)',
    'EXECUTE'
  ) as anon_can_get_fantasy_state,
  has_function_privilege(
    'anon',
    'public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb)',
    'EXECUTE'
  ) as anon_can_put_fantasy_state;

select
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname='public'
  and t.relname in ('boardmate_rooms','boardmate_ratings')
  and c.conname in ('boardmate_rooms_game_check','boardmate_ratings_game_check')
order by t.relname;

-- Expected:
-- all *_exists = true
-- fantasy_min_players = 3
-- fantasy_max_players = 6
-- fantasy_name = 판타지 왕국
-- four anon_can_* values = true
-- game constraints include fantasyrealms
--
-- v11.4 uses Realtime Broadcast, not Postgres Changes.
-- Do NOT add boardmate_room_state to supabase_realtime publication for this design.
