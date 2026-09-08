const PG=require('../powergrid/engine.js');
const map=PG.BOARD_MAPS.korea;
const byName=Object.fromEntries(map.CITIES.map(c=>[c.name,c]));
function edge(a,b){ const A=byName[a],B=byName[b]; if(!A||!B)return null; return map.EDGES.find(e=>(e.a===A.id&&e.b===B.id)||(e.a===B.id&&e.b===A.id)); }
function eq(a,b,msg){if(a!==b)throw new Error(`${msg}: ${a} !== ${b}`)}
if(byName['순천']) throw new Error('순천 must not exist');
if(!byName['속초']) throw new Error('속초 missing');
if(edge('서울','용인')) throw new Error('서울-용인 must not be directly connected');
eq(edge('인천','고양')?.cost,0,'인천-고양');
eq(edge('고양','서울')?.cost,0,'고양-서울');
eq(edge('서울','안양')?.cost,0,'서울-안양');
eq(edge('안양','수원')?.cost,3,'안양-수원');
eq(edge('수원','용인')?.cost,2,'수원-용인');
eq(edge('속초','강릉')?.cost,6,'속초-강릉');
eq(edge('속초','원산')?.cost,18,'속초-원산');
eq(map.CITIES.length,42,'city count');
eq(map.EDGES.length,81,'edge count');
for(const r of map.REGION_ORDER) eq(map.CITIES.filter(c=>c.region===r).length,7,`region ${r}`);
console.log('KOREA V27 REGRESSION PASS');
