-- BoardMate Arcade 공유 기록 + 회원/온라인 방/비공개 레이팅
-- Supabase > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 되도록 작성했습니다.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. 데일리/솔로 순위표
-- ============================================================
create table if not exists public.boardmate_results (
  id bigint generated always as identity primary key,
  game text not null check (game in ('ricochet','pensterdam','yahtzee')),
  period_key text not null,
  player_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 20),
  metric integer not null default 0,
  completed_at timestamptz not null default now(),
  unique (game, period_key, player_id)
);

create index if not exists boardmate_results_lookup
  on public.boardmate_results (game, period_key, metric, completed_at);

alter table public.boardmate_results enable row level security;
drop policy if exists "boardmate public read" on public.boardmate_results;
create policy "boardmate public read"
  on public.boardmate_results for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.boardmate_results from anon, authenticated;
grant select on public.boardmate_results to anon, authenticated;

create or replace function public.submit_boardmate_result(
  p_game text,
  p_period_key text,
  p_player_id text,
  p_nickname text,
  p_metric integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game not in ('ricochet','pensterdam','yahtzee') then
    raise exception 'invalid game';
  end if;
  if char_length(trim(p_nickname)) < 1 or char_length(trim(p_nickname)) > 20 then
    raise exception 'invalid nickname';
  end if;
  if char_length(p_player_id) < 8 or char_length(p_player_id) > 80 then
    raise exception 'invalid player';
  end if;

  if p_game = 'ricochet' then
    if p_metric < 1 or p_metric > 200 then raise exception 'invalid metric'; end if;
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),p_metric)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname,
          metric = case when excluded.metric < boardmate_results.metric then excluded.metric else boardmate_results.metric end,
          completed_at = case when excluded.metric < boardmate_results.metric then now() else boardmate_results.completed_at end;

  elsif p_game = 'pensterdam' then
    -- Pentorini: 도움칸 사용 수가 적을수록 우선, 같은 수면 먼저 완성한 기록 유지.
    if p_metric < 0 or p_metric > 5 then raise exception 'invalid metric'; end if;
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),p_metric)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname,
          metric = case when excluded.metric < boardmate_results.metric then excluded.metric else boardmate_results.metric end,
          completed_at = case when excluded.metric < boardmate_results.metric then now() else boardmate_results.completed_at end;

  else
    if p_metric < 0 or p_metric > 2000 then raise exception 'invalid metric'; end if;
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),p_metric)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname,
          metric = case when excluded.metric > boardmate_results.metric then excluded.metric else boardmate_results.metric end,
          completed_at = case when excluded.metric > boardmate_results.metric then now() else boardmate_results.completed_at end;
  end if;
end;
$$;

grant execute on function public.submit_boardmate_result(text,text,text,text,integer) to anon, authenticated;

-- ============================================================
-- 2. 회원: 화면에는 닉네임/비밀번호만 받습니다.
-- 실제 인증은 Supabase Auth를 사용하고, 이메일은 사이트가 내부적으로 생성합니다.
-- Authentication > Providers > Email > Confirm email 은 OFF 로 설정하세요.
-- ============================================================
create table if not exists public.boardmate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  nickname_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.boardmate_profiles enable row level security;
drop policy if exists "profiles readable by members" on public.boardmate_profiles;
create policy "profiles readable by members" on public.boardmate_profiles
  for select to authenticated using (true);
drop policy if exists "profile owner update" on public.boardmate_profiles;
create policy "profile owner update" on public.boardmate_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, update on public.boardmate_profiles to authenticated;

create or replace function public.handle_boardmate_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n text;
begin
  n := trim(coalesce(new.raw_user_meta_data->>'nickname',''));
  if char_length(n) < 1 or char_length(n) > 20 then
    raise exception 'invalid nickname';
  end if;
  insert into public.boardmate_profiles(user_id,nickname,nickname_key)
  values(new.id,n,lower(n));
  return new;
end;
$$;

drop trigger if exists on_boardmate_auth_user_created on auth.users;
create trigger on_boardmate_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_boardmate_new_user();

-- ============================================================
-- 3. 온라인 방/멤버/공유 게임상태
-- ============================================================
create table if not exists public.boardmate_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  game text not null check (game in ('maskmen','acquire')),
  max_players integer not null check (max_players between 3 and 6),
  host_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  status text not null default 'open' check (status in ('open','playing','finished')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.boardmate_room_members (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  seat integer not null,
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id),
  unique(room_id,seat)
);

