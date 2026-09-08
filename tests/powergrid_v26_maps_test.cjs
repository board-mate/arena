const assert=require('assert');
const PG=require('../powergrid/engine.js');
function audit(id,n,e){
 const m=PG.BOARD_MAPS[id]; assert(m); assert.equal(m.CITIES.length,n,id+' city count'); assert.equal(m.EDGES.length,e,id+' edge count');
 const ids=new Set(m.CITIES.map(c=>c.id)); assert.equal(ids.size,n,id+' unique city ids');
 const pairs=new Set(); m.EDGES.forEach(x=>{assert(ids.has(x.a)&&ids.has(x.b));assert(Number.isFinite(x.cost)&&x.cost>=0);let k=[x.a,x.b].sort().join('|');assert(!pairs.has(k),'duplicate '+k);pairs.add(k);});
 m.REGION_ORDER.forEach(r=>assert.equal(m.CITIES.filter(c=>c.region===r).length,7,id+' '+r+' must have 7 cities'));
 // graph connectivity
 const adj={};ids.forEach(x=>adj[x]=[]);m.EDGES.forEach(x=>{adj[x.a].push(x.b);adj[x.b].push(x.a)});let q=[m.CITIES[0].id],seen=new Set(q);while(q.length){for(const y of adj[q.shift()])if(!seen.has(y)){seen.add(y);q.push(y)}}assert.equal(seen.size,n,id+' connected');
}
audit('germany',42,83); audit('usa',42,87); audit('korea',42,81);
const U=PG.BOARD_MAPS.usa; function cost(m,a,b){let A=m.normalizeCity(a),B=m.normalizeCity(b);let x=m.EDGES.find(e=>(e.a===A&&e.b===B)||(e.a===B&&e.b===A));return x&&x.cost;}
assert.equal(cost(U,'Seattle','Portland'),3);assert.equal(cost(U,'Cheyenne','Denver'),0);assert.equal(cost(U,'New York','Philadelphia'),0);assert.equal(cost(U,'Savannah','Jacksonville'),0);assert.equal(cost(U,'Naju','Jeju'),undefined);
const K=PG.BOARD_MAPS.korea;assert.equal(cost(K,'나주','제주'),19);
console.log('V26 map audit PASS: DE 42/83, USA 42/87, KR 42/81');
