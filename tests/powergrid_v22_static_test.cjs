const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PG = require('../powergrid/engine.js');

function edgeCost(boardId, aName, bName) {
  const G = PG.mapData(boardId);
  const byName = Object.fromEntries(G.CITIES.map(c => [c.name, c.id]));
  const a = byName[aName], b = byName[bName];
  assert(a && b, `${boardId}: missing city ${aName}/${bName}`);
  const e = G.EDGES.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  assert(e, `${boardId}: missing edge ${aName}-${bName}`);
  return e.cost;
}

function validateGraph(boardId, cityCount, edgeCount) {
  const G = PG.mapData(boardId);
  assert.strictEqual(G.CITIES.length, cityCount, `${boardId} city count`);
  assert.strictEqual(G.EDGES.length, edgeCount, `${boardId} edge count`);
  const ids = new Set(G.CITIES.map(c => c.id));
  assert.strictEqual(ids.size, cityCount, `${boardId} duplicate city id`);
  const seen = new Set();
  for (const e of G.EDGES) {
    assert(ids.has(e.a) && ids.has(e.b), `${boardId} dangling edge ${e.a}-${e.b}`);
    const key = [e.a, e.b].sort().join('|');
    assert(!seen.has(key), `${boardId} duplicate edge ${key}`);
    seen.add(key);
    assert(Number.isFinite(e.cost) && e.cost >= 0, `${boardId} invalid cost ${key}`);
  }
}

validateGraph('usa', 42, 87);
validateGraph('korea', 42, 81);
assert.strictEqual(edgeCost('usa', 'Seattle', 'Portland'), 3);
assert.strictEqual(edgeCost('usa', 'Cheyenne', 'Denver'), 0);
assert.strictEqual(edgeCost('usa', 'New York', 'Philadelphia'), 0);
assert.strictEqual(edgeCost('usa', 'Tampa', 'Miami'), 4);
assert.strictEqual(edgeCost('korea', '서울', '고양'), 0);
assert.strictEqual(edgeCost('korea', '동해', '삼척'), 0);
assert.strictEqual(edgeCost('korea', '나주', '제주'), 19);
assert.strictEqual(edgeCost('korea', '라선', '청진'), 8);

const korea = PG.mapData('korea');
assert.strictEqual(korea.CITIES.filter(c => c.market === 'north').length, 15, 'Korea north-market city metadata');
assert.strictEqual(korea.CITIES.filter(c => c.market === 'south').length, 27, 'Korea south-market city metadata');

for (const boardId of ['usa', 'korea']) {
  for (const n of [2,3,4,5,6]) {
    const regs = PG.defaultRegions(n, boardId);
    assert.doesNotThrow(() => PG.validateRegionSelection(n, regs, boardId));
  }
  const state = PG.newGame({numPlayers:3, seatNames:['A','B','C'], boardId, regionIds:PG.defaultRegions(3, boardId), seed:123});
  assert.strictEqual(state.map.dataRev, PG.MAP_DATA_REV, `${boardId} map revision`);
}

const ui = fs.readFileSync(path.join(__dirname, '..', 'powergrid', 'ui.js'), 'utf8');
assert(ui.includes("value=\"'+myCityCount+'\""), 'power city input should default to own city count');
assert(ui.includes('id="pg-power-city-minus"') && ui.includes('id="pg-power-city-plus"'), 'mobile city count buttons');
assert(ui.includes('inputmode="numeric"'), 'mobile numeric input hint');

const html = fs.readFileSync(path.join(__dirname, '..', 'online-powergrid.html'), 'utf8');
assert(html.includes('id="pg-undo-btn"'), 'undo button');
assert(html.includes('PowerGrid.MAP_DATA_REV'), 'old USA/Korea state compatibility guard');
assert(html.includes('?v=22'), 'cache bust version');

console.log('Power Grid v22 static checks: OK');
