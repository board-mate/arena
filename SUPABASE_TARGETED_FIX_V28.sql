-- BoardMate Arena v11.4.28 targeted DB fixes
-- Safe to run after any existing v11.4.x / v11.4.27 Repair.
-- Does not change boardmate_rooms game CHECK constraints.

begin;

-- Ensure the unanimous-cancel vote table exists for standalone use.
create table if not exists public.boardmate_game_cancel_votes (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  vote boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_id,user_id)
);
alter table public.boardmate_game_cancel_votes enable row level security;
revoke all on public.boardmate_game_cancel_votes from anon,authenticated;

-- 1) Plakoro setup pair RPC: remove ambiguous RETURN TABLE column 'seat' reference.
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

  select game,host_id into rgame,host
    from public.boardmate_rooms where id=p_room_id;

  if rgame<>'plakoro' then
    raise exception '프라코로 포켓몬 방이 아닙니다.';
  end if;
  if host<>uid then
    raise exception '방장만 준비된 양쪽 구성을 확인할 수 있습니다.';
  end if;

  select count(*) into cnt
    from public.boardmate_plakoro_setups s
    where s.room_id=p_room_id
      and s.ready=true
      and s.seat between 0 and 1;

  if cnt<2 then
    raise exception '두 플레이어 모두 준비를 완료해야 합니다.';
  end if;

  return query
    select s.seat,s.payload
      from public.boardmate_plakoro_setups s
     where s.room_id=p_room_id
       and s.ready=true
       and s.seat between 0 and 1
     order by s.seat;
end;
$$;

grant execute on function public.boardmate_plakoro_get_setup_pair_v2(text,uuid)
  to anon,authenticated;

-- 2) Unanimous cancellation: keep Avalon/Secret Hitler/ONUW and add Plakoro.
create or replace function public.boardmate_get_cancel_status(
  p_token text,p_room_id uuid
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
  mine boolean:=false;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;

  if r.game not in ('avalon','secrethitler','onenightwerewolf','plakoro') then
    raise exception '취소 투표를 지원하지 않는 게임입니다.';
  end if;

  if not exists(
    select 1 from public.boardmate_room_members
     where room_id=p_room_id and user_id=uid
  ) then
    raise exception '이 방의 참가자가 아닙니다.';
  end if;

  select count(*)::integer into total_n
    from public.boardmate_room_members
   where room_id=p_room_id;

  select count(*)::integer into yes_n
    from public.boardmate_game_cancel_votes v
   where v.room_id=p_room_id and v.vote=true
     and exists(
       select 1 from public.boardmate_room_members m
        where m.room_id=p_room_id and m.user_id=v.user_id
     );

  select coalesce(v.vote,false) into mine
    from public.boardmate_game_cancel_votes v
   where v.room_id=p_room_id and v.user_id=uid;

  return jsonb_build_object(
    'total',total_n,
    'yes',yes_n,
    'mine',mine,
    'cancelled',(total_n>0 and yes_n>=total_n and r.status='finished')
  );
end;
$$;

grant execute on function public.boardmate_get_cancel_status(text,uuid)
  to anon,authenticated;

create or replace function public.boardmate_set_cancel_vote(
  p_token text,p_room_id uuid,p_vote boolean
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
  cancelled boolean:=false;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;

  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;

  if r.game not in ('avalon','secrethitler','onenightwerewolf','plakoro') then
    raise exception '취소 투표를 지원하지 않는 게임입니다.';
  end if;
  if r.status<>'playing' then
    raise exception '현재 취소 투표를 진행할 수 없는 방입니다.';
  end if;
  if not exists(
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
    from public.boardmate_room_members
   where room_id=p_room_id;

  select count(*)::integer into yes_n
    from public.boardmate_game_cancel_votes v
   where v.room_id=p_room_id and v.vote=true
     and exists(
       select 1 from public.boardmate_room_members m
        where m.room_id=p_room_id and m.user_id=v.user_id
     );

  if total_n>0 and yes_n>=total_n then
    update public.boardmate_rooms
       set status='finished'
     where id=p_room_id and status='playing';
    cancelled:=true;
  end if;

  return jsonb_build_object(
    'total',total_n,
    'yes',yes_n,
    'mine',p_vote,
    'cancelled',cancelled
  );
end;
$$;

grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean)
  to anon,authenticated;

notify pgrst,'reload schema';
commit;
