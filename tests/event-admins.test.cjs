const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {fixture,migration,uid}=require('./event-fixture.cjs');
let db;const event='splendor-2026-10-30';
before(async()=>{db=await fixture();});after(async()=>{await db?.close();});
async function anon(sql,args=[]){await db.exec('set role anon');try{return (await db.query(sql,args)).rows[0]?.data;}finally{await db.exec('reset role');}}
const list=i=>anon('select boardmate_list_event_admins($1,$2) as data',['fixture-token-'+i,event]);
const change=(actor,target,grant,revision)=>anon('select boardmate_change_event_admin($1,$2,$3,$4,$5) as data',['fixture-token-'+actor,event,uid(target),grant,revision]);
test('all five administrators can grant and revoke; delegated members can manage roles',async()=>{
  for(let i=0;i<5;i++){
    let r=await list(i);assert.equal(r.admins.length,5);
    r=await change(i,5,true,r.revision);assert.equal(r.admins.length,6);
    assert.equal((await list(5)).actor_id,uid(5));
    r=await change(i,5,false,r.revision);assert.equal(r.admins.length,5);
    await assert.rejects(list(5),/관리자/);
    await assert.rejects(change(5,5,true,r.revision),/관리자/);
    await assert.rejects(anon('select boardmate_save_event($1,$2,0,null,\'\') as data',['fixture-token-5',event]),/관리자/);
  }
  let r=await list(0);r=await change(0,5,true,r.revision);
  r=await change(5,4,false,r.revision);assert.equal(r.admins.length,5);
  r=await change(5,4,true,r.revision);assert.equal(r.admins.length,6);
  await change(0,5,false,r.revision);
});
test('nobody can revoke either protected root, even themselves; DB cascades cannot bypass protection',async()=>{
  const r=await list(0);assert.deepEqual(r.admins.filter(x=>x.is_super_admin).map(x=>x.user_id).sort(),[uid(0),uid(2)]);
  for(let i=0;i<5;i++)for(const root of [0,2])await assert.rejects(change(i,root,false,r.revision),/최상위/);
  await assert.rejects(change(1,1,false,r.revision),/자신의 권한/);
  for(const root of [0,2]){
    await assert.rejects(db.query('delete from boardmate_event_admins where user_id=$1',[uid(root)]),/최상위/);
    await assert.rejects(db.query('update boardmate_event_admins set is_super_admin=false where user_id=$1',[uid(root)]),/최상위/);
    await assert.rejects(db.query('update boardmate_event_admins set user_id=$2 where user_id=$1',[uid(root),uid(5)]),/최상위/);
    await assert.rejects(db.query('delete from boardmate_profiles where user_id=$1',[uid(root)]),/최상위/);
  }
  assert.equal((await list(0)).revision,r.revision);
});
test('role APIs reject anonymous and ordinary callers, search returns only public identity fields',async()=>{
  for(const token of ['', 'forged', 'fixture-token-5']){
    await assert.rejects(anon('select boardmate_list_event_admins($1,$2) as data',[token,event]),/관리자/);
    await assert.rejects(anon('select boardmate_search_event_members($1,$2,$3) as data',[token,event,'일반']),/관리자/);
    await assert.rejects(anon('select boardmate_change_event_admin($1,$2,$3,true,0) as data',[token,event,uid(5)]));
  }
  const results=await anon('select boardmate_search_event_members($1,$2,$3) as data',['fixture-token-1',event,'일반']);
  assert.equal(results.length,1);assert.deepEqual(Object.keys(results[0]).sort(),['is_admin','is_super_admin','nickname','user_id']);
  assert.equal((await anon('select boardmate_search_event_members($1,$2,$3) as data',['fixture-token-1',event,'%'])).length,0);
  await assert.rejects(anon('select * from boardmate_event_admin_history'),/permission denied/);
});
test('stale role updates fail, no-op changes do not increment revision, changes are audited',async()=>{
  let r=await list(0);const revision=r.revision;
  r=await change(0,5,true,revision);assert.equal(r.revision,revision+1);
  await assert.rejects(change(1,5,false,revision),/목록이 변경/);
  assert.equal((await change(0,5,true,r.revision)).revision,r.revision);
  const audit=(await db.query('select target_id,actor_id,action,revision from boardmate_event_admin_history order by revision desc limit 1')).rows[0];
  assert.equal(audit.target_id,uid(5));assert.equal(audit.actor_id,uid(0));assert.equal(audit.action,'grant');
  await change(0,5,false,r.revision);
});
test('rerun preserves revoked roles and renamed root identities without granting nickname impostors',async()=>{
  let r=await list(0);await change(0,4,false,r.revision);
  await db.query("update boardmate_profiles set nickname='새상현',nickname_key='새상현' where user_id=$1",[uid(0)]);
  await db.query("update boardmate_profiles set nickname='상현',nickname_key='상현' where user_id=$1",[uid(5)]);
  r=await list(0);await db.exec(migration);assert.deepEqual(await list(0),r);
  await assert.rejects(list(4),/관리자/);await assert.rejects(list(5),/관리자/);
  await assert.rejects(change(2,0,false,r.revision),/최상위/);
});
