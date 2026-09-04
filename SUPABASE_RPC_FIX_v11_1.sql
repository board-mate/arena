-- BoardMate v11.1: 방 생성 + 게임 취소 RPC 복구 패치
-- Supabase > SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- 목적:
--   1) create_boardmate_room_v8 schema cache 오류 복구
--   2) boardmate_set_cancel_vote / boardmate_get_cancel_status 복구
--   3) PostgREST schema cache 즉시 reload

-- ---------------------------------------------------------------------------
-- A. v8 방 생성에 필요한 room 컬럼/제약 보강
-- ---------------------------------------------------------------------------
alter table public.boardmate_rooms add column if not exists play_mode text not null default 'turn';
alter table public.boardmate_rooms add column if not exists turn_user_id uuid;
alter table public.boardmate_rooms add column if not exists turn_updated_at timestamptz;

alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_play_mode_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_play_mode_check
  check (play_mode in ('realtime','turn'));

alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_game_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_game_check
  check (game in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken'));

alter table public.boardmate_ratings drop constraint if exists boardmate_ratings_game_check;
alter table public.boardmate_ratings add constraint boardmate_ratings_game_check
  check (game in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken'));

-- 사용자 표시명/인원 수 계산 함수도 v11 기준으로 맞춥니다.
create or replace function public.boardmate_game_max(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','pocketnova') then 4
    when p_game='thegame' then 5
    when p_game='kraken' then 8
    else 6 end;
$$;

create or replace function public.boardmate_game_min(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','pocketnova','thegame') then 2
    else 3 end;
$$;

create or replace function public.boardmate_game_ko(p_game text)
returns text language sql immutable as $$
  select case p_game
    when 'maskmen' then '마스크맨'
    when 'acquire' then '어콰이어'
    when 'calico' then '캘리코'
    when 'cascadia' then '캐스캐디아'
    when 'pocketnova' then '포크노바'
    when 'thegame' then '더 게임'
    when 'kraken' then '노터치 크라켄'
    else '보드게임' end;
$$;
revoke all on function public.boardmate_game_max(text), public.boardmate_game_min(text), public.boardmate_game_ko(text) from public, anon, authenticated;

-- 파라미터 이름까지 확실히 다시 노출하기 위해 drop 후 재생성합니다.
drop function if exists public.create_boardmate_room_v8(text,text,text);
create function public.create_boardmate_room_v8(p_token text,p_title text,p_game text)
returns uuid
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; rid uuid; mx integer; nm text; ttl text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_game not in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken') then
    raise exception '지원하지 않는 게임입니다.';
  end if;
  select nickname into nm from public.boardmate_profiles where user_id=uid;
  ttl:=trim(coalesce(p_title,''));
  if ttl='' then ttl:=left(coalesce(nm,'보드메이트')||'의 '||public.boardmate_game_ko(p_game)||' 한 판',40); end if;
  if char_length(ttl)>40 then ttl:=left(ttl,40); end if;
  mx:=public.boardmate_game_max(p_game);
  insert into public.boardmate_rooms(title,game,max_players,host_id,play_mode)
  values(ttl,p_game,mx,uid,'turn') returning id into rid;
  insert into public.boardmate_room_members(room_id,user_id,seat) values(rid,uid,0);
  return rid;
end;
$$;
grant execute on function public.create_boardmate_room_v8(text,text,text) to anon, authenticated;

-- 새 Calico(active), Cascadia(current), Pocket Nova(currentSeat)의 현재 차례 표시도 맞춥니다.
create or replace function public.boardmate_turn_seat(p_game text,p_state jsonb)
returns integer
language plpgsql immutable
as $$
declare seat integer; p jsonb; qi integer;
begin
  if p_state is null then return null; end if;
  if coalesce((p_state->>'over')::boolean,false) or coalesce((p_state->>'gameOver')::boolean,false) then return null; end if;
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
  if p_game='calico' then return coalesce(nullif(p_state->>'active','')::integer,nullif(p_state->>'current','')::integer); end if;
  if p_game in ('cascadia','thegame','kraken') then return nullif(p_state->>'current','')::integer; end if;
  if p_game='pocketnova' then return nullif(p_state->>'currentSeat','')::integer; end if;
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.boardmate_turn_seat(text,jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- B. 게임 취소 RPC도 함께 복구
-- ---------------------------------------------------------------------------
alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_status_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_status_check
  check (status in ('open','playing','finished','cancelled'));

create table if not exists public.boardmate_room_cancel_votes (
  room_id uuid not null,
  user_id uuid not null,
  voted_at timestamptz not null default now(),
  primary key(room_id,user_id),
  constraint boardmate_room_cancel_votes_member_fk
    foreign key(room_id,user_id)
    references public.boardmate_room_members(room_id,user_id)
    on delete cascade
);
alter table public.boardmate_room_cancel_votes enable row level security;
revoke all on public.boardmate_room_cancel_votes from anon, authenticated;

drop function if exists public.boardmate_set_cancel_vote(text,uuid,boolean);
drop function if exists public.boardmate_get_cancel_status(text,uuid);

create function public.boardmate_get_cancel_status(p_token text,p_room_id uuid)
returns jsonb
language plpgsql security definer stable set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_count integer; vote_count integer; mine boolean; voters jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  select count(*) into total_count from public.boardmate_room_members where room_id=p_room_id;
  select count(*) into vote_count from public.boardmate_room_cancel_votes where room_id=p_room_id;
  select exists(select 1 from public.boardmate_room_cancel_votes where room_id=p_room_id and user_id=uid) into mine;
  select coalesce(jsonb_agg(p.nickname order by m.seat),'[]'::jsonb) into voters
  from public.boardmate_room_cancel_votes v
  join public.boardmate_room_members m on m.room_id=v.room_id and m.user_id=v.user_id
  join public.boardmate_profiles p on p.user_id=v.user_id
  where v.room_id=p_room_id;
  return jsonb_build_object('room_status',r.status,'votes',vote_count,'members',total_count,'mine',mine,'voters',voters);
end;
$$;
grant execute on function public.boardmate_get_cancel_status(text,uuid) to anon, authenticated;

create function public.boardmate_set_cancel_vote(p_token text,p_room_id uuid,p_vote boolean)
returns jsonb
language plpgsql security definer set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_count integer; vote_count integer; mine boolean; voters jsonb; cur_status text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  if r.status='cancelled' then return public.boardmate_get_cancel_status(p_token,p_room_id); end if;
  if r.status<>'playing' then raise exception '진행 중인 게임에서만 취소 투표를 할 수 있습니다.'; end if;

  if coalesce(p_vote,false) then
    insert into public.boardmate_room_cancel_votes(room_id,user_id,voted_at)
    values(p_room_id,uid,now())
    on conflict(room_id,user_id) do update set voted_at=excluded.voted_at;
  else
    delete from public.boardmate_room_cancel_votes where room_id=p_room_id and user_id=uid;
  end if;

  select count(*) into total_count from public.boardmate_room_members where room_id=p_room_id;
  select count(*) into vote_count from public.boardmate_room_cancel_votes where room_id=p_room_id;
  if total_count>0 and vote_count>=total_count then
    update public.boardmate_rooms
       set status='cancelled',finished_at=now(),turn_user_id=null,turn_updated_at=now()
     where id=p_room_id;
  end if;

  select exists(select 1 from public.boardmate_room_cancel_votes where room_id=p_room_id and user_id=uid) into mine;
  select coalesce(jsonb_agg(p.nickname order by m.seat),'[]'::jsonb) into voters
  from public.boardmate_room_cancel_votes v
  join public.boardmate_room_members m on m.room_id=v.room_id and m.user_id=v.user_id
  join public.boardmate_profiles p on p.user_id=v.user_id
  where v.room_id=p_room_id;
  select status into cur_status from public.boardmate_rooms where id=p_room_id;
  return jsonb_build_object('room_status',cur_status,'votes',vote_count,'members',total_count,'mine',mine,'voters',voters);
end;
$$;
grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean) to anon, authenticated;

-- PostgREST가 새 RPC 시그니처를 즉시 다시 읽도록 요청합니다.
notify pgrst, 'reload schema';

-- 실행 결과 확인: 아래 3개 함수가 보이면 정상입니다.
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('create_boardmate_room_v8','boardmate_get_cancel_status','boardmate_set_cancel_vote')
order by p.proname;
