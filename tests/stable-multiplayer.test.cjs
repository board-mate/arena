const {test}=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./multiplayer-fixture.cjs');
test('Acquire rejects fractional or nonfinite merger quantities without changing stocks',()=>{
 const g=game('acquire');g.run(`state=initialState();state.players[2].shares.sackson=4;state.pending={type:'merger',survivor:'tower',queue:[{seat:2,dead:'sackson',price:200},{seat:3,dead:'sackson',price:200}],qIndex:0};`);
 for(const [sell,trade]of [[.5,0],[0,.5],[NaN,0],[0,Infinity]]){g.context.sell=sell;g.context.trade=trade;assert.throws(()=>g.run('mergerDecision(state,2,sell,trade)'));}
 assert.equal(g.run('state.players[2].shares.sackson'),4);
});
test('Acquire merger share decisions begin with the tile placer and proceed clockwise',()=>{
 const g=game('acquire');g.run(`state=initialState();state.players.forEach(p=>p.shares.sackson=2);prepareMerge(state,'A1',3,'tower',['tower','sackson'],[]);`);
 assert.deepEqual(Array.from(g.run('state.pending.queue'),x=>x.seat),[3,4,5,0,1,2]);
});
test('Acquire safe chains cannot merge; final settlement preserves total shares',()=>{
 const g=game('acquire');g.run(`state=initialState();state.board={};for(let i=1;i<=11;i++){state.board['A'+i]={type:'chain',chain:'sackson'};state.board['C'+i]={type:'chain',chain:'tower'};}state.chains.sackson.active=true;state.chains.tower.active=true;`);
 assert.equal(g.run("legal(state,'B1')"),false);g.run("state.players[0].shares.sackson=2;state.chains.sackson.stock=23;state.phase='buy';endGame(state)");
 assert.equal(g.run('state.over'),true);assert.equal(g.run('state.chains.sackson.stock+state.players.reduce((s,p)=>s+p.shares.sackson,0)'),25);
});
test('Kraken deals five cards each, preserves all undealt roles ambiguity and exploration cards',()=>{
 const g=game('kraken');for(let n=3;n<=8;n++){g.set('members',g.context.fixtureMembers.slice(0,n));if(n>6)g.set('members',Array.from({length:n},(_,i)=>({user_id:'u'+i,nickname:'P'+i})));g.run('state=createGame(false)');assert.equal(g.run('state.players.flatMap(p=>p.hand).length'),n*5);assert.equal(g.run("state.players.flatMap(p=>p.hand).filter(c=>c.type==='kraken').length"),1);assert.equal(g.run("state.players.flatMap(p=>p.hand).filter(c=>c.type==='treasure').length"),n);g.run('state.players.forEach(p=>p.hand.pop());nextRound(state)');assert.ok(g.run('state.players.every(p=>p.hand.length===4)'));}}
);
test('Maskmen unknown strength needs one additional card and strength is transitive',()=>{
 const g=game('maskmen');g.run(`state=initialState();state.hands[0]=['BLUE','BLUE','GREEN','GREEN','GREEN'];state.currentPlay={wrestler:'ORANGE',count:1};state.lastPlayPlayer=1;`);
 assert.equal(g.run("valid(state,0,'BLUE',1).valid"),false);assert.equal(g.run("valid(state,0,'BLUE',2).valid"),true);
 g.run("addRelation(state,'GREEN','BLUE');addRelation(state,'BLUE','ORANGE');");assert.equal(g.run("isStronger(state,'GREEN','ORANGE')"),true);assert.equal(g.run("valid(state,0,'GREEN',1).valid"),true);assert.equal(g.run("valid(state,0,'GREEN',2).valid"),false);
});
test('Mandom sword blocks all copies of the named monster and failure eliminates on second loss',()=>{
 const g=game('mandom');g.run(`state=createGame();state.players=members.map((m,i)=>({seat:i,lives:0,wins:0}));state.turnOrder=members.map((_,i)=>i);state.equippedItems=['sword'];state.dungeon=MONSTERS.filter(m=>monsterFamily(m.id)==='goblin').map(m=>m.id);state.challenger=0;state.phase='challenge';state.namedMonster=state.dungeon[0];state.heroHP=3;mySeat=0;mutate=fn=>fn(state);`);
 g.run('revealNextCard();revealNextCard();');assert.equal(g.run('state.players[0].wins'),1);
 g.run('state.players[1].lives=1;state.challenger=1;dungeonFail(state);');assert.equal(g.run('state.players[1].lives'),2);assert.notEqual(g.run('state.currentTurn'),1);
});
test('Plakoro self-damage knockout ends battle even when the opponent survives',async()=>{
 const g=game('plakoro');g.run(`isHost=true;full={current:0,turn:2,players:[{name:'A',hp:20},{name:'B',hp:120,weak:'water'}],statuses:[{},{}],attacks:[[{id:'test-volttackle',cost:[],dmg:30,type:'lightning'}],[]],lastAttack:[null,null],lastDamage:[0,0],lastEnergy:[[],[]],logs:[]};rollEnergy=()=>[];rollDir=()=>'down';persist=async()=>{};`);
 await g.run("hostAction(0,'ROLL',{id:'test-volttackle'})");assert.equal(g.run('full.players[0].hp'),0);assert.equal(g.run('full.gameOver'),true);assert.equal(g.run('full.winner'),1);
});
test('Plakoro energy cannot double-spend required typed energy as colorless',()=>{
 const g=game('plakoro');assert.equal(g.run("canPay([['fire',2],['colorless',1]],['fire','fire'])"),false);assert.equal(g.run("canPay([['fire',2],['colorless',1]],[['fire','fire'],'water'])"),true);
});
test('Plakoro shield expires after the next opponent turn even if the attack fails',async()=>{
 const g=game('plakoro');g.run(`isHost=true;full={current:0,turn:2,players:[{name:'A',hp:120},{name:'B',hp:120}],statuses:[{},{shield:20}],attacks:[[{id:'test',cost:[['fire',4]],dmg:30}],[]],lastAttack:[null,null],lastDamage:[0,0],lastEnergy:[[],[]],logs:[]};rollEnergy=()=>[];rollDir=()=>'down';persist=async()=>{};`);await g.run("hostAction(0,'ROLL',{id:'test'})");assert.equal(g.run('full.statuses[1].shield'),0);assert.equal(g.run('full.players[1].hp'),120);
});
test('Fantasy Realms preserves cards across draw/discard and sends only the viewer hand',async()=>{
 const g=game('fantasy-realms');g.run(`me={user_id:'u0'};members=members.slice(0,3);buildGame();persist=async()=>true;`);
 assert.equal(g.run('fullState.hands.flat().length+fullState.drawPile.length'),53);
 const seat=g.run('fullState.current');g.context.seat=seat;await g.run("hostAction(seat,'DRAW')");assert.equal(g.run('fullState.hands[seat].length'),8);await g.run("hostAction(seat,'DISCARD',{index:0})");assert.equal(g.run('fullState.hands[seat].length'),7);
 g.run('var pub=publicSnapshot(),priv=privateSnapshotMap(),viewer=makeView(pub,priv,1)');assert.equal(g.run("'hands' in pub||'drawPile' in pub"),false);assert.equal(g.run('viewer.ownHand.join()==fullState.hands[1].join()'),true);assert.equal(g.run('fullState.hands.flat().length+fullState.drawPile.length+fullState.discardPile.length'),53);
});
test('Greek Legends afterlife heroes lose their bonus and tags under River Lethe',()=>{
 const g=game('fantasy-realms-greek');g.run("var st=makeScoreState(['river_lethe'],['helen']);");assert.deepEqual(Array.from(g.run('st.tags(st.afterlife[0])')),[]);assert.equal(g.run('st.bonusDisabled(st.afterlife[0])'),true);
 g.run("st=makeScoreState(['achilles','long_journey','daphne_spring'],[]);");assert.equal(g.run("calcBonus(byId('long_journey'),st)"),11);g.run("st=makeScoreState(['long_journey','daphne_spring'],['achilles']);");assert.equal(g.run("calcBonus(byId('long_journey'),st)"),0);
});
test('Planet X visible sectors wrap correctly and equal-time players preserve arrival order',()=>{
 const g=game('planetx');g.run("state={mode:'standard',earth:10,players:[{seat:0,time:4,tie:2},{seat:1,time:4,tie:1},{seat:2,time:5,tie:0}]}");assert.deepEqual(Array.from(g.run('visibleSectors()')),[10,11,12,1,2,3]);assert.deepEqual(Array.from(g.run('playerOrder()')),[1,0,2]);assert.equal(g.run('adjacentSectors(1).left'),12);
});
test('Power Grid runs complete auction/resource/build/bureaucracy rounds for 3–6 players',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ctx={};ctx.self=ctx;for(const file of ['powergrid/data/germany-map.js','powergrid/engine.js','powergrid/map-rules-v30.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);const P=ctx.PowerGrid;for(const boardId of ['germany','usa'])for(let n=3;n<=6;n++){
 let s=P.newGame({numPlayers:n,seatNames:Array.from({length:n},(_,i)=>'P'+i),seed:42,boardId}),actions=0;
 while(s.round<=2&&actions++<300){const seat=P.actingSeats(s)[0];assert.ok(Number.isInteger(seat));let a={seat};
 if(s.phase===2){a=s.auction.sub==='offer'?{...a,type:'offerPlant',args:{plant:s.plantMarket.current[0]}}:{...a,type:'bidPass'};}
 else if(s.phase===3)a={...a,type:'endResourceTurn'};
 else if(s.phase===4){const city=s.map.cityNames.find(c=>!s.players[seat].cities.includes(c)&&P.computeBuildCost(s,seat,c)!=null&&P.computeBuildCost(s,seat,c)<=s.players[seat].money);a=city&&s.players[seat].cities.length<s.round?{...a,type:'buildCity',args:{city}}:{...a,type:'endBuildTurn'};}
 else a={...a,type:'powerCities',args:{plants:[],cityCount:0}};
 s=P.applyAction(s,a);for(const p of Object.values(s.players)){assert.ok(Number.isFinite(p.money)&&p.money>=0);assert.ok(P.stockFitsPlants(p.plants,p.stock));}}
 assert.equal(s.round,3);assert.ok(actions<300);
 }
});
