const assert=require('assert');
global.window=global;
global.PowerGrid=require('../powergrid/engine.js');
require('../powergrid/map-rules-v23.js');
const PG=global.PowerGrid;
function names(n){return Array.from({length:n},(_,i)=>`P${i+1}`)}
function act(s,type,seat,args={}){return PG.applyAction(s,{type,seat,args})}

// USA storage purchase is available while market coal still exists.
{
 let s=PG.newGame({numPlayers:3,seatNames:names(3),boardId:'usa',seed:10});
 s.phase=3; s.resourceTurn={orderIdx:s.order.length-1};
 const seat=PG.resourceTurnSeat(s); const beforeMarket=s.resourceMarket.coal; s.players[seat].plants=[4];
 // Create storage by moving one market coal to derived supply/storage.
 s.resourceMarket.coal-=1;
 const stored=PG.usaCoalStorageCount(s); assert(stored>=1);
 const money=s.players[seat].money;
 s=act(s,'buyResource',seat,{resource:'coal',qty:1,source:'storage'});
 assert.equal(s.resourceMarket.coal,beforeMarket-1);
 assert.equal(s.players[seat].money,money-8);
}

// Korea: choose one side, cannot switch, North has no uranium.
{
 let s=PG.newGame({numPlayers:3,seatNames:names(3),boardId:'korea',seed:11});
 s.phase=3; s.resourceTurn={orderIdx:s.order.length-1};
 const seat=PG.resourceTurnSeat(s);
 s=act(s,'chooseKoreaMarket',seat,{market:'north'});
 assert.throws(()=>act(s,'chooseKoreaMarket',seat,{market:'south'}),/바꿀 수 없습니다/);
 assert.throws(()=>act(s,'buyResource',seat,{resource:'uranium',qty:1,market:'north'}),/우라늄/);
 assert.equal(s.koreaResourceMarkets.north.uranium,0);
}
console.log('Power Grid V25 map rules tests: PASS');
