const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const path=require('node:path');
const migration=fs.readFileSync(path.join(__dirname,'../database/SUPABASE_EVENTS_V11_4_84.sql'),'utf8');
const nicknames=['상현','test','관리자','레한','스테안','일반회원'];
const uid=i=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
async function fixture() {
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create table public.boardmate_profiles(user_id uuid primary key,nickname text,nickname_key text unique,suspended_until timestamptz);
    create table public.boardmate_sessions(token text,user_id uuid references public.boardmate_profiles(user_id) on delete cascade,expires_at timestamptz);
    create function public.boardmate_session_user(p_token text) returns uuid language sql stable security definer set search_path=public
    as $$ select s.user_id from boardmate_sessions s join boardmate_profiles p using(user_id) where s.token=p_token and s.expires_at>now() and (p.suspended_until is null or p.suspended_until<=now()) $$;
    revoke all on public.boardmate_profiles,public.boardmate_sessions from public,anon,authenticated;
    revoke all on function public.boardmate_session_user(text) from public,anon,authenticated;`);
  for(let i=0;i<nicknames.length;i++){
    await db.query('insert into boardmate_profiles(user_id,nickname,nickname_key) values($1,$2,$2)',[uid(i),nicknames[i]]);
    await db.query("insert into boardmate_sessions values($1,$2,now()+interval '1 day')",['fixture-token-'+i,uid(i)]);
  }
  await db.exec(migration);
  return db;
}
module.exports={fixture,migration,uid,nicknames};
