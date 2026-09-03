-- BoardMate Arcade v6
-- 데일리 기록 + 닉네임/PIN 회원 + 관리자 정지/퇴출 + 온라인 방 + 비공개 ELO
-- Supabase > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run 하세요.
-- v3의 이메일 기반 Supabase Auth를 더 이상 사용하지 않습니다.

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
set search_path = public, extensions
as $$
begin
  if p_game not in ('ricochet','pensterdam','yahtzee') then raise exception 'invalid game'; end if;
  if char_length(trim(p_nickname)) < 1 or char_length(trim(p_nickname)) > 20 then raise exception 'invalid nickname'; end if;
  if char_length(p_player_id) < 8 or char_length(p_player_id) > 80 then raise exception 'invalid player'; end if;

  if p_game = 'ricochet' then
    if p_metric < 1 or p_metric > 200 then raise exception 'invalid metric'; end if;
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),p_metric)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname,
          metric = case when excluded.metric < boardmate_results.metric then excluded.metric else boardmate_results.metric end,
          completed_at = case when excluded.metric < boardmate_results.metric then now() else boardmate_results.completed_at end;

  elsif p_game = 'pensterdam' then
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
-- 2. 회원: 이메일 없이 닉네임 + 4자 이상 PIN/비밀번호
--    비밀번호 원문은 저장하지 않고 pgcrypto bcrypt 해시만 저장합니다.
-- ============================================================
create table if not exists public.boardmate_profiles (
  user_id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 20),
  nickname_key text not null unique,
  created_at timestamptz not null default now()
);

-- v3에서 auth.users FK가 있었다면 제거합니다. 기존 닉네임 행은 유지됩니다.
alter table public.boardmate_profiles drop constraint if exists boardmate_profiles_user_id_fkey;
alter table public.boardmate_profiles add column if not exists password_hash text;
alter table public.boardmate_profiles add column if not exists is_admin boolean not null default false;
alter table public.boardmate_profiles add column if not exists suspended_until timestamptz;
alter table public.boardmate_profiles add column if not exists suspension_reason text;

create table if not exists public.boardmate_bans (
  nickname_key text primary key,
  nickname text not null,
  reason text,
  banned_at timestamptz not null default now()
);
alter table public.boardmate_bans enable row level security;
revoke all on public.boardmate_bans from anon, authenticated;

-- v3 Auth 트리거는 더 이상 쓰지 않습니다.
drop trigger if exists on_boardmate_auth_user_created on auth.users;
drop function if exists public.handle_boardmate_new_user();

