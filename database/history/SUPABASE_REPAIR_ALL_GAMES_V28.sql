-- BoardMate Arena v11.4.26 all-games repair
-- Run this file once in Supabase SQL Editor after deploying v11.4.26.
-- Keeps the legacy `pocketnova` DB key only so existing historical rows do not break;
-- Pokemon Minima is no longer exposed by the Arena UI/package.

-- BoardMate Arena v11.4.24: unified game catalog + new games + Fantasy/Werewolf repair
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

-- -----------------------------------------------------------------------------
-- 2) Private social-deduction state
-- -----------------------------------------------------------------------------
create table if not exists public.boardmate_social_games(
  room_id uuid primary key references public.boardmate_rooms(id) on delete cascade,
  game text not null check (game in ('avalon','secrethitler','onenightwerewolf')),
  revision bigint not null default 1,
  state jsonb not null default '{}'::jsonb,
  secrets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.boardmate_social_games enable row level security;
revoke all on table public.boardmate_social_games from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3) Small immutable helpers
-- -----------------------------------------------------------------------------
create or replace function public.boardmate_shuffle_text_array(p_items text[])
returns text[] language sql volatile as $$
  select coalesce(array_agg(x order by random()),array[]::text[]) from unnest(p_items) as t(x);
$$;
revoke all on function public.boardmate_shuffle_text_array(text[]) from public, anon, authenticated;

create or replace function public.boardmate_avalon_good_count(p_n integer)
returns integer language sql immutable as $$
  select case p_n when 5 then 3 when 6 then 4 when 7 then 4 when 8 then 5 when 9 then 6 when 10 then 6 else null end;
$$;
revoke all on function public.boardmate_avalon_good_count(integer) from public, anon, authenticated;

create or replace function public.boardmate_avalon_team_size(p_n integer,p_quest integer)
returns integer language sql immutable as $$
  select case p_n
    when 5 then (array[2,3,2,3,3])[p_quest+1]
    when 6 then (array[2,3,4,3,4])[p_quest+1]
    when 7 then (array[2,3,3,4,4])[p_quest+1]
    when 8 then (array[3,4,4,5,5])[p_quest+1]
    when 9 then (array[3,4,4,5,5])[p_quest+1]
    when 10 then (array[3,4,4,5,5])[p_quest+1]
    else null end;
$$;
revoke all on function public.boardmate_avalon_team_size(integer,integer) from public, anon, authenticated;

create or replace function public.boardmate_sh_power(p_n integer,p_fascist_count integer)
returns text language sql immutable as $$
  select case
    when p_fascist_count>=6 then null
    when p_n in (5,6) and p_fascist_count=3 then 'policy_peek'
    when p_n in (5,6) and p_fascist_count in (4,5) then 'execute'
    when p_n in (7,8) and p_fascist_count=2 then 'investigate'
    when p_n in (7,8) and p_fascist_count=3 then 'special_election'
    when p_n in (7,8) and p_fascist_count in (4,5) then 'execute'
    when p_n in (9,10) and p_fascist_count in (1,2) then 'investigate'
    when p_n in (9,10) and p_fascist_count=3 then 'special_election'
    when p_n in (9,10) and p_fascist_count in (4,5) then 'execute'
    else null end;
$$;
revoke all on function public.boardmate_sh_power(integer,integer) from public, anon, authenticated;

create or replace function public.boardmate_json_has_int(p_arr jsonb,p_value integer)
returns boolean language sql immutable as $$
  select exists(select 1 from jsonb_array_elements_text(coalesce(p_arr,'[]'::jsonb)) e(v) where e.v::integer=p_value);
$$;
revoke all on function public.boardmate_json_has_int(jsonb,integer) from public, anon, authenticated;

create or replace function public.boardmate_json_append_int_unique(p_arr jsonb,p_value integer)
returns jsonb language sql immutable as $$
  select case when public.boardmate_json_has_int(coalesce(p_arr,'[]'::jsonb),p_value)
    then coalesce(p_arr,'[]'::jsonb)
    else coalesce(p_arr,'[]'::jsonb)||jsonb_build_array(p_value) end;
$$;
revoke all on function public.boardmate_json_append_int_unique(jsonb,integer) from public, anon, authenticated;

create or replace function public.boardmate_json_object_count(p_obj jsonb)
returns integer language sql immutable as $$
  select count(*)::integer from jsonb_object_keys(coalesce(p_obj,'{}'::jsonb));
