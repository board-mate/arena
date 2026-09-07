-- BoardMate Arcade v11.4.12 — Plakoro PvP source-based upgrade
-- Incremental migration. Run AFTER the existing:
-- SUPABASE_BOARDMATE_GAME_CATALOG_V2.sql
--
-- The uploaded Plakoro HTML supports:
-- - 2 players
-- - each player selects 1 Pokemon + 4 attack cards from the supplied dataset
-- - each player can configure 3 energy dice x 6 faces
-- - host browser remains authoritative for dice rolls and damage
-- - selected attack actions are kept out of public room_state
--   (stored in this private action table and only surfaced to the host)
--
begin;

create table if not exists public.boardmate_plakoro_actions (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  seat integer not null check (seat between 0 and 1),
  action text not null check (action in ('SELECT_ATTACK','ROLL','CHOOSE_FORBID')),
  payload jsonb not null default '{}'::jsonb,
  nonce bigint not null default floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
  updated_at timestamptz not null default now(),
  primary key (room_id,user_id),
  unique(room_id,seat)
);

alter table public.boardmate_plakoro_actions enable row level security;
revoke all on public.boardmate_plakoro_actions from anon, authenticated;

create or replace function public.boardmate_plakoro_set_setup_v2(
  p_token text,
  p_room_id uuid,
  p_pokemon text,
  p_attacks jsonb,
  p_energy jsonb,
  p_ready boolean default true
)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid; r public.boardmate_rooms%rowtype; seat_no integer;
  allowed text[]; got text[]; distinct_n integer;
  energy_ok boolean := true;
  die jsonb; face text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found or r.game<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if r.status<>'playing' then raise exception '먼저 대기실에서 게임 시작을 눌러주세요.'; end if;

  select seat into seat_no
  from public.boardmate_room_members
  where room_id=p_room_id and user_id=uid;
  if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
  if seat_no not between 0 and 1 then raise exception '프라코로는 2인만 참가할 수 있습니다.'; end if;

  allowed:=case p_pokemon
    when 'bulbasaur' then array['bulbasaur-0','bulbasaur-1','bulbasaur-2','bulbasaur-3']
    when 'charmander' then array['charmander-0','charmander-1','charmander-2','charmander-3']
    when 'squirtle' then array['squirtle-0','squirtle-1','squirtle-2','squirtle-3']
    when 'pikachu' then array['pikachu-0','pikachu-1','pikachu-2','pikachu-3']
    when 'eevee' then array['eevee-0','eevee-1','eevee-2','eevee-3']
    when 'mew' then array['mew-0','mew-1','mew-2','mew-3']
    else null
  end;
  if allowed is null then raise exception '선택할 수 없는 포켓몬입니다.'; end if;

  if jsonb_typeof(p_attacks)<>'array' then raise exception '기술 카드 4장을 선택해야 합니다.'; end if;
  select array_agg(value) into got from jsonb_array_elements_text(p_attacks);
  if coalesce(array_length(got,1),0)<>4 then
    raise exception '제공된 프라코로 HTML 기준으로는 기술 카드 4장을 선택해야 합니다.';
  end if;
  select count(distinct x) into distinct_n from unnest(got) x;
  if distinct_n<>4 then raise exception '서로 다른 기술 카드 4장을 선택하세요.'; end if;
  if exists(select 1 from unnest(got) x where not (x=any(allowed))) then
    raise exception '선택한 기술 카드가 해당 포켓몬의 기술 카드가 아닙니다.';
  end if;

  if jsonb_typeof(p_energy)<>'array' or jsonb_array_length(p_energy)<>3 then
    raise exception '에너지코로는 3개가 필요합니다.';
  end if;

  for die in select value from jsonb_array_elements(p_energy)
  loop
    if jsonb_typeof(die)<>'array' or jsonb_array_length(die)<>6 then
      raise exception '각 에너지코로는 6면이어야 합니다.';
    end if;
    for face in select value::text from jsonb_array_elements_text(die)
    loop
      if face not in ('grass','fire','water','lightning','psychic','fight','dark','steel','dragon','flying','colorless') then
        raise exception '에너지코로에 허용되지 않는 에너지 타입입니다.';
      end if;
    end loop;
  end loop;

  insert into public.boardmate_plakoro_setups(room_id,user_id,seat,payload,ready,updated_at)
  values(
    p_room_id,uid,seat_no,
    jsonb_build_object(
      'pokemon',p_pokemon,
      'attacks',to_jsonb(got),
      'energyFaces',p_energy
    ),
    coalesce(p_ready,false),now()
  )
  on conflict(room_id,user_id) do update set
    seat=excluded.seat,
    payload=excluded.payload,
    ready=excluded.ready,
    updated_at=now();

  return true;
