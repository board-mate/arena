const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./event-fixture.cjs');
const names=n=>Array.from({length:n},(_,i)=>`참가자 ${i+1}`);

test('every seed count spreads evenly, preserving capacities and unique participants',async()=>{
  const E=(await import('../events/tournament-engine.js')).default;
  for(let n=3;n<=16;n++)for(let count=0;count<=n;count++)for(let repeat=0;repeat<20;repeat++){
    const all=names(n),t=E.createTournament('시드 대회',all.slice(count),'random',undefined,all.slice(0,count));
    const groups=t.prelims.length?t.prelims:[t.final];
    const ids=new Set(t.players.filter(p=>p.seed).map(p=>p.id));
    const counts=groups.map(g=>g.playerIds.filter(id=>ids.has(id)).length);
    assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
    assert.equal(new Set(groups.flatMap(g=>g.playerIds)).size,n);
    assert.deepEqual(groups.map(g=>g.playerIds.length),t.prelims.length?E.getRule(n).sizes:[n]);
    if(count===4&&n>=12)assert.deepEqual(counts,[1,1,1,1]);
    assert.deepEqual(E.validateState({...E.defaultState(),tournament:t}).tournament,t);
  }
});

test('duplicates across rosters are rejected and backups preserve seeds and legacy records',async()=>{
  const E=(await import('../events/tournament-engine.js')).default;
  assert.throws(()=>E.createTournament('대회',['가','나'],'random',undefined,['가']),/같은 이름/);
  for(const count of [0,4,12]){
    const all=names(12),t=E.createTournament('대회',all.slice(count),'random',undefined,all.slice(0,count));
    const state={...E.defaultState(),tournament:t};
    assert.deepEqual(E.importBackup(E.exportBackup(state)),state);
  }
});

test('existing database saves and retrieves seed metadata without migration',async()=>{
  const E=(await import('../events/tournament-engine.js')).default;
  const validate=(await import('../events/splendor-event.js')).validateEventTournament;
  const db=await fixture();
  try{
    const all=names(16),t=E.createTournament('대회',all.slice(4),'random',undefined,all.slice(0,4));
    await db.exec('set role anon');
    await db.query('select boardmate_save_event($1,$2,$3,$4::jsonb,$5)', ['fixture-token-0','splendor-2026-10-30',0,JSON.stringify(t),'']);
    const result=await db.query('select boardmate_get_event($1) as data',['splendor-2026-10-30']);
    assert.deepEqual(validate(result.rows[0].data.state),t);
  }finally{await db.close();}
});
