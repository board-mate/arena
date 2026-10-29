-- Apply after SUPABASE_EVENTS_V11_4_84.sql, before deploying v11.4.87.
begin;
create or replace function public.boardmate_validate_event_state(t jsonb)
returns void language plpgsql immutable set search_path=pg_catalog,public
as $$
declare n integer; p jsonb; g jsonb; i integer:=0; size integer; ids text[]:='{}'; seen text[]:='{}'; names text[]:='{}'; qualified text[]:='{}'; pid text; rank_index integer; all_locked boolean:=true; semi_allowed text[]; finalists text[]:='{}'; semi_locked boolean:=true;
begin
  if t is null then return; end if;
  if jsonb_typeof(t) is distinct from 'object' or octet_length(t::text)>30000
    or jsonb_typeof(t->'players') is distinct from 'array'
    or jsonb_typeof(t->'prelims') is distinct from 'array'
    or jsonb_typeof(t->'title') is distinct from 'string'
    or char_length(t->>'title') not between 1 and 60
    or jsonb_typeof(t->'createdAt') is distinct from 'string'
    or char_length(t->>'createdAt')>40
    or coalesce(t->>'drawMode','') not in ('random','manual')
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
    size:=case when t->>'drawMode'='manual' then jsonb_array_length(g->'playerIds') when i<n-12 then 4 else 3 end;
    if size not between 3 and 4 then raise exception '각 조에 3~4명을 편성하세요.'; end if;
    perform public.boardmate_validate_event_game(g,chr(65+i),size,ids);
    for pid in select value from jsonb_array_elements_text(g->'playerIds') loop seen:=array_append(seen,pid); end loop;
    if (g->>'locked')::boolean then
      for rank_index in select ordinality::integer-1 from jsonb_array_elements(g->'ranks') with ordinality where value in ('1'::jsonb,'2'::jsonb) order by value loop
        qualified:=array_append(qualified,g->'playerIds'->>rank_index);
      end loop;
    else all_locked:=false;
    end if;
    i:=i+1;
  end loop;
  if cardinality(seen)<>n or (select count(distinct x) from unnest(seen) x)<>n then raise exception '예선 참가자가 중복되거나 누락되었습니다.'; end if;
  if not(t ? 'semifinals') then raise exception '준결승 형식으로 업데이트해 주세요.'; end if;
  if t->'semifinals'<>'null'::jsonb then
    if not all_locked or jsonb_typeof(t->'semifinals') is distinct from 'array' or jsonb_array_length(t->'semifinals')<>2 then
      raise exception '모든 예선을 확정한 후 두 개의 준결승을 생성하세요.';
    end if;
    for i in 0..1 loop
      g:=t->'semifinals'->i;
      semi_allowed:=case when i=0 then array[qualified[1],qualified[4],qualified[5],qualified[8]] else array[qualified[2],qualified[3],qualified[6],qualified[7]] end;
      perform public.boardmate_validate_event_game(g,'semi'||(i+1)::text,4,semi_allowed);
      if (g->>'locked')::boolean then
        for rank_index in select ordinality::integer-1 from jsonb_array_elements(g->'ranks') with ordinality where value in ('1'::jsonb,'2'::jsonb) order by value loop
          finalists:=array_append(finalists,g->'playerIds'->>rank_index);
        end loop;
      else semi_locked:=false;
      end if;
    end loop;
  else semi_locked:=false;
  end if;
  if t->'final'<>'null'::jsonb then
    if not semi_locked then raise exception '모든 준결승을 확정한 후 결승을 생성하세요.'; end if;
    perform public.boardmate_validate_event_game(t->'final','final',4,finalists);
  end if;
end $$;


-- Archive legacy state before switching formats. Preserve roster and prelim results.
insert into public.boardmate_event_history(event_id,revision,state,notes,saved_at,saved_by)
select id,revision,state,notes,updated_at,updated_by from public.boardmate_events
where id='splendor-2026-10-30' and state is not null and not(state ? 'semifinals');
update public.boardmate_events set state=state||'{"semifinals":null,"final":null}'::jsonb,revision=revision+1,updated_at=now()
where id='splendor-2026-10-30' and state is not null and not(state ? 'semifinals');
revoke all on function public.boardmate_validate_event_state(jsonb) from public,anon,authenticated;
create or replace function public.boardmate_search_event_members(p_token text,p_event_id text,p_query text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public
as $$
begin
  if not public.boardmate_event_access(p_token,p_event_id) then
    raise exception using errcode='42501',message='대회 관리자만 회원을 검색할 수 있습니다.';
  end if;
  if char_length(trim(coalesce(p_query,''))) not between 0 and 20 then raise exception '닉네임을 20자 이하로 입력하세요.'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id',s.user_id,'nickname',s.nickname,'is_admin',s.is_admin,'is_super_admin',s.is_super_admin)
    order by s.nickname),'[]'::jsonb) from (
    select p.user_id,p.nickname,a.user_id is not null as is_admin,coalesce(a.is_super_admin,false) as is_super_admin
    from public.boardmate_profiles p left join public.boardmate_event_admins a on a.user_id=p.user_id and a.event_id=p_event_id
    where strpos(lower(p.nickname),lower(trim(coalesce(p_query,''))))>0 order by p.nickname
  ) s);
end $$;


notify pgrst,'reload schema';
commit;
