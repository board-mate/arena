const assert=require('assert');
const PG=require('../powergrid/engine.js');
const G=PG.GERMANY;

assert.equal(PG.STATE_KIND,'powergrid-v3-germany-boardmate');
assert.equal(G.CITIES.length,42,'Germany must have 42 cities');
assert.equal(G.EDGES.length,83,'Germany must have 83 weighted connections');
assert.equal(new Set(G.CITIES.map(c=>c.id)).size,42,'city ids unique');
assert.equal(new Set(G.EDGES.map(e=>[e.a,e.b].sort().join('|'))).size,83,'edges unique');
for(const region of G.REGION_ORDER) assert.equal(G.CITIES.filter(c=>c.region===region).length,7,`${region} should have 7 cities`);

assert.deepStrictEqual(PG.defaultRegions(2),['green','brown','yellow']);
assert.equal(PG.validateRegionSelection(2,['green','brown','yellow']).length,3);
assert.equal(PG.validateRegionSelection(4,['green','brown','yellow','red']).length,4);
assert.throws(()=>PG.validateRegionSelection(2,['green','brown','purple']),/서로 연결/);
assert.throws(()=>PG.newGame({numPlayers:1,seatNames:['A']}),/2~6인 다인플/);

const all=G.CITIES.map(c=>c.id);
assert.equal(PG.cheapestConnectionCost(['DUISBURG'],'ESSEN',all),0);
assert.equal(PG.cheapestConnectionCost(['MUNSTER'],'DORTMUND',all),2);
assert.equal(PG.cheapestConnectionCost(['AACHEN'],'KOLN',all),7);
assert.equal(PG.cheapestConnectionCost(['WIESBADEN'],'FRANKFURT_MAIN',all),0);
assert.equal(PG.cheapestConnectionCost(['HALLE'],'LEIPZIG',all),0);
assert.equal(PG.cheapestConnectionCost(['MUNICH'],'AUGSBURG',all),6);
assert.equal(PG.cheapestConnectionCost(['DUISBURG'],'AACHEN',all),11);

let s=PG.newGame({numPlayers:2,seatNames:['A','B'],regionIds:['red','blue','yellow'],seed:7});
assert.equal(s.kind,PG.STATE_KIND);
assert.equal(s.v,3);
assert.equal(s.map.boardId,'germany');
assert.equal(s.map.mode,'auto');
assert.equal(s.map.cityNames.length,21);
assert.equal(s.players[0].isAI,false);
assert.equal(s.players[1].isAI,false);
assert.equal(PG.computeBuildCost(s,0,'FLENSBURG'),null,'unselected city not buildable');

// Force phase 4 to test automatic Germany connection costs.
s.phase=4;s.auction=null;s.buildTurn={orderIdx:s.order.length-1};PG.syncDerivedTurn(s);
const seat=s.currentSeat;
const before=s.players[seat].money;
assert.equal(PG.computeBuildCost(s,seat,'DUISBURG'),10,'first city costs 10');
s=PG.applyAction(s,{type:'buildCity',seat,args:{city:'DUISBURG'}});
assert.equal(s.players[seat].money,before-10);
assert.equal(PG.computeBuildCost(s,seat,'AACHEN'),21,'Duisburg -> Aachen connection 11 + city 10');
s=PG.applyAction(s,{type:'buildCity',seat,args:{city:'AACHEN'}});
assert.equal(s.players[seat].money,before-31);
assert.deepStrictEqual(s.cityOwners.DUISBURG,[seat]);
assert.deepStrictEqual(s.cityOwners.AACHEN,[seat]);
assert.throws(()=>PG.applyAction(s,{type:'buildCity',seat,args:{city:'FLENSBURG'}}),/플레이 지역 밖/);
assert.throws(()=>PG.applyAction({...s,kind:'powergrid-v2-boardmate'},{type:'endBuildTurn',seat}),/이전 파워그리드/);

console.log('PASS powergrid_germany_v3_test: multiplayer-only + 42 cities + 83 links + automatic Germany route costs');