$$;
revoke all on function public.boardmate_json_object_count(jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4) Initialization
-- -----------------------------------------------------------------------------
create or replace function public.boardmate_social_init(p_token text,p_room_id uuid,p_options jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare
  uid uuid; r public.boardmate_rooms%rowtype; n integer; players jsonb; seats integer[]; seat integer; i integer;
  st jsonb:='{}'::jsonb; sec jsonb:='{}'::jsonb; roles_obj jsonb:='{}'::jsonb; role_counts jsonb:='{}'::jsonb;
  role_arr text[]:=array[]::text[]; good_n integer; evil_n integer; good_special integer; evil_special integer;
  opt_percival boolean; opt_morgana boolean; opt_mordred boolean; opt_oberon boolean; leader integer;
  lib_n integer; fasc_n integer; deck text[]; original_obj jsonb:='{}'::jsonb; cards_obj jsonb:='{}'::jsonb; center text[];
  counts jsonb; k text; c integer; total integer:=0; maxc integer; steps text[]:=array[]::text[];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.host_id<>uid then raise exception '방장만 게임을 초기화할 수 있습니다.'; end if;
  if r.game not in ('avalon','secrethitler','onenightwerewolf') then raise exception '소셜 디덕션 방이 아닙니다.'; end if;
  if r.status<>'playing' then raise exception '먼저 대기실에서 게임 시작을 눌러주세요.'; end if;
  if exists(select 1 from public.boardmate_social_games where room_id=p_room_id) then raise exception '이미 초기화된 게임입니다.'; end if;

  select count(*)::integer,
         jsonb_agg(jsonb_build_object('seat',m.seat,'nickname',p.nickname) order by m.seat),
         array_agg(m.seat order by m.seat)
    into n,players,seats
  from public.boardmate_room_members m join public.boardmate_profiles p on p.user_id=m.user_id
  where m.room_id=p_room_id;
  if n<public.boardmate_game_min(r.game) or n>public.boardmate_game_max(r.game) then raise exception '지원 인원 범위를 확인해주세요.'; end if;

  if r.game='avalon' then
    good_n:=public.boardmate_avalon_good_count(n); evil_n:=n-good_n;
    opt_percival:=coalesce((p_options->>'percival')::boolean,false);
    opt_morgana:=coalesce((p_options->>'morgana')::boolean,false);
    opt_mordred:=coalesce((p_options->>'mordred')::boolean,false);
    opt_oberon:=coalesce((p_options->>'oberon')::boolean,false);
    if n=5 and opt_percival and not (opt_morgana or opt_mordred) then raise exception '5인 게임에서 퍼시벌을 사용하면 모르가나 또는 모드레드 중 하나를 함께 넣어주세요.'; end if;
    role_arr:=array['merlin','assassin'];
    if opt_percival then role_arr:=array_append(role_arr,'percival'); end if;
    if opt_morgana then role_arr:=array_append(role_arr,'morgana'); end if;
    if opt_mordred then role_arr:=array_append(role_arr,'mordred'); end if;
    if opt_oberon then role_arr:=array_append(role_arr,'oberon'); end if;
    good_special:=1+(case when opt_percival then 1 else 0 end);
    evil_special:=1+(case when opt_morgana then 1 else 0 end)+(case when opt_mordred then 1 else 0 end)+(case when opt_oberon then 1 else 0 end);
    if good_special>good_n or evil_special>evil_n then raise exception '선택한 특수 역할 수가 진영 인원보다 많습니다.'; end if;
    for i in 1..(good_n-good_special) loop role_arr:=array_append(role_arr,'loyal'); end loop;
    for i in 1..(evil_n-evil_special) loop role_arr:=array_append(role_arr,'minion_of_mordred'); end loop;
    role_arr:=public.boardmate_shuffle_text_array(role_arr);
    for i in 1..n loop roles_obj:=roles_obj||jsonb_build_object(seats[i]::text,role_arr[i]); end loop;
    select coalesce(jsonb_object_agg(x,cnt),'{}'::jsonb) into role_counts
      from (select x,count(*)::integer cnt from unnest(role_arr) x group by x) q;
    leader:=seats[1+floor(random()*n)::integer];
    st:=jsonb_build_object('initialized',true,'game','avalon','phase','team_build','players',players,'role_counts',role_counts,
      'quest',0,'leader',leader,'proposal','[]'::jsonb,'required',public.boardmate_avalon_team_size(n,0),
      'good_score',0,'evil_score',0,'rejects',0,'vote_count',0,'mission_count',0,'quest_results','[]'::jsonb,'history','[]'::jsonb,'over',false);
    sec:=jsonb_build_object('roles',roles_obj,'team_votes','{}'::jsonb,'mission_votes','{}'::jsonb);

  elsif r.game='secrethitler' then
    lib_n:=case n when 5 then 3 when 6 then 4 when 7 then 4 when 8 then 5 when 9 then 5 when 10 then 6 end;
    fasc_n:=n-lib_n-1;
    role_arr:=array['hitler'];
    for i in 1..lib_n loop role_arr:=array_append(role_arr,'liberal'); end loop;
    for i in 1..fasc_n loop role_arr:=array_append(role_arr,'fascist'); end loop;
    role_arr:=public.boardmate_shuffle_text_array(role_arr);
    for i in 1..n loop roles_obj:=roles_obj||jsonb_build_object(seats[i]::text,role_arr[i]); end loop;
    role_counts:=jsonb_build_object('liberal',lib_n,'fascist',fasc_n,'hitler',1);
    deck:=array['L','L','L','L','L','L','F','F','F','F','F','F','F','F','F','F','F'];
    deck:=public.boardmate_shuffle_text_array(deck);
    leader:=seats[1+floor(random()*n)::integer];
    st:=jsonb_build_object('initialized',true,'game','secrethitler','phase','nomination','players',players,'role_counts',role_counts,
      'president',leader,'chancellor_candidate',null,'current_chancellor',null,'last_elected_president',null,'last_elected_chancellor',null,
      'liberal_policies',0,'fascist_policies',0,'election_tracker',0,'dead','[]'::jsonb,'investigated','[]'::jsonb,
      'vote_count',0,'last_vote','[]'::jsonb,'power',null,'special_return',null,'history','[]'::jsonb,'over',false);
    sec:=jsonb_build_object('roles',roles_obj,'deck',to_jsonb(deck),'discard','[]'::jsonb,'election_votes','{}'::jsonb,
      'legislative','{}'::jsonb,'intel','{}'::jsonb);

  else
    counts:=coalesce(p_options->'role_counts','{}'::jsonb);
    if jsonb_typeof(counts)<>'object' then raise exception '역할 구성이 올바르지 않습니다.'; end if;
    for k in select jsonb_object_keys(counts) loop
      if k not in ('doppelganger','werewolf','minion','mason','seer','robber','troublemaker','drunk','insomniac','villager','tanner','hunter') then
        raise exception '지원하지 않는 역할: %',k;
      end if;
      c:=greatest(0,coalesce((counts->>k)::integer,0));
      maxc:=case k when 'werewolf' then 2 when 'mason' then 2 when 'villager' then 3 else 1 end;
      if c>maxc then raise exception '% 역할 카드 수가 너무 많습니다.',k; end if;
      total:=total+c;
      for i in 1..c loop role_arr:=array_append(role_arr,k); end loop;
    end loop;
    if coalesce((counts->>'mason')::integer,0) not in (0,2) then raise exception '프리메이슨은 사용할 경우 반드시 2장을 함께 넣어야 합니다.'; end if;
    if total<>n+3 then raise exception '플레이어 수보다 정확히 3장 더 많은 역할 카드가 필요합니다. 현재 %장 / 필요 %장',total,n+3; end if;
    role_arr:=public.boardmate_shuffle_text_array(role_arr);
    for i in 1..n loop
      original_obj:=original_obj||jsonb_build_object(seats[i]::text,role_arr[i]);
      cards_obj:=cards_obj||jsonb_build_object(seats[i]::text,role_arr[i]);
    end loop;
    center:=array[role_arr[n+1],role_arr[n+2],role_arr[n+3]];
    select coalesce(jsonb_object_agg(x,cnt),'{}'::jsonb) into role_counts
      from (select x,count(*)::integer cnt from unnest(role_arr) x group by x) q;
    if coalesce((role_counts->>'doppelganger')::integer,0)>0 then steps:=steps||array['doppel1','doppel2']; end if;
    if coalesce((role_counts->>'werewolf')::integer,0)>0 then steps:=steps||array['werewolf']; end if;
    if coalesce((role_counts->>'minion')::integer,0)>0 then steps:=steps||array['minion']; end if;
    if coalesce((role_counts->>'mason')::integer,0)>0 then steps:=steps||array['mason']; end if;
    if coalesce((role_counts->>'seer')::integer,0)>0 then steps:=steps||array['seer']; end if;
    if coalesce((role_counts->>'robber')::integer,0)>0 then steps:=steps||array['robber']; end if;
    if coalesce((role_counts->>'troublemaker')::integer,0)>0 then steps:=steps||array['troublemaker']; end if;
    if coalesce((role_counts->>'drunk')::integer,0)>0 then steps:=steps||array['drunk']; end if;
    if coalesce((role_counts->>'insomniac')::integer,0)>0 then steps:=steps||array['insomniac']; end if;
    if coalesce((role_counts->>'doppelganger')::integer,0)>0 and coalesce((role_counts->>'insomniac')::integer,0)>0 then steps:=steps||array['doppel_check']; end if;
    if array_length(steps,1) is null then steps:=array['noop']; end if;
    st:=jsonb_build_object('initialized',true,'game','onenightwerewolf','phase','night','players',players,'role_counts',role_counts,
      'night_step',case steps[1] when 'doppel1' then 'doppelganger' when 'doppel2' then 'doppelganger' when 'doppel_check' then 'doppelganger' else steps[1] end,
      'night_progress',0,'vote_count',0,'history','[]'::jsonb,'over',false);
    sec:=jsonb_build_object('original',original_obj,'cards',cards_obj,'center',to_jsonb(center),'night_steps',to_jsonb(steps),'night_index',0,
      'night_done','[]'::jsonb,'doppel_role',null,'intel','{}'::jsonb,'day_votes','{}'::jsonb);
  end if;

  insert into public.boardmate_social_games(room_id,game,revision,state,secrets) values(p_room_id,r.game,1,st,sec);
  return 1;
end;
$$;
grant execute on function public.boardmate_social_init(text,uuid,jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) Per-player filtered view. No function returns the raw secrets column.
-- -----------------------------------------------------------------------------
create or replace function public.boardmate_social_view(p_token text,p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  uid uuid; seat integer; g public.boardmate_social_games%rowtype; rgame text; st jsonb; sec jsonb; role text; team text; known jsonb:='[]'::jsonb;
  x record; other_role text; n integer; my jsonb:='{}'::jsonb; intel jsonb; phase text; dead boolean;
  leg jsonb; hand jsonb; power text; arr jsonb:='[]'::jsonb; steps text[]; idx integer; step text; original text; doppel text;
  actor boolean:=false; action_kind text:='ready'; waking jsonb:='[]'::jsonb; persistent_known jsonb:='[]'::jsonb; cnt integer; current_card text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select m.seat into seat from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid;
  if seat is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select * into g from public.boardmate_social_games where room_id=p_room_id;
  if not found then
    select game into rgame from public.boardmate_rooms where id=p_room_id;
    return jsonb_build_object('initialized',false,'game',rgame,'revision',0,'state',null,'me',jsonb_build_object('seat',seat));
  end if;
  st:=g.state; sec:=g.secrets; phase:=st->>'phase';

  if g.game='avalon' then
    role:=sec#>>array['roles',seat::text];
    team:=case when role in ('assassin','morgana','mordred','oberon','minion_of_mordred') then 'evil' else 'good' end;
    for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
      other_role:=sec#>>array['roles',x.s::text];
      if role='merlin' and other_role in ('assassin','morgana','oberon','minion_of_mordred') then
        known:=known||jsonb_build_array(jsonb_build_object('seat',x.s,'hint','악 진영'));
      elsif role='percival' and other_role in ('merlin','morgana') then
        known:=known||jsonb_build_array(jsonb_build_object('seat',x.s,'hint','멀린 또는 모르가나'));
      elsif team='evil' and role<>'oberon' and x.s<>seat and other_role in ('assassin','morgana','mordred','minion_of_mordred') then
        known:=known||jsonb_build_array(jsonb_build_object('seat',x.s,'hint','악 진영 동료'));
      end if;
    end loop;
    my:=jsonb_build_object('seat',seat,'role',role,'team',team,'known',known,
      'team_voted',(sec->'team_votes') ? seat::text,'mission_voted',(sec->'mission_votes') ? seat::text,
      'can_fail',team='evil');
    if coalesce((st->>'over')::boolean,false) then my:=my||jsonb_build_object('reveal_roles',sec->'roles'); end if;

  elsif g.game='secrethitler' then
    role:=sec#>>array['roles',seat::text]; team:=case when role='liberal' then 'liberal' else 'fascist' end;
    n:=jsonb_array_length(st->'players');
    if role='fascist' then
      for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
        other_role:=sec#>>array['roles',x.s::text];
        if x.s<>seat and other_role in ('fascist','hitler') then known:=known||jsonb_build_array(jsonb_build_object('seat',x.s,'hint',case when other_role='hitler' then '히틀러' else '파시스트' end)); end if;
      end loop;
    elsif role='hitler' and n<=6 then
      for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
        other_role:=sec#>>array['roles',x.s::text];
        if other_role='fascist' then known:=known||jsonb_build_array(jsonb_build_object('seat',x.s,'hint','파시스트'));
        end if;
      end loop;
    end if;
    intel:=coalesce((sec->'intel')->seat::text,'[]'::jsonb); leg:=coalesce(sec->'legislative','{}'::jsonb); hand:=null;
    if phase='legislative_president' and (st->>'president')::integer=seat then hand:=leg->'hand3'; end if;
    if phase in ('legislative_chancellor','veto_president') and (st->>'current_chancellor')::integer=seat then hand:=leg->'hand2'; end if;
    power:=st->>'power';
    if phase='executive' and power='policy_peek' and (st->>'president')::integer=seat then
      hand:=(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select value v from jsonb_array_elements(sec->'deck') with ordinality q(value,ord) where ord<=3 order by ord) z);
    end if;
    dead:=public.boardmate_json_has_int(st->'dead',seat);
    my:=jsonb_build_object('seat',seat,'role',role,'team',team,'known',known,'intel',intel,'hand',hand,'dead',dead,
      'election_voted',(sec->'election_votes') ? seat::text,'veto_rejected',coalesce((leg->>'veto_rejected')::boolean,false));
    if coalesce((st->>'over')::boolean,false) then my:=my||jsonb_build_object('reveal_roles',sec->'roles'); end if;

  else
    original:=sec#>>array['original',seat::text]; doppel:=sec->>'doppel_role'; intel:=coalesce((sec->'intel')->seat::text,'[]'::jsonb);
    persistent_known:='[]'::jsonb;
    if original='werewolf' or (original='doppelganger' and doppel='werewolf') then
      for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
        if x.s<>seat and ((sec#>>array['original',x.s::text])='werewolf' or ((sec#>>array['original',x.s::text])='doppelganger' and doppel='werewolf')) then
          persistent_known:=persistent_known||jsonb_build_array(x.s);
        end if;
      end loop;
    elsif original='minion' or (original='doppelganger' and doppel='minion') then
      for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
        if (sec#>>array['original',x.s::text])='werewolf' or ((sec#>>array['original',x.s::text])='doppelganger' and doppel='werewolf') then
          persistent_known:=persistent_known||jsonb_build_array(x.s);
        end if;
      end loop;
    elsif original='mason' or (original='doppelganger' and doppel='mason') then
      for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
        if x.s<>seat and ((sec#>>array['original',x.s::text])='mason' or ((sec#>>array['original',x.s::text])='doppelganger' and doppel='mason')) then
          persistent_known:=persistent_known||jsonb_build_array(x.s);
        end if;
      end loop;
    end if;
    my:=jsonb_build_object('seat',seat,'initial_role',original,'intel',intel,'known_seats',persistent_known,'copied_role',case when original='doppelganger' then doppel else null end,
      'night_submitted',public.boardmate_json_has_int(sec->'night_done',seat),'day_voted',(sec->'day_votes') ? seat::text);
    if phase='night' then
      select coalesce(array_agg(value order by ord),array[]::text[]) into steps from jsonb_array_elements_text(sec->'night_steps') with ordinality q(value,ord);
      idx:=coalesce((sec->>'night_index')::integer,0); step:=steps[idx+1];
      action_kind:='ready'; actor:=false; waking:='[]'::jsonb;
      if step='doppel1' and original='doppelganger' then actor:=true;action_kind:='doppel_choose';
      elsif step='doppel2' and original='doppelganger' then
        actor:=true;
        action_kind:=case doppel when 'seer' then 'seer' when 'robber' then 'robber' when 'troublemaker' then 'troublemaker' when 'drunk' then 'drunk' else 'ready' end;
      elsif step='werewolf' and (original='werewolf' or (original='doppelganger' and doppel='werewolf')) then
        actor:=true;
        for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
          if (sec#>>array['original',x.s::text])='werewolf' or ((sec#>>array['original',x.s::text])='doppelganger' and doppel='werewolf') then
            waking:=waking||jsonb_build_array(x.s);
          end if;
        end loop;
        action_kind:=case when jsonb_array_length(waking)=1 then 'wolf_lone' else 'ready' end;
      elsif step='minion' and (original='minion' or (original='doppelganger' and doppel='minion')) then
        actor:=true;
        for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
          if (sec#>>array['original',x.s::text])='werewolf' or ((sec#>>array['original',x.s::text])='doppelganger' and doppel='werewolf') then waking:=waking||jsonb_build_array(x.s); end if;
        end loop;
      elsif step='mason' and (original='mason' or (original='doppelganger' and doppel='mason')) then
        actor:=true;
        for x in select (e->>'seat')::integer s from jsonb_array_elements(st->'players') e loop
          if x.s<>seat and ((sec#>>array['original',x.s::text])='mason' or ((sec#>>array['original',x.s::text])='doppelganger' and doppel='mason')) then waking:=waking||jsonb_build_array(x.s); end if;
        end loop;
      elsif step='seer' and original='seer' then actor:=true;action_kind:='seer';
      elsif step='robber' and original='robber' then actor:=true;action_kind:='robber';
      elsif step='troublemaker' and original='troublemaker' then actor:=true;action_kind:='troublemaker';
      elsif step='drunk' and original='drunk' then actor:=true;action_kind:='drunk';
      elsif step='insomniac' and original='insomniac' then actor:=true;action_kind:='insomniac';current_card:=sec#>>array['cards',seat::text];
      elsif step='doppel_check' and original='doppelganger' and doppel='insomniac' then actor:=true;action_kind:='insomniac';current_card:=sec#>>array['cards',seat::text];
      end if;
      my:=my||jsonb_build_object('night_action',jsonb_build_object('actor',actor,'kind',action_kind,'known_seats',waking,'seen_role',current_card,'copied_role',case when original='doppelganger' then doppel else null end));
    end if;
    if coalesce((st->>'over')::boolean,false) then
      my:=my||jsonb_build_object('reveal_original',sec->'original','reveal_cards',sec->'cards','reveal_center',sec->'center','doppel_role',sec->'doppel_role');
    end if;
  end if;
  return jsonb_build_object('initialized',true,'game',g.game,'revision',g.revision,'state',st,'me',my);
end;
$$;
grant execute on function public.boardmate_social_view(text,uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6) Game actions. Row lock makes simultaneous votes/actions deterministic.
-- -----------------------------------------------------------------------------
create or replace function public.boardmate_social_action(p_token text,p_room_id uuid,p_action jsonb)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare
  uid uuid; seat integer; g public.boardmate_social_games%rowtype; st jsonb; sec jsonb; typ text; phase text; n integer; i integer; j integer;
  target integer; target2 integer; role text; team text; other_role text; required integer; proposal jsonb; arr jsonb; votes jsonb; cnt integer; yesn integer; non integer;
  failn integer; threshold integer; leader integer; nextseat integer; history jsonb; item jsonb; winner text; reason text;
  rolearr text[]; deck text[]; discard text[]; hand text[]; remain text[]; picked text; pidx integer; fasc integer; lib integer; tracker integer; power text;
  president integer; chancellor integer; alive_n integer; deadarr jsonb; investigated jsonb; specialret integer; intel jsonb; intelarr jsonb; party text;
  steps text[]; stepidx integer; step text; original text; doppel text; done jsonb; actionkind text; mode text; center text[]; cards jsonb; tmp text;
  allseats integer[]; tally jsonb:='{}'::jsonb; maxvote integer:=0; dead jsonb:='[]'::jsonb; changed boolean; eff text; doppelrole text;
  actor boolean:=false;
  wolfexists boolean:=false; wolfdead boolean:=false; tannerdead boolean:=false; villagewin boolean:=false; wolfwin boolean:=false; winners jsonb:='[]'::jsonb;
  minionwin boolean; anyotherdead boolean; finalmap jsonb:='{}'::jsonb; reveal jsonb:='[]'::jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select m.seat into seat from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid;
  if seat is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select * into g from public.boardmate_social_games where room_id=p_room_id for update;
  if not found then raise exception '게임이 아직 초기화되지 않았습니다.'; end if;
  st:=g.state; sec:=g.secrets; typ:=coalesce(p_action->>'type',''); phase:=st->>'phase'; n:=jsonb_array_length(st->'players');
  select array_agg((e->>'seat')::integer order by (e->>'seat')::integer) into allseats from jsonb_array_elements(st->'players') e;
  if coalesce((st->>'over')::boolean,false) then raise exception '이미 종료된 게임입니다.'; end if;
  history:=coalesce(st->'history','[]'::jsonb);

  -- =============================== AVALON ===============================
  if g.game='avalon' then
    role:=sec#>>array['roles',seat::text]; team:=case when role in ('assassin','morgana','mordred','oberon','minion_of_mordred') then 'evil' else 'good' end;
    if typ='propose' then
      if phase<>'team_build' or (st->>'leader')::integer<>seat then raise exception '현재 팀장이 아닙니다.'; end if;
      proposal:=coalesce(p_action->'seats','[]'::jsonb); required:=(st->>'required')::integer;
      if jsonb_array_length(proposal)<>required then raise exception '임무 인원은 %명이어야 합니다.',required; end if;
      if (select count(distinct value::integer) from jsonb_array_elements_text(proposal))<>required then raise exception '같은 플레이어를 두 번 선택할 수 없습니다.'; end if;
      for target in select value::integer from jsonb_array_elements_text(proposal) loop
        if not (target=any(allseats)) then raise exception '잘못된 플레이어입니다.'; end if;
      end loop;
      st:=jsonb_set(st,'{proposal}',proposal,true);st:=jsonb_set(st,'{phase}','"team_vote"'::jsonb,true);st:=jsonb_set(st,'{vote_count}','0'::jsonb,true);
      sec:=jsonb_set(sec,'{team_votes}','{}'::jsonb,true);
      history:=history||jsonb_build_array(jsonb_build_object('text','팀장이 임무 팀을 제안했습니다.','quest',(st->>'quest')::integer+1));
    elsif typ='team_vote' then
      if phase<>'team_vote' then raise exception '현재 팀 투표 단계가 아닙니다.'; end if;
      if (sec->'team_votes') ? seat::text then raise exception '이미 투표했습니다.'; end if;
      votes:=sec->'team_votes'||jsonb_build_object(seat::text,coalesce((p_action->>'approve')::boolean,false));sec:=jsonb_set(sec,'{team_votes}',votes,true);
      cnt:=public.boardmate_json_object_count(votes);st:=jsonb_set(st,'{vote_count}',to_jsonb(cnt),true);
      if cnt=n then
        yesn:=0;non:=0;arr:='[]'::jsonb;
        foreach target in array allseats loop
          if coalesce((votes->>target::text)::boolean,false) then yesn:=yesn+1; else non:=non+1; end if;
          arr:=arr||jsonb_build_array(jsonb_build_object('seat',target,'approve',coalesce((votes->>target::text)::boolean,false)));
        end loop;
        st:=jsonb_set(st,'{last_vote}',arr,true);sec:=jsonb_set(sec,'{team_votes}','{}'::jsonb,true);st:=jsonb_set(st,'{vote_count}','0'::jsonb,true);
        if yesn>non then
          st:=jsonb_set(st,'{phase}','"quest_vote"'::jsonb,true);st:=jsonb_set(st,'{mission_count}','0'::jsonb,true);sec:=jsonb_set(sec,'{mission_votes}','{}'::jsonb,true);
          history:=history||jsonb_build_array(jsonb_build_object('text',format('팀 투표 통과 (%s 찬성 / %s 반대)',yesn,non)));
        else
          cnt:=(st->>'rejects')::integer+1;st:=jsonb_set(st,'{rejects}',to_jsonb(cnt),true);
          history:=history||jsonb_build_array(jsonb_build_object('text',format('팀 투표 부결 (%s 찬성 / %s 반대)',yesn,non)));
          if cnt>=5 then
            st:=st||jsonb_build_object('phase','over','over',true,'winner','evil','reason','한 라운드에서 5개 팀이 연속 부결되어 악 진영 승리');
          else
            leader:=(st->>'leader')::integer;for i in 1..n loop nextseat:=allseats[(array_position(allseats,leader)+i-1)%n+1];exit when nextseat is not null;end loop;
            st:=jsonb_set(st,'{leader}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{proposal}','[]'::jsonb,true);st:=jsonb_set(st,'{phase}','"team_build"'::jsonb,true);
          end if;
        end if;
      end if;
    elsif typ='quest_vote' then
      if phase<>'quest_vote' then raise exception '현재 임무 투표 단계가 아닙니다.'; end if;
      proposal:=st->'proposal'; if not public.boardmate_json_has_int(proposal,seat) then raise exception '이번 임무 팀원이 아닙니다.'; end if;
      if (sec->'mission_votes') ? seat::text then raise exception '이미 임무 카드를 냈습니다.'; end if;
      if team='good' and not coalesce((p_action->>'success')::boolean,true) then raise exception '선 진영은 임무 성공만 낼 수 있습니다.'; end if;
      votes:=sec->'mission_votes'||jsonb_build_object(seat::text,coalesce((p_action->>'success')::boolean,true));sec:=jsonb_set(sec,'{mission_votes}',votes,true);
      cnt:=public.boardmate_json_object_count(votes);st:=jsonb_set(st,'{mission_count}',to_jsonb(cnt),true);
      if cnt=jsonb_array_length(proposal) then
        failn:=0;for target in select value::integer from jsonb_array_elements_text(proposal) loop if not coalesce((votes->>target::text)::boolean,true) then failn:=failn+1; end if;end loop;
        threshold:=case when n>=7 and (st->>'quest')::integer=3 then 2 else 1 end;
        arr:=jsonb_build_object('quest',(st->>'quest')::integer+1,'fail_cards',failn,'success_cards',cnt-failn,'failed',failn>=threshold);
        st:=jsonb_set(st,'{last_quest}',arr,true);st:=jsonb_set(st,'{quest_results}',coalesce(st->'quest_results','[]'::jsonb)||jsonb_build_array(arr),true);sec:=jsonb_set(sec,'{mission_votes}','{}'::jsonb,true);st:=jsonb_set(st,'{mission_count}','0'::jsonb,true);
        if failn>=threshold then st:=jsonb_set(st,'{evil_score}',to_jsonb((st->>'evil_score')::integer+1),true);history:=history||jsonb_build_array(jsonb_build_object('text',format('%s번째 임무 실패 · 실패 카드 %s장',(st->>'quest')::integer+1,failn)));
        else st:=jsonb_set(st,'{good_score}',to_jsonb((st->>'good_score')::integer+1),true);history:=history||jsonb_build_array(jsonb_build_object('text',format('%s번째 임무 성공 · 실패 카드 %s장',(st->>'quest')::integer+1,failn))); end if;
        if (st->>'evil_score')::integer>=3 then st:=st||jsonb_build_object('phase','over','over',true,'winner','evil','reason','임무 3개 실패');
        elsif (st->>'good_score')::integer>=3 then st:=jsonb_set(st,'{phase}','"assassination"'::jsonb,true);
        else
          st:=jsonb_set(st,'{quest}',to_jsonb((st->>'quest')::integer+1),true);st:=jsonb_set(st,'{rejects}','0'::jsonb,true);st:=jsonb_set(st,'{proposal}','[]'::jsonb,true);
          leader:=(st->>'leader')::integer;nextseat:=allseats[(array_position(allseats,leader)%n)+1];st:=jsonb_set(st,'{leader}',to_jsonb(nextseat),true);
          st:=jsonb_set(st,'{required}',to_jsonb(public.boardmate_avalon_team_size(n,(st->>'quest')::integer)),true);st:=jsonb_set(st,'{phase}','"team_build"'::jsonb,true);
        end if;
      end if;
    elsif typ='assassinate' then
      if phase<>'assassination' or role<>'assassin' then raise exception '암살자만 선택할 수 있습니다.'; end if;
      target:=(p_action->>'seat')::integer;if not(target=any(allseats)) or target=seat then raise exception '잘못된 대상입니다.'; end if;
      other_role:=sec#>>array['roles',target::text];
      if other_role='merlin' then winner:='evil';reason:='암살자가 멀린을 찾아냈습니다.'; else winner:='good';reason:='암살자가 멀린이 아닌 플레이어를 지목했습니다.'; end if;
      st:=st||jsonb_build_object('phase','over','over',true,'winner',winner,'reason',reason,'assassinated',target);
      history:=history||jsonb_build_array(jsonb_build_object('text',reason));
    else raise exception '지원하지 않는 아발론 행동입니다.'; end if;

  -- ============================ SECRET HITLER ============================
  elsif g.game='secrethitler' then
    role:=sec#>>array['roles',seat::text];deadarr:=coalesce(st->'dead','[]'::jsonb);if public.boardmate_json_has_int(deadarr,seat) then raise exception '처형된 플레이어는 행동할 수 없습니다.'; end if;
    president:=(st->>'president')::integer;
    if typ='nominate' then
      if phase<>'nomination' or president<>seat then raise exception '현재 대통령 후보만 지명할 수 있습니다.'; end if;
      target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) or public.boardmate_json_has_int(deadarr,target) then raise exception '수상 후보로 지명할 수 없습니다.'; end if;
      alive_n:=n-jsonb_array_length(deadarr);
      if st->>'last_elected_chancellor' is not null and target=(st->>'last_elected_chancellor')::integer then raise exception '직전 수상은 연임 제한으로 지명할 수 없습니다.'; end if;
      if alive_n>5 and st->>'last_elected_president' is not null and target=(st->>'last_elected_president')::integer then raise exception '직전 대통령은 수상 후보가 될 수 없습니다.'; end if;
      st:=jsonb_set(st,'{chancellor_candidate}',to_jsonb(target),true);st:=jsonb_set(st,'{phase}','"election"'::jsonb,true);st:=jsonb_set(st,'{vote_count}','0'::jsonb,true);sec:=jsonb_set(sec,'{election_votes}','{}'::jsonb,true);
      history:=history||jsonb_build_array(jsonb_build_object('text','대통령 후보가 수상 후보를 지명했습니다.','president',seat,'chancellor',target));
    elsif typ='election_vote' then
      if phase<>'election' then raise exception '현재 선거 단계가 아닙니다.'; end if;
      if (sec->'election_votes') ? seat::text then raise exception '이미 투표했습니다.'; end if;
      votes:=sec->'election_votes'||jsonb_build_object(seat::text,coalesce((p_action->>'yes')::boolean,false));sec:=jsonb_set(sec,'{election_votes}',votes,true);
      alive_n:=n-jsonb_array_length(deadarr);cnt:=public.boardmate_json_object_count(votes);st:=jsonb_set(st,'{vote_count}',to_jsonb(cnt),true);
      if cnt=alive_n then
        yesn:=0;non:=0;arr:='[]'::jsonb;
        foreach target in array allseats loop
          if not public.boardmate_json_has_int(deadarr,target) then
            if coalesce((votes->>target::text)::boolean,false) then yesn:=yesn+1; else non:=non+1; end if;
            arr:=arr||jsonb_build_array(jsonb_build_object('seat',target,'yes',coalesce((votes->>target::text)::boolean,false)));
          end if;
        end loop;
        st:=jsonb_set(st,'{last_vote}',arr,true);sec:=jsonb_set(sec,'{election_votes}','{}'::jsonb,true);st:=jsonb_set(st,'{vote_count}','0'::jsonb,true);
        if yesn>non then
          chancellor:=(st->>'chancellor_candidate')::integer;st:=jsonb_set(st,'{current_chancellor}',to_jsonb(chancellor),true);st:=jsonb_set(st,'{last_elected_president}',to_jsonb(president),true);st:=jsonb_set(st,'{last_elected_chancellor}',to_jsonb(chancellor),true);
          history:=history||jsonb_build_array(jsonb_build_object('text',format('정부 선출 (%s Ja / %s Nein)',yesn,non),'president',president,'chancellor',chancellor));
          if (st->>'fascist_policies')::integer>=3 and (sec#>>array['roles',chancellor::text])='hitler' then
            st:=st||jsonb_build_object('phase','over','over',true,'winner','fascist','reason','파시스트 정책 3장 이후 히틀러가 수상으로 선출되었습니다.');
          else
            if (st->>'fascist_policies')::integer>=3 then history:=history||jsonb_build_array(jsonb_build_object('text','새로 선출된 수상은 히틀러가 아님이 공개적으로 확인되었습니다.','chancellor',chancellor)); end if;
            select coalesce(array_agg(value order by ord),array[]::text[]) into deck from jsonb_array_elements_text(sec->'deck') with ordinality q(value,ord);
            select coalesce(array_agg(value order by ord),array[]::text[]) into discard from jsonb_array_elements_text(sec->'discard') with ordinality q(value,ord);
            if coalesce(array_length(deck,1),0)<3 then deck:=public.boardmate_shuffle_text_array(coalesce(deck,array[]::text[])||coalesce(discard,array[]::text[]));discard:=array[]::text[]; end if;
            if array_length(deck,1)<3 then raise exception '정책 덱 오류'; end if;
            hand:=deck[1:3];if array_length(deck,1)>3 then remain:=deck[4:array_length(deck,1)];else remain:=array[]::text[];end if;
            sec:=jsonb_set(sec,'{deck}',to_jsonb(remain),true);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);
            sec:=jsonb_set(sec,'{legislative}',jsonb_build_object('president',president,'chancellor',chancellor,'hand3',to_jsonb(hand),'hand2','[]'::jsonb,'veto_rejected',false),true);
            intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->president::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','입법: 대통령이 본 3장','cards',to_jsonb(hand)));intel:=jsonb_set(intel,array[president::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);
            st:=jsonb_set(st,'{phase}','"legislative_president"'::jsonb,true);
          end if;
        else
          tracker:=(st->>'election_tracker')::integer+1;st:=jsonb_set(st,'{election_tracker}',to_jsonb(tracker),true);history:=history||jsonb_build_array(jsonb_build_object('text',format('정부 부결 (%s Ja / %s Nein)',yesn,non)));
          if tracker>=3 then
            select coalesce(array_agg(value order by ord),array[]::text[]) into deck from jsonb_array_elements_text(sec->'deck') with ordinality q(value,ord);
            select coalesce(array_agg(value order by ord),array[]::text[]) into discard from jsonb_array_elements_text(sec->'discard') with ordinality q(value,ord);
            if coalesce(array_length(deck,1),0)<1 then deck:=public.boardmate_shuffle_text_array(discard);discard:=array[]::text[]; end if;
            picked:=deck[1];if array_length(deck,1)>1 then remain:=deck[2:array_length(deck,1)];else remain:=array[]::text[];end if;sec:=jsonb_set(sec,'{deck}',to_jsonb(remain),true);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);
            st:=jsonb_set(st,'{election_tracker}','0'::jsonb,true);st:=jsonb_set(st,'{last_elected_president}','null'::jsonb,true);st:=jsonb_set(st,'{last_elected_chancellor}','null'::jsonb,true);
            if picked='L' then st:=jsonb_set(st,'{liberal_policies}',to_jsonb((st->>'liberal_policies')::integer+1),true); else st:=jsonb_set(st,'{fascist_policies}',to_jsonb((st->>'fascist_policies')::integer+1),true); end if;
            history:=history||jsonb_build_array(jsonb_build_object('text','선거 3연속 실패로 최상단 정책이 자동 시행되었습니다.','policy',picked));
            if (st->>'liberal_policies')::integer>=5 then st:=st||jsonb_build_object('phase','over','over',true,'winner','liberal','reason','자유 정책 5장 시행');
            elsif (st->>'fascist_policies')::integer>=6 then st:=st||jsonb_build_object('phase','over','over',true,'winner','fascist','reason','파시스트 정책 6장 시행');
            else
              -- chaos ignores presidential power and advances normally
              if st->>'special_return' is not null then nextseat:=(st->>'special_return')::integer;st:=jsonb_set(st,'{special_return}','null'::jsonb,true);for i in 1..n loop exit when not public.boardmate_json_has_int(coalesce(st->'dead','[]'::jsonb),nextseat);nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];end loop;
              else
                nextseat:=president;for i in 1..n loop nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];exit when not public.boardmate_json_has_int(deadarr,nextseat);end loop;
              end if;
              st:=jsonb_set(st,'{president}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{chancellor_candidate}','null'::jsonb,true);st:=jsonb_set(st,'{current_chancellor}','null'::jsonb,true);st:=jsonb_set(st,'{phase}','"nomination"'::jsonb,true);
            end if;
          else
            if st->>'special_return' is not null then
              nextseat:=(st->>'special_return')::integer;st:=jsonb_set(st,'{special_return}','null'::jsonb,true);
              for i in 1..n loop exit when not public.boardmate_json_has_int(deadarr,nextseat);nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];end loop;
            else
              nextseat:=president;for i in 1..n loop nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];exit when not public.boardmate_json_has_int(deadarr,nextseat);end loop;
            end if;
            st:=jsonb_set(st,'{president}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{chancellor_candidate}','null'::jsonb,true);st:=jsonb_set(st,'{current_chancellor}','null'::jsonb,true);st:=jsonb_set(st,'{phase}','"nomination"'::jsonb,true);
          end if;
        end if;
      end if;
    elsif typ='president_discard' then
      if phase<>'legislative_president' or president<>seat then raise exception '현재 대통령 입법 단계가 아닙니다.'; end if;
      pidx:=coalesce((p_action->>'index')::integer,-1);if pidx<0 or pidx>2 then raise exception '버릴 정책을 선택하세요.'; end if;
      select array_agg(value order by ord) into hand from jsonb_array_elements_text(sec#>'{legislative,hand3}') with ordinality q(value,ord);
      if array_length(hand,1)<>3 then raise exception '정책 손패 오류'; end if;picked:=hand[pidx+1];remain:=array[]::text[];for i in 1..3 loop if i<>pidx+1 then remain:=array_append(remain,hand[i]); end if;end loop;
      select coalesce(array_agg(value order by ord),array[]::text[]) into discard from jsonb_array_elements_text(sec->'discard') with ordinality q(value,ord);discard:=array_append(discard,picked);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);
      sec:=jsonb_set(sec,'{legislative,hand2}',to_jsonb(remain),true);chancellor:=(st->>'current_chancellor')::integer;
      intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->chancellor::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','입법: 수상이 받은 2장','cards',to_jsonb(remain)));intel:=jsonb_set(intel,array[chancellor::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);
      st:=jsonb_set(st,'{phase}','"legislative_chancellor"'::jsonb,true);
    elsif typ='chancellor_policy' then
      chancellor:=(st->>'current_chancellor')::integer;if phase<>'legislative_chancellor' or chancellor<>seat then raise exception '현재 수상 입법 단계가 아닙니다.'; end if;
      pidx:=coalesce((p_action->>'index')::integer,-1);if pidx<0 or pidx>1 then raise exception '시행할 정책을 선택하세요.'; end if;
      select array_agg(value order by ord) into hand from jsonb_array_elements_text(sec#>'{legislative,hand2}') with ordinality q(value,ord);if array_length(hand,1)<>2 then raise exception '정책 손패 오류'; end if;
      picked:=hand[pidx+1];tmp:=hand[case when pidx=0 then 2 else 1 end];select coalesce(array_agg(value order by ord),array[]::text[]) into discard from jsonb_array_elements_text(sec->'discard') with ordinality q(value,ord);discard:=array_append(discard,tmp);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);sec:=jsonb_set(sec,'{legislative}','{}'::jsonb,true);
      if picked='L' then lib:=(st->>'liberal_policies')::integer+1;st:=jsonb_set(st,'{liberal_policies}',to_jsonb(lib),true);else fasc:=(st->>'fascist_policies')::integer+1;st:=jsonb_set(st,'{fascist_policies}',to_jsonb(fasc),true);end if;
      st:=jsonb_set(st,'{election_tracker}','0'::jsonb,true);
      history:=history||jsonb_build_array(jsonb_build_object('text',case when picked='L' then '자유 정책이 시행되었습니다.' else '파시스트 정책이 시행되었습니다.' end,'policy',picked));
      if (st->>'liberal_policies')::integer>=5 then st:=st||jsonb_build_object('phase','over','over',true,'winner','liberal','reason','자유 정책 5장 시행');
      elsif (st->>'fascist_policies')::integer>=6 then st:=st||jsonb_build_object('phase','over','over',true,'winner','fascist','reason','파시스트 정책 6장 시행');
      else
        power:=case when picked='F' then public.boardmate_sh_power(n,(st->>'fascist_policies')::integer) else null end;st:=jsonb_set(st,'{power}',coalesce(to_jsonb(power),'null'::jsonb),true);
        if power is not null then st:=jsonb_set(st,'{phase}','"executive"'::jsonb,true);
        else
          if st->>'special_return' is not null then nextseat:=(st->>'special_return')::integer;st:=jsonb_set(st,'{special_return}','null'::jsonb,true);for i in 1..n loop exit when not public.boardmate_json_has_int(coalesce(st->'dead','[]'::jsonb),nextseat);nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];end loop;else nextseat:=president;for i in 1..n loop nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];exit when not public.boardmate_json_has_int(deadarr,nextseat);end loop;end if;
          st:=jsonb_set(st,'{president}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{chancellor_candidate}','null'::jsonb,true);st:=jsonb_set(st,'{current_chancellor}','null'::jsonb,true);st:=jsonb_set(st,'{phase}','"nomination"'::jsonb,true);
        end if;
      end if;
      -- rulebook reshuffle: if fewer than 3 remain at end of legislative session
      select coalesce(array_agg(value order by ord),array[]::text[]) into deck from jsonb_array_elements_text(sec->'deck') with ordinality q(value,ord);select coalesce(array_agg(value order by ord),array[]::text[]) into discard from jsonb_array_elements_text(sec->'discard') with ordinality q(value,ord);
      if coalesce(array_length(deck,1),0)<3 then deck:=public.boardmate_shuffle_text_array(coalesce(deck,array[]::text[])||coalesce(discard,array[]::text[]));discard:=array[]::text[];sec:=jsonb_set(sec,'{deck}',to_jsonb(deck),true);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);end if;
    elsif typ='veto_request' then
      chancellor:=(st->>'current_chancellor')::integer;if phase<>'legislative_chancellor' or chancellor<>seat or (st->>'fascist_policies')::integer<5 then raise exception '현재 거부권을 요청할 수 없습니다.'; end if;
      if coalesce((sec#>>'{legislative,veto_rejected}')::boolean,false) then raise exception '이번 입법에서 거부권이 이미 거절되었습니다.'; end if;st:=jsonb_set(st,'{phase}','"veto_president"'::jsonb,true);
    elsif typ='veto_decide' then
      if phase<>'veto_president' or president<>seat then raise exception '대통령만 거부권에 응답할 수 있습니다.'; end if;
      if coalesce((p_action->>'accept')::boolean,false) then
        select array_agg(value order by ord) into hand from jsonb_array_elements_text(sec#>'{legislative,hand2}') with ordinality q(value,ord);select coalesce(array_agg(value order by ord),array[]::text[]) into discard from jsonb_array_elements_text(sec->'discard') with ordinality q(value,ord);discard:=coalesce(discard,array[]::text[])||coalesce(hand,array[]::text[]);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);sec:=jsonb_set(sec,'{legislative}','{}'::jsonb,true);
        tracker:=(st->>'election_tracker')::integer+1;st:=jsonb_set(st,'{election_tracker}',to_jsonb(tracker),true);history:=history||jsonb_build_array(jsonb_build_object('text','대통령이 거부권에 동의했습니다.'));
        if tracker>=3 then
          select coalesce(array_agg(value order by ord),array[]::text[]) into deck from jsonb_array_elements_text(sec->'deck') with ordinality q(value,ord);if coalesce(array_length(deck,1),0)<1 then deck:=public.boardmate_shuffle_text_array(discard);discard:=array[]::text[];end if;picked:=deck[1];if array_length(deck,1)>1 then remain:=deck[2:array_length(deck,1)];else remain:=array[]::text[];end if;sec:=jsonb_set(sec,'{deck}',to_jsonb(remain),true);sec:=jsonb_set(sec,'{discard}',to_jsonb(discard),true);
          st:=jsonb_set(st,'{election_tracker}','0'::jsonb,true);st:=jsonb_set(st,'{last_elected_president}','null'::jsonb,true);st:=jsonb_set(st,'{last_elected_chancellor}','null'::jsonb,true);if picked='L' then st:=jsonb_set(st,'{liberal_policies}',to_jsonb((st->>'liberal_policies')::integer+1),true);else st:=jsonb_set(st,'{fascist_policies}',to_jsonb((st->>'fascist_policies')::integer+1),true);end if;history:=history||jsonb_build_array(jsonb_build_object('text','거부권으로 선거 트래커가 3에 도달해 정책이 자동 시행되었습니다.','policy',picked));
          if (st->>'liberal_policies')::integer>=5 then st:=st||jsonb_build_object('phase','over','over',true,'winner','liberal','reason','자유 정책 5장 시행');elsif (st->>'fascist_policies')::integer>=6 then st:=st||jsonb_build_object('phase','over','over',true,'winner','fascist','reason','파시스트 정책 6장 시행');end if;
        end if;
        if not coalesce((st->>'over')::boolean,false) then if st->>'special_return' is not null then nextseat:=(st->>'special_return')::integer;st:=jsonb_set(st,'{special_return}','null'::jsonb,true);for i in 1..n loop exit when not public.boardmate_json_has_int(coalesce(st->'dead','[]'::jsonb),nextseat);nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];end loop;else nextseat:=president;for i in 1..n loop nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];exit when not public.boardmate_json_has_int(deadarr,nextseat);end loop;end if;st:=jsonb_set(st,'{president}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{chancellor_candidate}','null'::jsonb,true);st:=jsonb_set(st,'{current_chancellor}','null'::jsonb,true);st:=jsonb_set(st,'{phase}','"nomination"'::jsonb,true);end if;
      else
        sec:=jsonb_set(sec,'{legislative,veto_rejected}','true'::jsonb,true);st:=jsonb_set(st,'{phase}','"legislative_chancellor"'::jsonb,true);history:=history||jsonb_build_array(jsonb_build_object('text','대통령이 거부권을 거절했습니다. 수상은 정책을 시행해야 합니다.'));
      end if;
    elsif typ='executive' then
      if phase<>'executive' or president<>seat then raise exception '현재 대통령의 행정 권한 단계가 아닙니다.'; end if;power:=st->>'power';
      if power='investigate' then
        target:=(p_action->>'seat')::integer;investigated:=coalesce(st->'investigated','[]'::jsonb);if target=seat or not(target=any(allseats)) or public.boardmate_json_has_int(deadarr,target) or public.boardmate_json_has_int(investigated,target) then raise exception '조사할 수 없는 대상입니다.'; end if;
        investigated:=public.boardmate_json_append_int_unique(investigated,target);st:=jsonb_set(st,'{investigated}',investigated,true);other_role:=sec#>>array['roles',target::text];party:=case when other_role='liberal' then 'liberal' else 'fascist' end;
        intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','당원 조사','seat',target,'party',party));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);history:=history||jsonb_build_array(jsonb_build_object('text','대통령이 당원 조사를 실시했습니다.','target',target));
      elsif power='policy_peek' then
        arr:=(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select value v from jsonb_array_elements(sec->'deck') with ordinality q(value,ord) where ord<=3 order by ord) z);intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','정책 확인','cards',arr));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);history:=history||jsonb_build_array(jsonb_build_object('text','대통령이 정책 덱 위 3장을 확인했습니다.'));
      elsif power='special_election' then
        target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) or public.boardmate_json_has_int(deadarr,target) then raise exception '특별 선거 대상으로 선택할 수 없습니다.'; end if;
        nextseat:=president;for i in 1..n loop nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];exit when not public.boardmate_json_has_int(deadarr,nextseat);end loop;st:=jsonb_set(st,'{special_return}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{president}',to_jsonb(target),true);st:=jsonb_set(st,'{chancellor_candidate}','null'::jsonb,true);st:=jsonb_set(st,'{current_chancellor}','null'::jsonb,true);st:=jsonb_set(st,'{power}','null'::jsonb,true);st:=jsonb_set(st,'{phase}','"nomination"'::jsonb,true);history:=history||jsonb_build_array(jsonb_build_object('text','대통령이 특별 선거를 지명했습니다.','target',target));
      elsif power='execute' then
        target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) or public.boardmate_json_has_int(deadarr,target) then raise exception '처형할 수 없는 대상입니다.'; end if;deadarr:=public.boardmate_json_append_int_unique(deadarr,target);st:=jsonb_set(st,'{dead}',deadarr,true);history:=history||jsonb_build_array(jsonb_build_object('text','대통령이 한 플레이어를 처형했습니다.','target',target));
        if (sec#>>array['roles',target::text])='hitler' then st:=st||jsonb_build_object('phase','over','over',true,'winner','liberal','reason','히틀러가 처형되었습니다.');end if;
      else raise exception '알 수 없는 대통령 권한입니다.';end if;
      if not coalesce((st->>'over')::boolean,false) and power<>'special_election' then
        st:=jsonb_set(st,'{power}','null'::jsonb,true);if st->>'special_return' is not null then nextseat:=(st->>'special_return')::integer;st:=jsonb_set(st,'{special_return}','null'::jsonb,true);for i in 1..n loop exit when not public.boardmate_json_has_int(coalesce(st->'dead','[]'::jsonb),nextseat);nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];end loop;else nextseat:=president;for i in 1..n loop nextseat:=allseats[(array_position(allseats,nextseat)%n)+1];exit when not public.boardmate_json_has_int(st->'dead',nextseat);end loop;end if;st:=jsonb_set(st,'{president}',to_jsonb(nextseat),true);st:=jsonb_set(st,'{chancellor_candidate}','null'::jsonb,true);st:=jsonb_set(st,'{current_chancellor}','null'::jsonb,true);st:=jsonb_set(st,'{phase}','"nomination"'::jsonb,true);
      end if;
    else raise exception '지원하지 않는 시크릿 히틀러 행동입니다.';end if;

  -- ====================== ONE NIGHT ULTIMATE WEREWOLF ======================
  else
    original:=sec#>>array['original',seat::text];doppel:=sec->>'doppel_role';
    if phase='night' then
      if typ<>'night_submit' then raise exception '현재 야간 단계입니다.'; end if;if public.boardmate_json_has_int(sec->'night_done',seat) then raise exception '이 야간 단계는 이미 확인했습니다.'; end if;
      select coalesce(array_agg(value order by ord),array[]::text[]) into steps from jsonb_array_elements_text(sec->'night_steps') with ordinality q(value,ord);stepidx:=coalesce((sec->>'night_index')::integer,0);step:=steps[stepidx+1];mode:=coalesce(p_action->>'mode','ready');cards:=sec->'cards';select coalesce(array_agg(value order by ord),array[]::text[]) into center from jsonb_array_elements_text(sec->'center') with ordinality q(value,ord);
      actor:=false;actionkind:='ready';
      if step='doppel1' and original='doppelganger' then actor:=true;actionkind:='doppel_choose';
      elsif step='doppel2' and original='doppelganger' then actor:=true;actionkind:=case doppel when 'seer' then 'seer' when 'robber' then 'robber' when 'troublemaker' then 'troublemaker' when 'drunk' then 'drunk' else 'ready' end;
      elsif step='werewolf' and (original='werewolf' or (original='doppelganger' and doppel='werewolf')) then actor:=true;cnt:=0;foreach target in array allseats loop if (sec#>>array['original',target::text])='werewolf' or ((sec#>>array['original',target::text])='doppelganger' and doppel='werewolf') then cnt:=cnt+1;end if;end loop;if cnt=1 then actionkind:='wolf_lone';end if;
      elsif step='minion' and (original='minion' or (original='doppelganger' and doppel='minion')) then actor:=true;
      elsif step='mason' and (original='mason' or (original='doppelganger' and doppel='mason')) then actor:=true;
      elsif step='seer' and original='seer' then actor:=true;actionkind:='seer';
      elsif step='robber' and original='robber' then actor:=true;actionkind:='robber';
      elsif step='troublemaker' and original='troublemaker' then actor:=true;actionkind:='troublemaker';
      elsif step='drunk' and original='drunk' then actor:=true;actionkind:='drunk';
      elsif step='insomniac' and original='insomniac' then actor:=true;actionkind:='insomniac';
      elsif step='doppel_check' and original='doppelganger' and doppel='insomniac' then actor:=true;actionkind:='insomniac';end if;
      if actor then
        if actionkind='doppel_choose' then
          target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) then raise exception '복제할 플레이어를 선택하세요.';end if;doppel:=cards->>target::text;sec:=jsonb_set(sec,'{doppel_role}',to_jsonb(doppel),true);intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','도플갱어 복제','seat',target,'role',doppel));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);
        elsif actionkind in ('seer') then
          if mode='player' then target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) then raise exception '다른 플레이어를 선택하세요.';end if;arr:=jsonb_build_array(jsonb_build_object('seat',target,'role',cards->>target::text));
          elsif mode='center' then target:=coalesce((p_action->>'center1')::integer,-1);target2:=coalesce((p_action->>'center2')::integer,-1);if target<0 or target>2 or target2<0 or target2>2 or target=target2 then raise exception '서로 다른 중앙 카드 2장을 선택하세요.';end if;arr:=jsonb_build_array(jsonb_build_object('center',target,'role',center[target+1]),jsonb_build_object('center',target2,'role',center[target2+1]));else raise exception '예언자 행동을 선택하세요.';end if;intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','예언자 확인','cards',arr));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);
        elsif actionkind='robber' then
          if mode='skip' then null;else target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) then raise exception '교환할 플레이어를 선택하세요.';end if;tmp:=cards->>seat::text;other_role:=cards->>target::text;cards:=jsonb_set(cards,array[seat::text],to_jsonb(other_role),true);cards:=jsonb_set(cards,array[target::text],to_jsonb(tmp),true);sec:=jsonb_set(sec,'{cards}',cards,true);intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','강도 교환 후 새 카드','seat',target,'role',other_role));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);end if;
        elsif actionkind='troublemaker' then
          if mode='skip' then null;else target:=(p_action->>'seat1')::integer;target2:=(p_action->>'seat2')::integer;if target=seat or target2=seat or target=target2 or not(target=any(allseats)) or not(target2=any(allseats)) then raise exception '서로 다른 다른 플레이어 2명을 선택하세요.';end if;tmp:=cards->>target::text;other_role:=cards->>target2::text;cards:=jsonb_set(cards,array[target::text],to_jsonb(other_role),true);cards:=jsonb_set(cards,array[target2::text],to_jsonb(tmp),true);sec:=jsonb_set(sec,'{cards}',cards,true);end if;
        elsif actionkind='drunk' then
          target:=coalesce((p_action->>'center')::integer,-1);if target<0 or target>2 then raise exception '중앙 카드 1장을 선택하세요.';end if;tmp:=cards->>seat::text;cards:=jsonb_set(cards,array[seat::text],to_jsonb(center[target+1]),true);center[target+1]:=tmp;sec:=jsonb_set(sec,'{cards}',cards,true);sec:=jsonb_set(sec,'{center}',to_jsonb(center),true);
        elsif actionkind='wolf_lone' then
          if mode<>'skip' then target:=coalesce((p_action->>'center')::integer,-1);if target<0 or target>2 then raise exception '중앙 카드 1장을 선택하거나 건너뛰세요.';end if;intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','단독 늑대인간 중앙 확인','center',target,'role',center[target+1]));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);end if;
        elsif actionkind='insomniac' then
          intel:=coalesce(sec->'intel','{}'::jsonb);intelarr:=coalesce(intel->seat::text,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('type','불면증환자 최종 카드 확인','role',cards->>seat::text));intel:=jsonb_set(intel,array[seat::text],intelarr,true);sec:=jsonb_set(sec,'{intel}',intel,true);
        end if;
      end if;
      done:=public.boardmate_json_append_int_unique(sec->'night_done',seat);sec:=jsonb_set(sec,'{night_done}',done,true);st:=jsonb_set(st,'{night_progress}',to_jsonb(jsonb_array_length(done)),true);
      if jsonb_array_length(done)=n then
        stepidx:=stepidx+1;sec:=jsonb_set(sec,'{night_index}',to_jsonb(stepidx),true);sec:=jsonb_set(sec,'{night_done}','[]'::jsonb,true);st:=jsonb_set(st,'{night_progress}','0'::jsonb,true);
        if stepidx>=coalesce(array_length(steps,1),0) then st:=jsonb_set(st,'{phase}','"day"'::jsonb,true);st:=jsonb_set(st,'{night_step}','null'::jsonb,true);history:=history||jsonb_build_array(jsonb_build_object('text','밤이 끝났습니다. 토론 후 투표하세요.'));
        else step:=steps[stepidx+1];st:=jsonb_set(st,'{night_step}',to_jsonb(case step when 'doppel1' then 'doppelganger' when 'doppel2' then 'doppelganger' when 'doppel_check' then 'doppelganger' else step end),true);end if;
      end if;
    elsif phase='day' then
      if typ<>'day_vote' then raise exception '토론 후 투표 단계입니다.';end if;if (sec->'day_votes') ? seat::text then raise exception '이미 투표했습니다.';end if;target:=(p_action->>'seat')::integer;if target=seat or not(target=any(allseats)) then raise exception '다른 플레이어에게 투표하세요.';end if;votes:=sec->'day_votes'||jsonb_build_object(seat::text,target);sec:=jsonb_set(sec,'{day_votes}',votes,true);cnt:=public.boardmate_json_object_count(votes);st:=jsonb_set(st,'{vote_count}',to_jsonb(cnt),true);
      if cnt=n then
        foreach target in array allseats loop tally:=tally||jsonb_build_object(target::text,0);end loop;foreach target in array allseats loop target2:=(votes->>target::text)::integer;tally:=jsonb_set(tally,array[target2::text],to_jsonb(coalesce((tally->>target2::text)::integer,0)+1),true);end loop;
        foreach target in array allseats loop maxvote:=greatest(maxvote,coalesce((tally->>target::text)::integer,0));end loop;if maxvote>1 then foreach target in array allseats loop if coalesce((tally->>target::text)::integer,0)=maxvote then dead:=public.boardmate_json_append_int_unique(dead,target);end if;end loop;end if;
        doppelrole:=sec->>'doppel_role';cards:=sec->'cards';
        changed:=true;while changed loop changed:=false;foreach target in array allseats loop if public.boardmate_json_has_int(dead,target) then tmp:=cards->>target::text;eff:=case when tmp='doppelganger' then coalesce(doppelrole,'villager') else tmp end;if eff='hunter' then target2:=(votes->>target::text)::integer;if not public.boardmate_json_has_int(dead,target2) then dead:=public.boardmate_json_append_int_unique(dead,target2);changed:=true;end if;end if;end if;end loop;end loop;
        foreach target in array allseats loop tmp:=cards->>target::text;eff:=case when tmp='doppelganger' then coalesce(doppelrole,'villager') else tmp end;finalmap:=finalmap||jsonb_build_object(target::text,eff);if eff='werewolf' then wolfexists:=true;if public.boardmate_json_has_int(dead,target) then wolfdead:=true;end if;end if;if eff='tanner' and public.boardmate_json_has_int(dead,target) then tannerdead:=true;end if;reveal:=reveal||jsonb_build_array(jsonb_build_object('seat',target,'physical_role',tmp,'role',eff));end loop;
        if wolfexists then villagewin:=wolfdead;wolfwin:=not wolfdead and not tannerdead;else villagewin:=jsonb_array_length(dead)=0;wolfwin:=false;end if;
        foreach target in array allseats loop eff:=finalmap->>target::text;minionwin:=false;if eff='tanner' then if public.boardmate_json_has_int(dead,target) then winners:=winners||jsonb_build_array(target);end if;
          elsif eff='werewolf' then if wolfwin then winners:=winners||jsonb_build_array(target);end if;
          elsif eff='minion' then if wolfexists then minionwin:=wolfwin;else anyotherdead:=exists(select 1 from jsonb_array_elements_text(dead) d(v) where d.v::integer<>target);minionwin:=anyotherdead;end if;if minionwin then winners:=winners||jsonb_build_array(target);end if;
          else if villagewin then winners:=winners||jsonb_build_array(target);end if;end if;end loop;
        st:=st||jsonb_build_object('phase','over','over',true,'dead',dead,'tally',tally,'winners',winners,'reveal',reveal,'center_reveal',sec->'center','doppel_role',doppelrole,
          'result',jsonb_build_object('village_win',villagewin,'werewolf_win',wolfwin,'tanner_dead',tannerdead,'werewolf_exists',wolfexists));
        history:=history||jsonb_build_array(jsonb_build_object('text','투표가 공개되고 게임이 종료되었습니다.'));
      end if;
    else raise exception '지원하지 않는 한밤의 늑대인간 행동입니다.';end if;
  end if;

  st:=jsonb_set(st,'{history}',history,true);
  update public.boardmate_social_games set state=st,secrets=sec,revision=revision+1,updated_at=now() where room_id=p_room_id returning revision into g.revision;
  return g.revision;
