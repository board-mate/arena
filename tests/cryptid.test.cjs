const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {fixture,uid}=require('./cryptid-fixture.cjs');
let E,TILES;const engine=async()=>{E??=await import('../cryptid/engine.js');TILES??=(await import('../cryptid/board-data.js')).TILES;};
const legal=(g,seat,disc=false)=>g.state.board.cells.filter(c=>E.legalPlacement(g,seat,c.id,disc));

test('hex distances include the source cell, all six neighbours, and never wrap edges',async()=>{
 await engine();const a={col:4,row:4};assert.equal(E.distance(a,a),0);
 const neighbours=[];for(let col=0;col<12;col++)for(let row=0;row<9;row++)if(E.distance(a,{col,row})===1)neighbours.push({col,row});assert.equal(neighbours.length,6);
 assert.equal(E.distance({col:0,row:0},{col:11,row:0})>1,true);assert.equal(E.distance({col:4,row:4},{col:5,row:3}),1);
});
test('all six source tiles, animal areas and normal/advanced structures survive board generation',async()=>{
 await engine();for(const advanced of [false,true]){const b=E.buildBoard(TILES,Math.random,advanced);assert.equal(b.cells.length,108);assert.equal(new Set(b.cells.map(c=>c.id)).size,108);assert.equal(b.cells.filter(c=>c.structure).length,advanced?8:6);assert.equal(b.cells.filter(c=>c.animal==='bear').length,8);assert.equal(b.cells.filter(c=>c.animal==='cougar').length,8);}
});
test('generated 3–5 player puzzles have one habitat, distinct non-redundant clues and correct negations',async()=>{
 await engine();for(const advanced of [false,true])for(let sample=0;sample<4;sample++){
  const board=E.buildBoard(TILES,Math.random,advanced),pool=E.cluePool(board);
  for(const clue of pool){assert.ok(clue.allowed.length<=96);for(const c of board.cells)assert.equal(clue.allowed.includes(c.id),E.clueMatches(board,clue,c));}
  for(const n of [3,4,5]){const x=E.chooseClues(pool,n);assert.equal(new Set(x.clues.map(c=>c.id)).size,n);assert.deepEqual(board.cells.filter(c=>x.clues.every(k=>k.allowed.includes(c.id))).map(c=>c.id),[x.solution]);for(let i=0;i<n;i++)assert.ok(board.cells.filter(c=>x.clues.every((k,j)=>i===j||k.allowed.includes(c.id))).length>1);}
 }
});

test('SQL enforces private clues, participation, room creation, minimum counts and idempotent migration',async()=>{
 const f=await fixture();try{
  for(const advanced of [false,true])for(const n of [3,4,5]){
   const id=await f.create(n,advanced),g=await f.raw(id);const clues=g.secrets.clues;
   assert.equal(clues.length,n);assert.equal(g.state.board.cells.filter(c=>clues.every(k=>k.allowed.includes(c.id))).length,1);
   for(let seat=0;seat<n;seat++){const v=await f.view(id,seat);assert.equal(v.clue.text,clues[seat].text);assert.equal(Object.hasOwn(v,'secrets'),false);assert.equal(JSON.stringify(v).includes('"allowed"'),false);assert.equal(Object.hasOwn(v.state,'solution'),false);}
   await assert.rejects(f.view(id,6),/참가자/);
  }
  await f.db.exec('set role anon');await assert.rejects(f.db.query('select * from boardmate_cryptid_games'),/permission denied/);await assert.rejects(f.db.query('select * from boardmate_cryptid_catalog'),/permission denied/);await f.db.exec('reset role');
  await f.db.exec(fs.readFileSync(path.join(__dirname,'../database/SUPABASE_CRYPTID_ALPHA_V11_4_95.sql'),'utf8'));
  const oldLimits={maskmen:[3,6],acquire:[3,6],calico:[2,4],cascadia:[2,4],pocketnova:[2,2],thegame:[2,5],kraken:[3,8],fantasyrealms:[2,6],fantasyrealmsgreek:[2,6],powergrid:[3,6],avalon:[5,10],secrethitler:[5,10],onenightwerewolf:[3,10],plakoro:[2,2],quacks:[2,4],mandom:[2,4],samurai:[2,4],eldorado:[2,4],panam:[2,4],projectl:[2,4],airlandsea:[2,2],planetx:[2,4],cryptid:[3,5]};
  for(const [game,[min,max]] of Object.entries(oldLimits)){const x=(await f.db.query('select boardmate_game_min($1) as min,boardmate_game_max($1) as max',[game])).rows[0];assert.deepEqual(x,{min,max},game);}
 }finally{await f.db.close();}
});

