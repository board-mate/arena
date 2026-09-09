-- BoardMate Arena v11.4.44 · Planet X private sheet account storage
-- Run once in Supabase SQL Editor. Idempotent / safe to run again.
begin;

create table if not exists public.boardmate_planetx_private_sheets(
  room_id uuid not null,
  user_id uuid not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

alter table public.boardmate_planetx_private_sheets enable row level security;
revoke all on public.boardmate_planetx_private_sheets from public, anon, authenticated;

drop function if exists public.boardmate_planetx_get_private_sheet(text,uuid);
create function public.boardmate_planetx_get_private_sheet(p_token text,p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid;
  seat_no integer;
  out_data jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  seat_no:=public.boardmate_planetx_seat(p_token,p_room_id);
  if uid is null or seat_no is null then
    raise exception '참가자가 아닙니다.';
  end if;

  select data into out_data
  from public.boardmate_planetx_private_sheets
  where room_id=p_room_id and user_id=uid;

  return coalesce(out_data,'{}'::jsonb);
end;
$$;
revoke all on function public.boardmate_planetx_get_private_sheet(text,uuid) from public;
grant execute on function public.boardmate_planetx_get_private_sheet(text,uuid) to anon,authenticated;

drop function if exists public.boardmate_planetx_save_private_sheet(text,uuid,jsonb);
create function public.boardmate_planetx_save_private_sheet(p_token text,p_room_id uuid,p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid;
  seat_no integer;
  clean_data jsonb;
begin
  uid:=public.boardmate_session_user(p_token);
  seat_no:=public.boardmate_planetx_seat(p_token,p_room_id);
  if uid is null or seat_no is null then
    raise exception '참가자가 아닙니다.';
  end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then
    raise exception '기록지 데이터 형식이 올바르지 않습니다.';
  end if;
  if pg_column_size(p_data)>262144 then
    raise exception '기록지 데이터가 너무 큽니다.';
  end if;

  -- Only the known private-sheet keys are persisted.
  clean_data:=jsonb_build_object(
    'hints',coalesce(p_data->'hints','[]'::jsonb),
    'season',coalesce(p_data->'season','""'::jsonb),
    'difficulty',coalesce(p_data->'difficulty','""'::jsonb),
    'observations',coalesce(p_data->'observations','[]'::jsonb),
    'marks',coalesce(p_data->'marks','{}'::jsonb),
    'research',coalesce(p_data->'research','{}'::jsonb)
  );

  insert into public.boardmate_planetx_private_sheets(room_id,user_id,data,updated_at)
  values(p_room_id,uid,clean_data,now())
  on conflict(room_id,user_id) do update
    set data=excluded.data, updated_at=excluded.updated_at;

  return clean_data;
end;
$$;
revoke all on function public.boardmate_planetx_save_private_sheet(text,uuid,jsonb) from public;
grant execute on function public.boardmate_planetx_save_private_sheet(text,uuid,jsonb) to anon,authenticated;

commit;
