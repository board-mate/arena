const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path');
const uid=i=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;
 create table boardmate_profiles(user_id uuid primary key,nickname text);
 create table boardmate_rooms(id uuid primary key default gen_random_uuid(),title text not null,game text not null,max_players integer not null,host_id uuid,status text default 'open',play_mode text default 'turn',turn_user_id uuid,turn_updated_at timestamptz,finished_at timestamptz,constraint boardmate_rooms_game_check check(game in ('maskmen','acquire','planetx')));
 create table boardmate_room_members(room_id uuid,user_id uuid,seat int,primary key(room_id,user_id));
 create function boardmate_session_user(text) returns uuid language sql security definer as $$select user_id from boardmate_profiles where nickname=$1$$;
 create function boardmate_game_min(text) returns int language sql immutable as $$select case when $1 in ('maskmen','acquire') then 3 else 2 end$$;
 create function boardmate_game_max(text) returns int language sql immutable as $$select case when $1='planetx' then 4 else 6 end$$;`);
 for(let i=0;i<7;i++)await db.query('insert into boardmate_profiles values($1,$2)',[uid(i),'P'+i]);
 await db.exec(fs.readFileSync(path.join(__dirname,'../database/SUPABASE_CRYPTID_ALPHA_V11_4_95.sql'),'utf8'));
 const create=async(n=3,advanced=false)=>{
  const id=(await db.query("select create_boardmate_cryptid_room('P0','') as id")).rows[0].id;
  for(let i=1;i<n;i++)await db.query('insert into boardmate_room_members values($1,$2,$3)',[id,uid(i),i]);
  await db.query("update boardmate_rooms set status='playing' where id=$1",[id]);
  await db.query("select boardmate_cryptid_init('P0',$1,$2)",[id,advanced]);return id;
 };
 const view=async(id,seat=0)=>(await db.query('select boardmate_cryptid_view($1,$2) as view',['P'+seat,id])).rows[0].view;
 const raw=async id=>(await db.query('select * from boardmate_cryptid_games where room_id=$1',[id])).rows[0];
 const act=async(id,seat,action,revision)=>{if(revision==null)revision=(await raw(id)).revision;return(await db.query('select boardmate_cryptid_action($1,$2,$3,$4) as view',['P'+seat,id,revision,action])).rows[0].view;};
 return{db,create,view,raw,act};
}
module.exports={fixture,uid};
