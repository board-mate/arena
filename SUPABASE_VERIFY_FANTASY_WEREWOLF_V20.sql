-- BoardMate Arena v11.4.20: Fantasy Realms / One Night Werewolf verification
-- Run AFTER SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql.

with checks(name, ok, detail) as (
  values
    ('fantasy get RPC', to_regprocedure('public.get_boardmate_fantasy_state(text,uuid)') is not null,
      coalesce(to_regprocedure('public.get_boardmate_fantasy_state(text,uuid)')::text,'missing')),
    ('fantasy put RPC', to_regprocedure('public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb)') is not null,
      coalesce(to_regprocedure('public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb)')::text,'missing')),
    ('social init RPC', to_regprocedure('public.boardmate_social_init(text,uuid,jsonb)') is not null,
      coalesce(to_regprocedure('public.boardmate_social_init(text,uuid,jsonb)')::text,'missing')),
    ('social view RPC', to_regprocedure('public.boardmate_social_view(text,uuid)') is not null,
      coalesce(to_regprocedure('public.boardmate_social_view(text,uuid)')::text,'missing')),
    ('social action RPC', to_regprocedure('public.boardmate_social_action(text,uuid,jsonb)') is not null,
      coalesce(to_regprocedure('public.boardmate_social_action(text,uuid,jsonb)')::text,'missing')),
    ('current room creator', to_regprocedure('public.create_boardmate_room_v10(text,text,text)') is not null,
      coalesce(to_regprocedure('public.create_boardmate_room_v10(text,text,text)')::text,'missing')),
    ('fantasy private table', to_regclass('public.boardmate_game_private_states') is not null,
      coalesce(to_regclass('public.boardmate_game_private_states')::text,'missing')),
    ('social private table', to_regclass('public.boardmate_social_games') is not null,
      coalesce(to_regclass('public.boardmate_social_games')::text,'missing')),
    ('Fantasy min players = 3', coalesce(public.boardmate_game_min('fantasyrealms')=3,false),
      public.boardmate_game_min('fantasyrealms')::text),
    ('Werewolf min players = 3', coalesce(public.boardmate_game_min('onenightwerewolf')=3,false),
      public.boardmate_game_min('onenightwerewolf')::text),
    ('Plakoro preserved', coalesce(public.boardmate_game_max('plakoro')=2,false),
      public.boardmate_game_max('plakoro')::text)
)
select * from checks
union all
select
  'room game CHECK has Fantasy/Werewolf/Plakoro',
  bool_or(
    pg_get_constraintdef(c.oid) like '%fantasyrealms%'
    and pg_get_constraintdef(c.oid) like '%onenightwerewolf%'
    and pg_get_constraintdef(c.oid) like '%plakoro%'
  ),
  string_agg(pg_get_constraintdef(c.oid), E'\n')
from pg_constraint c
join pg_class t on t.oid=c.conrelid
join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and t.relname='boardmate_rooms' and c.contype='c';
