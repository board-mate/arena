-- Arena database only: dtqhuorprcwehhoukbmu. Additive, transactional migration.
-- Uses the EXISTING BoardMate nickname/PIN session helper, not Supabase Auth.
-- The five current profiles are resolved once to immutable member UUIDs.
-- Updated for v11.4.85: delegated administrator management and protected roots.
begin;

create table if not exists public.boardmate_events (
  id text primary key,
  state jsonb,
  notes text not null default '' check (char_length(notes) <= 2000),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.boardmate_profiles(user_id) on delete set null,
  admins_seeded boolean not null default false
);
create table if not exists public.boardmate_event_admins (
  event_id text not null references public.boardmate_events(id) on delete cascade,
  user_id uuid not null references public.boardmate_profiles(user_id) on delete cascade,
  primary key(event_id,user_id)
);
alter table public.boardmate_events add column if not exists admin_revision bigint not null default 0;
alter table public.boardmate_events add column if not exists root_admins_seeded boolean not null default false;
alter table public.boardmate_event_admins add column if not exists is_super_admin boolean not null default false;
create table if not exists public.boardmate_event_admin_history (
  id bigint generated always as identity primary key,
  event_id text not null references public.boardmate_events(id) on delete cascade,
  revision bigint not null,
  actor_id uuid references public.boardmate_profiles(user_id) on delete set null,
  target_id uuid references public.boardmate_profiles(user_id) on delete set null,
  target_nickname text not null,
  action text not null check(action in ('grant','revoke')),
  changed_at timestamptz not null default now(),
  unique(event_id,revision)
);
create table if not exists public.boardmate_event_history (
  event_id text not null references public.boardmate_events(id) on delete cascade,
  revision bigint not null,
  state jsonb,
  notes text not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references public.boardmate_profiles(user_id) on delete set null,
  primary key(event_id,revision)
);
alter table public.boardmate_events enable row level security;
alter table public.boardmate_event_admins enable row level security;
alter table public.boardmate_event_history enable row level security;
alter table public.boardmate_event_admin_history enable row level security;
revoke all on public.boardmate_events,public.boardmate_event_admins,public.boardmate_event_history from public,anon,authenticated;
revoke all on public.boardmate_event_admin_history from public,anon,authenticated;
revoke all on sequence public.boardmate_event_admin_history_id_seq from public,anon,authenticated;

insert into public.boardmate_events(id) values('splendor-2026-10-30') on conflict(id) do nothing;
do $$
declare missing_names text;
begin
  perform 1 from public.boardmate_events where id='splendor-2026-10-30' for update;
  if not (select admins_seeded from public.boardmate_events where id='splendor-2026-10-30') then
    select string_agg(n,', ') into missing_names
    from unnest(array['상현','test','관리자','레한','스테안']) n
    where not exists(select 1 from public.boardmate_profiles p where p.nickname_key=lower(n));
    if missing_names is not null then
      raise exception '관리자 지정 중단: 기존 회원을 찾을 수 없습니다: %',missing_names;
    end if;
    insert into public.boardmate_event_admins(event_id,user_id)
      select 'splendor-2026-10-30',p.user_id from public.boardmate_profiles p
      where p.nickname_key=any(array['상현','test','관리자','레한','스테안'])
      on conflict do nothing;
    update public.boardmate_events set admins_seeded=true where id='splendor-2026-10-30';
  end if;
  if not (select root_admins_seeded from public.boardmate_events where id='splendor-2026-10-30') then
    -- Upgrade only already-seeded member IDs; never grant by a new nickname match.
    select string_agg(n,', ') into missing_names from unnest(array['상현','관리자']) n
    where not exists(select 1 from public.boardmate_event_admins a join public.boardmate_profiles p on p.user_id=a.user_id
      where a.event_id='splendor-2026-10-30' and p.nickname_key=n);
    if missing_names is not null then raise exception '최상위 관리자 지정 중단: 기존 대회 관리자를 확인하세요: %',missing_names; end if;
    update public.boardmate_event_admins a set is_super_admin=true
      from public.boardmate_profiles p where a.event_id='splendor-2026-10-30' and a.user_id=p.user_id and p.nickname_key in ('상현','관리자');
    update public.boardmate_events set root_admins_seeded=true where id='splendor-2026-10-30';
  end if;
end $$;

