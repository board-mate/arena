-- BoardMate Arena v11.4.24: Fantasy Realms unified migration (all-games-safe)
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
    when 'plakoro' then '프라코로'
    when 'quacks' then '돌팔이 약장수'
    when 'mandom' then '맨덤의 던전'
    when 'samurai' then '사무라이 PVP'
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

-- 2) Private Fantasy Realms state.
-- Public boardmate_room_state never contains hands/actions.
-- One private row stores a seat-keyed map. The RPC exposes only the caller's
-- seat to normal players; the authoritative host receives the full map so it
-- can resume the game after a browser refresh.
create table if not exists public.boardmate_game_private_states (
  room_id uuid primary key references public.boardmate_rooms(id) on delete cascade,
  revision bigint not null default 0,
  states jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.boardmate_game_private_states enable row level security;
revoke all on public.boardmate_game_private_states from anon, authenticated;

create or replace function public.get_boardmate_fantasy_state(p_token text,p_room_id uuid)
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; seat_no integer; r public.boardmate_rooms%rowtype; pub public.boardmate_room_state%rowtype; priv jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  select seat into seat_no from public.boardmate_room_members where room_id=p_room_id and user_id=uid;
  if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select * into pub from public.boardmate_room_state where room_id=p_room_id;
  if not found then return jsonb_build_object('revision',0,'state',null,'private',null); end if;
  select states into priv from public.boardmate_game_private_states where room_id=p_room_id;
  if r.host_id=uid then
    return jsonb_build_object('revision',pub.revision,'state',pub.state,'private',coalesce(priv,'{}'::jsonb),'host',true,'seat',seat_no,'updated_at',pub.updated_at);
  end if;
  return jsonb_build_object(
    'revision',pub.revision,
    'state',pub.state,
    'private',coalesce(priv->>(seat_no::text),'null'::text)::jsonb,
    'host',false,
    'seat',seat_no,
    'updated_at',pub.updated_at
  );
exception when others then
  raise;
end;
$$;
grant execute on function public.get_boardmate_fantasy_state(text,uuid) to anon, authenticated;

create or replace function public.put_boardmate_fantasy_state(
  p_token text,p_room_id uuid,p_expected_revision bigint,p_public_state jsonb,p_private_states jsonb
)
returns bigint
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; rev bigint; newrev bigint; seat_no integer; turn_uid uuid;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.host_id<>uid then raise exception '판타지 왕국 게임 상태는 방장만 확정할 수 있습니다.'; end if;
  if r.game<>'fantasyrealms' then raise exception '판타지 왕국 방이 아닙니다.'; end if;
  if r.status<>'playing' and r.status<>'finished' then raise exception '게임이 시작되지 않았습니다.'; end if;
  if jsonb_typeof(p_public_state) is distinct from 'object' then raise exception '공개 게임 상태가 올바르지 않습니다.'; end if;
  if jsonb_typeof(p_private_states) is distinct from 'object' then raise exception '비공개 게임 상태가 올바르지 않습니다.'; end if;

  select revision into rev from public.boardmate_room_state where room_id=p_room_id for update;
  if not found then
    if p_expected_revision<>0 then raise exception 'revision conflict'; end if;
    newrev:=1;
    insert into public.boardmate_room_state(room_id,revision,state) values(p_room_id,newrev,p_public_state);
  else
    if rev<>p_expected_revision then raise exception 'revision conflict'; end if;
    newrev:=rev+1;
    update public.boardmate_room_state set revision=newrev,state=p_public_state,updated_at=now() where room_id=p_room_id;
  end if;

  insert into public.boardmate_game_private_states(room_id,revision,states,updated_at)
  values(p_room_id,newrev,p_private_states,now())
  on conflict(room_id) do update set revision=excluded.revision,states=excluded.states,updated_at=now();

  seat_no:=public.boardmate_turn_seat('fantasyrealms',p_public_state);
  if seat_no is not null then
    select user_id into turn_uid from public.boardmate_room_members where room_id=p_room_id and seat=seat_no;
  else
    turn_uid:=null;
  end if;
  update public.boardmate_rooms
     set turn_user_id=turn_uid,turn_updated_at=now()
   where id=p_room_id;

  return newrev;
end;
$$;
grant execute on function public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb) to anon, authenticated;

select pg_notify('pgrst','reload schema');
commit;
