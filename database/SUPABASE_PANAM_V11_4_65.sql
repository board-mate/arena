-- BoardMate Arena v11.4.65 ALPHA
-- Pan Am multiplayer catalog / turn tracking / unanimous cancellation support.
-- Run ONCE in Supabase SQL Editor after uploading the v11.4.65 web files.
-- Idempotent: safe to run again.

begin;

-- 1) Game catalog constraints -------------------------------------------------
alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_game_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_game_check
  check (game in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','fantasyrealmsgreek','powergrid','avalon','secrethitler',
    'onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado',
    'panam','airlandsea','planetx'
  ));

alter table public.boardmate_ratings drop constraint if exists boardmate_ratings_game_check;
alter table public.boardmate_ratings add constraint boardmate_ratings_game_check
  check (game in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','fantasyrealmsgreek','powergrid','avalon','secrethitler',
    'onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado',
    'panam','airlandsea','planetx'
  ));

-- 2) Player-count / Korean-name helpers --------------------------------------
create or replace function public.boardmate_game_max(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','quacks','mandom','samurai','eldorado','panam','planetx') then 4
    when p_game='pocketnova' then 2
    when p_game in ('plakoro','airlandsea') then 2
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
    when p_game in ('calico','cascadia','pocketnova','thegame','plakoro','quacks','mandom','samurai','eldorado','panam','airlandsea','planetx') then 2
    when p_game in ('maskmen','acquire','kraken','fantasyrealms','fantasyrealmsgreek','powergrid','onenightwerewolf') then 3
    when p_game in ('avalon','secrethitler') then 5
    else 2 end;
$$;
revoke all on function public.boardmate_game_min(text) from public, anon, authenticated;

create or replace function public.boardmate_game_ko(p_game text)
returns text language sql immutable as $$
  select case p_game
    when 'maskmen'            then '마스크맨'
    when 'acquire'            then '어콰이어'
    when 'calico'             then '캘리코'
    when 'cascadia'           then '캐스캐디아'
    when 'pocketnova'         then '포켓몬 미니마'
    when 'thegame'            then '더 게임'
    when 'kraken'             then '노터치 크라켄'
    when 'fantasyrealms'      then '판타지 왕국'
    when 'fantasyrealmsgreek' then '판타지 왕국: 그리스의 전설들'
    when 'powergrid'          then '파워그리드'
    when 'avalon'             then '레지스탕스 아발론'
    when 'secrethitler'       then '시크릿 히틀러'
    when 'onenightwerewolf'   then '한밤의 늑대인간'
    when 'plakoro'            then '프라코로 포켓몬'
    when 'quacks'             then '돌팔이 약장수'
    when 'mandom'             then '맨덤의 던전'
    when 'samurai'            then '사무라이'
    when 'eldorado'           then '엘도라도'
    when 'panam'              then '팬 암'
    when 'airlandsea'         then '에어 랜드 & 씨'
    when 'planetx'            then '행성 X를 찾아서'
    else '보드게임' end;
$$;
revoke all on function public.boardmate_game_ko(text) from public, anon, authenticated;

-- 3) Room creation -----------------------------------------------------------
create or replace function public.create_boardmate_room_v10(p_token text,p_title text,p_game text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; rid uuid; mx integer; nm text; ttl text; mode text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_game not in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','fantasyrealmsgreek','powergrid','avalon','secrethitler',
    'onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado',
    'panam','airlandsea','planetx'
  ) then raise exception '지원하지 않는 게임입니다.'; end if;
  select nickname into nm from public.boardmate_profiles where user_id=uid;
  ttl:=trim(coalesce(p_title,''));
  if ttl='' then ttl:=left(coalesce(nm,'보드메이트')||'의 '||public.boardmate_game_ko(p_game)||' 한 판',40); end if;
  if char_length(ttl)>40 then ttl:=left(ttl,40); end if;
  mx:=public.boardmate_game_max(p_game);
  mode:=case when p_game in ('avalon','secrethitler','onenightwerewolf','quacks') then 'realtime' else 'turn' end;
  insert into public.boardmate_rooms(title,game,max_players,host_id,play_mode)
    values(ttl,p_game,mx,uid,mode) returning id into rid;
  insert into public.boardmate_room_members(room_id,user_id,seat) values(rid,uid,0);
  return rid;
end; $$;
grant execute on function public.create_boardmate_room_v10(text,text,text) to anon,authenticated;