-- Defence in depth: deleting a protected member (including FK cascades), moving
-- the grant to another ID, or demoting it must fail, even outside the UI RPC.
create or replace function public.boardmate_protect_event_root()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$
begin
  if old.is_super_admin then
    if tg_op='DELETE' then raise exception using errcode='42501',message='최상위 관리자의 권한은 해지할 수 없습니다.'; end if;
    if new.user_id is distinct from old.user_id or new.event_id is distinct from old.event_id or not new.is_super_admin then
      raise exception using errcode='42501',message='최상위 관리자의 권한은 변경하거나 해지할 수 없습니다.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists boardmate_protect_event_root on public.boardmate_event_admins;
create trigger boardmate_protect_event_root before update or delete on public.boardmate_event_admins
for each row execute function public.boardmate_protect_event_root();
revoke all on function public.boardmate_protect_event_root() from public,anon,authenticated;

create or replace function public.boardmate_event_access(p_token text,p_event_id text)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
  select exists(select 1 from public.boardmate_event_admins a
    where a.event_id=p_event_id and a.user_id=public.boardmate_session_user(p_token));
$$;

create or replace function public.boardmate_get_event(p_event_id text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public
as $$
  select jsonb_build_object('id',id,'state',state,'notes',notes,'revision',revision,'updated_at',updated_at)
    from public.boardmate_events where id=p_event_id;
$$;

create or replace function public.boardmate_list_event_admins(p_token text,p_event_id text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public
as $$
declare uid uuid;
begin
  uid:=public.boardmate_session_user(p_token);
  if uid is null or not exists(select 1 from public.boardmate_event_admins where event_id=p_event_id and user_id=uid) then
    raise exception using errcode='42501',message='대회 관리자만 권한을 관리할 수 있습니다.';
  end if;
  return jsonb_build_object('actor_id',uid,'revision',(select admin_revision from public.boardmate_events where id=p_event_id),
    'admins',(select coalesce(jsonb_agg(jsonb_build_object('user_id',a.user_id,'nickname',p.nickname,'is_super_admin',a.is_super_admin)
      order by a.is_super_admin desc,p.nickname),'[]'::jsonb)
      from public.boardmate_event_admins a join public.boardmate_profiles p on p.user_id=a.user_id where a.event_id=p_event_id));
end $$;

create or replace function public.boardmate_search_event_members(p_token text,p_event_id text,p_query text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public
as $$
begin
  if not public.boardmate_event_access(p_token,p_event_id) then
    raise exception using errcode='42501',message='대회 관리자만 회원을 검색할 수 있습니다.';
  end if;
  if char_length(trim(coalesce(p_query,''))) not between 1 and 20 then raise exception '닉네임을 1~20자로 입력하세요.'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id',s.user_id,'nickname',s.nickname,'is_admin',s.is_admin,'is_super_admin',s.is_super_admin)
    order by s.nickname),'[]'::jsonb) from (
    select p.user_id,p.nickname,a.user_id is not null as is_admin,coalesce(a.is_super_admin,false) as is_super_admin
    from public.boardmate_profiles p left join public.boardmate_event_admins a on a.user_id=p.user_id and a.event_id=p_event_id
    where strpos(lower(p.nickname),lower(trim(p_query)))>0 order by p.nickname limit 20
  ) s);
end $$;

