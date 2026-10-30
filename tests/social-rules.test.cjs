const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const uid=i=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
async function fixture(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create table boardmate_profiles(user_id uuid primary key,nickname text);create table boardmate_rooms(id uuid primary key,game text,host_id uuid,status text);create table boardmate_room_members(room_id uuid,user_id uuid,seat int);create function boardmate_session_user(text) returns uuid language sql as $$select user_id from boardmate_profiles where nickname=$1$$;create function boardmate_game_min(text) returns int language sql as $$select case when $1='onenightwerewolf' then 3 else 5 end$$;create function boardmate_game_max(text) returns int language sql as $$select 10$$;`);
 for(let i=0;i<10;i++)await db.query('insert into boardmate_profiles values($1,$2)',[uid(i),'P'+i]);
 const src=fs.readFileSync(path.join(__dirname,'../database/SUPABASE_CURRENT_UPDATE.sql'),'utf8'),start=src.indexOf('create table if not exists public.boardmate_social_games('),stop=src.indexOf('grant execute on function public.boardmate_social_action(text,uuid,jsonb) to anon, authenticated;',start);
 await db.exec(src.slice(start,stop)+'grant execute on function public.boardmate_social_action(text,uuid,jsonb) to anon, authenticated;');return db;}
test('social games enforce private roles, voting restrictions, mission thresholds and victory rules',async t=>{
 const db=await fixture();let roomNo=100;
 async function create(game,n,options={}){const id=uid(roomNo++);await db.query("insert into boardmate_rooms values($1,$2,$3,'playing')",[id,game,uid(0)]);for(let i=0;i<n;i++)await db.query('insert into boardmate_room_members values($1,$2,$3)',[id,uid(i),i]);await db.query('select boardmate_social_init($1,$2,$3)', ['P0',id,options]);return id;}
 const get=async id=>(await db.query('select state,secrets from boardmate_social_games where room_id=$1',[id])).rows[0];
 const act=(id,seat,a)=>db.query('select boardmate_social_action($1,$2,$3)',['P'+seat,id,a]);
 const set=async(id,st,sec)=>db.query('update boardmate_social_games set state=$2,secrets=$3 where room_id=$1',[id,st,sec]);
 try{
 await t.test('Avalon role counts for 5–10, hidden roles and five rejected teams',async()=>{
 for(let n=5;n<=10;n++){const id=await create('avalon',n),{state:s,secrets:sec}=await get(id);assert.equal(Object.values(sec.roles).length,n);assert.equal(Object.values(sec.roles).filter(x=>['merlin','loyal','percival'].includes(x)).length,({5:3,6:4,7:4,8:5,9:6,10:6})[n]);const v=(await db.query('select boardmate_social_view($1,$2) as v',['P0',id])).rows[0].v;assert.equal(JSON.stringify(v).includes('"secrets"'),false);if(n!==5)continue;for(let k=0;k<5;k++){const {state:s}=await get(id);await act(id,s.leader,{type:'propose',seats:[0,1]});for(let p=0;p<n;p++)await act(id,p,{type:'team_vote',approve:false});}assert.equal((await get(id)).state.winner,'evil');}
 });
 await t.test('Avalon fourth quest with seven players requires two fail cards',async()=>{
 const id=await create('avalon',7),{state:s,secrets:sec}=await get(id);s.phase='quest_vote';s.quest=3;s.proposal=[0,1,2,3];sec.roles={'0':'assassin','1':'loyal','2':'loyal','3':'loyal','4':'merlin','5':'morgana','6':'minion_of_mordred'};await set(id,s,sec);
 await assert.rejects(act(id,1,{type:'quest_vote',success:false}));for(let p=0;p<4;p++)await act(id,p,{type:'quest_vote',success:p!==0});assert.equal((await get(id)).state.good_score,1);
 });
 await t.test('Secret Hitler electing Hitler after three fascist policies ends the game',async()=>{
 const id=await create('secrethitler',7),{state:s,secrets:sec}=await get(id);s.president=0;s.fascist_policies=3;sec.roles['1']='hitler';await set(id,s,sec);await act(id,0,{type:'nominate',seat:1});for(let p=0;p<7;p++)await act(id,p,{type:'election_vote',yes:true});assert.equal((await get(id)).state.winner,'fascist');
 });
 await t.test('Secret Hitler three rejected elections enact one policy and clear term limits',async()=>{
 const id=await create('secrethitler',5),{state:s,secrets:sec}=await get(id);s.president=0;s.election_tracker=2;s.last_elected_president=3;s.last_elected_chancellor=4;sec.deck=['F','L','F'];await set(id,s,sec);await act(id,0,{type:'nominate',seat:1});for(let p=0;p<5;p++)await act(id,p,{type:'election_vote',yes:false});const end=(await get(id)).state;assert.equal(end.fascist_policies,1);assert.equal(end.election_tracker,0);assert.equal(end.last_elected_chancellor,null);assert.equal(end.phase,'nomination');
 });
 await t.test('One Night no deaths when every player gets one vote; werewolf dies on majority',async()=>{
 for(const wolves of [false,true]){const id=await create('onenightwerewolf',3,{role_counts:{werewolf:2,villager:3,seer:1}}),{state:s,secrets:sec}=await get(id);s.phase='day';sec.cards={'0':wolves?'werewolf':'villager','1':'villager','2':'seer'};await set(id,s,sec);const votes=wolves?[1,0,0]:[1,2,0];for(let p=0;p<3;p++)await act(id,p,{type:'day_vote',seat:votes[p]});const end=(await get(id)).state;assert.equal(end.over,true);assert.equal(end.result.village_win,true);assert.equal(end.dead.length,wolves?1:0);}
 });
 await t.test('Avalon three successes reach assassination and only the assassin can decide the outcome',async()=>{
  for(const target of [1,2]){
   const id=await create('avalon',5),{state:s,secrets:sec}=await get(id);s.phase='quest_vote';s.good_score=2;s.proposal=[1,2];sec.roles={'0':'assassin','1':'merlin','2':'loyal','3':'loyal','4':'minion_of_mordred'};await set(id,s,sec);
   await act(id,1,{type:'quest_vote',success:true});await act(id,2,{type:'quest_vote',success:true});assert.equal((await get(id)).state.phase,'assassination');
   await assert.rejects(act(id,2,{type:'assassinate',seat:1}));await act(id,0,{type:'assassinate',seat:target});assert.equal((await get(id)).state.winner,target===1?'evil':'good');
  }
 });
 await t.test('Secret Hitler legislative policy wins and executing Hitler end the game',async()=>{
  for(const policy of ['L','F']){
   const id=await create('secrethitler',5),{state:s,secrets:sec}=await get(id);s.phase='legislative_chancellor';s.president=0;s.current_chancellor=1;s.liberal_policies=4;s.fascist_policies=5;sec.legislative={hand2:[policy,policy]};await set(id,s,sec);await act(id,1,{type:'chancellor_policy',index:0});const end=(await get(id)).state;assert.equal(end.over,true);assert.equal(end.winner,policy==='L'?'liberal':'fascist');
  }
  const id=await create('secrethitler',7),{state:s,secrets:sec}=await get(id);s.phase='executive';s.power='execute';s.president=0;sec.roles['1']='hitler';await set(id,s,sec);await act(id,0,{type:'executive',seat:1});assert.equal((await get(id)).state.winner,'liberal');
 });
 await t.test('One Night hunter chains and tanner votes use final roles',async()=>{
  for(const tanner of [false,true]){
   const id=await create('onenightwerewolf',3,{role_counts:{werewolf:2,villager:3,seer:1}}),{state:s,secrets:sec}=await get(id);s.phase='day';sec.cards={'0':tanner?'tanner':'hunter','1':'werewolf','2':'villager'};await set(id,s,sec);for(let p=0;p<3;p++)await act(id,p,{type:'day_vote',seat:[1,0,0][p]});const end=(await get(id)).state;
   if(tanner){assert.equal(end.result.tanner_dead,true);assert.ok(end.winners.includes(0));assert.equal(end.result.werewolf_win,false)}else{assert.ok(end.dead.includes(1));assert.equal(end.result.village_win,true)}
  }
 });
 }finally{await db.close();}
});
