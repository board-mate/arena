-- BoardMate Arena Social Deduction V1 verification
-- Run AFTER SUPABASE_SOCIAL_DEDUCTION_V1.sql in Supabase SQL Editor.
-- This script does not change game data. It raises an exception if a required object/rule is missing.

do $$
declare rls_enabled boolean;
begin
  if to_regclass('public.boardmate_social_games') is null then
    raise exception 'FAIL: boardmate_social_games table is missing';
  end if;

  if to_regprocedure('public.create_boardmate_room_v10(text,text,text)') is null then
    raise exception 'FAIL: create_boardmate_room_v10 is missing';
  end if;
  if to_regprocedure('public.boardmate_social_init(text,uuid,jsonb)') is null then
    raise exception 'FAIL: boardmate_social_init is missing';
  end if;
  if to_regprocedure('public.boardmate_social_view(text,uuid)') is null then
    raise exception 'FAIL: boardmate_social_view is missing';
  end if;
  if to_regprocedure('public.boardmate_social_action(text,uuid,jsonb)') is null then
    raise exception 'FAIL: boardmate_social_action is missing';
  end if;

  select c.relrowsecurity into rls_enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='boardmate_social_games';
  if not coalesce(rls_enabled,false) then
    raise exception 'FAIL: RLS is not enabled on boardmate_social_games';
  end if;

  if has_table_privilege('anon','public.boardmate_social_games','SELECT')
     or has_table_privilege('authenticated','public.boardmate_social_games','SELECT') then
    raise exception 'FAIL: raw secret table is directly readable by client roles';
  end if;

  if public.boardmate_game_min('avalon')<>5 or public.boardmate_game_max('avalon')<>10 then
    raise exception 'FAIL: Avalon player range';
  end if;
  if public.boardmate_game_min('secrethitler')<>5 or public.boardmate_game_max('secrethitler')<>10 then
    raise exception 'FAIL: Secret Hitler player range';
  end if;
  if public.boardmate_game_min('onenightwerewolf')<>3 or public.boardmate_game_max('onenightwerewolf')<>10 then
    raise exception 'FAIL: ONUW player range';
  end if;

  if public.boardmate_avalon_good_count(5)<>3
     or public.boardmate_avalon_good_count(10)<>6
     or public.boardmate_avalon_team_size(5,0)<>2
     or public.boardmate_avalon_team_size(7,3)<>4
     or public.boardmate_avalon_team_size(10,4)<>5 then
    raise exception 'FAIL: Avalon setup/quest-size helpers';
  end if;

  if public.boardmate_sh_power(5,3)<>'policy_peek'
     or public.boardmate_sh_power(5,4)<>'execute'
     or public.boardmate_sh_power(7,2)<>'investigate'
     or public.boardmate_sh_power(7,3)<>'special_election'
     or public.boardmate_sh_power(9,1)<>'investigate'
     or public.boardmate_sh_power(9,3)<>'special_election'
     or public.boardmate_sh_power(10,5)<>'execute' then
    raise exception 'FAIL: Secret Hitler presidential-power track';
  end if;
end $$;

select 'PASS' as result,
       'Social Deduction V1 objects, private-state protection, player ranges and core helper tables verified.' as message;

-- Pokemon Minima keeps the legacy DB key `pocketnova`, but it is a strict 2-player game.
select public.boardmate_game_max('pocketnova') as pokemon_minima_max_players,
       public.boardmate_game_min('pocketnova') as pokemon_minima_min_players,
       public.boardmate_game_ko('pocketnova') as pokemon_minima_display_name;
