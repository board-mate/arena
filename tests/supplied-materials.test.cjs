const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {game}=require('./multiplayer-fixture.cjs');

test('Project L uses all 52 supplied physical puzzle shapes, printed points and rewards',()=>{
 const g=game('projectl');
 assert.equal(g.run('PHYSICAL_PUZZLES.length'),52);
 assert.equal(g.run("puzzleDeck('white',32).length"),32);
 assert.equal(g.run("puzzleDeck('black',20).length"),20);
 assert.equal(g.run('new Set(PHYSICAL_PUZZLES.map(p=>p.id)).size'),52);
 assert.equal(g.run("PHYSICAL_PUZZLES.find(p=>p.id==='white-1').points"),2);
 assert.equal(g.run("PHYSICAL_PUZZLES.find(p=>p.id==='white-1').reward"),'domino');
 assert.deepEqual(JSON.parse(g.run("JSON.stringify(PHYSICAL_PUZZLES.find(p=>p.id==='white-1').mask)")),[[0,0],[1,0],[1,1],[1,2],[2,0]]);
 assert.equal(g.run("PHYSICAL_PUZZLES.find(p=>p.id==='white-32').points"),0);
 assert.equal(g.run("PHYSICAL_PUZZLES.find(p=>p.id==='black-1').mask.length"),16);
 assert.equal(g.run("PHYSICAL_PUZZLES.find(p=>p.id==='black-1').points"),5);
 assert.equal(g.run("PHYSICAL_PUZZLES.find(p=>p.id==='black-20').reward"),'tetT');
 assert.equal(g.run('PHYSICAL_PUZZLES.every(p=>p.mask.length===new Set(p.mask.map(c=>c.join(","))).size&&PIECES[p.reward])'),true);
 for(const n of [2,3,4]){g.context.count=n;g.run('members=fixtureMembers.slice(0,count);state=initState(members)');assert.equal(g.run('state.blackDeck.length+state.rows.black.length'),({2:12,3:14,4:16})[n]);assert.equal(g.run('state.whiteDeck.length+state.rows.white.length'),32);}
});

test('new Quacks games follow all 53 physical cauldron spaces instead of treating money as distance',()=>{
 const g=game('quacks');g.run('members=members.slice(0,2);state=initialState()');
 assert.equal(g.run('MAX_POS()'),53);assert.equal(g.run('CAULDRON_GOLD.length'),54);assert.equal(g.run('CAULDRON_POINTS.length'),54);
 for(const [pos,gold,points,ruby] of [[5,5,0,true],[15,15,3,false],[16,15,3,true],[31,23,7,false],[40,27,10,true],[52,33,14,true],[53,35,15,false]]){
   g.context.pos=pos;assert.equal(g.run('GOLD_OF(pos)'),gold);assert.equal(g.run('POINTS_OF(pos)'),points);assert.equal(g.run('HAS_RUBY(pos)'),ruby);
 }
 g.run('state.players[0].cursor=15;state.players[1].cursor=0;computeScoring(state)');
 assert.equal(g.run('state.players[0].scoring.gold'),15);assert.equal(g.run('state.players[0].scoring.points'),3);assert.equal(g.run('state.players[0].scoring.hasRuby'),true);
 g.run("state.players[0].cursor=40;placeChip(state.players[0],{c:'orange',v:1})");assert.equal(g.run('state.players[0].cursor'),41);
 g.run('delete state.rulesVersion;state.players[0].cursor=33;computeScoring(state)');
 assert.equal(g.run('MAX_POS()'),33);assert.equal(g.run('state.players[0].scoring.scoringPos'),34);assert.equal(g.run('state.players[0].scoring.gold'),35);
});

test('Quacks six-sided bonus die has two one-point faces and empty flasks stay empty until refilled',()=>{
 const g=game('quacks');g.run("members=members.slice(0,2);state=initialState();state.phase='scoring';state.players.forEach(p=>{p.flaskUsed=true;p.scoring={endReady:true,bonusEligible:false};});checkAdvance(state)");
 assert.equal(g.run('BONUS_FACES.length'),6);assert.equal(g.run("BONUS_FACES.filter(x=>x==='1점').length"),2);
 assert.equal(g.run('state.round'),2);assert.equal(g.run('state.players.every(p=>p.flaskUsed)'),true);
 g.run('mySeat=0;mutateSelf=fn=>fn(state.players[0],state);state.players[0].rubies=2;actionSpendFlask()');assert.equal(g.run('state.players[0].flaskUsed'),false);assert.equal(g.run('state.players[0].rubies'),0);
});

test('all 80 Greek cards and every Quacks chip art reference have local image files',()=>{
 const root=path.join(__dirname,'..');
 const greek=fs.readFileSync(path.join(root,'online-fantasy-realms-greek.html'),'utf8');
 const cards=JSON.parse(greek.match(/const RAW_DB = (\[.*?\]);/s)[1]);
 assert.equal(cards.length,80);
 for(const c of cards)assert.ok(fs.statSync(path.join(root,'assets/fantasy-realms-greek',c.id+'.webp')).size>1000,c.id);
 const g=game('quacks');for(const file of Object.values(g.run('CHIP_ART')))assert.ok(fs.existsSync(path.join(root,file)));
});
