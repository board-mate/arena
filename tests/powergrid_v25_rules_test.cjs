const assert = require('assert');
const path = require('path');
const PG = require('../powergrid/engine.js');

function names(n){ return Array.from({length:n},(_,i)=>`P${i+1}`); }
function fresh(boardId='germany', n=3){ return PG.newGame({numPlayers:n, seatNames:names(n), boardId, seed:12345}); }
function act(s,type,seat,args={}){ return PG.applyAction(s,{type,seat,args}); }
function acting(s){ return PG.actingSeats(s)[0]; }

// 1. 3~6 only
assert.throws(()=>PG.newGame({numPlayers:2,seatNames:names(2),seed:1}),/3~6/);
assert.equal(fresh('germany',3).numPlayers,3);

// 2. Unsold discounted plant is removed and replaced at end of phase 2.
{
  let s=fresh();
  s.firstRoundAuction=false;
  const discounted=s.plantMarket.discounted;
  while(s.phase===2){
    const seat=acting(s);
    assert.notEqual(seat,null);
    s=act(s,'offerPass',seat);
  }
  assert.equal(s.phase,3);
  assert(!s.plantMarket.current.includes(discounted) && !s.plantMarket.future.includes(discounted));
  assert.equal(s.plantMarket.current.length+s.plantMarket.future.length,8);
}

// 3. Lower replacement than discounted plant: new card removed, discount removed, draw again.
{
  let s=fresh();
  s.firstRoundAuction=false;
  s.plantMarket.current=[10,11,12,13]; s.plantMarket.future=[14,15,16,17]; s.plantMarket.discounted=10;
  s.deck=[5,18,19,20,21,'STEP3'];
  const offer=acting(s);
  s=act(s,'offerPlant',offer,{plant:11,bid:11});
  while(s.phase===2 && s.auction && s.auction.sub==='bid') s=act(s,'bidPass',acting(s));
  assert.equal(s.plantMarket.discounted,null);
  assert(!s.plantMarket.current.includes(5) && !s.plantMarket.future.includes(5));
  assert(s.plantMarket.current.includes(18) || s.plantMarket.future.includes(18));
}

// 4. Step 3 drawn during Phase 2 occupies market slot; after Phase 2 leaves six current plants.
{
  let s=fresh();
  s.firstRoundAuction=false;
  s.plantMarket.current=[10,11,12,13]; s.plantMarket.future=[14,15,16,17]; s.plantMarket.discounted=10;
  s.deck=['STEP3',30,31,32,33,34];
  const offer=acting(s);
  s=act(s,'offerPlant',offer,{plant:11,bid:11});
  while(s.phase===2 && s.auction && s.auction.sub==='bid') s=act(s,'bidPass',acting(s));
  assert.equal(s._step3CardInMarket,true);
  assert.equal(s.plantMarket.current.length+s.plantMarket.future.length,7);
  while(s.phase===2){ s=act(s,'offerPass',acting(s)); }
  assert.equal(s.step,3);
  assert.equal(s.phase,3);
  assert.equal(s.plantMarket.current.length,6);
  assert.equal(s.plantMarket.future.length,0);
  assert(!s._step3CardInMarket);
}

// 5. Step 3 drawn during Phase 5: Step 2 refill, next round Step 3, six-plant market.
{
  let s=fresh();
  s.firstRoundAuction=false;
  s.step=2; s.phase=5; s.powerTurn={orderIdx:0};
  s.plantMarket.current=[10,11,12,13]; s.plantMarket.future=[14,15,16,17]; s.plantMarket.discounted=null;
  s.deck=['STEP3',30,31,32];
  for(const seat of s.order){
    assert.equal(acting(s),seat);
    s=act(s,'powerCities',seat,{plants:[],cityCount:0});
  }
  assert.equal(s.step,3);
  assert.equal(s.round,2);
  assert.equal(s.phase,2);
  assert.equal(s.plantMarket.current.length,6);
  assert.equal(s.plantMarket.future.length,0);
}

// 6. Final round: no income is added; final powered count is recorded.
{
  let s=fresh();
  s.gameOver=true; s.winner=null; s.phase=5; s.powerTurn={orderIdx:0};
  const seat=s.order[0], p=s.players[seat];
  p.cities=['x']; p.plants=[13]; p.money=50;
  s=act(s,'powerCities',seat,{plants:[13],cityCount:1});
  assert.equal(s.players[seat].money,50);
  assert.equal(s.players[seat]._finalPowered,1);
}

// 7. Hybrid fuel split is player-selectable.
{
  const range=PG.hybridFuelRange([5],{coal:2,oil:2,garbage:0,uranium:0});
  assert.deepEqual({need:range.hybridNeed,min:range.minCoal,max:range.maxCoal},{need:2,min:0,max:2});
  assert.deepEqual(PG.fuelUseForPlants([5],{coal:2,oil:2,garbage:0,uranium:0},2),{coal:2,oil:0,garbage:0,uranium:0,hybridCoal:2,hybridOil:0,hybridNeed:2});
  assert.deepEqual(PG.fuelUseForPlants([5],{coal:2,oil:2,garbage:0,uranium:0},0),{coal:0,oil:2,garbage:0,uranium:0,hybridCoal:0,hybridOil:2,hybridNeed:2});

  let s=fresh(); s.phase=5; s.powerTurn={orderIdx:0};
  const seat=s.order[0], p=s.players[seat]; p.cities=['x']; p.plants=[5]; p.stock={coal:2,oil:2,garbage:0,uranium:0};
  s=act(s,'powerCities',seat,{plants:[5],cityCount:1,hybridCoal:1});
  assert.equal(s.players[seat].stock.coal,1); assert.equal(s.players[seat].stock.oil,1);
}

// 8. Fourth plant: newly purchased plant cannot be scrapped; excess stock is player-chosen.
{
  let s=fresh(); s.firstRoundAuction=false;
  const seat=acting(s), p=s.players[seat];
  p.plants=[4,8,13]; p.stock={coal:10,oil:0,garbage:0,uranium:0}; p.money=100;
  s.plantMarket.current=[40,41,42,44].filter(n=>PG.PLANT_DEFS[n]);
  if(!s.plantMarket.current.includes(40)) s.plantMarket.current[0]=40;
  // ensure 4 cards with valid defs
  s.plantMarket.current=[40,42,44,46]; s.plantMarket.future=[30,31,32,33]; s.plantMarket.discounted=40;
  s.deck=[34,35,36,37,'STEP3'];
  s=act(s,'offerPlant',seat,{plant:40,bid:1});
  while(s.auction && s.auction.sub==='bid') s=act(s,'bidPass',acting(s));
  assert(s.plantDiscard && s.plantDiscard.purchased===40);
  assert.throws(()=>act(s,'discardPlant',seat,{plant:40}),/방금 구입한 발전소/);
  s=act(s,'discardPlant',seat,{plant:4});
  assert(s.plantDiscard && s.plantDiscard.stage==='resources');
  let returned=0;
  while(s.plantDiscard){ s=act(s,'discardExcessResource',seat,{resource:'coal'}); returned++; if(returned>10) throw new Error('discard loop'); }
  assert.equal(returned,4);
  assert.equal(s.players[seat].stock.coal,6);
}

console.log('Power Grid V25 engine rule tests: PASS');
