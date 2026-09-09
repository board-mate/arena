-- BoardMate Arena v11.4.38 · Planet X public research topic titles
-- Existing v11.4.34+ installs: run this once in Supabase SQL Editor.
-- Safe to run repeatedly. This exposes only the A-F research TOPIC TITLES,
-- never the hidden logic rules or the answer board.

begin;

create or replace function public.boardmate_planetx_research_topics(
  p_token text,
  p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  seat_no integer;
  sess public.boardmate_planetx_sessions%rowtype;
  cards jsonb;
begin
  seat_no:=public.boardmate_planetx_seat(p_token,p_room_id);
  if seat_no is null then
    raise exception '참가자가 아닙니다.';
  end if;

  select * into sess
  from public.boardmate_planetx_sessions
  where room_id=p_room_id;

  if sess.room_id is null then
    raise exception '행성 X 게임이 아직 초기화되지 않았습니다.';
  end if;

  select c.cards into cards
  from public.boardmate_planetx_catalog c
  where c.code=sess.code;

  if cards is null then
    raise exception '연구 주제 정보를 찾을 수 없습니다.';
  end if;

  return jsonb_build_object(
    'A', cards->'A'->>'topic',
    'B', cards->'B'->>'topic',
    'C', cards->'C'->>'topic',
    'D', cards->'D'->>'topic',
    'E', cards->'E'->>'topic',
    'F', cards->'F'->>'topic'
  );
end;
$$;

grant execute on function public.boardmate_planetx_research_topics(text,uuid)
  to anon, authenticated;

commit;
