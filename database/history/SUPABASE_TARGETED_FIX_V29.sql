-- BoardMate Arena v11.4.29 targeted repair
-- Safe/idempotent. Does not alter boardmate_rooms game CHECK constraints.
begin;

create table if not exists public.boardmate_plakoro_actions (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  seat integer not null check (seat between 0 and 1),
  action text not null check (action in ('SELECT_ATTACK','ROLL','CHOOSE_FORBID')),
  payload jsonb not null default '{}'::jsonb,
  nonce bigint not null default floor(extract(epoch from clock_timestamp())*1000)::bigint,
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id),
  unique(room_id,seat)
);
alter table public.boardmate_plakoro_actions enable row level security;
revoke all on public.boardmate_plakoro_actions from public,anon,authenticated;

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
revoke all on public.boardmate_plakoro_setups from public,anon,authenticated;


create table if not exists public.boardmate_game_cancel_votes (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  vote boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_id,user_id)
);
alter table public.boardmate_game_cancel_votes enable row level security;
revoke all on public.boardmate_game_cancel_votes from public,anon,authenticated;

create or replace function public.boardmate_get_cancel_status(p_token text,p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; mine boolean:=false; voters text[];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken','fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado','airlandsea') then raise exception '취소 투표를 지원하지 않는 게임입니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select count(*)::integer into total_n from public.boardmate_room_members where room_id=p_room_id;
  select count(*)::integer into yes_n from public.boardmate_game_cancel_votes v where v.room_id=p_room_id and v.vote=true and exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=v.user_id);
  select coalesce(v.vote,false) into mine from public.boardmate_game_cancel_votes v where v.room_id=p_room_id and v.user_id=uid;
  select coalesce(array_agg(p.nickname order by m.seat) filter(where v.vote=true),'{}'::text[]) into voters
  from public.boardmate_room_members m join public.boardmate_profiles p on p.user_id=m.user_id left join public.boardmate_game_cancel_votes v on v.room_id=m.room_id and v.user_id=m.user_id where m.room_id=p_room_id;
  return jsonb_build_object('total',total_n,'yes',yes_n,'members',total_n,'votes',yes_n,'mine',mine,'voters',coalesce(voters,'{}'::text[]),'room_status',case when r.status='playing' then 'playing' when r.status='finished' then 'finished' else r.status end);
end; $$;
grant execute on function public.boardmate_get_cancel_status(text,uuid) to anon,authenticated;

create or replace function public.boardmate_set_cancel_vote(p_token text,p_room_id uuid,p_vote boolean)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; total_n integer; yes_n integer; rgame text; rstatus text; cancelled boolean:=false; voters text[];
begin
  uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select game,status into rgame,rstatus from public.boardmate_rooms where id=p_room_id;
  if rgame is null then raise exception '방을 찾을 수 없습니다.'; end if;
  if rgame not in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken','fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf','plakoro','quacks','mandom','samurai','eldorado','airlandsea') then raise exception '취소 투표를 지원하지 않는 게임입니다.'; end if;
  if rstatus<>'playing' then raise exception '현재 취소 투표를 진행할 수 없는 방입니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members where room_id=p_room_id and user_id=uid) then raise exception '이 방의 참가자가 아닙니다.'; end if;
  insert into public.boardmate_game_cancel_votes(room_id,user_id,vote,updated_at) values(p_room_id,uid,coalesce(p_vote,false),now()) on conflict(room_id,user_id) do update set vote=excluded.vote,updated_at=now();
  select count(*)::integer into total_n from public.boardmate_room_members where room_id=p_room_id;
  select count(*)::integer into yes_n from public.boardmate_game_cancel_votes v where v.room_id=p_room_id and v.vote=true and exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=v.user_id);
  if total_n>0 and yes_n>=total_n then update public.boardmate_rooms set status='finished' where id=p_room_id and status='playing'; cancelled:=true; end if;
  select coalesce(array_agg(p.nickname order by m.seat) filter(where v.vote=true),'{}'::text[]) into voters from public.boardmate_room_members m join public.boardmate_profiles p on p.user_id=m.user_id left join public.boardmate_game_cancel_votes v on v.room_id=m.room_id and v.user_id=m.user_id where m.room_id=p_room_id;
  return jsonb_build_object('total',total_n,'yes',yes_n,'members',total_n,'votes',yes_n,'mine',p_vote,'voters',coalesce(voters,'{}'::text[]),'cancelled',cancelled,'room_status',case when cancelled then 'finished' else 'playing' end);
end; $$;
grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean) to anon,authenticated;

