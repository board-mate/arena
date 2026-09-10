-- BoardMate Arena v11.4.24: current game catalog / room migration (all-games-safe)
-- Run this LAST in Supabase SQL Editor after deploying the v11.4.24 web files.
-- Safe/idempotent for current v11.4.x installations. It does NOT delete rooms,
-- ratings, member data, or saved game state.
--
-- Adds multiplayer game ids:
--   quacks, mandom, samurai, eldorado, airlandsea
-- Keeps every previously supported game and re-installs the Fantasy Realms /
-- social-deduction repair RPCs from v11.4.20 so migration order cannot regress them.

begin;

-- -----------------------------------------------------------------------------
-- 1. Unified multiplayer catalog (18 game ids)
-- -----------------------------------------------------------------------------
alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_game_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_game_check
  check (game in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro',
    'quacks','mandom','samurai','eldorado','airlandsea'
  ));

alter table public.boardmate_ratings drop constraint if exists boardmate_ratings_game_check;
alter table public.boardmate_ratings add constraint boardmate_ratings_game_check
  check (game in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro',
    'quacks','mandom','samurai','eldorado','airlandsea'
  ));

create or replace function public.boardmate_game_max(p_game text)
returns integer
language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','quacks','mandom','samurai','eldorado') then 4
    when p_game='pocketnova' then 2
    when p_game in ('plakoro','airlandsea') then 2
    when p_game='thegame' then 5
    when p_game='kraken' then 8
    when p_game in ('fantasyrealms','powergrid') then 6
    when p_game in ('avalon','secrethitler','onenightwerewolf') then 10
    else 6
  end;
$$;
revoke all on function public.boardmate_game_max(text) from public, anon, authenticated;

create or replace function public.boardmate_game_min(p_game text)
returns integer
language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','pocketnova','thegame','plakoro','quacks','mandom','samurai','eldorado','airlandsea') then 2
    when p_game in ('maskmen','acquire','kraken','fantasyrealms','powergrid','onenightwerewolf') then 3
    when p_game in ('avalon','secrethitler') then 5
    else 2
  end;
$$;
revoke all on function public.boardmate_game_min(text) from public, anon, authenticated;

create or replace function public.boardmate_game_ko(p_game text)
returns text
language sql immutable as $$
  select case p_game
    when 'maskmen' then '마스크맨'
    when 'acquire' then '어콰이어'
    when 'calico' then '캘리코'
    when 'cascadia' then '캐스캐디아'
    when 'pocketnova' then '포켓몬 미니마'
    when 'thegame' then '더 게임'
    when 'kraken' then '노터치 크라켄'
    when 'fantasyrealms' then '판타지 왕국'
    when 'powergrid' then '파워그리드'
    when 'avalon' then '레지스탕스 아발론'
    when 'secrethitler' then '시크릿 히틀러'
    when 'onenightwerewolf' then '한밤의 늑대인간'
    when 'plakoro' then '프라코로 포켓몬'
    when 'quacks' then '돌팔이 약장수'
    when 'mandom' then '맨덤의 던전'
    when 'samurai' then '사무라이'
    when 'eldorado' then '엘도라도'
    when 'airlandsea' then '에어 랜드 & 씨'
    else '보드게임'
  end;
$$;
revoke all on function public.boardmate_game_ko(text) from public, anon, authenticated;

create or replace function public.create_boardmate_room_v10(p_token text,p_title text,p_game text)
returns uuid
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid; rid uuid; mx integer; nm text; ttl text; mode text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  if p_game not in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro',
    'quacks','mandom','samurai','eldorado','airlandsea'
  ) then
    raise exception '지원하지 않는 게임입니다.';
  end if;

  select nickname into nm from public.boardmate_profiles where user_id=uid;
  ttl:=trim(coalesce(p_title,''));
  if ttl='' then
    ttl:=left(coalesce(nm,'보드메이트')||'의 '||public.boardmate_game_ko(p_game)||' 한 판',40);
  end if;
  if char_length(ttl)>40 then ttl:=left(ttl,40); end if;

  mx:=public.boardmate_game_max(p_game);
  mode:=case when p_game in ('avalon','secrethitler','onenightwerewolf') then 'realtime' when p_game='quacks' then 'realtime' else 'turn' end;

  insert into public.boardmate_rooms(title,game,max_players,host_id,play_mode)
  values(ttl,p_game,mx,uid,mode)
  returning id into rid;

  insert into public.boardmate_room_members(room_id,user_id,seat)
  values(rid,uid,0);

  return rid;
end;
$$;
grant execute on function public.create_boardmate_room_v10(text,text,text) to anon, authenticated;

-- Turn helper used by room list / direct-resume indicators.
create or replace function public.boardmate_turn_seat(p_game text,p_state jsonb)
returns integer
language plpgsql immutable as $$
declare
  seat integer; p jsonb; qi integer;