end;
$$;
grant execute on function public.boardmate_social_action(text,uuid,jsonb) to anon, authenticated;

-- Refresh PostgREST's RPC/schema cache after every repaired function is present.
select pg_notify('pgrst','reload schema');
commit;


-- -----------------------------------------------------------------------------
-- Plakoro Pokemon V5 self-contained private setup/action storage repair
-- -----------------------------------------------------------------------------
-- BoardMate Arena v11.4.26 — Plakoro Pokemon PvP V5 (self-contained repair)
-- This version is safe to run even when the older catalog migration that created
-- boardmate_plakoro_setups was never executed. Existing setup/action rows are preserved.

begin;

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
  die jsonb; face jsonb; t text; i integer; j integer;
  valid_types text[] := array['grass','fire','water','lightning','psychic','fight','fighting','dark','steel','dragon','wind','flying','colorless'];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found or r.game<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
  if r.status<>'playing' then raise exception '먼저 대기실에서 게임 시작을 눌러주세요.'; end if;

  select seat into seat_no
  from public.boardmate_room_members
  where room_id=p_room_id and user_id=uid;
  if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
  if seat_no not between 0 and 1 then raise exception '프라코로 포켓몬은 2인만 참가할 수 있습니다.'; end if;

  allowed:=case p_pokemon
    when 'bulbasaur' then array['bulbasaur-vine','bulbasaur-leaf','bulbasaur-leech','bulbasaur-knot','bulbasaur-tackle','bulbasaur-giga','bulbasaur-acid']
    when 'charmander' then array['charmander-ember','charmander-heat','charmander-flame','charmander-fang','charmander-storm','charmander-thunderpunch','charmander-metal']
    when 'squirtle' then array['squirtle-watergun','squirtle-withdraw','squirtle-pulse','squirtle-shell','squirtle-bubble','squirtle-hydro','squirtle-mud']
    when 'pikachu' then array['pikachu-bite','pikachu-thundershock','pikachu-rush','pikachu-bolt','pikachu-thunder','pikachu-volttackle','pikachu-iron']
    when 'eevee' then array['eevee-tailslap','eevee-tackle','eevee-rush','eevee-bounce','eevee-full','eevee-charm','eevee-darkbite']
    when 'mew' then array['mew-confusion','mew-psybeam','mew-barrier','mew-memory','mew-psyshot','mew-psychic','mew-reflection']
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

  if jsonb_typeof(p_energy)<>'array' or jsonb_array_length(p_energy)<>3 then
    raise exception '에너지코로는 3개가 필요합니다.';
  end if;

  for i in 0..2 loop
    die:=p_energy->i;
    if jsonb_typeof(die)<>'array' or jsonb_array_length(die)<>6 then
      raise exception '각 에너지코로는 6면이어야 합니다.';
    end if;

    -- A1/A2/B1/B2: single-energy string faces
    for j in 0..3 loop
      face:=die->j;
      if jsonb_typeof(face)<>'string' then
        raise exception 'A/B면은 단일 에너지 타입이어야 합니다.';
      end if;
      t:=trim(both '"' from face::text);
      if not (t=any(valid_types)) then
        raise exception '에너지코로에 허용되지 않는 에너지 타입입니다: %', t;
      end if;
    end loop;

    -- C1/C2: each face is exactly two energy types
    for j in 4..5 loop
      face:=die->j;
      if jsonb_typeof(face)<>'array' or jsonb_array_length(face)<>2 then
        raise exception 'C면은 2에너지 조합이어야 합니다.';
      end if;
      for t in select value::text from jsonb_array_elements_text(face)
      loop
        t:=trim(both '"' from t);
        if not (t=any(valid_types)) then
          raise exception 'C면에 허용되지 않는 에너지 타입입니다: %', t;
        end if;
      end loop;
    end loop;

    -- A face rule: two A faces must be different.
    if die->>0 = die->>1 then
      raise exception 'A면 2개는 서로 다른 타입이어야 합니다.';
    end if;
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
  if rgame<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
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
  if rgame<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
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
  if rgame<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
  if host<>uid then raise exception '방장만 준비된 양쪽 구성을 확인할 수 있습니다.'; end if;
  select count(*) into cnt from public.boardmate_plakoro_setups
    where room_id=p_room_id and ready=true and s.seat between 0 and 1;
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
  if rgame<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
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
  if rgame<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
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