end;
$$;
grant execute on function public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean) to anon, authenticated;

create or replace function public.boardmate_plakoro_get_setup_status_v2(
  p_token text,p_room_id uuid
)
returns table(seat integer, ready boolean)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; rgame text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select game into rgame from public.boardmate_rooms where id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  return query
    select m.seat, coalesce(s.ready,false)
    from public.boardmate_room_members m
    left join public.boardmate_plakoro_setups s
      on s.room_id=m.room_id and s.user_id=m.user_id
    where m.room_id=p_room_id and m.seat between 0 and 1
    order by m.seat;
end;
$$;
grant execute on function public.boardmate_plakoro_get_setup_status_v2(text,uuid) to anon, authenticated;

create or replace function public.boardmate_plakoro_get_setup_self_v2(
  p_token text,p_room_id uuid
)
returns table(seat integer, ready boolean, payload jsonb)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; rgame text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select game into rgame from public.boardmate_rooms where id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  return query
    select s.seat,s.ready,s.payload
    from public.boardmate_plakoro_setups s
    where s.room_id=p_room_id and s.user_id=uid;
end;
$$;
grant execute on function public.boardmate_plakoro_get_setup_self_v2(text,uuid) to anon, authenticated;

create or replace function public.boardmate_plakoro_get_setup_pair_v2(
  p_token text,p_room_id uuid
)
returns table(seat integer,payload jsonb)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; host uuid; rgame text; cnt integer;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select game,host_id into rgame,host from public.boardmate_rooms where id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if host<>uid then raise exception '방장만 준비된 양쪽 구성을 확인할 수 있습니다.'; end if;
  select count(*) into cnt from public.boardmate_plakoro_setups
    where room_id=p_room_id and ready=true and seat between 0 and 1;
  if cnt<2 then raise exception '두 플레이어 모두 준비를 완료해야 합니다.'; end if;
  return query
    select s.seat,s.payload
    from public.boardmate_plakoro_setups s
    where s.room_id=p_room_id and s.ready=true and s.seat between 0 and 1
    order by s.seat;
end;
$$;
grant execute on function public.boardmate_plakoro_get_setup_pair_v2(text,uuid) to anon, authenticated;

create or replace function public.boardmate_plakoro_put_action(
  p_token text,p_room_id uuid,p_action text,p_payload jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; seat_no integer; rgame text; rstatus text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_action not in ('SELECT_ATTACK','ROLL','CHOOSE_FORBID') then
    raise exception '허용되지 않는 액션입니다.';
  end if;
  select game,status into rgame,rstatus from public.boardmate_rooms where id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if rstatus<>'playing' then raise exception '게임이 시작되지 않았습니다.'; end if;
  select seat into seat_no from public.boardmate_room_members
    where room_id=p_room_id and user_id=uid;
  if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;

  insert into public.boardmate_plakoro_actions(room_id,user_id,seat,action,payload,nonce,updated_at)
  values(p_room_id,uid,seat_no,p_action,coalesce(p_payload,'{}'::jsonb),floor(extract(epoch from clock_timestamp())*1000)::bigint,now())
  on conflict(room_id,user_id) do update set
    seat=excluded.seat,
    action=excluded.action,
    payload=excluded.payload,
    nonce=excluded.nonce,
    updated_at=now();
  return true;
end;
$$;
grant execute on function public.boardmate_plakoro_put_action(text,uuid,text,jsonb) to anon, authenticated;

create or replace function public.boardmate_plakoro_take_action(
  p_token text,p_room_id uuid,p_seat integer
)
returns table(seat integer,action text,payload jsonb,nonce bigint)
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; host uuid; rgame text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select game,host_id into rgame,host from public.boardmate_rooms where id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if host<>uid then raise exception '방장만 대기 액션을 가져올 수 있습니다.'; end if;
  if p_seat not between 0 and 1 then return; end if;

  return query
    delete from public.boardmate_plakoro_actions a
    where a.room_id=p_room_id and a.seat=p_seat
    returning a.seat,a.action,a.payload,a.nonce;
end;
$$;
grant execute on function public.boardmate_plakoro_take_action(text,uuid,integer) to anon, authenticated;

commit;

notify pgrst,'reload schema';
