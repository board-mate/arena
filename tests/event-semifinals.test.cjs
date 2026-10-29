const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture}=require('./event-fixture.cjs');
const upgrade=fs.readFileSync(require('node:path').join(__dirname,'../database/SUPABASE_EVENTS_V11_4_87.sql'),'utf8');
test('semifinal progression rejects forged entrants and resets dependent results',async()=>{
 const E=(await import('../events/tournament-engine.js')).default;
 const db=await fixture();
 try {
  const t=E.createTournament('대회',Array.from({length:16},(_,i)=>'회원'+i));
  const check=state=>db.query('select boardmate_validate_event_state($1::jsonb)',[JSON.stringify(state)]);
  assert.throws(()=>E.buildSemifinals(t));
  for(const g of t.prelims){g.ranks=g.playerIds.map((_,i)=>i+1);E.lockGame(g);}
  assert.throws(()=>E.buildFinal(t));E.buildSemifinals(t);assert.equal(E.phase(t),'semifinals');
  assert.equal(new Set(t.semifinals.flatMap(g=>g.playerIds)).size,8);
  for(const g of t.prelims)assert.ok(t.semifinals.every(s=>s.playerIds.filter(id=>g.playerIds.includes(id)).length===1));
  await check(t);
  const bad=structuredClone(t);bad.semifinals[0].playerIds[0]=t.prelims[0].playerIds[2];
  assert.throws(()=>E.validateState({...E.defaultState(),tournament:bad}));await assert.rejects(check(bad));
  for(const g of t.semifinals){g.ranks=[4,3,2,1];E.lockGame(g);}
  E.buildFinal(t);await check(t);
  assert.deepEqual(E.importBackup(E.exportBackup({...E.defaultState(),tournament:t})).tournament,t);
  E.unlockSemifinal(t,'semi1');assert.equal(t.final,null);assert.equal(t.semifinals[1].locked,true);await check(t);
  E.unlockPrelim(t,'B');assert.equal(t.semifinals,null);await check(t);
 }finally{await db.close();}
});
test('upgrade archives legacy final, preserves prelims, and can run twice',async()=>{
 const E=(await import('../events/tournament-engine.js')).default;const db=await fixture();
 try {
  const t=E.createTournament('대회',Array.from({length:12},(_,i)=>'회원'+i));delete t.semifinals;
  for(const g of t.prelims){g.ranks=[1,2,3];g.locked=true;}
  t.final={id:'final',playerIds:t.prelims.map(g=>g.playerIds[0]),ranks:[1,2,3,4],locked:true};
  await db.query("update boardmate_events set state=$1::jsonb",[JSON.stringify(t)]);
  await db.exec(upgrade);await db.exec(upgrade);
  const row=(await db.query('select state,revision from boardmate_events')).rows[0];
  assert.equal(row.revision,1);assert.deepEqual(row.state.prelims,t.prelims);assert.equal(row.state.final,null);
  assert.deepEqual((await db.query('select state from boardmate_event_history')).rows[0].state,t);
 }finally{await db.close();}
});
test('empty member query lists all members only for event administrators',async()=>{
 const db=await fixture();try {
  await db.exec('set role anon');
  const query=token=>db.query('select boardmate_search_event_members($1,$2,$3) as people',[token,'splendor-2026-10-30','']);
  const people=(await query('fixture-token-0')).rows[0].people;assert.equal(people.length,6);
  assert.deepEqual(Object.keys(people[0]).sort(),['is_admin','is_super_admin','nickname','user_id']);
  for(const token of ['', 'fixture-token-5'])await assert.rejects(query(token),/관리자/);
 }finally{await db.close();}
});

test('manual groups preserve entered seating and arbitrary balanced group sizes through SQL and backup',async()=>{
 const E=(await import('../events/tournament-engine.js')).default;
 const validate=(await import('../events/splendor-event.js')).validateEventTournament;
 const groups=[['가','나','다'],['라','마','바','사'],['아','자','차'],['카','타','파','하']];
 const t=E.createManualTournament('대회',groups);
 assert.deepEqual(t.prelims.map(g=>g.playerIds.map(id=>t.players.find(p=>p.id===id).name)),groups);
 assert.equal(validate(t).drawMode,'manual');
 assert.deepEqual(E.importBackup(E.exportBackup({...E.defaultState(),tournament:t})).tournament,t);
 assert.throws(()=>E.createManualTournament('대회',[['가','나'],...groups.slice(1)]),/3~4/);
 assert.throws(()=>E.createManualTournament('대회',[groups[0],groups[0],...groups.slice(2)]),/같은 이름/);
 const db=await fixture();try{
  await db.exec('set role anon');
  await db.query('select boardmate_save_event($1,$2,0,$3::jsonb,$4)',['fixture-token-0','splendor-2026-10-30',JSON.stringify(t),'']);
  const saved=(await db.query('select boardmate_get_event($1) as data',['splendor-2026-10-30'])).rows[0].data.state;
  assert.deepEqual(saved,t);
  const bad=structuredClone(t);bad.prelims[0].playerIds[0]=bad.prelims[1].playerIds[0];
  await assert.rejects(db.query('select boardmate_save_event($1,$2,1,$3::jsonb,$4)',['fixture-token-0','splendor-2026-10-30',JSON.stringify(bad),'']));
 }finally{await db.close();}
});