create table if not exists public.boardmate_room_state (
  room_id uuid primary key references public.boardmate_rooms(id) on delete cascade,
  revision bigint not null default 0,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.boardmate_rooms enable row level security;
alter table public.boardmate_room_members enable row level security;
alter table public.boardmate_room_state enable row level security;

drop policy if exists "rooms readable by members" on public.boardmate_rooms;
create policy "rooms readable by members" on public.boardmate_rooms
  for select to authenticated using (true);
drop policy if exists "room members readable" on public.boardmate_room_members;
create policy "room members readable" on public.boardmate_room_members
  for select to authenticated using (true);
drop policy if exists "room state readable by members" on public.boardmate_room_state;
create policy "room state readable by members" on public.boardmate_room_state
  for select to authenticated using (
    exists(select 1 from public.boardmate_room_members m where m.room_id=boardmate_room_state.room_id and m.user_id=auth.uid())
  );

grant select on public.boardmate_rooms, public.boardmate_room_members, public.boardmate_room_state to authenticated;
revoke insert, update, delete on public.boardmate_rooms, public.boardmate_room_members, public.boardmate_room_state from authenticated;

create or replace function public.create_boardmate_room(p_title text,p_game text,p_max_players integer)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_game not in ('maskmen','acquire') then raise exception 'invalid game'; end if;
  if p_max_players < 3 or p_max_players > 6 then raise exception 'invalid max players'; end if;
  if char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 40 then raise exception 'invalid title'; end if;
  insert into public.boardmate_rooms(title,game,max_players,host_id)
  values(trim(p_title),p_game,p_max_players,auth.uid()) returning id into rid;
  insert into public.boardmate_room_members(room_id,user_id,seat) values(rid,auth.uid(),0);
  return rid;
end;
$$;

grant execute on function public.create_boardmate_room(text,text,integer) to authenticated;

create or replace function public.join_boardmate_room(p_room_id uuid)
returns integer
language plpgsql security definer set search_path=public
as $$
declare r public.boardmate_rooms%rowtype; s integer; cnt integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception 'room not found'; end if;
  if r.status <> 'open' then raise exception 'room is not open'; end if;
  select seat into s from public.boardmate_room_members where room_id=p_room_id and user_id=auth.uid();
  if found then return s; end if;
  select count(*) into cnt from public.boardmate_room_members where room_id=p_room_id;
  if cnt >= r.max_players then raise exception 'room full'; end if;
  select coalesce(min(x),0) into s from generate_series(0,r.max_players-1) x
    where not exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.seat=x);
  insert into public.boardmate_room_members(room_id,user_id,seat) values(p_room_id,auth.uid(),s);
  return s;
end;
$$;
grant execute on function public.join_boardmate_room(uuid) to authenticated;

create or replace function public.leave_boardmate_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
declare r public.boardmate_rooms%rowtype;
begin
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then return; end if;
  if r.status <> 'open' then raise exception 'playing room cannot be left here'; end if;
  delete from public.boardmate_room_members where room_id=p_room_id and user_id=auth.uid();
  if r.host_id=auth.uid() then delete from public.boardmate_rooms where id=p_room_id;
  end if;
end;
$$;
grant execute on function public.leave_boardmate_room(uuid) to authenticated;

create or replace function public.start_boardmate_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
declare r public.boardmate_rooms%rowtype; cnt integer;
begin
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception 'room not found'; end if;
  if r.host_id<>auth.uid() then raise exception 'host only'; end if;
  if r.status<>'open' then raise exception 'room is not open'; end if;
  select count(*) into cnt from public.boardmate_room_members where room_id=p_room_id;
  if cnt < 3 then raise exception 'at least 3 players required'; end if;
  update public.boardmate_rooms set status='playing',started_at=now() where id=p_room_id;
end;
$$;
grant execute on function public.start_boardmate_room(uuid) to authenticated;

create or replace function public.put_boardmate_room_state(p_room_id uuid,p_expected_revision bigint,p_state jsonb)
returns bigint
language plpgsql security definer set search_path=public
as $$
declare rev bigint; newrev bigint;
begin
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=auth.uid()) then
    raise exception 'not a room member';
  end if;
  if not exists(select 1 from public.boardmate_rooms where id=p_room_id and status='playing') then
    raise exception 'room is not playing';
  end if;
  select revision into rev from public.boardmate_room_state where room_id=p_room_id for update;
  if not found then
    if p_expected_revision<>0 then raise exception 'revision conflict'; end if;
    insert into public.boardmate_room_state(room_id,revision,state) values(p_room_id,1,p_state);
    return 1;
  end if;
  if rev<>p_expected_revision then raise exception 'revision conflict'; end if;
  newrev:=rev+1;
  update public.boardmate_room_state set revision=newrev,state=p_state,updated_at=now() where room_id=p_room_id;
  return newrev;
