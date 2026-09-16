-- BoardMate Arena V11.4.74 - BGG rule audit player-count migration
-- Run AFTER previous BoardMate migrations (including Project L V1).
-- Idempotent: replaces only the min/max helper functions.

begin;

create or replace function public.boardmate_game_max(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','quacks','mandom','samurai','eldorado','panam','planetx','projectl') then 4
    when p_game in ('pocketnova','plakoro','airlandsea') then 2
    when p_game='thegame' then 5
    when p_game='kraken' then 8
    when p_game in ('fantasyrealms','fantasyrealmsgreek','powergrid') then 6
    when p_game in ('avalon','secrethitler','onenightwerewolf') then 10
    else 6 end;
$$;
revoke all on function public.boardmate_game_max(text) from public, anon, authenticated;

create or replace function public.boardmate_game_min(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','pocketnova','thegame','plakoro','quacks','mandom','samurai','eldorado','panam','projectl','airlandsea','planetx','fantasyrealms','fantasyrealmsgreek') then 2
    -- Acquire and Maskmen are kept at 3 until their edition-specific 2p rules are explicitly implemented.
    -- Power Grid remains 3p+ by BoardMate project decision.
    when p_game in ('maskmen','acquire','kraken','powergrid','onenightwerewolf') then 3
    when p_game in ('avalon','secrethitler') then 5
    else 2 end;
$$;
revoke all on function public.boardmate_game_min(text) from public, anon, authenticated;

notify pgrst,'reload schema';
commit;