-- ===== v11.4.27 unanimous social-game cancellation =====
-- BoardMate social deduction unanimous game cancellation
-- Applies to Avalon / Secret Hitler / One Night Werewolf.
-- Does not change boardmate_rooms constraints or delete game state.
begin;

create table if not exists public.boardmate_game_cancel_votes (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  vote boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_id,user_id)
);

alter table public.boardmate_game_cancel_votes enable row level security;
revoke all on public.boardmate_game_cancel_votes from anon, authenticated;

create or replace function public.boardmate_get_cancel_status(
  p_token text,
  p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid;
  r public.boardmate_rooms%rowtype;
  total_n integer;
  yes_n integer;
  mine boolean := false;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;

  if r.game not in ('avalon','secrethitler','onenightwerewolf') then
    raise exception '취소 투표를 지원하지 않는 게임입니다.';
  end if;

  if not exists (
    select 1 from public.boardmate_room_members
    where room_id=p_room_id and user_id=uid
  ) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;

  select count(*)::integer into total_n
  from public.boardmate_room_members where room_id=p_room_id;

  select count(*)::integer into yes_n
  from public.boardmate_game_cancel_votes
  where room_id=p_room_id and vote=true
    and exists (
      select 1 from public.boardmate_room_members m
      where m.room_id=p_room_id and m.user_id=boardmate_game_cancel_votes.user_id
    );

  select coalesce(v.vote,false) into mine
  from public.boardmate_game_cancel_votes v
  where v.room_id=p_room_id and v.user_id=uid;

  return jsonb_build_object(
    'total', total_n,
    'yes', yes_n,
    'mine', mine,
    'cancelled', (total_n > 0 and yes_n >= total_n and r.status='finished')
  );
end;
$$;
grant execute on function public.boardmate_get_cancel_status(text,uuid) to anon, authenticated;

create or replace function public.boardmate_set_cancel_vote(
  p_token text,
  p_room_id uuid,
  p_vote boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid;
  r public.boardmate_rooms%rowtype;
  total_n integer;
  yes_n integer;
  cancelled boolean := false;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in ('avalon','secrethitler','onenightwerewolf') then
    raise exception '취소 투표를 지원하지 않는 게임입니다.';
  end if;
  if r.status<>'playing' then
    raise exception '현재 취소 투표를 진행할 수 없는 방입니다.';
  end if;
  if not exists (
    select 1 from public.boardmate_room_members
    where room_id=p_room_id and user_id=uid
  ) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;

  insert into public.boardmate_game_cancel_votes(room_id,user_id,vote,updated_at)
  values(p_room_id,uid,coalesce(p_vote,false),now())
  on conflict(room_id,user_id) do update
    set vote=excluded.vote,updated_at=now();

  select count(*)::integer into total_n
  from public.boardmate_room_members where room_id=p_room_id;

  select count(*)::integer into yes_n
  from public.boardmate_game_cancel_votes
  where room_id=p_room_id and vote=true
    and exists (
      select 1 from public.boardmate_room_members m
      where m.room_id=p_room_id and m.user_id=boardmate_game_cancel_votes.user_id
    );

  if total_n > 0 and yes_n >= total_n then
    update public.boardmate_rooms
       set status='finished'
     where id=p_room_id and status='playing';
    cancelled := true;
  end if;

  return jsonb_build_object(
    'total', total_n,
    'yes', yes_n,
    'mine', p_vote,
    'cancelled', cancelled
  );
end;
$$;
grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean) to anon, authenticated;

notify pgrst,'reload schema';
commit;


-- v11.4.28: Fix ambiguous RETURN TABLE seat reference in Plakoro setup-pair RPC.
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
  if rgame<>'plakoro' then raise exception '프라코로 포켓몬 방이 아닙니다.'; end if;
  if host<>uid then raise exception '방장만 준비된 양쪽 구성을 확인할 수 있습니다.'; end if;
  select count(*) into cnt
    from public.boardmate_plakoro_setups s
    where s.room_id=p_room_id and s.ready=true and s.seat between 0 and 1;
  if cnt<2 then raise exception '두 플레이어 모두 준비를 완료해야 합니다.'; end if;
  return query
    select s.seat,s.payload
    from public.boardmate_plakoro_setups s
    where s.room_id=p_room_id and s.ready=true and s.seat between 0 and 1
    order by s.seat;
end;
$$;
grant execute on function public.boardmate_plakoro_get_setup_pair_v2(text,uuid) to anon, authenticated;

-- v11.4.28: Extend unanimous cancellation to Plakoro.
create or replace function public.boardmate_get_cancel_status(
  p_token text,p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; mine boolean := false;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in ('avalon','secrethitler','onenightwerewolf','plakoro') then
    raise exception '취소 투표를 지원하지 않는 게임입니다.';
  end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  select count(*)::integer into total_n from public.boardmate_room_members where room_id=p_room_id;
  select count(*)::integer into yes_n
    from public.boardmate_game_cancel_votes v
    where v.room_id=p_room_id and v.vote=true
      and exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=v.user_id);
  select coalesce(v.vote,false) into mine from public.boardmate_game_cancel_votes v
    where v.room_id=p_room_id and v.user_id=uid;
  return jsonb_build_object('total',total_n,'yes',yes_n,'mine',mine,'cancelled',(total_n>0 and yes_n>=total_n and r.status='finished'));
end;
$$;
grant execute on function public.boardmate_get_cancel_status(text,uuid) to anon, authenticated;

create or replace function public.boardmate_set_cancel_vote(
  p_token text,p_room_id uuid,p_vote boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; cancelled boolean:=false;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in ('avalon','secrethitler','onenightwerewolf','plakoro') then
    raise exception '취소 투표를 지원하지 않는 게임입니다.';
  end if;
  if r.status<>'playing' then raise exception '현재 취소 투표를 진행할 수 없는 방입니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;
  insert into public.boardmate_game_cancel_votes(room_id,user_id,vote,updated_at)
  values(p_room_id,uid,coalesce(p_vote,false),now())
  on conflict(room_id,user_id) do update set vote=excluded.vote,updated_at=now();
  select count(*)::integer into total_n from public.boardmate_room_members where room_id=p_room_id;
  select count(*)::integer into yes_n
    from public.boardmate_game_cancel_votes v
    where v.room_id=p_room_id and v.vote=true
      and exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=v.user_id);
  if total_n>0 and yes_n>=total_n then
    update public.boardmate_rooms set status='finished' where id=p_room_id and status='playing';
    cancelled:=true;
  end if;
  return jsonb_build_object('total',total_n,'yes',yes_n,'mine',p_vote,'cancelled',cancelled);
end;
$$;
grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean) to anon, authenticated;
