const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {game}=require('./multiplayer-fixture.cjs');

test('playability audit selects the 14 games without an ALPHA or BETA tier',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const source=app.match(/function gameInfo\(game\)\{[\s\S]*?\n\}/)[0];
 const c={};vm.createContext(c);vm.runInContext(source,c);
 const ids=['maskmen','acquire','calico','thegame','kraken','fantasyrealms','fantasyrealmsgreek','plakoro','powergrid','mandom','planetx','avalon','secrethitler','onenightwerewolf'];
 assert.ok(ids.every(id=>!c.gameInfo(id).tier));
 assert.ok(['cascadia','quacks','samurai','eldorado','panam','projectl','airlandsea'].every(id=>c.gameInfo(id).tier));
});

test('all 14 stable game pages have valid scripts',()=>{
 const cp=require('node:child_process');
 const files=['maskmen','acquire','calico','thegame','kraken','fantasy-realms','fantasy-realms-greek','plakoro','powergrid','mandom','planetx','avalon','secret-hitler','one-night-werewolf'];
 for(const file of files){
  const html=fs.readFileSync(path.join(__dirname,'../online-'+file+'.html'),'utf8');
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(!m[2].trim())continue;if(/application\/(?:ld\+)?json/.test(m[1])){JSON.parse(m[2]);continue;}
   const result=cp.spawnSync(process.execPath,['--check','--input-type='+(/type=["']module/.test(m[1])?'module':'commonjs')],{input:m[2],encoding:'utf8'});assert.equal(result.status,0,file+': '+result.stderr);
  }
 }
});

test('Acquire keeps temporarily unplayable hands and skips placement without drawing replacements',()=>{
 const g=game('acquire');g.run("state=initialState();state.current=0;state.board={};CHAINS.forEach(c=>state.chains[c.id].active=true);state.players[0].hand=['A1','A2','A3','A4','A5','A6'];for(let i=1;i<=6;i++)state.board['B'+i]={type:'standalone'};var handBefore=JSON.stringify(state.players[0].hand),poolBefore=JSON.stringify(state.pool);ensureNextHand(state)");
 assert.equal(g.run('state.phase'),'buy');assert.equal(g.run('JSON.stringify(state.players[0].hand)'),g.run('handBefore'));assert.equal(g.run('JSON.stringify(state.pool)'),g.run('poolBefore'));
});

function fantasy(n=2){const g=game('fantasy-realms');g.set('members',g.context.fixtureMembers.slice(0,n));g.run("me={user_id:'u0'};buildGame();persist=async()=>true;beginFinalize=()=>{fullState.phase='finalize';}");return g;}

test('Fantasy Realms two-player games start empty and draw two, discard one until seven',async()=>{
 const g=fantasy();assert.equal(g.run('fullState.hands.flat().length'),0);
 for(let turn=0;turn<14;turn++){
  const before=g.run('fullState.hands[fullState.current].length');
  await g.run("hostAction(fullState.current,'DRAW')");assert.equal(g.run('fullState.hands[fullState.current].length'),before+2);
  await g.run("hostAction(fullState.current,'DISCARD',{index:0})");if(turn<13)assert.notEqual(g.run('fullState.phase'),'finalize');
 }
 assert.deepEqual(Array.from(g.run('fullState.hands'),h=>h.length),[7,7]);
 assert.equal(g.run('fullState.phase'),'finalize');
});

test('Fantasy Realms taking a discard builds a two-player hand without another discard',async()=>{
 const g=fantasy();await g.run("hostAction(fullState.current,'DRAW');");await g.run("hostAction(fullState.current,'DISCARD',{index:0})");
 const seat=g.run('fullState.current');await g.run("hostAction(fullState.current,'TAKE',{index:0})");assert.equal(g.run('fullState.hands['+seat+'].length'),1);assert.equal(g.run('fullState.phase'),'draw');assert.notEqual(g.run('fullState.current'),seat);
});

test('Fantasy Realms two-player end threshold is twelve and persists through controller recovery',async()=>{
 const g=fantasy();g.run('var pub=publicSnapshot(),priv=privateSnapshotMap();fullState=null;reconstructController(pub,priv)');assert.equal(g.run('fullState.twoPlayerVariant'),true);
 g.run("fullState.hands=[BASE_IDS.slice(0,7),BASE_IDS.slice(7,14)];fullState.discardPile=BASE_IDS.slice(14,24);fullState.drawPile=BASE_IDS.slice(24);fullState.current=0;fullState.turnNumber=20");
 await g.run("hostAction(0,'DRAW')");await g.run("hostAction(0,'DISCARD',{index:0})");assert.equal(g.run('fullState.phase'),'draw');assert.equal(g.run('fullState.discardPile.length'),11);
 await g.run("hostAction(1,'DRAW')");await g.run("hostAction(1,'DISCARD',{index:0})");assert.equal(g.run('fullState.phase'),'finalize');assert.equal(g.run('fullState.discardPile.length'),12);
});

test('Fantasy Realms legacy games retain the original hand and end rules',async()=>{
 const g=fantasy(3);g.run("var pub=publicSnapshot(),priv=privateSnapshotMap();delete pub.twoPlayerVariant;reconstructController(pub,priv)");assert.equal(g.run('fullState.twoPlayerVariant'),false);assert.equal(g.run('fullState.hands.every(h=>h.length===7)'),true);
 g.run("fullState.discardPile=fullState.drawPile.splice(0,9)");await g.run("hostAction(fullState.current,'DRAW')");await g.run("hostAction(fullState.current,'DISCARD',{index:0})");assert.equal(g.run('fullState.phase'),'finalize');
});

test('Fantasy Realms existing two-player rooms do not switch rules on resume',()=>{
 const g=fantasy();g.run("fullState.hands=[fullState.drawPile.splice(0,7),fullState.drawPile.splice(0,7)];var pub=publicSnapshot(),priv=privateSnapshotMap();delete pub.twoPlayerVariant;reconstructController(pub,priv)");assert.equal(g.run('buildingHand(fullState,0)'),false);assert.equal(g.run('discardTarget(fullState)'),10);assert.equal(g.run('fullState.hands[0].length'),7);
});

test('The Game handles both final victory and an impossible next turn',()=>{
 const g=game('thegame');g.run("members=members.slice(0,2);mySeat=0;mutate=fn=>fn(state);state={playerCount:2,current:0,deck:[],hands:[[2],[]],piles:[1,1,100,100],played:0,logs:[],turnNo:1};selected=0;play(0)");assert.equal(g.run('state.over&&state.win'),true);
 g.run("state={playerCount:2,current:0,deck:[],hands:[[10],[50]],piles:[59,59,41,41],played:1,logs:[],turnNo:1};endTurn()");assert.equal(g.run('state.over'),true);assert.equal(g.run('state.win'),false);
});

test('Planet X conference and theory events fire at their scheduled positions',()=>{
 const g=game('planetx');assert.equal(g.run("nextEvent(7,8,{mode:'expert',conferences:{}}).key"),'X1');assert.equal(g.run("nextEvent(7,8,{mode:'expert',conferences:{X1:{topic:'already public'}}})"),null);assert.equal(g.run("nextEvent(2,3,{mode:'standard',conferences:{}}).type"),'theory');
});

test('Planet X scores standard/expert theories and shared leader bonuses correctly',async()=>{
 for(const mode of ['standard','expert']){
  const g=game('planetx');g.set('members',g.context.fixtureMembers.slice(0,2));g.context.mode=mode;
  g.run("state={phase:'reveal',mode,players:[{xScore:0},{xScore:0}],log:[]};commit=async s=>{state=s;return true};sb={rpc:async()=>({data:{board:['x','dwarf'],theories:[{ownerSeat:0,sector:2,object:'dwarf',correct:true,submitRound:1},{ownerSeat:1,sector:2,object:'dwarf',correct:true,submitRound:1},{ownerSeat:1,sector:1,object:'comet',correct:false,submitRound:2}]}})}");
  await g.run('revealAndFinish()');assert.equal(g.run('state.over'),true);assert.equal(g.run('state.sharedTie'),true);assert.equal(g.run('state.scores[0].leader'),1);assert.equal(g.run('state.scores[0].theory'),mode==='expert'?2:4);
 }
});