begin
  if p_game in ('avalon','secrethitler','onenightwerewolf','quacks') then return null; end if;
  if p_state is null then return null; end if;
  if coalesce((p_state->>'over')::boolean,false)
     or coalesce((p_state->>'gameOver')::boolean,false) then return null; end if;

  if p_game='maskmen' then return nullif(p_state->>'currentTurn','')::integer; end if;

  if p_game='acquire' then
    if p_state->>'phase'='resolve' then
      p:=p_state->'pending';
      if p->>'type'='merger' then
        qi:=coalesce(nullif(p->>'qIndex','')::integer,0);
        seat:=nullif((p->'queue'->qi->>'seat'),'')::integer;
        if seat is not null then return seat; end if;
      elsif p->>'type' in ('founder','survivor') then
        seat:=nullif(p->>'triggerSeat','')::integer;
        if seat is not null then return seat; end if;
      end if;
    end if;
    return nullif(p_state->>'current','')::integer;
  end if;

  if p_game='calico' then
    return coalesce(nullif(p_state->>'active','')::integer,
                    nullif(p_state->>'current','')::integer);
  end if;

  if p_game in ('cascadia','thegame','kraken','fantasyrealms','plakoro','eldorado') then
    return nullif(p_state->>'current','')::integer;
  end if;

  if p_game in ('mandom','airlandsea') then
    return nullif(p_state->>'currentTurn','')::integer;
  end if;

  if p_game='samurai' then
    return nullif(p_state->>'active','')::integer;
  end if;

  if p_game='pocketnova' then return nullif(p_state->>'currentPlayer','')::integer; end if;
  if p_game='powergrid' then return nullif(p_state->>'currentSeat','')::integer; end if;

  return null;
exception when others then
  return null;
end;
$$;
revoke all on function public.boardmate_turn_seat(text,jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Plakoro setup selections.
--    Kept separate until both players have chosen their starter and 4 moves.
-- -----------------------------------------------------------------------------
create table if not exists public.boardmate_plakoro_setups (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  seat integer not null check (seat between 0 and 1),
  payload jsonb not null default '{}'::jsonb,
  ready boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id),
  unique(room_id,seat)
);

alter table public.boardmate_plakoro_setups enable row level security;
revoke all on public.boardmate_plakoro_setups from anon, authenticated;
drop policy if exists "plakoro_setup_no_direct_read" on public.boardmate_plakoro_setups;

create or replace function public.boardmate_plakoro_set_setup(
  p_token text,
  p_room_id uuid,
  p_pokemon text,
  p_attacks jsonb,
  p_ready boolean default true
)
returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid; r public.boardmate_rooms%rowtype; seat_no integer;
  allowed text[]; got text[];
  distinct_n integer;
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
    when 'bulbasaur' then array['whip','leaf','seed','knot','tackle','giga','acid']
    when 'charmander' then array['ember','heat','flame','fang','storm','punch','metal']
    when 'squirtle' then array['water','shell','wave','shellatk','bubble','anger','mud']
    when 'pikachu' then array['bite','shock','rush','thunder10','thunder','volttackle','iron']
    when 'eevee' then array['tail','tackle','rush','bounce','dash','charm','bite']
    when 'mew' then array['psy','beam','barrier','skip','shot','kinetic','reflection']
    else null
  end;
  if allowed is null then raise exception '선택할 수 없는 포켓몬입니다.'; end if;

  if jsonb_typeof(p_attacks)<>'array' then raise exception '기술 카드 4장을 선택해야 합니다.'; end if;
  select array_agg(value) into got from jsonb_array_elements_text(p_attacks);
  if coalesce(array_length(got,1),0)<>4 then raise exception '기술 카드 4장을 선택해야 합니다.'; end if;
  select count(distinct x) into distinct_n from unnest(got) x;
  if distinct_n<>4 then raise exception '서로 다른 기술 카드 4장을 선택하세요.'; end if;
  if exists(select 1 from unnest(got) x where not (x=any(allowed))) then
    raise exception '선택한 기술 카드가 해당 포켓몬의 기술 카드가 아닙니다.';
  end if;

  insert into public.boardmate_plakoro_setups(room_id,user_id,seat,payload,ready,updated_at)
  values(p_room_id,uid,seat_no,
         jsonb_build_object('pokemon',p_pokemon,'attacks',to_jsonb(got)),
         coalesce(p_ready,false),now())
  on conflict(room_id,user_id) do update set
    seat=excluded.seat,
    payload=excluded.payload,
    ready=excluded.ready,
    updated_at=now();

  return true;
end;
$$;
grant execute on function public.boardmate_plakoro_set_setup(text,uuid,text,jsonb,boolean) to anon, authenticated;

create or replace function public.boardmate_plakoro_get_setup_status(p_token text,p_room_id uuid)
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
grant execute on function public.boardmate_plakoro_get_setup_status(text,uuid) to anon, authenticated;

create or replace function public.boardmate_plakoro_get_setup_self(p_token text,p_room_id uuid)
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
grant execute on function public.boardmate_plakoro_get_setup_self(text,uuid) to anon, authenticated;

create or replace function public.boardmate_plakoro_get_setup_pair(p_token text,p_room_id uuid)
returns table(seat integer, payload jsonb)
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
  select count(*) into cnt from public.boardmate_plakoro_setups where room_id=p_room_id and ready=true and seat between 0 and 1;
  if cnt<2 then raise exception '두 플레이어 모두 준비를 완료해야 합니다.'; end if;
  return query
    select s.seat,s.payload
    from public.boardmate_plakoro_setups s
    where s.room_id=p_room_id and s.ready=true and s.seat between 0 and 1
    order by s.seat;
end;
$$;
grant execute on function public.boardmate_plakoro_get_setup_pair(text,uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