create or replace function public.boardmate_change_event_admin(p_token text,p_event_id text,p_user_id uuid,p_grant boolean,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid; current_revision bigint; target_nickname text; target_is_root boolean; affected integer;
begin
  -- All role changes and tournament writes lock the same event first, then
  -- recheck the caller's current role. A concurrent revoke cannot be bypassed.
  if public.boardmate_session_user(p_token) is null then raise exception using errcode='42501',message='로그인이 필요합니다.'; end if;
  select admin_revision into current_revision from public.boardmate_events where id=p_event_id for update;
  uid:=public.boardmate_session_user(p_token);
  if uid is null or not exists(select 1 from public.boardmate_event_admins where event_id=p_event_id and user_id=uid) then
    raise exception using errcode='42501',message='대회 관리자만 권한을 관리할 수 있습니다.';
  end if;
  if p_grant is null or p_user_id is null then raise exception '변경할 회원과 권한을 선택하세요.'; end if;
  select nickname into target_nickname from public.boardmate_profiles where user_id=p_user_id;
  if not found then raise exception '현재 가입된 회원을 찾을 수 없습니다.'; end if;
  select is_super_admin into target_is_root from public.boardmate_event_admins where event_id=p_event_id and user_id=p_user_id;
  if not p_grant and target_is_root then raise exception using errcode='42501',message='상현·관리자는 최상위 관리자이므로 누구도 권한을 해지할 수 없습니다.'; end if;
  if not p_grant and uid=p_user_id then raise exception '자신의 권한은 직접 해지할 수 없습니다. 다른 관리자에게 요청하세요.'; end if;
  if p_expected_revision is distinct from current_revision then
    raise exception using errcode='40001',message='관리자 목록이 변경되었습니다. 새로고침 후 다시 시도하세요.';
  end if;
  if p_grant then
    insert into public.boardmate_event_admins(event_id,user_id,is_super_admin) values(p_event_id,p_user_id,false) on conflict do nothing;
  else
    delete from public.boardmate_event_admins where event_id=p_event_id and user_id=p_user_id and not is_super_admin;
  end if;
  get diagnostics affected=row_count;
  if affected>0 then
    update public.boardmate_events set admin_revision=admin_revision+1 where id=p_event_id;
    insert into public.boardmate_event_admin_history(event_id,revision,actor_id,target_id,target_nickname,action)
      values(p_event_id,current_revision+1,uid,p_user_id,target_nickname,case when p_grant then 'grant' else 'revoke' end);
  end if;
  return public.boardmate_list_event_admins(p_token,p_event_id);
end $$;

-- Server-side invariants apply even to requests made outside the website UI.
create or replace function public.boardmate_validate_event_game(g jsonb,game_id text,expected_size integer,allowed_ids text[])
returns void language plpgsql immutable set search_path=pg_catalog,public
as $$
declare ids text[]; ranks integer[]; r jsonb; rank_count integer; distinct_count integer;
begin
  if jsonb_typeof(g) is distinct from 'object' or g->>'id' is distinct from game_id
    or jsonb_typeof(g->'playerIds') is distinct from 'array'
    or jsonb_typeof(g->'ranks') is distinct from 'array'
    or jsonb_typeof(g->'locked') is distinct from 'boolean' then
    raise exception '경기 데이터 형식이 올바르지 않습니다.';
  end if;
  select array_agg(value) into ids from jsonb_array_elements_text(g->'playerIds');
  if cardinality(ids) is distinct from expected_size or not(ids <@ allowed_ids)
    or (select count(distinct x) from unnest(ids) x) <> expected_size
    or jsonb_array_length(g->'ranks') <> expected_size then
    raise exception '경기 참가자 또는 순위 수가 올바르지 않습니다.';
  end if;
  for r in select value from jsonb_array_elements(g->'ranks') loop
    if r <> 'null'::jsonb and (jsonb_typeof(r)<>'number' or r::text !~ '^[1-4]$') then
      raise exception '순위는 정수여야 합니다.';
    end if;
    if r <> 'null'::jsonb and (r::text)::integer > expected_size then raise exception '순위 범위를 초과했습니다.'; end if;
  end loop;
  select array_agg(case when value='null'::jsonb then null else (value::text)::integer end)
    into ranks from jsonb_array_elements(g->'ranks');
  select count(x),count(distinct x) into rank_count,distinct_count from unnest(ranks) x;
  if rank_count<>distinct_count or ((g->>'locked')::boolean and rank_count<>expected_size) then
    raise exception '순위를 중복 없이 모두 입력해 주세요.';
  end if;
end $$;

create or replace function public.boardmate_validate_event_state(t jsonb)
returns void language plpgsql immutable set search_path=pg_catalog,public
as $$
declare n integer; p jsonb; g jsonb; i integer:=0; size integer; ids text[]:='{}'; seen text[]:='{}'; names text[]:='{}'; qualified text[]:='{}'; pid text; rank_index integer; all_locked boolean:=true;
begin
  if t is null then return; end if;
  if jsonb_typeof(t) is distinct from 'object' or octet_length(t::text)>30000
    or jsonb_typeof(t->'players') is distinct from 'array'
    or jsonb_typeof(t->'prelims') is distinct from 'array'
    or jsonb_typeof(t->'title') is distinct from 'string'
    or char_length(t->>'title') not between 1 and 60
    or jsonb_typeof(t->'createdAt') is distinct from 'string'
    or char_length(t->>'createdAt')>40
    or t->>'drawMode' is distinct from 'random'
    or not(t ? 'final') then raise exception '대회 데이터 형식이 올바르지 않습니다.'; end if;
  perform (t->>'createdAt')::timestamptz;
  n:=jsonb_array_length(t->'players');
  if n not between 12 and 16 or jsonb_array_length(t->'prelims')<>4 then
    raise exception '이번 대회는 12~16명, 4개 조로 진행합니다.';
  end if;
  for p in select value from jsonb_array_elements(t->'players') loop
    i:=i+1;
    if jsonb_typeof(p) is distinct from 'object' or p->>'id' is distinct from 'p'||i::text
      or jsonb_typeof(p->'name') is distinct from 'string'
      or char_length(trim(p->>'name')) not between 1 and 40 then raise exception '참가자 정보가 올바르지 않습니다.'; end if;
    ids:=array_append(ids,p->>'id');
    names:=array_append(names,lower(regexp_replace(trim(p->>'name'),'\s+',' ','g')));
  end loop;
  if (select count(distinct x) from unnest(names) x)<>n then raise exception '참가자 이름이 중복됩니다.'; end if;
  i:=0;
  for g in select value from jsonb_array_elements(t->'prelims') loop
    size:=case when i<n-12 then 4 else 3 end;
    perform public.boardmate_validate_event_game(g,chr(65+i),size,ids);
    for pid in select value from jsonb_array_elements_text(g->'playerIds') loop seen:=array_append(seen,pid); end loop;
    if (g->>'locked')::boolean then
      select ordinality::integer-1 into rank_index from jsonb_array_elements(g->'ranks') with ordinality where value='1'::jsonb;
      qualified:=array_append(qualified,g->'playerIds'->>rank_index);
    else all_locked:=false;
    end if;
    i:=i+1;
  end loop;
  if cardinality(seen)<>n or (select count(distinct x) from unnest(seen) x)<>n then raise exception '예선 참가자가 중복되거나 누락되었습니다.'; end if;
  if t->'final'<>'null'::jsonb then
    if not all_locked then raise exception '모든 예선을 확정한 후 결승을 생성하세요.'; end if;
    perform public.boardmate_validate_event_game(t->'final','final',4,qualified);
  end if;
end $$;

create or replace function public.boardmate_save_event(p_token text,p_event_id text,p_expected_revision bigint,p_state jsonb,p_notes text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid; current_event public.boardmate_events%rowtype;
begin
  if public.boardmate_session_user(p_token) is null then raise exception using errcode='42501',message='대회 관리자만 기록할 수 있습니다. 로그인 상태를 확인하세요.'; end if;
  select * into current_event from public.boardmate_events where id=p_event_id for update;
  if not found then raise exception '대회를 찾을 수 없습니다.'; end if;
  uid:=public.boardmate_session_user(p_token);
  if uid is null or not exists(select 1 from public.boardmate_event_admins where event_id=p_event_id and user_id=uid) then
    raise exception using errcode='42501',message='대회 관리자만 기록할 수 있습니다. 로그인 상태를 확인하세요.';
  end if;
  if p_expected_revision is distinct from current_event.revision then
    raise exception using errcode='40001',message='다른 관리자가 기록을 변경했습니다. 최신 기록을 불러온 후 다시 저장하세요.';
  end if;
  if p_notes is null or char_length(p_notes)>2000 then raise exception '운영 안내는 2000자 이하로 입력하세요.'; end if;
  perform public.boardmate_validate_event_state(p_state);
  -- Preserve the previous snapshot before every replacement or re-draw.
  insert into public.boardmate_event_history(event_id,revision,state,notes,saved_at,saved_by)
    values(current_event.id,current_event.revision,current_event.state,current_event.notes,current_event.updated_at,current_event.updated_by);
  update public.boardmate_events set state=p_state,notes=p_notes,revision=revision+1,updated_at=now(),updated_by=uid where id=p_event_id;
  return public.boardmate_get_event(p_event_id);
end $$;

revoke all on function public.boardmate_event_access(text,text) from public,anon,authenticated;
revoke all on function public.boardmate_get_event(text) from public,anon,authenticated;
revoke all on function public.boardmate_save_event(text,text,bigint,jsonb,text) from public,anon,authenticated;
revoke all on function public.boardmate_validate_event_game(jsonb,text,integer,text[]) from public,anon,authenticated;
revoke all on function public.boardmate_validate_event_state(jsonb) from public,anon,authenticated;
revoke all on function public.boardmate_list_event_admins(text,text) from public,anon,authenticated;
revoke all on function public.boardmate_search_event_members(text,text,text) from public,anon,authenticated;
revoke all on function public.boardmate_change_event_admin(text,text,uuid,boolean,bigint) from public,anon,authenticated;
grant execute on function public.boardmate_event_access(text,text),public.boardmate_get_event(text),public.boardmate_save_event(text,text,bigint,jsonb,text) to anon,authenticated;
grant execute on function public.boardmate_list_event_admins(text,text),public.boardmate_search_event_members(text,text,text),public.boardmate_change_event_admin(text,text,uuid,boolean,bigint) to anon,authenticated;
notify pgrst,'reload schema';
commit;

-- Verify exactly five EXISTING member IDs received event-scoped permission.
select p.nickname,a.user_id,a.is_super_admin from public.boardmate_event_admins a
join public.boardmate_profiles p on p.user_id=a.user_id
where a.event_id='splendor-2026-10-30' order by p.nickname;
