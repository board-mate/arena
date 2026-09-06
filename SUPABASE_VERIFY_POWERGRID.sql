-- Safe verification after SUPABASE_POWERGRID_UNIFIED.sql
select
  to_regprocedure('public.create_boardmate_room_v9(text,text,text)') is not null as create_room_v9_exists,
  public.boardmate_game_min('powergrid') = 2 as powergrid_min_2,
  public.boardmate_game_max('powergrid') = 6 as powergrid_max_6,
  public.boardmate_game_ko('powergrid') = '파워그리드' as powergrid_name_ok,
  to_regprocedure('public.get_boardmate_room_state(text,uuid)') is not null as common_get_state_exists,
  to_regprocedure('public.put_boardmate_room_state(text,uuid,bigint,jsonb)') is not null as common_put_state_exists;
