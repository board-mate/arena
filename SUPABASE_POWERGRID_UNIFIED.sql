-- BoardMate v11.4.10 direct package: Power Grid common-room integration (safe to run from integrated v11.4.8 DB)
-- Prerequisite: existing BoardMate v11.4.7 Fantasy migration already applied.
-- No new table is required. Power Grid uses boardmate_room_state + Realtime Broadcast.

alter table public.boardmate_rooms drop constraint if exists boardmate_rooms_game_check;
alter table public.boardmate_rooms add constraint boardmate_rooms_game_check
  check (game in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken','fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf'));

alter table public.boardmate_ratings drop constraint if exists boardmate_ratings_game_check;
alter table public.boardmate_ratings add constraint boardmate_ratings_game_check
  check (game in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken','fantasyrealms','powergrid','avalon','secrethitler','onenightwerewolf'));

create or replace function public.boardmate_game_max(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia') then 4
    when p_game='pocketnova' then 2
    when p_game='thegame' then 5
    when p_game='kraken' then 8
    when p_game in ('fantasyrealms','powergrid') then 6
    when p_game in ('avalon','secrethitler','onenightwerewolf') then 10
    else 6 end;
$$;
revoke all on function public.boardmate_game_max(text) from public, anon, authenticated;

create or replace function public.boardmate_game_min(p_game text)
returns integer language sql immutable as $$
  select case
    when p_game in ('calico','cascadia','pocketnova','thegame','powergrid') then 2
    when p_game in ('fantasyrealms','onenightwerewolf') then 3
    when p_game in ('avalon','secrethitler') then 5
    else 3 end;
$$;
revoke all on function public.boardmate_game_min(text) from public, anon, authenticated;

create or replace function public.boardmate_game_ko(p_game text)
returns text language sql immutable as $$
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
    else '보드게임' end;
$$;
revoke all on function public.boardmate_game_ko(text) from public, anon, authenticated;

create or replace function public.create_boardmate_room_v9(p_token text,p_title text,p_game text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid; rid uuid; mx integer; nm text; ttl text;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_game not in ('maskmen','acquire','calico','cascadia','pocketnova','thegame','kraken','fantasyrealms','powergrid') then
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
grant execute on function public.create_boardmate_room_v9(text,text,text) to anon, authenticated;

create or replace function public.boardmate_turn_seat(p_game text,p_state jsonb)
returns integer language plpgsql immutable as $$
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
  if p_game in ('cascadia','thegame','kraken','fantasyrealms') then return nullif(p_state->>'current','')::integer; end if;
  if p_game in ('pocketnova','powergrid') then return nullif(p_state->>'currentSeat','')::integer; end if;
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.boardmate_turn_seat(text,jsonb) from public, anon, authenticated;

select pg_notify('pgrst','reload schema');
