-- BoardMate 공유 순위표용 Supabase SQL
-- Supabase > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run 하세요.

create table if not exists public.boardmate_results (
  id bigint generated always as identity primary key,
  game text not null check (game in ('ricochet','pensterdam','yahtzee')),
  period_key text not null,
  player_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 20),
  metric integer not null default 0,
  completed_at timestamptz not null default now(),
  unique (game, period_key, player_id)
);

create index if not exists boardmate_results_lookup
  on public.boardmate_results (game, period_key, metric, completed_at);

alter table public.boardmate_results enable row level security;

drop policy if exists "boardmate public read" on public.boardmate_results;
create policy "boardmate public read"
  on public.boardmate_results for select
  to anon, authenticated
  using (true);

-- 브라우저에서 테이블을 직접 수정하는 것은 막고, 아래 함수로만 기록합니다.
revoke insert, update, delete on public.boardmate_results from anon, authenticated;
grant select on public.boardmate_results to anon, authenticated;

create or replace function public.submit_boardmate_result(
  p_game text,
  p_period_key text,
  p_player_id text,
  p_nickname text,
  p_metric integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game not in ('ricochet','pensterdam','yahtzee') then
    raise exception 'invalid game';
  end if;
  if char_length(trim(p_nickname)) < 1 or char_length(trim(p_nickname)) > 20 then
    raise exception 'invalid nickname';
  end if;
  if char_length(p_player_id) < 8 or char_length(p_player_id) > 80 then
    raise exception 'invalid player';
  end if;

  if p_game = 'ricochet' then
    if p_metric < 1 or p_metric > 200 then raise exception 'invalid metric'; end if;
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),p_metric)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname,
          metric = case when excluded.metric < boardmate_results.metric then excluded.metric else boardmate_results.metric end,
          completed_at = case when excluded.metric < boardmate_results.metric then now() else boardmate_results.completed_at end;

  elsif p_game = 'pensterdam' then
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),0)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname;

  else
    if p_metric < 0 or p_metric > 2000 then raise exception 'invalid metric'; end if;
    insert into public.boardmate_results(game,period_key,player_id,nickname,metric)
    values(p_game,p_period_key,p_player_id,trim(p_nickname),p_metric)
    on conflict(game,period_key,player_id) do update
      set nickname = excluded.nickname,
          metric = case when excluded.metric > boardmate_results.metric then excluded.metric else boardmate_results.metric end,
          completed_at = case when excluded.metric > boardmate_results.metric then now() else boardmate_results.completed_at end;
  end if;
end;
$$;

grant execute on function public.submit_boardmate_result(text,text,text,text,integer) to anon, authenticated;
