const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.join(__dirname,'..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function fn(file,name){const s=read(file),start=s.indexOf('function '+name+'(');assert.ok(start>=0);const end=s.slice(start+1).search(/\n(?:async )?function /);return s.slice(start,end<0?undefined:start+1+end);}
test('all 29 game pages have parseable scripts, JSON metadata and existing local assets',()=>{
 const files=fs.readdirSync(root).filter(f=>/^(online|solo)-.*\.html$/.test(f));assert.equal(files.length,29);
 for(const f of files){const s=read(f);for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!m[2].trim())continue;if(/application\/(?:ld\+)?json/.test(m[1])){JSON.parse(m[2]);continue;}
  const check=cp.spawnSync(process.execPath,['--check','--input-type='+(/type=["']module/.test(m[1])?'module':'commonjs')],{input:m[2],encoding:'utf8'});assert.equal(check.status,0,f+' '+check.stderr);
 }for(const m of s.matchAll(/(?:src|href)=["'](\.\/[^"'?#]+)/g))assert.ok(fs.existsSync(path.resolve(root,m[1])),f+': '+m[1]);}
});
function online(state){const c={state,mySeat:0,members:[{nickname:'A'},{nickname:'B'},{nickname:'C'}]};c.mutate=f=>f(c.state);vm.createContext(c);vm.runInContext(['limit','legalWith','minNeed','hasEnoughMoves','endTurn'].map(n=>fn('online-thegame.html',n)).join('\n'),c);return c;}
test('The Game skips empty hands after the deck is exhausted',()=>{
 const s={over:false,current:0,played:1,playerCount:3,deck:[],hands:[[3],[],[4]],piles:[2,1,100,100],turnNo:1};const c=online(s);c.endTurn();assert.equal(s.current,2);assert.equal(s.over,false);
});
test('The Game cannot end after one card while the draw pile remains',()=>{
 const s={over:false,current:0,played:1,playerCount:2,deck:[90],hands:[[3],[4]],piles:[2,1,100,100],turnNo:1};const c=online(s);c.endTurn();assert.equal(s.current,0);assert.equal(s.deck.length,1);
});
test('The Game evaluates sequential legal moves and backward tens',()=>{
 const c=online({});assert.equal(c.hasEnoughMoves({deck:[90],hands:[[20,10]],piles:[30,99,2,2]},0),true);assert.equal(c.hasEnoughMoves({deck:[90],hands:[[20]],piles:[1,1,100,100]},0),false);
});
test('local The Game skips empty hands without consuming extra fire turns',()=>{
 const G={deck:[],totalPlayers:3,currentTurn:0,playedCount:1,hands:[[3],[],[4]],fireActive:[false,false,false,false],fireTimer:[0,0,0,0]};const c={G,render(){},checkValidPlays(){},gameOver(){throw Error('unexpected end');}};vm.runInNewContext(fn('solo-thegame.html','endTurn'),c);c.endTurn();assert.equal(G.currentTurn,2);
});
function samurai(counts){const G={players:counts.map((v,id)=>({id,name:String(id),captured:{helmet:v[0],buddha:v[1],rice:v[2]}}))};const c={G,FIG:{HELMET:'helmet',BUDDHA:'buddha',RICE:'rice'},FIG_KO:{},addLog(){}};vm.runInNewContext(['computeFinalOrder','totalFigs','rankPlayersSimple'].map(n=>fn('online-samurai.html',n)).join('\n'),c);c.computeFinalOrder();return Array.from(G.winner);}
test('Samurai compares the sum of both non-majority castes',()=>assert.deepEqual(samurai([[5,4,0],[3,5,2],[0,0,3]]),[1]));
test('Samurai uses total captures after equal other-figure totals',()=>assert.deepEqual(samurai([[6,1,2],[0,5,3],[1,0,4]]),[0]));
test('Samurai shares fully tied victories including no majority',()=>{assert.deepEqual(samurai([[5,2,1],[2,5,1],[0,0,3]]),[0,1]);assert.deepEqual(samurai([[2,2,1],[2,2,1]]),[0,1]);});