create or replace function public.boardmate_plakoro_set_setup_v2(p_token text,p_room_id uuid,p_pokemon text,p_attacks jsonb,p_energy jsonb,p_ready boolean default true)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; seat_no integer; r public.boardmate_rooms%rowtype; got text[]; distinct_n integer; die jsonb; face text; idx integer;
begin
 uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
 select * into r from public.boardmate_rooms where id=p_room_id;
 if not found or r.game<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
 if r.status<>'playing' then raise exception '먼저 방을 시작해 주세요.'; end if;
 select m.seat into seat_no from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid;
 if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
 if p_pokemon not in ('bulbasaur','charmander','squirtle','pikachu','eevee','mew') then raise exception '선택할 수 없는 포켓몬입니다.'; end if;
 if jsonb_typeof(p_attacks)<>'array' then raise exception '기술 카드 4장을 선택하세요.'; end if;
 select array_agg(v) into got from jsonb_array_elements_text(p_attacks) e(v);
 if coalesce(array_length(got,1),0)<>4 then raise exception '기술 카드 4장을 선택하세요.'; end if;
 select count(distinct v) into distinct_n from unnest(got) v; if distinct_n<>4 then raise exception '서로 다른 기술 카드 4장을 선택하세요.'; end if;
 if exists(select 1 from unnest(got) v where split_part(v,'-',1)<>p_pokemon or (split_part(v,'-',2) !~ '^[0-6]$')) then raise exception '선택한 기술 카드가 해당 포켓몬의 기술 카드가 아닙니다.'; end if;
 if jsonb_typeof(p_energy)<>'array' or jsonb_array_length(p_energy)<>3 then raise exception '에너지코로는 3개가 필요합니다.'; end if;
 for die in select value from jsonb_array_elements(p_energy) loop
  if jsonb_typeof(die)<>'array' or jsonb_array_length(die)<>6 then raise exception '각 에너지코로는 6면이어야 합니다.'; end if;
  for face in select value from jsonb_array_elements_text(die) loop
   if face not in ('grass','fire','water','lightning','psychic','fight','fighting','dark','steel','dragon','flying','wind','colorless') then raise exception '에너지코로에 허용되지 않는 타입입니다.'; end if;
  end loop;
 end loop;
 insert into public.boardmate_plakoro_setups(room_id,user_id,seat,payload,ready,updated_at) values(p_room_id,uid,seat_no,jsonb_build_object('pokemon',p_pokemon,'attacks',to_jsonb(got),'energyFaces',p_energy),coalesce(p_ready,false),now())
 on conflict(room_id,user_id) do update set seat=excluded.seat,payload=excluded.payload,ready=excluded.ready,updated_at=now();
 return true;
end; $$;
grant execute on function public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean) to anon,authenticated;

create or replace function public.boardmate_plakoro_get_setup_status_v2(p_token text,p_room_id uuid)
returns table(seat integer,ready boolean) language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid;
begin
 uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
 if not exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid) then raise exception '이 방의 참가자가 아닙니다.'; end if;
 return query select m.seat,coalesce(s.ready,false) from public.boardmate_room_members m left join public.boardmate_plakoro_setups s on s.room_id=m.room_id and s.user_id=m.user_id where m.room_id=p_room_id and m.seat between 0 and 1 order by m.seat;
end; $$;
grant execute on function public.boardmate_plakoro_get_setup_status_v2(text,uuid) to anon,authenticated;

create or replace function public.boardmate_plakoro_get_setup_self_v2(p_token text,p_room_id uuid)
returns table(seat integer,ready boolean,payload jsonb) language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid;
begin
 uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
 return query select s.seat,s.ready,s.payload from public.boardmate_plakoro_setups s where s.room_id=p_room_id and s.user_id=uid;
end; $$;
grant execute on function public.boardmate_plakoro_get_setup_self_v2(text,uuid) to anon,authenticated;

create or replace function public.boardmate_plakoro_put_action(p_token text,p_room_id uuid,p_action text,p_payload jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; seat_no integer; rgame text; rstatus text;
begin
 uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
 if p_action not in ('SELECT_ATTACK','ROLL','CHOOSE_FORBID') then raise exception '허용되지 않는 액션입니다.'; end if;
 select game,status into rgame,rstatus from public.boardmate_rooms where id=p_room_id;
 if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
 if rstatus<>'playing' then raise exception '게임이 시작되지 않았습니다.'; end if;
 select m.seat into seat_no from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid;
 if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
 insert into public.boardmate_plakoro_actions(room_id,user_id,seat,action,payload,nonce,updated_at) values(p_room_id,uid,seat_no,p_action,coalesce(p_payload,'{}'::jsonb),floor(extract(epoch from clock_timestamp())*1000)::bigint,now())
 on conflict(room_id,user_id) do update set seat=excluded.seat,action=excluded.action,payload=excluded.payload,nonce=excluded.nonce,updated_at=now();
 return true;
end; $$;
grant execute on function public.boardmate_plakoro_put_action(text,uuid,text,jsonb) to anon,authenticated;

create or replace function public.boardmate_plakoro_take_action(p_token text,p_room_id uuid,p_seat integer)
returns table(seat integer,action text,payload jsonb,nonce bigint) language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; host uuid; rgame text;
begin
 uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
 select game,host_id into rgame,host from public.boardmate_rooms where id=p_room_id;
 if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
 if host<>uid then raise exception '방장만 액션을 가져올 수 있습니다.'; end if;
 if p_seat not between 0 and 1 then return; end if;
 return query delete from public.boardmate_plakoro_actions a where a.room_id=p_room_id and a.seat=p_seat returning a.seat,a.action,a.payload,a.nonce;
end; $$;
grant execute on function public.boardmate_plakoro_take_action(text,uuid,integer) to anon,authenticated;

create or replace function public.boardmate_plakoro_get_setup_pair_v2(p_token text,p_room_id uuid)
returns table(seat integer,payload jsonb) language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; host uuid; rgame text; cnt integer;
begin
  uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select game,host_id into rgame,host from public.boardmate_rooms where id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if host<>uid then raise exception '방장만 준비된 양쪽 구성을 확인할 수 있습니다.'; end if;
  select count(*) into cnt from public.boardmate_plakoro_setups ps where ps.room_id=p_room_id and ps.ready=true and ps.seat between 0 and 1;
  if cnt<2 then raise exception '두 플레이어 모두 준비를 완료해야 합니다.'; end if;
  return query select ps.seat,ps.payload from public.boardmate_plakoro_setups ps where ps.room_id=p_room_id and ps.ready=true and ps.seat between 0 and 1 order by ps.seat;
end; $$;
grant execute on function public.boardmate_plakoro_get_setup_pair_v2(text,uuid) to anon,authenticated;

notify pgrst,'reload schema';
commit;
