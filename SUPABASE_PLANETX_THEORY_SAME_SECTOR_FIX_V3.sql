-- BoardMate Arena v11.4.43
-- Planet X: allow two DIFFERENT theory tokens on the same sector.
-- Rule: same sector + same object type cannot be submitted twice by the same player.
-- Run this file once in Supabase SQL Editor for an existing deployment.

create or replace function public.boardmate_planetx_set_theory_choice(
  p_token text,
  p_room_id uuid,
  p_phase_id integer,
  p_choices jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid;
  seat_no integer;
  sess public.boardmate_planetx_sessions%rowtype;
  st jsonb;
  maxn integer;
  x jsonb;
  sec integer;
  obj text;
  used integer;
  pending_same_type integer;
  choice_n integer;
begin
  uid:=public.boardmate_session_user(p_token);
  seat_no:=public.boardmate_planetx_seat(p_token,p_room_id);
  if uid is null or seat_no is null then raise exception '참가자가 아닙니다.'; end if;

  select state into st from public.boardmate_room_state where room_id=p_room_id;
  if st is null or st->>'phase'<>'theory-select'
     or coalesce(nullif(st->>'theoryRound','')::integer,-1)<>p_phase_id then
    raise exception '현재 가설 선택 단계가 아닙니다.';
  end if;

  select * into sess from public.boardmate_planetx_sessions where room_id=p_room_id;
  maxn:=case when sess.mode='expert' then 2 else 1 end;

  if jsonb_typeof(coalesce(p_choices,'[]'::jsonb))<>'array' then
    raise exception '가설 형식을 확인해 주세요.';
  end if;
  choice_n:=jsonb_array_length(coalesce(p_choices,'[]'::jsonb));
  if choice_n>maxn then raise exception '이번 가설 단계의 제출 수를 확인해 주세요.'; end if;

  -- Different object types MAY share a sector. Only an identical sector+object pair is forbidden.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_choices,'[]'::jsonb)) z(value)
    group by value->>'sector', value->>'object'
    having count(*) > 1
  ) then
    raise exception '같은 섹터에 같은 종류의 가설 토큰을 2개 제출할 수 없습니다.';
  end if;

  for x in select value from jsonb_array_elements(coalesce(p_choices,'[]'::jsonb)) loop
    sec:=nullif(x->>'sector','')::integer;
    obj:=x->>'object';
    if sec is null or sec<1 or sec>(case when sess.mode='expert' then 18 else 12 end)
       or obj not in ('asteroid','comet','dwarf','gas') then
      raise exception '가설 내용을 확인해 주세요.';
    end if;
    if coalesce(st->'confirmed','{}'::jsonb)?sec::text then
      raise exception '이미 교차 검증으로 확인된 섹터에는 가설을 낼 수 없습니다.';
    end if;
    if exists(
      select 1 from public.boardmate_planetx_theories
      where room_id=p_room_id and owner_uid=uid and sector=sec and object_type=obj
    ) then
      raise exception '같은 섹터에 같은 종류의 가설을 다시 제출할 수 없습니다.';
    end if;

    select count(*) into used
    from public.boardmate_planetx_theories
    where room_id=p_room_id and owner_uid=uid and object_type=obj;

    select count(*) into pending_same_type
    from jsonb_array_elements(coalesce(p_choices,'[]'::jsonb)) z(value)
    where value->>'object'=obj;

    if used + pending_same_type > public.boardmate_planetx_token_limit(sess.mode,obj) then
      raise exception '해당 종류의 가설 토큰을 모두 사용했습니다.';
    end if;
  end loop;

  insert into public.boardmate_planetx_choices(room_id,user_id,seat,phase_id,choices,ready,placed,updated_at)
  values(p_room_id,uid,seat_no,p_phase_id,coalesce(p_choices,'[]'::jsonb),true,false,now())
  on conflict(room_id,user_id,phase_id)
  do update set choices=excluded.choices,ready=true,placed=false,updated_at=now();

  return jsonb_build_object('ready',true,'count',choice_n);
end;
$$;

grant execute on function public.boardmate_planetx_set_theory_choice(text,uuid,integer,jsonb) to anon,authenticated;

create or replace function public.boardmate_planetx_final_submit(
  p_token text,
  p_room_id uuid,
  p_choices jsonb,
  p_max integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  uid uuid;
  seat_no integer;
  sess public.boardmate_planetx_sessions%rowtype;
  st jsonb;
  x jsonb;
  outj jsonb:='[]'::jsonb;
  tid uuid;
  obj text;
  sec integer;
  used integer;
  choice_n integer;
begin
  uid:=public.boardmate_session_user(p_token);
  seat_no:=public.boardmate_planetx_assert_action(p_token,p_room_id,array['final'],true);
  select state into st from public.boardmate_room_state where room_id=p_room_id;
  select * into sess from public.boardmate_planetx_sessions where room_id=p_room_id;

  if p_max not in(1,2) or jsonb_typeof(coalesce(p_choices,'[]'::jsonb))<>'array' then
    raise exception '제출 가능한 가설 수를 확인해 주세요.';
  end if;
  choice_n:=jsonb_array_length(coalesce(p_choices,'[]'::jsonb));
  if choice_n>p_max then raise exception '제출 가능한 가설 수를 확인해 주세요.'; end if;

  -- Same sector is allowed when the object types differ.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_choices,'[]'::jsonb)) z(value)
    group by value->>'sector', value->>'object'
    having count(*) > 1
  ) then
    raise exception '같은 섹터에 같은 종류의 가설 토큰을 2개 제출할 수 없습니다.';
  end if;

  for x in select value from jsonb_array_elements(coalesce(p_choices,'[]'::jsonb)) loop
    obj:=x->>'object';
    sec:=nullif(x->>'sector','')::integer;
    if obj not in('asteroid','comet','dwarf','gas')
       or sec is null or sec<1 or sec>(case when sess.mode='expert' then 18 else 12 end) then
      raise exception '가설 내용을 확인해 주세요.';
    end if;
    if coalesce(st->'confirmed','{}'::jsonb)?sec::text then
      raise exception '이미 확인된 섹터에는 가설을 낼 수 없습니다.';
    end if;
    if exists(
      select 1 from public.boardmate_planetx_theories
      where room_id=p_room_id and owner_uid=uid and sector=sec and object_type=obj
    ) then
      raise exception '같은 섹터에 같은 가설을 다시 낼 수 없습니다.';
    end if;

    select count(*) into used
    from public.boardmate_planetx_theories
    where room_id=p_room_id and owner_uid=uid and object_type=obj;
    if used>=public.boardmate_planetx_token_limit(sess.mode,obj) then
      raise exception '해당 종류의 가설 토큰을 모두 사용했습니다.';
    end if;

    insert into public.boardmate_planetx_theories(
      room_id,owner_uid,owner_seat,object_type,sector,depth,submit_round,final
    ) values(
      p_room_id,uid,seat_no,obj,sec,0,1000000,true
    ) returning id into tid;

    outj:=outj||jsonb_build_array(jsonb_build_object(
      'id',tid,'ownerSeat',seat_no,'sector',sec,'depth',0,'final',true
    ));
  end loop;
  return outj;
end;
$$;

grant execute on function public.boardmate_planetx_final_submit(text,uuid,jsonb,integer) to anon,authenticated;
