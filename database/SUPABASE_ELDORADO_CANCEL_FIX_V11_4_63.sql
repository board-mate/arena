-- BoardMate Arena v11.4.63 ALPHA
-- Eldorado unanimous game-cancel support
-- Run this once in Supabase SQL Editor after the existing current update.

begin;

create table if not exists public.boardmate_game_cancel_votes (
  room_id uuid not null references public.boardmate_rooms(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  vote boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
alter table public.boardmate_game_cancel_votes enable row level security;
revoke all on public.boardmate_game_cancel_votes from anon,authenticated;

create or replace function public.boardmate_get_cancel_status(
  p_token text,p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; mine boolean := false; voters text[];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in ('avalon','secrethitler','onenightwerewolf','plakoro','planetx','eldorado') then
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
  select coalesce(array_agg(m.nickname order by m.seat),'{}'::text[]) into voters
    from public.boardmate_game_cancel_votes v
    join public.boardmate_room_members m on m.room_id=v.room_id and m.user_id=v.user_id
    where v.room_id=p_room_id and v.vote=true;
  return jsonb_build_object(
    'total',total_n,'yes',yes_n,'members',total_n,'votes',yes_n,'mine',mine,
    'voters',coalesce(voters,'{}'::text[]),
    'cancelled',(total_n>0 and yes_n>=total_n and r.status='finished'),
    'room_status',r.status
  );
end;
$$;
grant execute on function public.boardmate_get_cancel_status(text,uuid) to anon,authenticated;

create or replace function public.boardmate_set_cancel_vote(
  p_token text,p_room_id uuid,p_vote boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare uid uuid; r public.boardmate_rooms%rowtype; total_n integer; yes_n integer; cancelled boolean:=false; voters text[];
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.boardmate_rooms where id=p_room_id;
  if not found then raise exception '방을 찾을 수 없습니다.'; end if;
  if r.game not in ('avalon','secrethitler','onenightwerewolf','plakoro','planetx','eldorado') then
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

  select coalesce(array_agg(m.nickname order by m.seat),'{}'::text[]) into voters
    from public.boardmate_game_cancel_votes v
    join public.boardmate_room_members m on m.room_id=v.room_id and m.user_id=v.user_id
    where v.room_id=p_room_id and v.vote=true;

  return jsonb_build_object(
    'total',total_n,'yes',yes_n,'members',total_n,'votes',yes_n,'mine',coalesce(p_vote,false),
    'voters',coalesce(voters,'{}'::text[]),'cancelled',cancelled,
    'room_status',case when cancelled then 'finished' else 'playing' end
  );
end;
$$;
grant execute on function public.boardmate_set_cancel_vote(text,uuid,boolean) to anon,authenticated;

notify pgrst,'reload schema';
commit;
