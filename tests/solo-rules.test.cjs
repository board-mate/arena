const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fn(file,name){const s=fs.readFileSync(path.join(__dirname,'..',file),'utf8'),a=s.indexOf('function '+name+'('),b=s.indexOf('\nfunction ',a+1);assert.ok(a>=0&&b>a,name);return s.slice(a,b);}
function etch(extra,names){const c={s:{},save(){},render(){},log(){},$:()=>null,...extra};vm.createContext(c);vm.runInContext(names.map(n=>fn('solo-etchinstone.html',n)).join('\n'),c);return c;}
const stats={spell:{attack:2,enhAttack:5,move:4,enhMove:7},element:{init:3},boost:{boost:2},reserve:{boost:4}};
function action(enc,focus='dual',target='move'){
 return etch({s:{hand:['spell','element','boost','reserve'],roles:{spell:'spell',element:'element',boost:'boost',boostTarget:target},encounter:enc},st:id=>stats[id],mage:()=>({element:'water',focus})},['reserveId','rolesReady','calcAction']);
}
test('Etchinstone matching enhanced journey adds reserve boost once, including steep terrain',()=>{
 const c=action({type:'journey',mp:10,element:'water',peril:'steep'}),r=c.calcAction();assert.equal(r.move,13);assert.equal(r.effectiveMp,14);assert.equal(r.attack,5);
});
test('Etchinstone slow enemies compare actual movement separately from attack',()=>{
 const c=action({type:'enemy',hp:10,armor:0,ability:'slow'},'move','move');assert.equal(c.calcAction().move,9);assert.equal(c.calcAction().attack,1);
});
test('Etchinstone night reduces boost before initiative allocation',()=>{
 const c=action({type:'enemy',armor:0,circ:'night'},'dual','init'),r=c.calcAction();assert.equal(r.init,3);assert.equal(r.boost,0);
});
function encounter(ability,initiative,ignore){
 const s={hand:['a','b','c','reserve'],deck:['key','next'],discard:[],roles:{},encounter:{type:'enemy',name:'test',ability,initiative,attack:2,hp:8,xp:2},stats:{perfect:0,narrow:0,defeat:0,encounters:0},poisonPending:0};
 return etch({s,rolesReady:()=>true,calcAction:()=>({attack:10,move:1,init:3}),reserveId:()=> 'reserve',mage:()=>({name:'reserve'}),$:()=>({checked:ignore}),applyTime:()=>0,cleanupEncounter(){}},['resolveEncounter']);
}
test('Etchinstone ignoring ranged does not bypass ordinary initiative and keeps reserve for damage',()=>{
 const c=encounter('ranged',5,true);c.resolveEncounter();assert.equal(c.s.pendingDamage.amount,2);assert.ok(c.s.hand.includes('reserve'));assert.equal(c.s.discardReserve,'reserve');
 const fast=encounter('ranged',2,true);fast.resolveEncounter();assert.equal(fast.s.pendingDamage,undefined);
});
test('Etchinstone freeze discards reserve during cleanup, after damage and upgrades',()=>{
 const c=encounter('freeze',5,false);c.resolveEncounter();assert.equal(c.s.discardReserve,'reserve');assert.ok(c.s.hand.includes('reserve'));
 c.s.roles={spell:'a',element:'b',boost:'c'};c.s.deck=['k','l','m','n','o'];c.totalCurrent=()=>c.s.deck.length+c.s.hand.length;c.endRegion=()=>{};
 vm.runInContext(fn('solo-etchinstone.html','cleanupEncounter'),c);c.cleanupEncounter();assert.ok(c.s.discard.includes('reserve'));assert.ok(!c.s.hand.includes('reserve'));
});
test('Etchinstone regroup preserves the remaining deck order',()=>{
 const c=etch({s:{hand:['a','b','c','d','e','f','g'],deck:['h','i','j','k'],discard:[]},prompt:()=> 'a',mage:id=>({name:id}),rngShuffle:a=>[...a].reverse()},['regroup']);c.regroup();assert.deepEqual(Array.from(c.s.hand.slice(0,4)),['h','i','j','k']);assert.equal(c.s.regroupUsed,true);
});
test('Etchinstone final sets can independently boost initiative',()=>{
 const c=etch({s:{finalAssign:{spell:'A-spell',element:'A-element',boost:'A-boost'},finalBoost:{A:'init'}},mage:()=>({element:'water',focus:'dual'}),st:id=>stats[id]},['finalCombo']);const r=c.finalCombo('A','enemy');assert.equal(r.value,5);assert.equal(r.init,5);
});
test('Etchinstone requires available cards to fill action roles before resolving',()=>{
 const c=etch({s:{hand:['a','b'],roles:{spell:'a'}}},['rolesReady']);assert.equal(c.rolesReady(),false);c.s.roles.element='b';assert.equal(c.rolesReady(),true);
 c.s={phase:'finalEnemy',hand:['a','b','c','d','e','f'],finalAssign:{a:'A-spell',b:'B-spell'}};vm.runInContext(fn('solo-etchinstone.html','finalReady'),c);assert.equal(c.finalReady(),false);
});
test('Etchinstone role buttons work even when the button has the DOM role property',()=>{
 const c=etch({s:{hand:['a'],roles:{}},mage:id=>({id,name:id,element:'water',focus:'dual'}),st:()=>({level:2}),E:{water:{name:'물',icon:'',color:'blue'}},esc:x=>x},['currentRole','roleLabel','reserveId','cardHtml','setCardRole','assignMageRole']);
 const html=c.cardHtml('a',true),handler=html.match(/onclick="(event\.stopPropagation\(\);[^\"]+)"/)[1];
 c.button={role:null};c.event={stopPropagation(){}};vm.runInContext('with(button){'+handler+'}',c);assert.equal(c.s.roles.spell,'a');
});
const TYPES=['sardine','mussel','scallop','octopus','water'];
function conservas(state,names,extra={}){
 const c={state,TYPES,KOR:{},MONTH:{rounds:7},hasUp:()=>false,save(){},render(){},log(){},$:()=>null,shuffle:a=>[...a],...extra};vm.createContext(c);vm.runInContext(names.map(n=>fn('solo-conservas.html',n)).join('\n'),c);return c;
}
function dayState(){return {phase:'endday',round:1,money:2,bag:[],general:{sardine:10,mussel:0,scallop:0,octopus:0,water:10},heldFish:[],boats:[{id:'expensive',name:'A',upkeep:3,boughtRound:0,catchTokens:[],deep:['sardine','sardine']},{id:'cheap',name:'B',upkeep:1,boughtRound:0,catchTokens:[],deep:[]}],openWater:{deep:[]},boatMarket:[{id:'m1'},{id:'m2'},{id:'m3'}],boatDeck:[],upgradeMarket:[{id:'u1'},{id:'u2'},{id:'u3'}],upgradeDeck:[]};}
test('Conservas unaffordable upkeep preserves cash and fish under the discarded boat',()=>{
 const s=dayState(),c=conservas(s,['blankCounts','countArr','allDeep','refreshMarket','endDay']);c.endDay();assert.equal(s.money,1);assert.equal(s.boats.length,1);assert.equal(s.boats[0].id,'cheap');assert.equal(s.bag.filter(x=>x==='sardine').length,3);assert.equal(s.general.sardine,9);assert.equal(s.boatDiscard[0].id,'expensive');assert.equal(s.boatMarket[0].id,'m1');
});
test('Conservas upkeep follows the player order and exempts newly purchased boats',()=>{
 const s=dayState();s.money=3;s.upkeepOrder=['cheap','expensive'];s.boats.push({id:'new',name:'new',upkeep:9,boughtRound:1,catchTokens:[],deep:[]});const c=conservas(s,['blankCounts','countArr','allDeep','refreshMarket','endDay']);c.endDay();assert.equal(s.money,2);assert.deepEqual(Array.from(s.boats,b=>b.id),['cheap','new']);
});
test('Conservas market draws existing deck before reshuffling discards',()=>{
 const s={boatMarket:[],boatDeck:[{id:'top'}],boatDiscard:[{id:'old1'},{id:'old2'}]},c=conservas(s,['refreshMarket']);c.refreshMarket('boat',false);assert.equal(s.boatMarket[0].id,'top');assert.equal(s.boatMarket.length,3);assert.equal(s.boatDiscard.length,0);
});
test('Conservas unchosen starter returns to bottom of deck',()=>{
 const s={phase:'setup',boatOffer:[{id:'a'},{id:'b'}],boatDeck:[{id:'top'}]},c=conservas(s,['chooseStarter']);c.chooseStarter('a');assert.equal(s.boatDeck[0].id,'b');assert.equal(s.boatDeck.at(-1).id,'top');
});
test('Conservas secondary net returns exactly three tokens and only works on first draw',()=>{
 const s={phase:'sea',drawn:[],bag:[],boats:[],openWater:{used:false}},c=conservas(s,['drawTokens','returnSecondary'],{hasUp:()=>true,targets:()=>[{used:false}],drawN:n=>Array.from({length:n},(_,i)=>String(i))});
 c.drawTokens(true);assert.equal(s.drawn.length,8);s.selectedCatch=[0,3,7];c.returnSecondary();assert.equal(s.drawn.length,5);assert.deepEqual(Array.from(s.bag),['0','3','7']);assert.equal(s.returning,0);
 s.drawn=[];c.targets=()=>[{used:true},{used:false}];c.drawTokens(true);assert.equal(s.drawn.length,5);
});
test('Conservas January uses the official 24 orders, six per row',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../solo-conservas.html'),'utf8');const c={};vm.runInNewContext(s.slice(s.indexOf('const ORDERS='),s.indexOf('const MONTH='))+';this.orders=ORDERS',c);
 assert.equal(c.orders.length,24);assert.deepEqual(Array.from(c.orders.slice(12,18),o=>o.money),[3,4,4,5,5,6]);assert.deepEqual(Array.from(c.orders.slice(18),o=>o.money),[7,7,8,8,9,9]);
 assert.ok(c.orders.slice(0,6).every(o=>o.req.sardine===1&&o.money===1));assert.ok(c.orders.slice(6,12).every(o=>o.req.scallop===1&&o.money===2));
});
test('Conservas cannot purchase an any-fish upgrade with too few fish',()=>{
 const c=conservas({heldFish:[]},['blankCounts','countArr','fishCounts','chooseFishForCost']);assert.equal(c.chooseFishForCost({mode:'any',n:1}),null);c.state.heldFish=['sardine'];assert.equal(c.chooseFishForCost({mode:'any',n:2}),null);assert.deepEqual(Array.from(c.chooseFishForCost({mode:'any',n:1})),['sardine']);
});
function coffee(cup,flavorReq){const c={TOKEN_TYPES:{r2:{roastLevel:2}},addLog(){}};vm.createContext(c);vm.runInContext(['calcRoastSum','calcScore'].map(n=>fn('solo-coffee-roaster.html',n)).join('\n'),c);return c.calcScore({cup,bean:{roastPoints:{},flavorReq}});}
test('Coffee Roaster scores repeated flavors and sweetness substitution',()=>{
 assert.equal(coffee(['aroma','aroma','sweetness'],['aroma','aroma','acidity']).flavorPts,6);
 assert.equal(coffee(['aroma'],['aroma','aroma','acidity']).flavorCount,1);
 assert.equal(coffee(['aroma','sweetness'],['aroma','acidity','sweetness']).flavorCount,2);
});
test('Coffee Roaster does not apply no-flavor penalty for an unmatched flavor',()=>{
 const r=coffee(['aroma',...Array(9).fill('r2')],['body']);assert.equal(r.flavorPts,0);assert.equal(r.minusPts,0);
});
