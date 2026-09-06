-- BoardMate Arcade v11.4
-- Supabase Realtime setup / verification
--
-- IMPORTANT:
-- v11.4 uses Supabase Realtime Broadcast as a lightweight "state changed"
-- signal. It does NOT use Postgres Changes, so boardmate_room_state does not
-- need to be added to supabase_realtime publication.
--
-- The channel is intentionally PUBLIC because BoardMate uses its own
-- nickname+PIN session system rather than Supabase Auth. No game state or
-- secret information is placed in the broadcast payload. A receiver only
-- gets { revision } and must call the existing membership-protected
-- get_boardmate_room_state RPC to retrieve the actual state.
--
-- Therefore there is NO destructive schema migration required for v11.4.
-- Run this file in Supabase SQL Editor to verify the existing v11.3 setup.

select
  to_regclass('public.boardmate_room_state') is not null
    as room_state_table_exists,
  to_regprocedure('public.put_boardmate_room_state(text,uuid,bigint,jsonb)') is not null
    as put_state_rpc_exists,
  to_regprocedure('public.get_boardmate_room_state(text,uuid)') is not null
    as get_state_rpc_exists;

select
  has_function_privilege(
    'anon',
    'public.put_boardmate_room_state(text,uuid,bigint,jsonb)',
    'EXECUTE'
  ) as anon_can_put_state,
  has_function_privilege(
    'anon',
    'public.get_boardmate_room_state(text,uuid)',
    'EXECUTE'
  ) as anon_can_get_state;

-- Expected result for a healthy existing installation:
-- room_state_table_exists = true
-- put_state_rpc_exists    = true
-- get_state_rpc_exists   = true
-- anon_can_put_state      = true
-- anon_can_get_state      = true
--
-- No INSERT/UPDATE/DELETE permissions are granted here.
-- Do NOT add boardmate_room_state to supabase_realtime for this v11.4 design.