-- 4) Turn seat: Pan Am stores the active resolver in state.current ------------
create or replace function public.boardmate_turn_seat(p_game text,p_state jsonb)
returns integer language plpgsql immutable as $$
declare seat integer; p jsonb; qi integer;
begin
  if p_game in ('avalon','secrethitler','onenightwerewolf','quacks') then return null; end if;
  if p_state is null then return null; end if;
  if coalesce((p_state->>'over')::boolean,false) or coalesce((p_state->>'gameOver')::boolean,false) then return null; end if;
  if p_game='maskmen' then return nullif(p_state->>'currentTurn','')::integer; end if;
  if p_game='acquire' then
    if p_state->>'phase'='resolve' then p:=p_state->'pending';
      if p->>'type'='merger' then qi:=coalesce(nullif(p->>'qIndex','')::integer,0); seat:=nullif((p->'queue'->qi->>'seat'),'')::integer; if seat is not null then return seat; end if;
      elsif p->>'type' in ('founder','survivor') then seat:=nullif(p->>'triggerSeat','')::integer; if seat is not null then return seat; end if; end if;
    end if; return nullif(p_state->>'current','')::integer;
  end if;
  if p_game='calico' then return coalesce(nullif(p_state->>'active','')::integer,nullif(p_state->>'current','')::integer); end if;
  if p_game in ('cascadia','thegame','kraken','fantasyrealms','fantasyrealmsgreek','plakoro','eldorado','panam','planetx') then return nullif(p_state->>'current','')::integer; end if;
  if p_game in ('mandom','airlandsea') then return nullif(p_state->>'currentTurn','')::integer; end if;
  if p_game='samurai' then return nullif(p_state->>'active','')::integer; end if;
  if p_game='pocketnova' then return nullif(p_state->>'currentPlayer','')::integer; end if;
  if p_game='powergrid' then return nullif(p_state->>'currentSeat','')::integer; end if;
  return null;
exception when others then return null; end; $$;
revoke all on function public.boardmate_turn_seat(text,jsonb) from public,anon,authenticated;

-- 5) Unanimous game-cancel support ------------------------------------------
create table if not exists public.boardmate_game_cancel_votes (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  vote boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
alter table public.boardmate_game_cancel_votes enable row level security;
revoke all on public.boardmate_game_cancel_votes from anon,authenticated;

create or replace function public.boardmate_get_cancel_status(p_token text,p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; mine boolean:=false; voters text[];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','fantasyrealmsgreek','powergrid','avalon','secrethitler',
    'onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado',
    'panam','airlandsea','planetx'
  ) then raise exception '취소 투표를 지원하지 않는 게임입니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select count(*)::integer into total_n from public.boardmate_room_members where room_id=p_room_id;
  select count(*)::integer into yes_n from public.boardmate_game_cancel_votes v
    where v.room_id=p_room_id and v.vote=true and exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=v.user_id);
  select coalesce(v.vote,false) into mine from public.boardmate_game_cancel_votes v where v.room_id=p_room_id and v.user_id=uid;
  select coalesce(array_agg(coalesce(nullif(p.nickname,''),'플레이어') order by m.seat) filter(where coalesce(v.vote,false)=true),'{}'::text[])
    into voters
    from public.boardmate_room_members m
    left join public.boardmate_profiles p on p.user_id=m.user_id
    left join public.boardmate_game_cancel_votes v on v.room_id=m.room_id and v.user_id=m.user_id
    where m.room_id=p_room_id;
  return jsonb_build_object('total',total_n,'yes',yes_n,'members',total_n,'votes',yes_n,'mine',coalesce(mine,false),
    'voters',coalesce(voters,'{}'::text[]),'cancelled',(total_n>0 and yes_n>=total_n and r.status='finished'),'room_status',r.status);
end; $$;
grant execute on function public.boardmate_get_cancel_status(text,uuid) to anon,authenticated;

create or replace function public.boardmate_set_cancel_vote(p_token text,p_room_id uuid,p_vote boolean)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; cancelled boolean:=false; voters text[];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in (
    'maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken',
    'fantasyrealms','fantasyrealmsgreek','powergrid','avalon','secrethitler',
    'onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado',
    'panam','airlandsea','planetx'
  ) then raise exception '취소 투표를 지원하지 않는 게임입니다.'; end if;
  if r.status<>'playing' then raise exception '현재 취소 투표를 진행할 수 없는 방입니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then raise exception '이 방의 참가자가 아닙니다.'; end if;
  insert into public.boardmate_game_cancel_votes(room_id,user_id,vote,updated_at)
    values(p_room_id,uid,coalesce(p_vote,false),now())
    on conflict(room_id,user_id) do update set vote=excluded.vote,updated_at=now();
  select count(*)::integer into total_n from public.boardmate_room_members where room_id=p_room_id;
  select count(*)::integer into yes_n from public.boardmate_game_cancel_votes v
    where v.room_id=p_room_id and v.vote=true and exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=v.user_id);
  if total_n>0 and yes_n>=total_n then
    update public.boardmate_rooms set status='finished' where id=p_room_id and status='playing';
    cancelled:=true;
  end if;
  select coalesce(array_agg(coalesce(nullif(p.nickname,''),'플레이어') order by m.seat) filter(where coalesce(v.vote,false)=true),'{}'::text[])
    into voters
    from public.boardmate_room_members m
    left join public.boardmate_profiles p on p.user_id=m.user_id
    left join public.boardmate_game_cancel_votes v on v.room_id=m.room_id and v.user_id=m.user_id
    where m.room_id=p_room_id;
  return jsonb_build_object('total',total_n,'yes',yes_n,'members',total_n,'votes',yes_n,'mine',coalesce(p_vote,false),
    'voters',coalesce(voters,'{}'::text[]),'cancelled',cancelled,'room_status',case when cancelled then 'finished' else 'playing' end);
end; $$;
grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean) to anon,authenticated;

notify pgrst,'reload schema';
commit;
