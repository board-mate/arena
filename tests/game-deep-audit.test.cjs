const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calico}=require('./calico-fixture.cjs');
const {game}=require('./multiplayer-fixture.cjs');

test('Calico completes 2, 3 and 4-player games even with stale low-variance settings',()=>{
 for(const count of [2,3,4]){
  const g=calico();g.ctx.count=count;
  g.run("pendingSetup={players:Array.from({length:count},(_,i)=>({id:String(i),name:'P'+i,boardColor:BOARD_COLORS[i].id})),settings:{lowerVariance:true},goalChoices:Array.from({length:count},()=>({selected:['333','222','42']}))};startGameFromPending()");
  let steps=0;
  while(!g.run('state.gameOver')&&steps++<600){
   const phase=g.run('state.phase');
   if(phase==='place'){
    assert.ok(g.run('state.players[state.active].hand.length'),`${count} players ran out of hand tiles`);
    g.run("state.selectedHand=0;placeTile(Object.keys(state.players[state.active].board).find(k=>state.players[state.active].board[k].type==='patch'&&!state.players[state.active].board[k].tile))");
   }else if(phase==='token')g.run('tokenPlacementMode=pendingTokenChoices[0];placePendingToken(tokenPlacementMode.keys[0])');
   else if(phase==='draft'){assert.ok(g.run('state.market.length'),`${count} players ran out of market tiles`);g.run('draftMarket(0)')}
   else if(phase==='turn-end')g.run('advanceTurn()');
   else assert.fail(`Unexpected phase ${phase}`);
  }
  assert.equal(g.run('state.gameOver'),true);
  assert.equal(g.run('state.players.every(p=>countEmpty(p)===0)'),true);
  assert.equal(g.run('state.players.every(p=>Number.isFinite(playerScore(p).total))'),true);
 }
});

test('Calico limits both low-variance controls to two players',()=>{
 const g=calico();g.run("$('#lowerVariance').checked=true;playerCount=4;updateVariantAvailability()");
 assert.equal(g.run("$('#lowerVariance').disabled"),true);assert.equal(g.run("$('#lowerVariance').checked"),false);
 g.run('playerCount=2;updateVariantAvailability()');assert.equal(g.run("$('#lowerVariance').disabled"),false);
});

test('Calico printed edges count toward tokens; a connected area cannot score twice',()=>{
 const g=calico();g.run("var p={boardColor:'blue',board:{'0,0':{type:'patch',tile:{color:'green',pattern:3},cats:[],buttons:[]},'1,0':{type:'patch',tile:{color:'green',pattern:3},cats:[],buttons:[]}}};state={inventories:{buttons:{green:8},cats:{millie:12}},cats:[{id:'millie',ko:'Millie',kind:'size',size:3,preferred:[3]}]}");
 assert.equal(g.run("buildAllPendingTokenChoices(p,state).filter(x=>x.type==='button').length"),1);
 assert.equal(g.run("buildAllPendingTokenChoices(p,state).filter(x=>x.type==='cat').length"),1);
 g.run("p.board['0,0'].cats=['millie'];p.board['1,0'].buttons=['green']");assert.equal(g.run('buildAllPendingTokenChoices(p,state).length'),0);
});

test('Calico validates rotated cat shapes and preserves previously earned tokens',()=>{
 const g=calico();
 for(const shape of ['callie','rumi','tecolote','almond','leo']){
  g.ctx.shape=shape;
  for(let turn=0;turn<6;turn++){
   g.ctx.turn=turn;
   assert.equal(g.run("var coords=AXIAL_SHAPES[shape].map(x=>x.slice());for(var i=0;i<turn;i++)coords=coords.map(([q,r])=>rotateAxial(q,r));var keys=coords.map(([q,r])=>axialToKey(q,r));!!componentHasShape({},keys,shape)"),true,`${shape} rotation ${turn}`);
  }
 }
 const before=g.run("var saved={players:[{board:{x:{cats:['millie']}}}],cats:[{id:'millie'}]};JSON.stringify(saved)");g.run('repairInvalidCatTokens(saved)');assert.equal(g.run('JSON.stringify(saved)'),before);
});

function project(){const g=game('projectl');g.run("members=members.slice(0,2);state=initState(members);mySeat=0;commit=()=>{};toast=()=>{};var p=myPlayer();p.supply={dot:1};p.puzzles=[{id:'one',kind:'white',points:1,reward:'dot',mask:[[0,0]],placed:[]},{id:'two',kind:'white',points:1,reward:'dot',mask:[[0,0]],placed:[]}];selectedPiece='dot'");return g;}

test('Project L cannot reuse completed puzzle pieces or rewards during the same Master Action',()=>{
 const g=project();g.run('startMaster();placeSelected(0,0,0)');
 assert.equal(g.run('p.supply.dot'),0);assert.equal(g.run('p.completed.length'),0);
 g.run('placeSelected(1,0,0)');assert.equal(g.run('p.puzzles[1].placed.length'),0);
 g.run('endMaster()');assert.equal(g.run('p.completed.length'),1);assert.equal(g.run('p.supply.dot'),2);
});

test('Project L blocks other actions during Master Action and resumes them after it ends',()=>{
 const g=project();g.run('startMaster()');const before=g.run('JSON.stringify(state)');g.run("takePuzzle('white',0);recycle('white');upgradeModal();startMaster()");assert.equal(g.run('JSON.stringify(state)'),before);
 g.run("endMaster();takePuzzle('white',0)");assert.equal(g.run('p.puzzles.length'),3);assert.equal(g.run('state.actionsLeft'),1);
});

test('Project L finishing touches collect no rewards and do not reuse completed pieces',()=>{
 const g=project();g.run("state.phase='finishing';placeSelected(0,0,0);placeSelected(1,0,0)");assert.equal(g.run('p.puzzles[1].placed.length'),0);g.run('finishTouchesDone()');assert.equal(g.run('p.supply.dot'),0);assert.equal(g.run('p.completed.length'),1);assert.equal(g.run('p.finishingPenalty'),1);
});

test('Air Land & Sea Air Drop expires after the next turn even when playing face down',()=>{
 const g=game('airlandsea');g.run("members=members.slice(0,2);state=createGame(members);mySeat=0;state.currentTurn=0;state.hands=[['land6','sea6'],['air6']];state.airdropNext=0;mutate=fn=>fn(state);playFacedown(0,'air')");
 assert.equal(g.run('state.airdropNext'),null);
 g.run("state.currentTurn=0;var before=JSON.stringify(state);playFaceup(0,'air')");assert.equal(g.run('JSON.stringify(state)'),g.run('before'));
});

test('Air Land & Sea opponent turns do not consume Air Drop, and a new Air Drop can be earned',()=>{
 const g=game('airlandsea');g.run("members=members.slice(0,2);state=createGame(members);mySeat=1;state.currentTurn=1;state.hands=[['air2'],['land6']];state.airdropNext=0;mutate=fn=>fn(state);playFacedown(0,'sea')");assert.equal(g.run('state.airdropNext'),0);
 g.run("mySeat=0;playFaceup(0,'sea')");assert.equal(g.run('state.field.sea[0][0].id'),'air2');assert.equal(g.run('state.airdropNext'),0);
});
