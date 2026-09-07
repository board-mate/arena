-- BoardMate Arena: social deduction room capacity fix
-- Fixes: new row for relation "boardmate_rooms" violates check constraint
--        "boardmate_rooms_max_players_check"
-- Existing schemas capped rooms at 8, while Avalon / Secret Hitler / One Night Werewolf use up to 10.

begin;

alter table public.boardmate_rooms
  drop constraint if exists boardmate_rooms_max_players_check;

alter table public.boardmate_rooms
  add constraint boardmate_rooms_max_players_check
  check (max_players between 2 and 10);

commit;

-- Verification: expected definition contains "max_players >= 2" and "max_players <= 10".
select c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid=c.conrelid
join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public'
  and t.relname='boardmate_rooms'
  and c.conname='boardmate_rooms_max_players_check';

-- These should return 10 after SUPABASE_SOCIAL_DEDUCTION_V1.sql has also been applied.
select
  public.boardmate_game_max('avalon') as avalon_max,
  public.boardmate_game_max('secrethitler') as secret_hitler_max,
  public.boardmate_game_max('onenightwerewolf') as one_night_werewolf_max;