end;
$$;
grant execute on function public.put_boardmate_room_state(uuid,bigint,jsonb) to authenticated;

-- ============================================================
-- 4. 게임별 비공개 ELO + 공개 티어용 통계
-- ============================================================
create table if not exists public.boardmate_ratings (
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  game text not null check (game in ('maskmen','acquire')),
  elo numeric not null default 1000,
  wins numeric(10,3) not null default 0,
  losses numeric(10,3) not null default 0,
  games integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id,game)
);

create table if not exists public.boardmate_matches (
  room_id uuid primary key references public.boardmate_rooms(id) on delete restrict,
  game text not null,
  finishing_order uuid[] not null,
  created_at timestamptz not null default now()
);

alter table public.boardmate_ratings enable row level security;
alter table public.boardmate_matches enable row level security;
-- 원본 ELO 테이블에는 클라이언트 SELECT 권한을 주지 않습니다.
revoke all on public.boardmate_ratings from anon, authenticated;
revoke all on public.boardmate_matches from anon, authenticated;

create or replace view public.boardmate_rating_public as
with ranked as (
  select user_id,game,rank() over(partition by game order by elo desc, games desc, updated_at asc) as elo_rank
  from public.boardmate_ratings where games>0
)
select r.user_id,r.game,r.wins,r.losses,r.games,ranked.elo_rank
from public.boardmate_ratings r
left join ranked using(user_id,game);

grant select on public.boardmate_rating_public to authenticated;

create or replace function public.submit_boardmate_match(p_room_id uuid,p_order uuid[])
returns void
language plpgsql security definer set search_path=public
as $$
declare
  r public.boardmate_rooms%rowtype;
  n integer; i integer; j integer;
  uid uuid; ri numeric; rj numeric; expected numeric; actual numeric; delta numeric;
  ratings numeric[] := array[]::numeric[];
  members_count integer;
begin
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception 'room not found'; end if;
  if r.host_id<>auth.uid() then raise exception 'host only'; end if;
  if r.status<>'playing' then raise exception 'room not playing'; end if;
  if exists(select 1 from public.boardmate_matches where room_id=p_room_id) then raise exception 'already submitted'; end if;
  n:=coalesce(array_length(p_order,1),0);
  select count(*) into members_count from public.boardmate_room_members where room_id=p_room_id;
  if n<>members_count or n<3 then raise exception 'invalid order'; end if;
  if (select count(distinct uid) from unnest(p_order) as t(uid))<>n then raise exception 'duplicate player'; end if;
  if exists(select 1 from unnest(p_order) as t(uid) where not exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=t.uid)) then
    raise exception 'invalid player';
  end if;

  for i in 1..n loop
    uid:=p_order[i];
    insert into public.boardmate_ratings(user_id,game) values(uid,r.game)
      on conflict(user_id,game) do nothing;
    select elo into ri from public.boardmate_ratings where user_id=uid and game=r.game;
    ratings:=array_append(ratings,ri);
  end loop;

  for i in 1..n loop
    delta:=0;
    ri:=ratings[i];
    for j in 1..n loop
      if i=j then continue; end if;
      rj:=ratings[j];
      expected:=1.0/(1.0+power(10.0,(rj-ri)/400.0));
      actual:=case when i<j then 1.0 when i>j then 0.0 else 0.5 end;
      delta:=delta + (24.0/(n-1))*(actual-expected);
    end loop;
    update public.boardmate_ratings
      set elo=elo+delta,
          wins=wins+(case when i=1 then 1 else 0 end),
          losses=losses+(case when i=1 then 0 else 1.0/(n-1) end),
          games=games+1,
          updated_at=now()
      where user_id=p_order[i] and game=r.game;
  end loop;

  insert into public.boardmate_matches(room_id,game,finishing_order) values(p_room_id,r.game,p_order);
  update public.boardmate_rooms set status='finished',finished_at=now() where id=p_room_id;
end;
$$;
grant execute on function public.submit_boardmate_match(uuid,uuid[]) to authenticated;
