-- BoardMate Arena v11.4.30 targeted DB repair
-- Safe/idempotent. Does NOT alter boardmate_rooms game CHECK constraints.
begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Plakoro setup: accept the real skill IDs (bulbasaur-vine, etc.) and the
-- C-face 2-energy arrays used by the BoardMate UI.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.boardmate_plakoro_set_setup_v2(
  p_token text,p_room_id uuid,p_pokemon text,p_attacks jsonb,p_energy jsonb,p_ready boolean default true
)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; seat_no integer; r public.boardmate_rooms%rowtype; got text[]; distinct_n integer; die jsonb; face jsonb; idx integer; scalar_face text; pair jsonb;
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
 -- Real BoardMate Plakoro IDs are <pokemon>-<skill-name>, not numeric suffixes.
 if exists(select 1 from unnest(got) v where split_part(v,'-',1)<>p_pokemon or split_part(v,'-',2)='') then
   raise exception '선택한 기술 카드가 해당 포켓몬의 기술 카드가 아닙니다.';
 end if;
 if jsonb_typeof(p_energy)<>'array' or jsonb_array_length(p_energy)<>3 then raise exception '에너지코로는 3개가 필요합니다.'; end if;
 for die in select value from jsonb_array_elements(p_energy) loop
   if jsonb_typeof(die)<>'array' or jsonb_array_length(die)<>6 then raise exception '각 에너지코로는 6면이어야 합니다.'; end if;
   for idx in 0..5 loop
     face:=die->idx;
     if idx<4 then
       if jsonb_typeof(face)<>'string' then raise exception '에너지코로 A/B 면은 단일 에너지 타입이어야 합니다.'; end if;
       scalar_face:=face#>>'{}';
       if scalar_face not in ('grass','fire','water','lightning','psychic','fight','fighting','dark','steel','dragon','flying','wind','colorless') then raise exception '에너지코로에 허용되지 않는 타입입니다.'; end if;
     else
       if jsonb_typeof(face)<>'array' or jsonb_array_length(face)<>2 then raise exception '에너지코로 C 면은 2에너지 조합이어야 합니다.'; end if;
       for pair in select value from jsonb_array_elements(face) loop
         if jsonb_typeof(pair)<>'string' then raise exception '에너지코로 C 면의 에너지 타입이 올바르지 않습니다.'; end if;
         scalar_face:=pair#>>'{}';
         if scalar_face not in ('grass','fire','water','lightning','psychic','fight','fighting','dark','steel','dragon','flying','wind','colorless') then raise exception '에너지코로에 허용되지 않는 타입입니다.'; end if;
       end loop;
     end if;
   end loop;
 end loop;
 insert into public.boardmate_plakoro_setups(room_id,user_id,seat,payload,ready,updated_at)
 values(p_room_id,uid,seat_no,jsonb_build_object('pokemon',p_pokemon,'attacks',to_jsonb(got),'energyFaces',p_energy),coalesce(p_ready,false),now())
 on conflict(room_id,user_id) do update set seat=excluded.seat,payload=excluded.payload,ready=excluded.ready,updated_at=now();
 return true;
end; $$;
grant execute on function public.boardmate_plakoro_set_setup_v2(text,uuid,text,jsonb,jsonb,boolean) to anon,authenticated;

-- Re-create the action helpers with explicit table aliases so no seat reference
-- can become ambiguous after future joins are added.
create or replace function public.boardmate_plakoro_get_setup_pair_v2(p_token text,p_room_id uuid)
returns table(seat integer,payload jsonb) language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; host uuid; rgame text; cnt integer;
begin
  uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select r.game,r.host_id into rgame,host from public.boardmate_rooms r where r.id=p_room_id;
  if rgame<>'plakoro' then raise exception '프라코로 방이 아닙니다.'; end if;
  if host<>uid then raise exception '방장만 준비된 양쪽 구성을 확인할 수 있습니다.'; end if;
  select count(*) into cnt from public.boardmate_plakoro_setups ps where ps.room_id=p_room_id and ps.ready=true and ps.seat between 0 and 1;
  if cnt<2 then raise exception '두 플레이어 모두 준비를 완료해야 합니다.'; end if;
  return query select ps.seat,ps.payload from public.boardmate_plakoro_setups ps where ps.room_id=p_room_id and ps.ready=true and ps.seat between 0 and 1 order by ps.seat;
