const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {fixture,migration,uid}=require('./event-fixture.cjs');
let E,validate,db;
const event='splendor-2026-10-30';
const names=n=>Array.from({length:n},(_,i)=>'참가자 '+(i+1));
const tournament=n=>E.createTournament('메카배 스플렌더 대회',names(n),'random',max=>max-1);
before(async()=>{E=(await import('../events/tournament-engine.js')).default;validate=(await import('../events/splendor-event.js')).validateEventTournament;db=await fixture();});
after(async()=>{await db?.close();});
async function asAnon(sql,params=[]){await db.exec('set role anon');try{return await db.query(sql,params);}finally{await db.exec('reset role');}}
const save=(token,state,rev,notes='')=>asAnon('select boardmate_save_event($1,$2,$3,$4::jsonb,$5) as data',[token,event,rev,JSON.stringify(state),notes]);
const read=async()=> (await asAnon('select boardmate_get_event($1) as data',[event])).rows[0].data;

test('12–16 entrants form four balanced groups; every winner advances exactly once',()=>{
  for(let n=12;n<=16;n++){
    const t=tournament(n);validate(t);
    assert.deepEqual(t.prelims.map(g=>g.playerIds.length),Array.from({length:4},(_,i)=>i<n-12?4:3));
    assert.equal(new Set(t.prelims.flatMap(g=>g.playerIds)).size,n);
    for(const g of t.prelims){g.playerIds.forEach((id,i)=>E.setRank(g,id,i+1));E.lockGame(g);}
    E.buildSemifinals(t); for(const g of t.semifinals){g.playerIds.forEach((id,i)=>E.setRank(g,id,i+1));E.lockGame(g);} E.buildFinal(t);validate(t);assert.deepEqual(t.final.playerIds,t.semifinals.flatMap(g=>g.playerIds.slice(0,2)));
    t.final.playerIds.forEach((id,i)=>E.setRank(t.final,id,i+1));E.lockGame(t.final);assert.equal(E.phase(t),'done');
    E.unlockPrelim(t,'A');assert.equal(t.final,null);assert.equal(t.prelims[0].locked,false);
  }
});
test('invalid rosters, repeated ranks and premature finals cannot be confirmed',()=>{
  assert.throws(()=>validate(tournament(11)),/12~16/);
  assert.throws(()=>E.createTournament('x',[...names(11),'참가자 1']),/같은 이름/);
  const t=tournament(12),g=t.prelims[0];
  g.playerIds.forEach(id=>E.setRank(g,id,1));assert.throws(()=>E.lockGame(g));assert.throws(()=>E.buildFinal(t));
  assert.throws(()=>validate({...t,drawMode:'ordered'}));
});
test('public can read but anonymous and ordinary members cannot write or bypass RPC',async()=>{
  assert.equal((await read()).revision,0);
  for(const token of ['', 'forged-token', 'fixture-token-5'])await assert.rejects(save(token,tournament(12),0),/관리자/);
  for(const table of ['boardmate_events','boardmate_event_admins','boardmate_event_history']){
    await assert.rejects(asAnon(`select * from ${table}`),/permission denied/);
    await assert.rejects(asAnon(`delete from ${table}`),/permission denied/);
  }
  await assert.rejects(asAnon("update boardmate_events set notes='forged'"),/permission denied/);
  await assert.rejects(asAnon('select boardmate_validate_event_state(null)'),/permission denied/);
});
test('all five current accounts can write; reads expose no operator ID or access list',async()=>{
  for(let i=0;i<5;i++){
    const allowed=await asAnon('select boardmate_event_access($1,$2) as ok',['fixture-token-'+i,event]);assert.equal(allowed.rows[0].ok,true);
    const r=await save('fixture-token-'+i,tournament(12+i),i,'운영 안내 '+i);assert.equal(r.rows[0].data.revision,i+1);
  }
  assert.deepEqual(Object.keys(await read()).sort(),['id','notes','revision','state','updated_at']);
  assert.equal((await db.query('select count(*)::int as n from boardmate_event_history')).rows[0].n,5);
});
test('optimistic revision prevents stale manager from overwriting newer records',async()=>{
  const latest=await read();await assert.rejects(save('fixture-token-0',tournament(12),latest.revision-1),/다른 관리자/);
  assert.deepEqual(await read(),latest);
});
test('database validates bracket, rankings, group membership, progression and notes',async()=>{
  const bad=[];
  bad.push(tournament(11));
  let t=tournament(12);t.prelims[0].playerIds[0]=t.prelims[1].playerIds[0];bad.push(t);
  t=tournament(12);t.prelims[0].ranks=[1,1,3];t.prelims[0].locked=true;bad.push(t);
  t=tournament(12);t.prelims[0].ranks=[1,null,3];t.prelims[0].locked=true;bad.push(t);
  t=tournament(12);t.final={id:'final',playerIds:['p1','p2','p3','p4'],ranks:[1,2,3,4],locked:true};bad.push(t);
  t=tournament(12);t.players[0].name='';bad.push(t);
  t=tournament(12);t.createdAt='not-a-date';bad.push(t);
  for(const data of bad)await assert.rejects(save('fixture-token-0',data,5));
  await assert.rejects(save('fixture-token-0',tournament(12),5,'x'.repeat(2001)));
  assert.equal((await read()).revision,5);
});
test('valid final and later correction round-trip through SQL',async()=>{
  const t=tournament(16);
  for(const g of t.prelims){g.playerIds.forEach((id,i)=>E.setRank(g,id,i+1));E.lockGame(g);}
  E.buildSemifinals(t); for(const g of t.semifinals){g.playerIds.forEach((id,i)=>E.setRank(g,id,i+1));E.lockGame(g);} E.buildFinal(t);t.final.playerIds.forEach((id,i)=>E.setRank(t.final,id,i+1));E.lockGame(t.final);
  await save('fixture-token-0',t,5);assert.deepEqual((await read()).state,t);
  const forged=structuredClone(t);forged.final.playerIds[0]='p2';await assert.rejects(save('fixture-token-0',forged,6));
  E.unlockPrelim(t,'A');await save('fixture-token-1',t,6);assert.equal((await read()).state.final,null);
});
test('expired and suspended sessions lose event access on the server',async()=>{
  await db.query("update boardmate_sessions set expires_at=now()-interval '1 day' where user_id=$1",[uid(0)]);
  await db.query("update boardmate_profiles set suspended_until=now()+interval '1 day' where user_id=$1",[uid(1)]);
  for(const i of [0,1]){
    await assert.rejects(save('fixture-token-'+i,tournament(12),7),/관리자/);
    assert.equal((await asAnon('select boardmate_event_access($1,$2) as ok',['fixture-token-'+i,event])).rows[0].ok,false);
  }
});
test('migration rerun preserves records and cannot grant access to a reused nickname',async()=>{
  const before=await read();await db.exec(migration);assert.deepEqual(await read(),before);
  await db.query('delete from boardmate_profiles where user_id=$1',[uid(4)]);
  await db.query("insert into boardmate_profiles(user_id,nickname,nickname_key) values($1,'스테안','스테안')",[uid(20)]);
  await db.query("insert into boardmate_sessions values('replacement-user',$1,now()+interval '1 day')",[uid(20)]);
  await db.exec(migration);await assert.rejects(save('replacement-user',tournament(12),7),/관리자/);
  assert.equal((await db.query('select count(*)::int as n from boardmate_event_admins')).rows[0].n,4);
});
