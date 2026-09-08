const path=require('path');
global.window=global;
global.PowerGrid=require('../powergrid/engine.js');
require('../powergrid/map-rules-v23.js');
const PG=global.PowerGrid;
function names(n){return Array.from({length:n},(_,i)=>'P'+(i+1));}
function act(s,type,seat,args={}){return PG.applyAction(s,{type,seat,args});}
function fuelForPlant(n){const d=PG.PLANT_DEFS[n]; return d;}
function phase2(s){
  while(s.phase===2){
    const seat=PG.actingSeats(s)[0]; if(seat==null) throw new Error('no seat p2');
    if(s.plantDiscard){ throw new Error('unexpected discard'); }
    if(s.auction.sub==='offer'){
      if(s.firstRoundAuction){
        const choices=s.plantMarket.current.slice().sort((a,b)=>a-b);
        const affordable=choices.find(x=>s.players[seat].money >= (x===s.plantMarket.discounted?1:x));
        if(affordable==null) throw new Error('no affordable first round');
        s=act(s,'offerPlant',seat,{plant:affordable,bid:(affordable===s.plantMarket.discounted?1:affordable)});
      } else s=act(s,'offerPass',seat);
    } else {
      s=act(s,'bidPass',seat);
    }
  }
  return s;
}
function buyOne(s,seat,res,qty,market){
  for(let i=0;i<qty;i++){
    try{
      const args={resource:res,qty:1}; if(market) args.market=market;
      if(s.map.boardId==='usa' && res==='coal') args.source='market';
      s=act(s,'buyResource',seat,args);
    }catch(e){ return {s,ok:false,msg:e.message}; }
  }
  return {s,ok:true};
}
function phase3(s){
  while(s.phase===3){
    const seat=PG.actingSeats(s)[0]; if(seat==null) throw new Error('no seat p3');
    const p=s.players[seat];
    let market=null;
    if(s.map.boardId==='korea'){
      // choose south for universal access
      s=act(s,'chooseKoreaMarket',seat,{market:'south'}); market='south';
    }
    // Only need fuel for first owned plant, enough to operate once.
    const n=p.plants[0]; const d=n?PG.PLANT_DEFS[n]:null;
    if(d && d.need>0){
      if(d.type==='hybrid'){
        let need=Math.max(0,d.need-(p.stock.coal+p.stock.oil));
        // try coal then oil
        if(need){ let r=buyOne(s,seat,'coal',need,market); s=r.s; if(!r.ok){r=buyOne(s,seat,'oil',need,market);s=r.s;} }
      } else {
        const need=Math.max(0,d.need-p.stock[d.type]);
        if(need){ const r=buyOne(s,seat,d.type,need,market); s=r.s; }
      }
    }
    s=act(s,'endResourceTurn',seat);
  }
  return s;
}
function phase4(s){
  while(s.phase===4){
    const seat=PG.actingSeats(s)[0]; if(seat==null) throw new Error('no seat p4');
    const p=s.players[seat];
    // build exactly one cheapest affordable city if possible
    let best=null;
    for(const c of s.map.cityNames){ const cost=PG.computeBuildCost(s,seat,c); if(cost!=null && cost<=p.money && (!best||cost<best.cost)) best={c,cost}; }
    if(best) s=act(s,'buildCity',seat,{city:best.c});
    s=act(s,'endBuildTurn',seat);
  }
  return s;
}
function phase5(s){
  while(s.phase===5 && s.winner==null){
    const seat=PG.actingSeats(s)[0]; if(seat==null) throw new Error('no seat p5');
    const p=s.players[seat];
    let plants=[]; let cityCount=0; let hybridCoal=0;
    const n=p.plants[0], d=n?PG.PLANT_DEFS[n]:null;
    if(d){
      const range=PG.hybridFuelRange([n],p.stock);
      if(range){ plants=[n]; cityCount=Math.min(d.cities,p.cities.length); hybridCoal=range.minCoal; }
    }
    s=act(s,'powerCities',seat,{plants,cityCount,hybridCoal});
  }
  return s;
}
function run(map,n,seed){
  let s=PG.newGame({numPlayers:n,seatNames:names(n),boardId:map,seed});
  let actions=0; let guard=0;
  while(!s.gameOver || s.winner==null){
    if(++guard>100) throw new Error(`${map}/${n} round guard phase=${s.phase} round=${s.round}`);
    if(s.phase===2) s=phase2(s);
    if(s.phase===3) s=phase3(s);
    if(s.phase===4) s=phase4(s);
    if(s.phase===5) s=phase5(s);
  }
  // invariants
  if(s.winner==null) throw new Error('no winner');
  for(const p of Object.values(s.players)){
    for(const r of ['coal','oil','garbage','uranium']) if(p.stock[r]<0) throw new Error('negative stock');
    if(p.money<0) throw new Error('negative money');
  }
  if(map==='korea' && s.koreaResourceMarkets.north.uranium!==0) throw new Error('north uranium');
  return {round:s.round,step:s.step,winner:s.winner,cities:Object.values(s.players).map(p=>p.cities.length),money:Object.values(s.players).map(p=>p.money)};
}
for(const map of ['germany','usa','korea']) for(const n of [3,4,5,6]){
  const out=run(map,n,1000+n); console.log(map,n,JSON.stringify(out));
}
console.log('FULL SMOKE PASS');
