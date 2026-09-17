const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'online-calico.html'), 'utf8');

function declaration(name) {
  const match = source.match(new RegExp(`  const ${name} = [\\s\\S]*?\\n  \\];|  const ${name} = [\\s\\S]*?\\n  \\}\\);`));
  assert.ok(match, `${name} declaration exists`);
  return match[0];
}

function functionSource(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `${name} function exists`);
  const next = source.indexOf('\n  function ', start + 1);
  assert.notEqual(next, -1, `${name} has a following function`);
  return source.slice(start, next);
}

const goalContext = { state: { settings: {} } };
vm.runInNewContext(`${declaration('GOALS')}\n${functionSource('scoreGoal')}\n` +
  `const GOAL_POSITIONS=['goal'];
   const neighborKeys=()=>['a','b','c','d','e','f'];
   const goalById=id=>GOALS.find(goal=>goal.id===id);
   const histogram=values=>{const counts=new Map(); for(const value of values)counts.set(value,(counts.get(value)||0)+1); return [...counts.values()].sort((a,b)=>b-a)};
   const sameArray=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
   globalThis.goals=GOALS; globalThis.scoreGoal=scoreGoal;`, goalContext);

function score(id, colors, patterns) {
  const board = { goal: { type: 'goal', goalId: id } };
  ['a','b','c','d','e','f'].forEach((key, index) => {
    board[key] = { type: 'patch', tile: { color: colors[index], pattern: patterns[index] } };
  });
  return goalContext.scoreGoal({ board }, 'goal').total;
}

test('design goal points match the official scoring tiles', () => {
  assert.equal(score('333', [1,1,1,2,2,2], [1,2,3,4,5,6]), 8);
  assert.equal(score('333', [1,1,1,2,2,2], [1,1,1,2,2,2]), 13);
  assert.equal(score('2211', [1,1,2,2,3,4], [1,2,3,4,5,6]), 5);
  assert.equal(score('2211', [1,1,2,2,3,4], [1,1,2,2,3,4]), 8);
});

test('physical cat supply totals 80 tokens', () => {
  const context = {};
  vm.runInNewContext(`${declaration('CAT_TOKEN_COUNTS')}\nglobalThis.counts=CAT_TOKEN_COUNTS;`, context);
  assert.equal(Object.values(context.counts).reduce((sum, count) => sum + count, 0), 80);
});

test('a qualifying cat remains claimable after its physical tokens run out', () => {
  const board = Object.fromEntries(['a','b','c'].map(key => [key, {
    type: 'patch', tile: { color: 'green', pattern: 1 }, cats: [], buttons: []
  }]));
  const context = {
    board,
    state: null,
    COLORS: [{ id: 'green' }],
    componentFor: () => ['a','b','c'],
    groupSignature: keys => keys.join('|'),
    tokenTargetKeys: (_, keys) => keys,
    hasButtonInComponent: () => false,
    hasCatInComponent: () => false,
    colorById: () => ({ ko: '초록' }),
    componentHasShape: () => null,
    countButtonsByColor: () => 0
  };
  vm.runInNewContext(`${functionSource('buildAllPendingTokenChoices')}\nglobalThis.buildChoices=buildAllPendingTokenChoices;`, context);
  const choices = context.buildChoices({ board }, {
    inventories: { buttons: { green: 0 }, cats: { millie: 0 }, rainbow: 0 },
    cats: [{ id: 'millie', ko: '밀리', kind: 'size', size: 3, preferred: [1, 2] }]
  });
  assert.equal(choices.filter(choice => choice.type === 'cat' && choice.id === 'millie').length, 1);
});
