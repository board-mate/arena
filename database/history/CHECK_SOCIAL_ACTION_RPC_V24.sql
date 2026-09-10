-- Correct signature: boardmate_social_action(text, uuid, jsonb)
select
  to_regprocedure('public.boardmate_social_action(text,uuid,jsonb)') is not null
  as "social action RPC exists";