create table if not exists public.boardmate_sessions (
  token_hash bytea primary key,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
create index if not exists boardmate_sessions_user_idx on public.boardmate_sessions(user_id);
create index if not exists boardmate_sessions_expiry_idx on public.boardmate_sessions(expires_at);

alter table public.boardmate_profiles enable row level security;
alter table public.boardmate_sessions enable row level security;
revoke all on public.boardmate_profiles, public.boardmate_sessions from anon, authenticated;

create or replace function public.boardmate_session_user(p_token text)
returns uuid
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare uid uuid;
begin
  if p_token is null or char_length(p_token) < 32 then return null; end if;
  select s.user_id into uid
  from public.boardmate_sessions s
  join public.boardmate_profiles p on p.user_id=s.user_id
  where s.token_hash = digest(p_token,'sha256')
    and s.expires_at > now()
    and (p.suspended_until is null or p.suspended_until <= now());
  return uid;
end;
$$;
revoke all on function public.boardmate_session_user(text) from public, anon, authenticated;

create or replace function public.boardmate_issue_session(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare tok text;
begin
  tok := encode(gen_random_bytes(32),'hex');
  delete from public.boardmate_sessions where user_id=p_user_id and expires_at < now();
  insert into public.boardmate_sessions(token_hash,user_id)
  values(digest(tok,'sha256'),p_user_id);
  return tok;
end;
$$;
revoke all on function public.boardmate_issue_session(uuid) from public, anon, authenticated;

create or replace function public.boardmate_register(p_nickname text,p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n text := trim(coalesce(p_nickname,''));
  uid uuid := gen_random_uuid();
  tok text;
begin
  if char_length(n) < 1 or char_length(n) > 20 then raise exception '닉네임은 1~20자로 입력하세요.'; end if;
  if char_length(coalesce(p_password,'')) < 4 then raise exception '비밀번호는 4자 이상 입력하세요.'; end if;
  if char_length(p_password) > 72 then raise exception '비밀번호가 너무 깁니다.'; end if;
  if exists(select 1 from public.boardmate_bans where nickname_key=lower(n)) then
    raise exception '운영자에 의해 퇴출된 닉네임입니다.';
  end if;

  insert into public.boardmate_profiles(user_id,nickname,nickname_key,password_hash)
  values(uid,n,lower(n),crypt(p_password,gen_salt('bf',10)));
  tok := public.boardmate_issue_session(uid);
  return jsonb_build_object('token',tok,'user_id',uid,'nickname',n);
exception when unique_violation then
  raise exception '이미 사용 중인 닉네임입니다.';
end;
$$;
grant execute on function public.boardmate_register(text,text) to anon, authenticated;

create or replace function public.boardmate_login(p_nickname text,p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p public.boardmate_profiles%rowtype;
  tok text;
begin
  select * into p from public.boardmate_profiles where nickname_key=lower(trim(coalesce(p_nickname,'')));
  if not found or p.password_hash is null or crypt(coalesce(p_password,''),p.password_hash)<>p.password_hash then
    raise exception '닉네임 또는 비밀번호가 맞지 않습니다.';
  end if;
  if p.suspended_until is not null and p.suspended_until > now() then
    raise exception '정지된 계정입니다. 정지 종료: %', to_char(p.suspended_until at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI');
  end if;
  tok := public.boardmate_issue_session(p.user_id);
  return jsonb_build_object('token',tok,'user_id',p.user_id,'nickname',p.nickname);
end;
$$;
grant execute on function public.boardmate_login(text,text) to anon, authenticated;

create or replace function public.boardmate_me(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare uid uuid; p public.boardmate_profiles%rowtype;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then return null; end if;
  select * into p from public.boardmate_profiles where user_id=uid;
  if not found then return null; end if;
  return jsonb_build_object('user_id',p.user_id,'nickname',p.nickname,'created_at',p.created_at,'is_admin',p.is_admin,'suspended_until',p.suspended_until,'suspension_reason',p.suspension_reason);
end;
$$;
grant execute on function public.boardmate_me(text) to anon, authenticated;

create or replace function public.boardmate_logout(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_token is not null then delete from public.boardmate_sessions where token_hash=digest(p_token,'sha256'); end if;
end;
$$;
grant execute on function public.boardmate_logout(text) to anon, authenticated;

create or replace function public.boardmate_change_password(p_token text,p_current_password text,p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare uid uuid; ph text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 만료되었습니다.'; end if;
  if char_length(coalesce(p_new_password,'')) < 4 then raise exception '새 비밀번호는 4자 이상 입력하세요.'; end if;
  if char_length(p_new_password) > 72 then raise exception '비밀번호가 너무 깁니다.'; end if;
  select password_hash into ph from public.boardmate_profiles where user_id=uid;
  if ph is null or crypt(coalesce(p_current_password,''),ph)<>ph then raise exception '현재 비밀번호가 맞지 않습니다.'; end if;
  update public.boardmate_profiles set password_hash=crypt(p_new_password,gen_salt('bf',10)) where user_id=uid;
  delete from public.boardmate_sessions where user_id=uid and token_hash<>digest(p_token,'sha256');
end;
$$;
grant execute on function public.boardmate_change_password(text,text,text) to anon, authenticated;

-- 관리자용: Supabase SQL Editor에서만 직접 실행하세요.
-- 예) select public.admin_reset_boardmate_password('홍길동','1234');
create or replace function public.admin_reset_boardmate_password(p_nickname text,p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare uid uuid;
begin
  if char_length(coalesce(p_new_password,'')) < 4 then raise exception '새 비밀번호는 4자 이상이어야 합니다.'; end if;
  select user_id into uid from public.boardmate_profiles where nickname_key=lower(trim(p_nickname));
  if uid is null then raise exception '해당 닉네임이 없습니다.'; end if;
  update public.boardmate_profiles set password_hash=crypt(p_new_password,gen_salt('bf',10)) where user_id=uid;
  delete from public.boardmate_sessions where user_id=uid;
end;
$$;
revoke all on function public.admin_reset_boardmate_password(text,text) from public, anon, authenticated;

-- ============================================================
-- 3. 온라인 방 / 멤버 / 공유 상태
-- ============================================================
create table if not exists public.boardmate_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  game text not null,
  max_players integer not null default 6,
  host_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  status text not null default 'open' check (status in ('open','playing','finished')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_game_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_game_check check (game in ('maskmen','acquire','calico','thegame','kraken'));
alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_max_players_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_max_players_check check (max_players between 2 and 8);

create table if not exists public.boardmate_room_members (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  seat integer not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key(room_id,user_id),
  unique(room_id,seat)
);
alter table public.boardmate_room_members add column if not exists last_seen_at timestamptz not null default now();

create table if not exists public.boardmate_room_state (
  room_id uuid primary key references public.boardmate_rooms(id) on delete cascade,
  revision bigint not null default 0,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.boardmate_rooms enable row level security;
alter table public.boardmate_room_members enable row level security;
alter table public.boardmate_room_state enable row level security;
revoke all on public.boardmate_rooms, public.boardmate_room_members, public.boardmate_room_state from anon, authenticated;

drop policy if exists "rooms readable by members" on public.boardmate_rooms;
drop policy if exists "room members readable" on public.boardmate_room_members;
drop policy if exists "room state readable by members" on public.boardmate_room_state;

-- v3 함수 제거
DROP FUNCTION IF EXISTS public.create_boardmate_room(text,text,integer);
DROP FUNCTION IF EXISTS public.join_boardmate_room(uuid);
DROP FUNCTION IF EXISTS public.leave_boardmate_room(uuid);
DROP FUNCTION IF EXISTS public.start_boardmate_room(uuid);
DROP FUNCTION IF EXISTS public.put_boardmate_room_state(uuid,bigint,jsonb);
DROP FUNCTION IF EXISTS public.submit_boardmate_match(uuid,uuid[]);

create or replace function public.boardmate_game_max(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game='calico' then 4
    when p_game='thegame' then 5
    when p_game='kraken' then 8
    else 6 end;
$$;
create or replace function public.boardmate_game_min(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','thegame') then 2
    else 3 end;
$$;
revoke all on function public.boardmate_game_max(text), public.boardmate_game_min(text) from public, anon, authenticated;

create or replace function public.boardmate_reseat_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
begin
  update public.boardmate_room_members set seat=seat+100 where room_id=p_room_id;
  with x as (
    select user_id,row_number() over(order by seat,joined_at,user_id)-1 as new_seat
    from public.boardmate_room_members where room_id=p_room_id
  )
  update public.boardmate_room_members m set seat=x.new_seat
  from x where m.room_id=p_room_id and m.user_id=x.user_id;
end;
$$;
revoke all on function public.boardmate_reseat_room(uuid) from public, anon, authenticated;

create or replace function public.create_boardmate_room(p_token text,p_title text,p_game text)
returns uuid
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; rid uuid; mx integer;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_game not in ('maskmen','acquire','calico','thegame','kraken') then raise exception '지원하지 않는 게임입니다.'; end if;
  if char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 40 then raise exception '방 제목은 1~40자로 입력하세요.'; end if;
  mx:=public.boardmate_game_max(p_game);
  insert into public.boardmate_rooms(title,game,max_players,host_id)
  values(trim(p_title),p_game,mx,uid) returning id into rid;
  insert into public.boardmate_room_members(room_id,user_id,seat) values(rid,uid,0);
  return rid;
end;
$$;
grant execute on function public.create_boardmate_room(text,text,text) to anon, authenticated;

create or replace function public.join_boardmate_room(p_token text,p_room_id uuid)
returns integer
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; cnt integer; s integer;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;

  select seat into s from public.boardmate_room_members where room_id=p_room_id and user_id=uid;
  if found then
    update public.boardmate_room_members set last_seen_at=now() where room_id=p_room_id and user_id=uid;
    return s;
  end if;

  if r.status <> 'open' then raise exception '이미 시작한 방에는 새로 참가할 수 없습니다.'; end if;
  select count(*) into cnt from public.boardmate_room_members where room_id=p_room_id;
  if cnt >= r.max_players then raise exception '이 게임의 최대 인원에 도달했습니다.'; end if;
  select coalesce(min(x),0) into s from generate_series(0,r.max_players-1) x
   where not exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.seat=x);
  insert into public.boardmate_room_members(room_id,user_id,seat,last_seen_at) values(p_room_id,uid,s,now());
  return s;
end;
$$;
grant execute on function public.join_boardmate_room(text,uuid) to anon, authenticated;

create or replace function public.touch_boardmate_room(p_token text,p_room_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  update public.boardmate_room_members set last_seen_at=now()
   where room_id=p_room_id and user_id=uid;
end;
$$;
grant execute on function public.touch_boardmate_room(text,uuid) to anon, authenticated;

create or replace function public.disconnect_boardmate_room(p_token text,p_room_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then return; end if;
  update public.boardmate_room_members set last_seen_at='1970-01-01'::timestamptz
   where room_id=p_room_id and user_id=uid;
end;
$$;
grant execute on function public.disconnect_boardmate_room(text,uuid) to anon, authenticated;

create or replace function public.leave_boardmate_room(p_token text,p_room_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; next_host uuid;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then return; end if;
  if r.status <> 'open' then raise exception '게임 시작 후에는 로비에서 나갈 수 없습니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then return; end if;

  if r.host_id=uid then
    select user_id into next_host from public.boardmate_room_members
      where room_id=p_room_id and user_id<>uid order by seat,joined_at limit 1;
    if next_host is null then
      delete from public.boardmate_rooms where id=p_room_id;
      return;
    end if;
    update public.boardmate_rooms set host_id=next_host where id=p_room_id;
  end if;
  delete from public.boardmate_room_members where room_id=p_room_id and user_id=uid;
  perform public.boardmate_reseat_room(p_room_id);
end;
$$;
grant execute on function public.leave_boardmate_room(text,uuid) to anon, authenticated;

create or replace function public.kick_boardmate_room_member(p_token text,p_room_id uuid,p_user_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.status<>'open' then raise exception '대기 중인 방에서만 강퇴할 수 있습니다.'; end if;
  if r.host_id<>uid then raise exception '방장만 강퇴할 수 있습니다.'; end if;
  if p_user_id=uid then raise exception '방장은 자기 자신을 강퇴할 수 없습니다.'; end if;
  delete from public.boardmate_room_members where room_id=p_room_id and user_id=p_user_id;
  perform public.boardmate_reseat_room(p_room_id);
end;
$$;
grant execute on function public.kick_boardmate_room_member(text,uuid,uuid) to anon, authenticated;

create or replace function public.start_boardmate_room(p_token text,p_room_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; cnt integer; mn integer;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.host_id<>uid then raise exception '방장만 시작할 수 있습니다.'; end if;
  if r.status<>'open' then raise exception '이미 시작한 방입니다.'; end if;
  select count(*) into cnt from public.boardmate_room_members where room_id=p_room_id;
  mn:=public.boardmate_game_min(r.game);
  if cnt < mn then raise exception '이 게임은 최소 %명이 필요합니다.',mn; end if;
  update public.boardmate_rooms set status='playing',started_at=now() where id=p_room_id;
end;
$$;
grant execute on function public.start_boardmate_room(text,uuid) to anon, authenticated;

-- ============================================================
-- 4. 게임별 비공개 ELO + 공개 티어용 통계
-- ============================================================
create table if not exists public.boardmate_ratings (
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  game text not null,
  elo numeric not null default 1000,
  wins numeric(10,3) not null default 0,
  losses numeric(10,3) not null default 0,
  games integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id,game)
);
alter table public.boardmate_ratings drop constraint if exists boardmate_ratings_game_check;
alter table public.boardmate_ratings add constraint boardmate_ratings_game_check check (game in ('maskmen','acquire','calico','thegame','kraken'));

create table if not exists public.boardmate_matches (
  room_id uuid primary key references public.boardmate_rooms(id) on delete restrict,
  game text not null,
  finishing_order uuid[] not null,
  created_at timestamptz not null default now()
);

alter table public.boardmate_ratings enable row level security;
alter table public.boardmate_matches enable row level security;
revoke all on public.boardmate_ratings, public.boardmate_matches from anon, authenticated;

create or replace function public.boardmate_get_ratings(p_token text,p_game text,p_user_ids uuid[])
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; out jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  with ranked as (
    select user_id,game,wins,losses,games,
      rank() over(partition by game order by elo desc,games desc,updated_at asc) as elo_rank
    from public.boardmate_ratings where games>0
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',u,
    'wins',coalesce(r.wins,0),
    'losses',coalesce(r.losses,0),
    'games',coalesce(r.games,0),
    'elo_rank',r.elo_rank
  )),'[]'::jsonb) into out
  from unnest(coalesce(p_user_ids,array[]::uuid[])) u
  left join ranked r on r.user_id=u and r.game=p_game;
  return out;
end;
$$;
grant execute on function public.boardmate_get_ratings(text,text,uuid[]) to anon, authenticated;

create or replace function public.boardmate_list_rooms(p_token text)
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; out jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into out
  from (
    select r.created_at,
      jsonb_build_object(
        'id',r.id,'title',r.title,'game',r.game,'status',r.status,'host_id',r.host_id,
        'host_nickname',hp.nickname,'member_count',count(m.user_id),'max_players',r.max_players,
        'online_count',count(m.user_id) filter(where m.last_seen_at > now()-interval '20 seconds'),
        'min_players',public.boardmate_game_min(r.game),
        'mine',bool_or(m.user_id=uid)
      ) obj
    from public.boardmate_rooms r
    join public.boardmate_profiles hp on hp.user_id=r.host_id
    left join public.boardmate_room_members m on m.room_id=r.id
    where r.status in ('open','playing')
    group by r.id,hp.nickname
    order by r.created_at desc
    limit 60
  ) x;
  return out;
end;
$$;
grant execute on function public.boardmate_list_rooms(text) to anon, authenticated;

create or replace function public.boardmate_get_room(p_token text,p_room_id uuid)
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; ms jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid)
     and r.status<>'open' then raise exception '이 방의 참가자가 아닙니다.'; end if;

  with ranked as (
    select user_id,game,wins,losses,games,
      rank() over(partition by game order by elo desc,games desc,updated_at asc) as elo_rank
    from public.boardmate_ratings where games>0
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',m.user_id,'seat',m.seat,'joined_at',m.joined_at,'nickname',p.nickname,
    'connected',(m.last_seen_at > now()-interval '20 seconds'),'last_seen_at',m.last_seen_at,
    'wins',coalesce(rt.wins,0),'losses',coalesce(rt.losses,0),'games',coalesce(rt.games,0),'elo_rank',rt.elo_rank
  ) order by m.seat),'[]'::jsonb) into ms
  from public.boardmate_room_members m
  join public.boardmate_profiles p on p.user_id=m.user_id
  left join ranked rt on rt.user_id=m.user_id and rt.game=r.game
  where m.room_id=p_room_id;

  return jsonb_build_object(
    'room',to_jsonb(r)||jsonb_build_object('min_players',public.boardmate_game_min(r.game)),
    'members',ms
  );
end;
$$;
grant execute on function public.boardmate_get_room(text,uuid) to anon, authenticated;

-- ============================================================
-- 5. 공유 게임 상태
-- ============================================================
create or replace function public.get_boardmate_room_state(p_token text,p_room_id uuid)
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; rr public.boardmate_room_state%rowtype;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  select * into rr from public.boardmate_room_state where room_id=p_room_id;
  if not found then return jsonb_build_object('revision',0,'state',null); end if;
  return jsonb_build_object('revision',rr.revision,'state',rr.state,'updated_at',rr.updated_at);
end;
$$;
grant execute on function public.get_boardmate_room_state(text,uuid) to anon, authenticated;

create or replace function public.put_boardmate_room_state(p_token text,p_room_id uuid,p_expected_revision bigint,p_state jsonb)
returns bigint
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; rev bigint; newrev bigint;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  if not exists(select 1 from public.boardmate_rooms where id=p_room_id and status='playing') then
    raise exception '게임이 시작되지 않았습니다.';
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
grant execute on function public.put_boardmate_room_state(text,uuid,bigint,jsonb) to anon, authenticated;

create or replace function public.submit_boardmate_match(p_token text,p_room_id uuid,p_order uuid[])
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare
  uid0 uuid; r public.boardmate_rooms%rowtype;
  n integer; i integer; j integer;
  uid uuid; ri numeric; rj numeric; expected numeric; actual numeric; delta numeric;
  ratings numeric[] := array[]::numeric[];
  members_count integer;
begin
  uid0:=public.boardmate_session_user(p_token);
  if uid0 is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.host_id<>uid0 then raise exception '방장만 결과를 확정할 수 있습니다.'; end if;
  if r.status<>'playing' then raise exception '게임 중인 방이 아닙니다.'; end if;
  if exists(select 1 from public.boardmate_matches where room_id=p_room_id) then raise exception 'already submitted'; end if;
  n:=coalesce(array_length(p_order,1),0);
  select count(*) into members_count from public.boardmate_room_members where room_id=p_room_id;
  if n<>members_count or n<public.boardmate_game_min(r.game) then raise exception 'invalid order'; end if;
  if (select count(distinct z) from unnest(p_order) as t(z))<>n then raise exception 'duplicate player'; end if;
  if exists(select 1 from unnest(p_order) as t(z) where not exists(
    select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=t.z
  )) then raise exception 'invalid player'; end if;

  for i in 1..n loop
    uid:=p_order[i];
    insert into public.boardmate_ratings(user_id,game) values(uid,r.game)
      on conflict(user_id,game) do nothing;
    select elo into ri from public.boardmate_ratings where user_id=uid and game=r.game;
    ratings:=array_append(ratings,ri);
  end loop;

  for i in 1..n loop
    delta:=0; ri:=ratings[i];
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
grant execute on function public.submit_boardmate_match(text,uuid,uuid[]) to anon, authenticated;


create or replace function public.submit_boardmate_team_match(p_token text,p_room_id uuid,p_winners uuid[],p_losers uuid[])
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid0 uuid; r public.boardmate_rooms%rowtype; u uuid; avgw numeric; avgl numeric; e numeric; d numeric;
begin
  uid0:=public.boardmate_session_user(p_token);
  if uid0 is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found or r.host_id<>uid0 or r.status<>'playing' then raise exception '결과를 확정할 수 없습니다.'; end if;
  if exists(select 1 from public.boardmate_matches where room_id=p_room_id) then raise exception 'already submitted'; end if;
  if coalesce(array_length(p_winners,1),0)<1 or coalesce(array_length(p_losers,1),0)<1 then raise exception 'invalid teams'; end if;
  if exists(select 1 from unnest(p_winners||p_losers) as t(z) where not exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=t.z)) then raise exception 'invalid player'; end if;
  foreach u in array p_winners||p_losers loop
    insert into public.boardmate_ratings(user_id,game) values(u,r.game) on conflict(user_id,game) do nothing;
  end loop;
  select avg(elo) into avgw from public.boardmate_ratings where game=r.game and user_id=any(p_winners);
  select avg(elo) into avgl from public.boardmate_ratings where game=r.game and user_id=any(p_losers);
  foreach u in array p_winners loop
    select 1.0/(1.0+power(10.0,(avgl-elo)/400.0)) into e from public.boardmate_ratings where user_id=u and game=r.game;
    d:=24*(1-e);
    update public.boardmate_ratings set elo=elo+d,wins=wins+1,games=games+1,updated_at=now() where user_id=u and game=r.game;
  end loop;
  foreach u in array p_losers loop
    select 1.0/(1.0+power(10.0,(avgw-elo)/400.0)) into e from public.boardmate_ratings where user_id=u and game=r.game;
    d:=24*(0-e);
    update public.boardmate_ratings set elo=elo+d,losses=losses+1,games=games+1,updated_at=now() where user_id=u and game=r.game;
  end loop;
  insert into public.boardmate_matches(room_id,game,finishing_order) values(p_room_id,r.game,p_winners||p_losers);
  update public.boardmate_rooms set status='finished',finished_at=now() where id=p_room_id;
end;
$$;
grant execute on function public.submit_boardmate_team_match(text,uuid,uuid[],uuid[]) to anon, authenticated;

create or replace function public.submit_boardmate_coop_match(p_token text,p_room_id uuid,p_win boolean)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare uid0 uuid; r public.boardmate_rooms%rowtype; u uuid; e numeric; d numeric; ids uuid[];
begin
  uid0:=public.boardmate_session_user(p_token);
  if uid0 is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found or r.host_id<>uid0 or r.status<>'playing' then raise exception '결과를 확정할 수 없습니다.'; end if;
  if exists(select 1 from public.boardmate_matches where room_id=p_room_id) then raise exception 'already submitted'; end if;
  select array_agg(user_id order by seat) into ids from public.boardmate_room_members where room_id=p_room_id;
  foreach u in array ids loop
    insert into public.boardmate_ratings(user_id,game) values(u,r.game) on conflict(user_id,game) do nothing;
    select 1.0/(1.0+power(10.0,(1000.0-elo)/400.0)) into e from public.boardmate_ratings where user_id=u and game=r.game;
    d:=24*((case when p_win then 1 else 0 end)-e);
    update public.boardmate_ratings set elo=elo+d,wins=wins+(case when p_win then 1 else 0 end),losses=losses+(case when p_win then 0 else 1 end),games=games+1,updated_at=now() where user_id=u and game=r.game;
  end loop;
  insert into public.boardmate_matches(room_id,game,finishing_order) values(p_room_id,r.game,ids);
  update public.boardmate_rooms set status='finished',finished_at=now() where id=p_room_id;
end;
$$;
grant execute on function public.submit_boardmate_coop_match(text,uuid,boolean) to anon, authenticated;

-- 참고: v3에서 생성된 기존 회원은 password_hash가 비어 있을 수 있습니다.
-- 그 경우 SQL Editor에서 아래처럼 새 비밀번호를 지정하면 v6 로그인으로 전환됩니다.
-- select public.admin_reset_boardmate_password('닉네임','1234');

-- ============================================================
-- 2-B. 관리자 회원 관리
-- ============================================================
-- 최초 관리자 지정은 SQL Editor에서 직접 실행합니다.
-- 예) select public.admin_set_boardmate_admin('내닉네임', true);
create or replace function public.admin_set_boardmate_admin(p_nickname text,p_admin boolean default true)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
begin
  update public.boardmate_profiles set is_admin=coalesce(p_admin,true)
   where nickname_key=lower(trim(p_nickname));
  if not found then raise exception '해당 닉네임이 없습니다.'; end if;
end;
$$;
revoke all on function public.admin_set_boardmate_admin(text,boolean) from public, anon, authenticated;

create or replace function public.boardmate_require_admin(p_token text)
returns uuid
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; ok boolean;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select is_admin into ok from public.boardmate_profiles where user_id=uid;
  if coalesce(ok,false) is not true then raise exception '관리자 권한이 필요합니다.'; end if;
  return uid;
end;
$$;
revoke all on function public.boardmate_require_admin(text) from public, anon, authenticated;

create or replace function public.boardmate_admin_list_members(p_token text)
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare admin_uid uuid; out jsonb;
begin
  admin_uid:=public.boardmate_require_admin(p_token);
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',p.user_id,'nickname',p.nickname,'created_at',p.created_at,'is_admin',p.is_admin,
    'suspended_until',p.suspended_until,'suspension_reason',p.suspension_reason
  ) order by p.created_at desc),'[]'::jsonb) into out
  from public.boardmate_profiles p;
  return out;
end;
$$;
grant execute on function public.boardmate_admin_list_members(text) to anon, authenticated;

create or replace function public.boardmate_admin_suspend_member(p_token text,p_user_id uuid,p_days integer,p_reason text default null)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare admin_uid uuid;
begin
  admin_uid:=public.boardmate_require_admin(p_token);
  if p_user_id=admin_uid then raise exception '자기 계정은 정지할 수 없습니다.'; end if;
  if coalesce(p_days,0)<1 or p_days>3650 then raise exception '정지 일수는 1~3650일입니다.'; end if;
  update public.boardmate_profiles
     set suspended_until=now()+make_interval(days=>p_days), suspension_reason=nullif(trim(coalesce(p_reason,'')),'')
   where user_id=p_user_id;
  if not found then raise exception '회원을 찾을 수 없습니다.'; end if;
  delete from public.boardmate_sessions where user_id=p_user_id;
end;
$$;
grant execute on function public.boardmate_admin_suspend_member(text,uuid,integer,text) to anon, authenticated;

create or replace function public.boardmate_admin_unsuspend_member(p_token text,p_user_id uuid)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare admin_uid uuid;
begin
  admin_uid:=public.boardmate_require_admin(p_token);
  update public.boardmate_profiles set suspended_until=null,suspension_reason=null where user_id=p_user_id;
  if not found then raise exception '회원을 찾을 수 없습니다.'; end if;
end;
$$;
grant execute on function public.boardmate_admin_unsuspend_member(text,uuid) to anon, authenticated;

create or replace function public.boardmate_admin_expel_member(p_token text,p_user_id uuid,p_reason text default null)
returns void
language plpgsql security definer set search_path=public,extensions
as $$
declare admin_uid uuid; n text; nk text;
begin
  admin_uid:=public.boardmate_require_admin(p_token);
  if p_user_id=admin_uid then raise exception '자기 계정은 퇴출할 수 없습니다.'; end if;
  select nickname,nickname_key into n,nk from public.boardmate_profiles where user_id=p_user_id;
  if nk is null then raise exception '회원을 찾을 수 없습니다.'; end if;
  insert into public.boardmate_bans(nickname_key,nickname,reason)
  values(nk,n,nullif(trim(coalesce(p_reason,'')),''))
  on conflict(nickname_key) do update set nickname=excluded.nickname,reason=excluded.reason,banned_at=now();
  -- 진행/대기 중 방에서 플레이어를 제거하면 게임 상태 좌석이 어긋날 수 있어, 해당 회원이 참여 중인 활성 방은 안전하게 닫습니다.
  delete from public.boardmate_rooms r where r.status in ('open','playing') and exists(select 1 from public.boardmate_room_members m where m.room_id=r.id and m.user_id=p_user_id);
  -- 종료된 방의 대전 기록은 보존하기 위해, 퇴출 회원이 방장이었던 기록 방은 관리자에게 소유권만 넘깁니다.
  update public.boardmate_rooms set host_id=admin_uid where host_id=p_user_id;
  delete from public.boardmate_profiles where user_id=p_user_id;
end;
$$;
grant execute on function public.boardmate_admin_expel_member(text,uuid,text) to anon, authenticated;

-- 퇴출 해제는 SQL Editor에서 직접 실행합니다.
-- 예) delete from public.boardmate_bans where nickname_key=lower('닉네임');
