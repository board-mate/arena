// ============================================================================
// state.js — 게임 상태 모델 + 셋업
// ============================================================================
import { ACTION_CARDS, ACTION_TYPE_ORDER } from '../data/actionCards.js';
import { ALL_ANIMALS }         from '../data/cards-animals.js';
import { SPONSOR_CARDS }       from '../data/cards-sponsors.js';
import { LEGENDARY_CARDS }     from '../data/cards-legendary.js';
import { FINAL_SCORING_CARDS } from '../data/cards-finalscoring.js';
import { getAvailableMaps, makeDefaultMap } from './board.js';
import {
  BREAK_START_SPACE, BREAK_TRACK_LENGTH,
  MAX_X_TOKENS, HAND_LIMIT_DEFAULT, donationCost,
} from './config.js';

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function buildZooDeck() {
  const conservationAsZooCards = LEGENDARY_CARDS.map(c => ({
    ...c, kind:'conservationProject', id:`zoo_${c.id}`,
  }));
  return shuffle([
    ...ALL_ANIMALS.map(c   => ({ ...c, kind:'animal' })),
    ...SPONSOR_CARDS.map(c => ({ ...c, kind:'sponsor' })),
    ...conservationAsZooCards,
  ]);
}

function freshPlayer(id, name, color, turnOrderIndex) {
  const slots = ACTION_TYPE_ORDER.map((type, i) => ({
    slotIndex: i+1,
    actionType: type,
    side: 'I',
  }));
  return {
    id, name, color,
    money: 25,
    appeal: turnOrderIndex,
    conservation: 0,
    reputation: 0,
    xTokens: 0,
    associationWorkers: { active:1, resting:3 },
    handLimit: HAND_LIMIT_DEFAULT,
    hand: [],
    playedAnimals: [],
    playedSponsors: [],
    partnerZoos: [],      // ['관동', '성도', ...]
    universities: [],     // ['일반대학', ...]
    zooBuildings: new Map(),
    conservationTokensAvailable: 7,
    actionSlots: slots,
    finalScoringCards: [],
    upgradesUsed: {
      track2: false, track_reputation: false,
      secondPartnerZoo: false, secondUniversity: false,
    },
    tokensOnActionCards: {},
    // 동물 아이콘 집계 (보존 프로젝트 판정용)
    iconCounts: {
      water:0, fire:0, grass:0, fighting:0, psychic:0, fossil:0,
      '관동':0, '성도':0, '호연':0, '신오':0, '하나':0,
    },
    log: [],
  };
}

export function createGame({ playerNames, mapId, seed, solo = false, soloAppeal = 20 } = {}) {
  const names = playerNames?.length ? playerNames : ['플레이어 1','플레이어 2'];
  const colors = ['#e74c3c','#3498db','#f1c40f','#2ecc71'];
  const deck    = buildZooDeck();
  const display = deck.splice(0, 6);
  const players = names.map((n, i) => freshPlayer(`p${i+1}`, n, colors[i%colors.length], i));
  if (solo && players.length === 1) players[0].appeal = Number(soloAppeal ?? 20);

  // 손패: 8장 뽑고 UI에서 4장 선택
  players.forEach(p => { p.hand = deck.splice(0, 8); });

  const finalScoringDeck = shuffle(FINAL_SCORING_CARDS);
  players.forEach(p => { p.finalScoringCards = finalScoringDeck.splice(0, 2); });

  const baseConservationCount = players.length === 4 ? 4 : 3;
  const baseConservationProjects = shuffle(LEGENDARY_CARDS.slice(0,12)).slice(0, baseConservationCount);

  // 지도 선택
  const maps = getAvailableMaps();
  const mapDef = maps.find(m => m.id === mapId) || maps[0];
  const map = mapDef.make();

  // F13 특수: 매점에서 건설 시작은 ui.js setupStarterKiosk()에서 처리

  return {
    seed: seed || Date.now(),
    players,
    map,
    deck,
    discard: [],
    display,
    breakTrack: {
      length: BREAK_TRACK_LENGTH[players.length] || 12,
      position: BREAK_START_SPACE[players.length] || 0,
    },
    conservationProjectsInPlay: [],
    baseConservationProjects,
    associationBoard: {
      partnerZoosAvailable: ['관동','성도','호연','신오','하나'],
      universitiesAvailable: ['일반대학','연구소','도감연구소'],
      donationsFilled: 0,
    },
    bonusTilesOnTrack: [], // 레퓨테이션 트랙 보너스
    turnOrder: players.map(p => p.id),
    currentPlayerIndex: 0,
    phase: 'setup',
    endTriggeredBy: null,
    turnNumber: 1,
    conservationMilestone10Reached: false,
    log: [],
    xTokenCap: MAX_X_TOKENS,
    solo: solo && players.length === 1 ? {
      enabled: true,
      startAppeal: Number(soloAppeal ?? 20),
      round: 1,
      tokensRemaining: 7,
      turnsRemaining: 7,
      totalTurns: 27
    } : null,
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex];
}

export function nextPlayer(game) {
  game.currentPlayerIndex = (game.currentPlayerIndex+1) % game.players.length;
  game.turnNumber += 1;
}

export function actionCardDef(actionType, side) {
  return side === 'II'
    ? ACTION_CARDS[actionType].sideII
    : ACTION_CARDS[actionType].sideI;
}

// 플레이어 아이콘 집계 갱신 (동물/스폰서 배치 후 호출)
export function rebuildIconCounts(player) {
  const counts = {
    water:0, fire:0, grass:0, fighting:0, psychic:0, fossil:0,
    '관동':0, '성도':0, '호연':0, '신오':0, '하나':0,
  };
  const addCard = card => {
    if (card.types)   card.types.forEach(t => { if (t in counts) counts[t]++; });
    if (card.regions) card.regions.forEach(r => { if (r in counts) counts[r]++; });
    // 물/바위 요구조건도 아이콘으로 집계 (룰북 p.15)
    if (card.requiresWater) counts.water += card.requiresWater;
    if (card.requiresRock)  ; // 바위 아이콘은 별도 집계 없음
  };
  player.playedAnimals.forEach(addCard);
  player.playedSponsors.forEach(addCard);
  player.partnerZoos.forEach(r => { if (r in counts) counts[r]++; });
  player.universities.forEach(u => {
    if (u.icons) u.icons.forEach(ic => { if (ic in counts) counts[ic]++; });
  });
  player.iconCounts = counts;
}