end; $$;
grant execute on function public.boardmate_plakoro_get_setup_pair_v2(text,uuid) to anon,authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fantasy Realms: the controller must be able to read/write the aggregate
-- private state. The old implementation allowed only the room host, which made
-- a started game unusable when the host disconnected.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_boardmate_fantasy_state(p_token text,p_room_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,extensions as $$
declare uid uuid; seat_no integer; r public.boardmate_rooms%rowtype; pub public.boardmate_room_state%rowtype; priv jsonb; controller uuid;
begin
  uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  select m.seat into seat_no from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid;
  if seat_no is null then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select * into pub from public.boardmate_room_state where room_id=p_room_id;
  if not found then return jsonb_build_object('revision',0,'state',null,'private',null); end if;
  controller:=nullif(pub.state->>'controllerUserId','')::uuid;
  select states into priv from public.boardmate_game_private_states where room_id=p_room_id;
  if r.host_id=uid or controller=uid then
    return jsonb_build_object('revision',pub.revision,'state',pub.state,'private',coalesce(priv,'{}'::jsonb),'host',r.host_id=uid,'controller',controller=uid,'seat',seat_no,'updated_at',pub.updated_at);
  end if;
  return jsonb_build_object('revision',pub.revision,'state',pub.state,'private',coalesce(priv->>(seat_no::text),'null'::text)::jsonb,'host',false,'controller',false,'seat',seat_no,'updated_at',pub.updated_at);
end; $$;
grant execute on function public.get_boardmate_fantasy_state(text,uuid) to anon,authenticated;

create or replace function public.claim_boardmate_fantasy_controller(p_token text,p_room_id uuid)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; pub public.boardmate_room_state%rowtype; current_controller uuid;
begin
  uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists(select 1 from public.boardmate_room_members m where m.room_id=p_room_id and m.user_id=uid) then raise exception '이 방의 참가자가 아닙니다.'; end if;
  select * into pub from public.boardmate_room_state where room_id=p_room_id for update;
  if not found or pub.state->>'gameId' <> 'fantasyrealms' then return false; end if;
  current_controller:=nullif(pub.state->>'controllerUserId','')::uuid;
  if current_controller=uid then return true; end if;
  update public.boardmate_room_state
     set revision=revision+1,
         state=jsonb_set(pub.state,'{controllerUserId}',to_jsonb(uid),true),
         updated_at=now()
   where room_id=p_room_id and revision=pub.revision;
  return found;
end; $$;
grant execute on function public.claim_boardmate_fantasy_controller(text,uuid) to anon,authenticated;

create or replace function public.put_boardmate_fantasy_state(p_token text,p_room_id uuid,p_expected_revision bigint,p_public_state jsonb,p_private_states jsonb)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; r public.boardmate_rooms%rowtype; rev bigint; newrev bigint; seat_no integer; turn_uid uuid; controller uuid;
begin
  uid:=public.boardmate_session_user(p_token); if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id for update;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game<>'fantasyrealms' then raise exception '판타지 왕국 방이 아닙니다.'; end if;
  if r.status<>'playing' and r.status<>'finished' then raise exception '게임이 시작되지 않았습니다.'; end if;
  select nullif(s.state->>'controllerUserId','')::uuid into controller from public.boardmate_room_state s where s.room_id=p_room_id;
  -- Empty room_state: the first connected participant may bootstrap a new game,
  -- provided the submitted public state explicitly names that participant.
  if r.host_id<>uid and controller is not null and controller<>uid then raise exception '판타지 왕국 게임 상태 확정 권한이 없습니다.'; end if;
  if r.host_id<>uid and controller is null and nullif(p_public_state->>'controllerUserId','')::uuid<>uid then raise exception '판타지 왕국 게임 상태 확정 권한이 없습니다.'; end if;
  if jsonb_typeof(p_public_state) is distinct from 'object' then raise exception '공개 게임 상태가 올바르지 않습니다.'; end if;
  if jsonb_typeof(p_private_states) is distinct from 'object' then raise exception '비공개 게임 상태가 올바르지 않습니다.'; end if;
  select s.revision into rev from public.boardmate_room_state s where s.room_id=p_room_id for update;
  if not found then
    if p_expected_revision<>0 then raise exception 'revision conflict'; end if;
    newrev:=1; insert into public.boardmate_room_state(room_id,revision,state) values(p_room_id,newrev,p_public_state);
  else
    if rev<>p_expected_revision then raise exception 'revision conflict'; end if;
    newrev:=rev+1; update public.boardmate_room_state s set revision=newrev,state=p_public_state,updated_at=now() where s.room_id=p_room_id;
  end if;
  insert into public.boardmate_game_private_states(room_id,revision,states,updated_at) values(p_room_id,newrev,p_private_states,now())
  on conflict(room_id) do update set revision=excluded.revision,states=excluded.states,updated_at=now();
  seat_no:=public.boardmate_turn_seat('fantasyrealms',p_public_state);
  if seat_no is not null then select m.user_id into turn_uid from public.boardmate_room_members m where m.room_id=p_room_id and m.seat=seat_no; else turn_uid:=null; end if;
  update public.boardmate_rooms set turn_user_id=turn_uid,turn_updated_at=now() where id=p_room_id;
  return newrev;
end; $$;
grant execute on function public.put_boardmate_fantasy_state(text,uuid,bigint,jsonb,jsonb) to anon,authenticated;

notify pgrst,'reload schema';
commit;