test('SQL and JS agree on initial sharing, truthful questions, penalties, search offers and victory',async()=>{
 await engine();const f=await fixture();try{
  const id=await f.create(3,true);let row=await f.raw(id),g={state:row.state,secrets:row.secrets};
  const perform=async action=>{const seat=g.state.current;const expected=E.applyAction(g,seat,action),v=await f.act(id,seat,action);assert.equal(v.state.phase,expected.state.phase);assert.equal(v.state.current,expected.state.current);assert.deepEqual(v.state.marks,expected.state.marks);assert.equal(v.state.over,expected.state.over);g={state:v.state,secrets:g.secrets};return v;};
  await assert.rejects(f.act(id,1,{type:'cube',cell:0}),/현재 행동/);
  await assert.rejects(f.db.query("select boardmate_cryptid_action('P0',$1,null,$2)",[id,{type:'cube',cell:0}]),/revision conflict/);
  const bad=g.secrets.clues[0].allowed[0];await assert.rejects(f.act(id,0,{type:'cube',cell:bad}),/단서/);
  for(let i=0;i<6;i++)await perform({type:'cube',cell:legal(g,g.state.current)[0].id});
  assert.equal(g.state.phase,'turn');
  const seat=g.state.current,target=(seat+1)%3;
  const rejection=g.state.board.cells.find(c=>g.state.marks[c.id]?.cube==null&&!g.secrets.clues[target].allowed.includes(c.id));
  await perform({type:'question',cell:rejection.id,target});assert.equal(g.state.phase,'penalty');
  const stale=(await f.raw(id)).revision-1;await assert.rejects(f.act(id,g.state.current,{type:'cube',cell:legal(g,g.state.current)[0].id},stale),/revision conflict/);
  await perform({type:'cube',cell:legal(g,g.state.current)[0].id});
  // Search at the unique habitat. Seed the active player's existing disc to
  // exercise the required extra-disc step without revealing any other clue.
  const habitat=g.secrets.solution,active=g.state.current;g.state.marks[habitat]={cube:null,discs:[active]};
  await f.db.query('update boardmate_cryptid_games set state=$2 where room_id=$1',[id,g.state]);
  await perform({type:'search',cell:habitat});assert.equal(g.state.phase,'search-offer');
  const v=await perform({type:'disc',cell:legal(g,g.state.current,true)[0].id});assert.equal(v.state.over,true);assert.equal(v.state.winner,active);assert.equal(v.state.revealedClues.length,3);
  assert.equal((await f.db.query('select status,turn_user_id from boardmate_rooms where id=$1',[id])).rows[0].status,'finished');
  await assert.rejects(f.act(id,active,{type:'search',cell:habitat}),/진행 중/);
 }finally{await f.db.close();}
});

test('failed search stops at the first clockwise refusal and advances after the extra cube',async()=>{
 await engine();const f=await fixture();try{
  const id=await f.create(5,false);const row=await f.raw(id);let g={state:row.state,secrets:row.secrets};
  // A clean turn isolates the search response ordering from initial markers.
  g.state.phase='turn';g.state.sharingCount=10;
  const cell=g.state.board.cells.find(c=>g.secrets.clues[0].allowed.includes(c.id)&&!g.secrets.clues[1].allowed.includes(c.id));assert.ok(cell);
  await f.db.query('update boardmate_cryptid_games set state=$2 where room_id=$1',[id,g.state]);
  const expected=E.applyAction(g,0,{type:'search',cell:cell.id});const v=await f.act(id,0,{type:'search',cell:cell.id});
  assert.deepEqual(v.state.marks,expected.state.marks);assert.deepEqual(v.state.marks[cell.id],{cube:1,discs:[0]});assert.equal(v.state.phase,'penalty');assert.equal(v.state.current,0);assert.equal(v.state.over,false);
  g={state:v.state,secrets:g.secrets};const next=await f.act(id,0,{type:'cube',cell:legal(g,0)[0].id});assert.equal(next.state.phase,'turn');assert.equal(next.state.current,1);assert.equal(next.state.turn,2);
 }finally{await f.db.close();}
});
