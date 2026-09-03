import { createGame, currentPlayer } from '../js/state.js';
import * as Engine from '../js/engine.js';
import * as Board from '../js/board.js';

function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); console.log('OK:', msg); }

const game = createGame({ playerNames: ['A', 'B', 'C'] });
assert(game.players.length === 3, 'creates 3 players');
assert(game.players.every((p) => p.hand.length === 8), 'each player dealt 8 cards');
game.players.forEach((p) => { game.discard.push(...p.hand.splice(4)); });
assert(game.players.every((p) => p.hand.length === 4), 'kept 4 after draft');

let p = currentPlayer(game);
console.log('Starting player:', p.name, 'money', p.money, 'appeal', p.appeal);

// --- Build action: place a kiosk adjacent to the starter enclosure ---
const starter = game.map.starterEnclosure;
const adj = Board.neighbors(starter.q, starter.r).find((n) => {
  const t = Board.tileAt(game.map, n.q, n.r);
  return t && t.type === 'empty';
});
assert(!!adj, 'found an empty tile adjacent to starter enclosure');
const before = p.money;
Engine.resolveBuild(game, p, { side: 'I', buildings: [{ kind: 'kiosk', size: 1, cells: [adj] }], xTokens: 0 });
assert(p.money === before - 2, `kiosk cost deducted (${before} -> ${p.money})`);
assert(p.actionSlots[0].actionType === 'build', 'used action card moved to slot 1');

// --- Animals action: play an animal from hand into the starter enclosure ---
p = currentPlayer(game);
console.log('Now current player:', p.name);
// give player a guaranteed-playable small animal for the test
const cheapAnimal = { id: 'test_an', kind: 'animal', type: 'water', name: '테스트몬',
  regions: [], enclosureSize: 1, cost: 0, appeal: 5, abilityKey: null, abilityText: '' };
p.hand.push(cheapAnimal);
const enclosureKey = [...p.zooBuildings.entries()].find(([k, b]) => b.kind === 'enclosure' && !b.occupied);
assert(!!enclosureKey, 'player has an empty enclosure to place into');
const [ek, ebuild] = enclosureKey;
const [q, r] = ek.split(',').map(Number);
const appealBefore = p.appeal;
Engine.resolveAnimals(game, p, {
  side: 'I',
  plays: [{ card: cheapAnimal, fromHand: true, enclosureCells: [{ q, r }] }],
  xTokens: 0,
});
assert(p.appeal === appealBefore + 5, `appeal increased by animal (${appealBefore} -> ${p.appeal})`);
assert(p.zooBuildings.get(ek).occupied === true, 'enclosure marked occupied');

// --- X-token action ---
p = currentPlayer(game);
const xBefore = p.xTokens;
Engine.resolveXToken(game, p, 'cards');
assert(p.xTokens === xBefore + 1, 'x-token action grants 1 token');

// --- Cards action: draw from deck ---
p = currentPlayer(game);
const handBefore = p.hand.length;
Engine.resolveCards(game, p, { side: 'I', mode: 'draw' });
assert(p.hand.length >= handBefore, `hand size after draw (${handBefore} -> ${p.hand.length})`);

// --- Association action: increase reputation ---
p = currentPlayer(game);
const repBefore = p.reputation;
Engine.resolveAssociation(game, p, {
  side: 'I',
  tasks: [{ type: 'reputation', cost: 2, workersNeeded: 1 }],
});
assert(p.reputation === repBefore + 2, `reputation increased (${repBefore} -> ${p.reputation})`);

// --- Sponsors action: advance break token for money ---
p = currentPlayer(game);
const moneyBefore = p.money;
Engine.resolveSponsors(game, p, { side: 'I', plays: [], breakAdvance: true, xTokens: 0 });
assert(p.money > moneyBefore, `break-advance sponsors action pays money (${moneyBefore} -> ${p.money})`);

// --- Final scoring math sanity check ---
game.players[0].appeal = 80;
game.players[0].conservation = 16;
const scores = Engine.computeFinalScores(game);
assert(Array.isArray(scores) && scores.length === 3, 'computeFinalScores returns all players');
console.log('Final scores sample:', scores);

console.log('\nALL SMOKE TESTS PASSED');
