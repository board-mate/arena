const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {game}=require('./multiplayer-fixture.cjs');

test('conference titles are visible before each conference without revealing its rule',()=>{
 const g=game('planetx');g.context.esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;');g.run("state={mode:'expert',code:'EXPERT',conferences:{}};researchTopics={X1:'First title',X2:'Second title'}");
 let panel=g.run('conferencePanel()');assert.match(panel,/First title/);assert.match(panel,/Second title/);assert.match(panel,/8번/);assert.match(panel,/16번/);
 g.run("state.conferences.X1={topic:'First title',rule:'Revealed clue'}");panel=g.run('conferencePanel()');assert.match(panel,/Revealed clue/);assert.doesNotMatch(panel,/8번/);assert.match(panel,/16번/);
 g.run("state={mode:'standard',conferences:{}}");panel=g.run('conferencePanel()');assert.match(panel,/10번/);assert.doesNotMatch(panel,/X2/);
});

test('topic cache reuses all titles and refreshes when game code changes',async()=>{
 const g=game('planetx');g.run("state={code:'A',mode:'expert'};var calls=0;sb={rpc:async()=>{calls++;return {data:{A:'a',B:'b',C:'c',D:'d',E:'e',F:'f',X1:'x1',X2:'x2'}}}}");
 await g.run('ensureResearchTopics()');await g.run('ensureResearchTopics()');assert.equal(g.run('calls'),1);
 g.run("state.code='B'");await g.run('ensureResearchTopics()');assert.equal(g.run('calls'),2);
});

test('title RPC returns only topic strings and keeps participant access checks',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
 try{
 await db.exec("create schema extensions; create role anon; create role authenticated; create table boardmate_planetx_sessions(room_id uuid,code text); create table boardmate_planetx_catalog(code text,cards jsonb); create function boardmate_planetx_seat(text,uuid) returns integer language sql as $$ select case when $1='member' then 0 else null end $$;");
 const room='00000000-0000-0000-0000-000000000001';const cards=Object.fromEntries(['A','B','C','D','E','F','X1','X2'].map(k=>[k,{topic:k+' title',rule:'SECRET RULE'}]));
 await db.query('insert into boardmate_planetx_sessions values ($1,$2)',[room,'TEST']);await db.query('insert into boardmate_planetx_catalog values ($1,$2)', ['TEST',cards]);
 await db.exec(fs.readFileSync(path.join(__dirname,'../database/SUPABASE_PLANETX_CONFERENCE_TITLES.sql'),'utf8'));
 const result=await db.query('select boardmate_planetx_research_topics($1,$2) as topics',['member',room]);assert.deepEqual(result.rows[0].topics,Object.fromEntries(Object.keys(cards).map(k=>[k,k+' title'])));
 await assert.rejects(db.query('select boardmate_planetx_research_topics($1,$2)',['outsider',room]),/참가자가 아닙니다/);
 }finally{await db.close()}
});
