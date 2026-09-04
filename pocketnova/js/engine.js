// ============================================================================
// engine.js — 턴 루프 및 액션 처리 (아크노바 룰북 기반)
// ============================================================================
import { actionCardDef, currentPlayer, nextPlayer, rebuildIconCounts } from './state.js';
import * as Board from './board.js';
import { resolveAbility, triggerSponsorOnAnimalPlaced, computeSponsorBreakIncome, computeSponsorBreakXTokens } from './abilities.js';
import {
  MAX_X_TOKENS, appealIncome, conservationTarget, SCORING_AREA_WINDOW,
  HAND_LIMIT_WITH_UNIVERSITY, CONSERVATION_BONUSES, donationCost,
} from './config.js';

// ── 슬롯 강도 계산 ──────────────────────────────────────────────
export function slotStrength(player, actionType) {
  const idx = player.actionSlots.findIndex(s => s.actionType === actionType);
  return { slotIndex: idx, strength: idx + 1 };
}

// ── 액션카드 슬롯 이동 (사용 후 슬롯1로) ────────────────────────
export function advanceActionCard(player, actionType) {
  const idx = player.actionSlots.findIndex(s => s.actionType === actionType);
  const card = player.actionSlots[idx];
  const rest = player.actionSlots.filter((_, i) => i !== idx);
  player.actionSlots = [card, ...rest];
}

function pushLog(game, text) {
  game.log.push({ turn: game.turnNumber, text });
  if (game.log.length > 400) game.log.shift();
}

// ═══════════════════════════════════════════════════ BUILD ═══
export function resolveBuild(game, player, { side, buildings, xTokens = 0 }) {
  const { strength } = slotStrength(player, 'build');
  const def = actionCardDef('build', side);
  const maxSize = Math.min(5, strength + xTokens);
  let totalSize = 0;
  const results = [];
  const isFirstEver = player.zooBuildings.size === 0;

  for (const b of buildings) {
    const size = getBuildingSize(b);
    totalSize += size;
    if (totalSize > maxSize)
      throw new Error(`건물 크기 합(${totalSize})이 행동 강도(${maxSize})를 초과합니다.`);
    if (!def.multi && results.length >= 1)
      throw new Error('건설 카드 I면으로는 건물을 1개만 지을 수 있습니다.');

    // 특수 우리 중복 체크
    if (['reptileHouse', 'largeBirdAviary', 'pettingZoo'].includes(b.kind)) {
      const already = [...player.zooBuildings.values()].some(bld => bld.kind === b.kind);
      if (already) throw new Error(`${b.kind}은 동물원당 1개만 지을 수 있습니다.`);
    }

    // 업그레이드 필요 칸 체크
    const isUpgraded = player.actionSlots.find(s => s.actionType === 'build')?.side === 'II';
    const needsUpgrade = b.cells?.some(c => {
      const t = Board.tileAt(game.map, c.q, c.r);
      return t?.bonus?.kind === 'upgrade_required';
    });
    if (needsUpgrade && !isUpgraded)
      throw new Error('건설 카드 II면이 있어야 이 칸에 건설할 수 있습니다.');

    if (!Board.canPlaceBuilding(game.map, player.zooBuildings, b.cells, isFirstEver && results.length === 0))
      throw new Error('해당 위치에 건설할 수 없습니다 (인접/경계 규칙).');

    const cost = size * def.costPerSpace;
    if (player.money < cost) throw new Error(`건설 비용(${cost}원)이 부족합니다.`);
    player.money -= cost;

    for (const c of b.cells) {
      player.zooBuildings.set(Board.key(c.q, c.r), {
        kind: b.kind, size, occupied: false, cells: b.cells,
      });
    }

    // 배치 보너스
    for (const bonus of Board.placementBonusesFor(game.map, b.cells))
      applyBonus(game, player, bonus);

    if (b.kind === 'pavilion') {
      player.appeal = Math.min(113, player.appeal + 1);
    }
    results.push({ kind: b.kind, size, cells: b.cells });
  }

  checkZooCoveredBonus(game, player);
  advanceActionCard(player, 'build');
  pushLog(game, `${player.name}: 건설 (강도${maxSize}) — ${results.map(r => r.kind).join(', ')}`);
  return results;
}

function getBuildingSize(b) {
  if (b.kind === 'kiosk' || b.kind === 'pavilion') return 1;
  if (b.kind === 'pettingZoo') return 3;
  if (b.kind === 'reptileHouse' || b.kind === 'largeBirdAviary') return 5;
  return b.size || 1;
}

export function applyBonus(game, player, bonus) {
  if (!bonus) return;
  switch (bonus.kind) {
    case 'money':        player.money += bonus.amount; break;
    case 'reputation':   gainReputation(game, player, bonus.amount); break;
    case 'conservation': gainConservation(game, player, bonus.amount); break;
    case 'xtoken':       player.xTokens = Math.min(MAX_X_TOKENS, player.xTokens + bonus.amount); break;
    case 'appeal':       player.appeal = Math.min(113, player.appeal + bonus.amount); break;
  }
}

function checkZooCoveredBonus(game, player) {
  const buildable = game.map.tiles.filter(t =>
    !['rock', 'water', 'blocked'].includes(t.type)).length;
  if (player.zooBuildings.size >= buildable) {
    player.appeal = Math.min(113, player.appeal + 7);
    pushLog(game, `${player.name}: 동물원 완전 덮기 보너스! 매력도 +7`);
  }
}

// ═══════════════════════════════════════════════════ ANIMALS ════
export function resolveAnimals(game, player, { side, plays, xTokens = 0, ctx = { prompts: [] } }) {
  const { strength } = slotStrength(player, 'animals');
  const def = actionCardDef('animals', side);
  const eff = Math.min(5, strength + xTokens);
  const maxPlays = def.table?.[eff] ?? 0;

  // II면 강도5: 명성 +1
  if (side === 'II' && eff >= 5) gainReputation(game, player, 1);

  if (plays.length > maxPlays)
    throw new Error(`강도 ${eff}로는 동물을 최대 ${maxPlays}장까지만 낼 수 있습니다.`);

  const logs = [];
  for (const play of plays) {
    const card = play.card;
    let cost = card.cost ?? 0;

    // 파트너 동물원 할인 (3원/대륙 아이콘)
    const discount = (player.partnerZoos.filter(z => card.regions?.includes(z)).length) * 3;
    cost = Math.max(0, cost - discount);

    // II면 필드 카드 surcharge
    if (!play.fromHand && side === 'II') cost += (play.folderIndex ?? 0);

    if (player.money < cost)
      throw new Error(`${card.name} 비용(${cost}원)이 부족합니다. (보유: ${player.money}원)`);
    player.money -= cost;

    // 우리 배치
    if (play.useSpecial) {
      player.specialEnclosures = player.specialEnclosures || {};
      const sp = player.specialEnclosures[play.useSpecial.kind] || { tokens: 0, cap: 5 };
      const need = card.specialTokens || play.useSpecial.tokens || 1;
      if (sp.tokens + need > sp.cap) throw new Error('특수 우리 공간이 부족합니다.');
      sp.tokens += need;
      player.specialEnclosures[play.useSpecial.kind] = sp;
    } else {
      const cellKey = Board.key(play.enclosureCells[0].q, play.enclosureCells[0].r);
      const building = player.zooBuildings.get(cellKey);
      if (!building || building.kind !== 'enclosure' || building.occupied)
        throw new Error(`${card.name}: 빈 우리가 아닙니다.`);
      if (building.size < (card.enclosureSize || 1))
        throw new Error(`${card.name}: 우리 크기가 부족합니다 (필요:${card.enclosureSize}, 실제:${building.size}).`);

      // 물/바위 인접 조건 체크
      const { water, rock } = Board.adjacentWaterRockCounts(game.map, building.cells || [play.enclosureCells[0]]);
      if ((card.waterReq || 0) > water)
        throw new Error(`${card.name}: 물 칸이 인접해야 합니다 (필요:${card.waterReq}, 실제:${water}).`);
      if ((card.rockReq || 0) > rock)
        throw new Error(`${card.name}: 바위 칸이 인접해야 합니다 (필요:${card.rockReq}, 실제:${rock}).`);

      building.occupied = true;
      building.animalId = card.id;
    }

    player.appeal = Math.min(113, player.appeal + (card.appeal || 0));
    if (card.conservationGain) gainConservation(game, player, card.conservationGain);
    if (card.reputationGain)   gainReputation(game, player, card.reputationGain);

    player.playedAnimals.push(card);
    removeFromHandOrDisplay(game, player, card, play.fromHand);
    rebuildIconCounts(player);

    // 동물 카드 자체 능력 처리
    if (card.abilityKey) {
      const result = resolveAbility(game, player, card, ctx);
      if (result) logs.push(result);
    }

    // 스폰서 트리거: 동물 배치 시 발동하는 스폰서 능력 처리
    const sponsorLogs = triggerSponsorOnAnimalPlaced(game, player, card);
    logs.push(...sponsorLogs);

    pushLog(game, `${player.name}: ${card.name} 포획 (매력도+${card.appeal || 0})`);
  }

  advanceActionCard(player, 'animals');
  return logs;
}

function removeFromHandOrDisplay(game, player, card, fromHand) {
  if (fromHand) {
    const i = player.hand.findIndex(c => c.id === card.id || c === card);
    if (i >= 0) player.hand.splice(i, 1);
  } else {
    const i = game.display.findIndex(c => c.id === card.id || c === card);
    if (i >= 0) game.display.splice(i, 1);
  }
}

// ═══════════════════════════════════════════════ ASSOCIATION ═════
// ─── 아크노바 협회 규칙 ───
// 각 업무는 "최소 요구 강도"가 있고, 강도를 소비하지 않음.
// I면: 업무 1개만 수행 가능.
// II면: 여러 업무 가능, 단 모든 업무 요구 강도 합이 행동 강도를 초과할 수 없음.
//   (각 업무 가치: 명성+2=2, 파트너동물원=3, 대학=4, 보존프로젝트=5)
export function resolveAssociation(game, player, { side, tasks, donate = false, xTokens = 0 }) {
  const { strength } = slotStrength(player, 'association');
  const def = actionCardDef('association', side);
  const budget = Math.min(6, strength + xTokens);

  if (!def.multi && tasks.length > 1)
    throw new Error('협회 카드 I면으로는 업무를 1개만 수행할 수 있습니다.');

  // II면: 업무 가치 합이 강도 이하여야 함
  if (def.multi && tasks.length > 1) {
    const totalValue = tasks.reduce((s, t) => s + (t.value || t.cost || 0), 0);
    if (totalValue > budget)
      throw new Error(`업무 가치 합(${totalValue})이 행동 강도(${budget})를 초과합니다.`);
  }

  const logs = [];
  for (const t of tasks) {
    // 최소 강도 체크 (각 업무별 요구 강도)
    const minStr = t.minStrength || t.value || t.cost || 0;
    if (budget < minStr)
      throw new Error(`이 업무는 강도 ${minStr} 이상이 필요합니다 (현재 ${budget}).`);

    const needed = t.workersNeeded || 1;
    if (player.associationWorkers.active < needed)
      throw new Error(`활동 가능한 협회 일꾼이 부족합니다 (필요:${needed}, 보유:${player.associationWorkers.active}).`);
    player.associationWorkers.active -= needed;

    switch (t.type) {
      case 'reputation':
        gainReputation(game, player, 2);
        logs.push('명성 +2');
        break;

      case 'partnerZoo': {
        if (player.partnerZoos.includes(t.region))
          throw new Error(`이미 ${t.region} 파트너 동물원이 있습니다.`);
        if (player.partnerZoos.length >= 4)
          throw new Error('파트너 동물원은 최대 4개까지입니다.');
        if (player.partnerZoos.length >= 2 &&
            player.actionSlots.find(s => s.actionType === 'association')?.side !== 'II')
          throw new Error('3번째 파트너 동물원은 협회 카드 II면이 필요합니다.');
        player.partnerZoos.push(t.region);
        rebuildIconCounts(player);
        logs.push(`파트너 동물원: ${t.region}`);
        break;
      }

      case 'university': {
        if (player.universities.some(u => (typeof u === 'string' ? u : u.id) === t.uniId))
          throw new Error('이미 해당 대학이 있습니다.');
        player.universities.push(t.uniId);
        player.handLimit = HAND_LIMIT_WITH_UNIVERSITY;
        gainReputation(game, player, 1);
        logs.push(`대학 획득: ${t.uniId}`);
        break;
      }

      case 'conservationProject':
        applyConservationProjectSupport(game, player, t);
        logs.push('보존 프로젝트 지원');
        break;
    }
  }

  // 기부 (II면, 업무 1개 이상 수행한 경우)
  if (donate && def.donation && tasks.length > 0) {
    const cost = donationCost(game.associationBoard.donationsFilled);
    if (player.money < cost) throw new Error(`기부 비용(${cost}원)이 부족합니다.`);
    player.money -= cost;
    gainConservation(game, player, 1);
    game.associationBoard.donationsFilled++;
    logs.push(`기부 (${cost}원) → 보존점수 +1`);
  }

  advanceActionCard(player, 'association');
  pushLog(game, `${player.name}: 협회 — ${logs.join(', ')}`);
  return logs;
}

function applyConservationProjectSupport(game, player, t) {
  const project = t.project;
  const tierIdx = t.tierIndex ?? 0;
  const pts = project.tiers?.points?.[tierIdx] ?? 1;
  gainConservation(game, player, pts);
  player.conservationTokensAvailable = Math.max(0, player.conservationTokensAvailable - 1);
  project.claimedTiers = project.claimedTiers || [];
  project.claimedTiers.push({ playerId: player.id, tierIndex: tierIdx });
  if (project.playedBy === undefined) {
    project.playedBy = player.id;
    if (project.bonusForPlayer) applyBonus(game, player, project.bonusForPlayer);
  }
}

// ═══════════════════════════════════════════════════ SPONSORS ════
export function resolveSponsors(game, player, { side, plays, breakAdvance, xTokens = 0, ctx = { prompts: [] } }) {
  const { strength } = slotStrength(player, 'sponsors');
  const def = actionCardDef('sponsors', side);
  const eff = Math.min(5, strength + xTokens);
  const logs = [];

  if (breakAdvance) {
    const money = eff * (def.breakMoneyDouble ? 2 : 1);
    player.money += money;
    advanceBreakToken(game, eff);
    logs.push(`휴식 ${eff}칸 전진, ${money}원 획득`);
  } else {
    const budget = def.multi ? eff + 1 : eff;
    const totalLevels = plays.reduce((s, p) => s + (p.card.level || 1), 0);
    if (!def.multi && plays.length > 1)
      throw new Error('도움 카드 I면으로는 1장만 낼 수 있습니다.');
    if (totalLevels > budget)
      throw new Error(`레벨 합(${totalLevels})이 강도+1(${budget})을 초과합니다.`);

    for (const p of plays) {
      const cost = p.fromHand ? 0 : (p.folderIndex ?? 0);
      if (player.money < cost) throw new Error(`필드 카드 비용(${cost}원)이 부족합니다.`);
      player.money -= cost;
      player.playedSponsors.push(p.card);
      removeFromHandOrDisplay(game, player, p.card, p.fromHand);
      rebuildIconCounts(player);
      const r = resolveAbility(game, player, p.card, ctx);
      if (r) logs.push(r);
      pushLog(game, `${player.name}: ${p.card.name} 사용`);
    }
  }

  advanceActionCard(player, 'sponsors');
  pushLog(game, `${player.name}: 도움 액션 — ${logs.join('; ')}`);
  return logs;
}

// ═════════════════════════════════════════════════════ CARDS ════
export function resolveCards(game, player, { side, mode, discardIndices = [], snapCard, xTokens = 0 }) {
  const { strength } = slotStrength(player, 'cards');
  const def = actionCardDef('cards', side);
  const eff = Math.min(5, strength + xTokens);

  advanceBreakToken(game, def.breakAdvance || 2);

  let log;
  if (mode === 'snap') {
    const snapMin = side === 'II' ? 3 : 5;
    if (eff < snapMin) throw new Error(`낚아채기는 강도 ${snapMin} 이상이어야 합니다.`);
    const i = game.display.findIndex(c => c === snapCard || c.id === snapCard?.id);
    if (i < 0) throw new Error('필드에 없는 카드입니다.');
    player.hand.push(game.display[i]);
    game.display.splice(i, 1);
    log = `${player.name}: 낚아채기 — ${snapCard.name}`;
  } else {
    const drawCount = def.draw?.[eff] ?? 0;
    const discardCount = def.discard?.[eff] ?? 0;
    for (let i = 0; i < drawCount && game.deck.length; i++) player.hand.push(game.deck.shift());
    const sorted = [...discardIndices].sort((a, b) => b - a);
    for (const idx of sorted) {
      if (idx < player.hand.length) { game.discard.push(player.hand[idx]); player.hand.splice(idx, 1); }
    }
    log = `${player.name}: ${drawCount}장 뽑음, ${sorted.length}장 버림`;
  }

  replenishDisplay(game);
  advanceActionCard(player, 'cards');
  pushLog(game, log);
  return log;
}

function replenishDisplay(game) {
  while (game.display.length < 6 && game.deck.length) game.display.push(game.deck.shift());
}

// ═══════════════════════════════════════════════════ X-TOKEN ════
export function resolveXToken(game, player, actionType) {
  if (player.xTokens >= MAX_X_TOKENS) throw new Error('X-토큰이 이미 최대치(5)입니다.');
  player.xTokens++;
  advanceActionCard(player, actionType);
  pushLog(game, `${player.name}: X-토큰 획득 (+1, 현재 ${player.xTokens})`);
}

// ════════════════════════════════════════════════════ TURN END ════
export function endTurn(game) {
  // BoardMate 1인플: 7+6+5+4+3+2 = 총 27턴.
  // 각 라운드 마지막 턴 뒤 Break를 처리하고, 마지막 2턴 뒤에는 바로 점수 계산으로 갑니다.
  if (game.solo?.enabled) {
    if (game.phase !== 'playing') return;
    game.solo.turnsRemaining = Math.max(0, Number(game.solo.turnsRemaining || 0) - 1);
    if (game.solo.turnsRemaining === 0) {
      if (Number(game.solo.tokensRemaining || 0) <= 2) {
        game.phase = 'scoring';
        pushLog(game, '🏁 솔로 27턴 종료 — 최종 점수를 계산합니다.');
        return;
      }
      game.associationBoard.donationsFilled = Math.min(8, Number(game.associationBoard.donationsFilled || 0) + 1);
      runBreak(game);
      game.solo.tokensRemaining = Math.max(2, Number(game.solo.tokensRemaining || 7) - 1);
      game.solo.round = Number(game.solo.round || 1) + 1;
      game.solo.turnsRemaining = game.solo.tokensRemaining;
    }
    game.turnNumber += 1;
    return;
  }

  checkEndGameTrigger(game);
  if (game.phase === 'playing' || game.phase === 'lastRound') {
    if (game.phase === 'lastRound') {
      const triggerIdx = game.players.findIndex(p => p.id === game.endTriggeredBy);
      const beforeTrigger = (triggerIdx - 1 + game.players.length) % game.players.length;
      if (game.currentPlayerIndex === beforeTrigger) {
        game.phase = 'scoring';
        return;
      }
    }
    nextPlayer(game);
  }
}

// ══════════════════════════════════════════════════════ BREAK ════
function advanceBreakToken(game, steps) {
  if (game.solo?.enabled) return;
  game.breakTrack.position = Math.min(game.breakTrack.length, game.breakTrack.position + steps);
}

export function checkAndRunBreak(game) {
  if (game.breakTrack.position >= game.breakTrack.length) runBreak(game);
}

export function runBreak(game) {
  pushLog(game, '=== 휴식(Break) 시작 ===');

  // 1. 손패 한도 초과 버리기
  for (const player of game.players) {
    while (player.hand.length > player.handLimit) game.discard.push(player.hand.pop());
  }

  // 2. 액션카드 위 토큰 제거
  for (const player of game.players) player.tokensOnActionCards = {};

  // 3. 협회 일꾼 귀환
  for (const player of game.players) player.associationWorkers = { active: 4, resting: 0 };

  // 4. 디스플레이 하위 2장 버리고 보충
  game.discard.push(...game.display.splice(0, 2));
  replenishDisplay(game);

  // 5. 수입
  for (const player of game.players) {
    const income = appealIncome(player.appeal);
    const kioskIncome = computeKioskIncome(game, player);
    const sponsorIncome = computeSponsorBreakIncome(player);
    const sponsorXTokens = computeSponsorBreakXTokens(player);
    player.money += income + kioskIncome + sponsorIncome;
    if (sponsorXTokens > 0) {
      player.xTokens = Math.min(MAX_X_TOKENS, player.xTokens + sponsorXTokens);
    }
    pushLog(game, `${player.name}: 수입 ${income}원(매력도) + ${kioskIncome}원(매점) + ${sponsorIncome}원(스폰서)${sponsorXTokens ? ` + X토큰 +${sponsorXTokens}` : ''}`);
  }

  // F15 동적 타일 추가
  if (game.map.dynamicTiles) {
    for (const player of game.players) Board.addDynamicTiles(game.map, player.zooBuildings);
  }

  // 6. 일반 게임은 휴식 트랙 초기화 + 발동자 X-토큰.
  // BoardMate 솔로는 Break 트랙/X-토큰 보너스를 쓰지 않습니다.
  game.breakTrack.position = 0;
  const p = currentPlayer(game);
  if (game.solo?.enabled) {
    pushLog(game, `=== 솔로 휴식 종료 — 다음 라운드 준비 ===`);
  } else {
    p.xTokens = Math.min(MAX_X_TOKENS, p.xTokens + 1);
    pushLog(game, `=== 휴식 종료 — ${p.name}: X-토큰 +1 ===`);
  }
}

function computeKioskIncome(game, player) {
  let total = 0;
  for (const [k, b] of player.zooBuildings) {
    if (b.kind !== 'kiosk') continue;
    const [q, r] = k.split(',').map(Number);
    for (const n of Board.neighbors(q, r)) {
      const nb = player.zooBuildings.get(Board.key(n.q, n.r));
      if (!nb) continue;
      if (nb.kind === 'pavilion'
        || (nb.kind === 'enclosure' && nb.occupied)
        || nb.kind === 'reptileHouse'
        || nb.kind === 'pettingZoo'
        || nb.kind === 'largeBirdAviary'
        || nb.kind === 'unique') total++;
    }
  }
  return total;
}

// ══════════════════════════════════════ 명성/보존 ════════════════
export function gainReputation(game, player, amount) {
  const old = player.reputation;
  player.reputation = Math.min(15, player.reputation + amount);
  const overflow = (old + amount) - 15;
  if (overflow > 0) player.appeal = Math.min(113, player.appeal + overflow);
}

export function gainConservation(game, player, amount) {
  const old = player.conservation;
  player.conservation = Math.min(41, player.conservation + amount);
  for (const mb of CONSERVATION_BONUSES) {
    if (old < mb.points && player.conservation >= mb.points) {
      if (mb.effect === 'upgrade_or_worker') {
        player._pendingConservationBonus = mb;
        pushLog(game, `${player.name}: 보존 ${mb.points}점 → 업그레이드 또는 일꾼 고용 선택!`);
      } else if (mb.effect === 'money_or_bonus_token') {
        player.money += mb.amount;
        pushLog(game, `${player.name}: 보존 ${mb.points}점 → ${mb.amount}원 획득`);
      } else if (mb.effect === 'discard_final_scoring' && !game.conservationMilestone10Reached) {
        game.conservationMilestone10Reached = true;
        game._allDiscardFinalScoring = true;
        pushLog(game, '보존 10점 달성! 모든 플레이어 최종 점수 카드 1장 버림');
      }
    }
  }
}

// ══════════════════════════════════════ END GAME ════════════════
export function checkEndGameTrigger(game) {
  if (game.solo?.enabled) return false;
  for (const player of game.players) {
    const target = conservationTarget(player.conservation);
    if (player.appeal >= target - SCORING_AREA_WINDOW) {
      if (game.phase === 'playing') {
        game.phase = 'lastRound';
        game.endTriggeredBy = player.id;
        pushLog(game, `🏁 종료 조건 달성! (${player.name}) — 나머지 플레이어 마지막 턴`);
      }
      return true;
    }
  }
  return false;
}

export function computeFinalScores(game) {
  return game.players.map(player => {
    const target = conservationTarget(player.conservation);
    const cardBonus = player.finalScoringCards.reduce(
      (s, fc) => s + evaluateFinalScoringCard(game, player, fc), 0);
    const endIconBonus = player.playedSponsors.concat(player.playedAnimals)
      .reduce((s, c) => c.abilityKey === 'end_game_appeal' ? s + (c.abilityAmount || 0) : s, 0);
    const finalAppeal = Math.min(113, player.appeal + endIconBonus);
    const vp = (finalAppeal - target) + cardBonus;
    return {
      playerId: player.id, name: player.name,
      appeal: finalAppeal, conservation: player.conservation,
      target, cardBonus, victoryPoints: vp,
    };
  }).sort((a, b) => b.victoryPoints - a.victoryPoints);
}

function evaluateFinalScoringCard(game, player, fc) {
  if (!fc) return 0;
  let val = 0;

  // ── 자동 집계 카드 ──────────────────────────────────────────
  if (fc.id === 'fs_masterball') {
    val = player.playedAnimals.filter(a => (a.enclosureSize || 0) >= 4).length;
  } else if (fc.id === 'fs_monsterball') {
    val = player.playedAnimals.filter(a => (a.enclosureSize || 1) <= 2).length;
  } else if (fc.id === 'fs_contacts') {
    val = player.playedSponsors.length;

  // ── 낚싯대: 물 칸에 인접한 건물 수 ─────────────────────────
  } else if (fc.id === 'fs_fishingrod') {
    const counted = new Set();
    for (const [k, b] of player.zooBuildings) {
      if (b.kind === 'enclosure' || b.kind === 'reptileHouse' ||
          b.kind === 'largeBirdAviary' || b.kind === 'pettingZoo') {
        const cells = b.cells || [{ q: parseInt(k.split(',')[0]), r: parseInt(k.split(',')[1]) }];
        const { water } = Board.adjacentWaterRockCounts(game.map, cells);
        if (water > 0 && !counted.has(k)) { val++; counted.add(k); }
      }
    }

  // ── 자전거: 바위 칸에 인접한 건물 수 ───────────────────────
  } else if (fc.id === 'fs_bicycle') {
    const counted = new Set();
    for (const [k, b] of player.zooBuildings) {
      if (b.kind === 'enclosure' || b.kind === 'reptileHouse' ||
          b.kind === 'largeBirdAviary' || b.kind === 'pettingZoo') {
        const cells = b.cells || [{ q: parseInt(k.split(',')[0]), r: parseInt(k.split(',')[1]) }];
        const { rock } = Board.adjacentWaterRockCounts(game.map, cells);
        if (rock > 0 && !counted.has(k)) { val++; counted.add(k); }
      }
    }

  // ── 지도: 빈 칸 수 (건물 없는 EMPTY 타일) ──────────────────
  } else if (fc.id === 'fs_map') {
    val = game.map.tiles.filter(t =>
      t.type === 'empty' && !player.zooBuildings.has(Board.key(t.q, t.r))
    ).length;

  // ── 이상한 알: 알 아이콘 수 ────────────────────────────────
  } else if (fc.id === 'fs_mysteryegg') {
    val = (player.iconCounts || {})['egg'] || 0;

  // ── 포켓머신: 전설 카드 위 토큰 수 ────────────────────────
  } else if (fc.id === 'fs_pokemachine') {
    val = game.conservationProjectsInPlay.reduce((s, p) => {
      return s + (p.claimedTiers?.filter(t => t.playerId === player.id).length || 0);
    }, 0);
    val += game.baseConservationProjects.reduce((s, p) => {
      return s + (p.claimedTiers?.filter(t => t.playerId === player.id).length || 0);
    }, 0);

  // ── 포케 도감: 오른쪽 플레이어보다 많은 포켓몬 타입 수 ────
  } else if (fc.id === 'fs_pokedex') {
    const idx = game.players.findIndex(p => p.id === player.id);
    const rightPlayer = game.players[(idx + 1) % game.players.length];
    const myTypes = new Set(player.playedAnimals.map(a => a.type || (a.types && a.types[0])).filter(Boolean));
    const theirTypes = new Set(rightPlayer.playedAnimals.map(a => a.type || (a.types && a.types[0])).filter(Boolean));
    let diff = 0;
    for (const t of myTypes) { if (!theirTypes.has(t)) diff++; }
    val = Math.min(4, diff);
    return val; // 포케 도감은 thresholds 없이 직접 점수

  // ── 학습 장치: 체크리스트 (4개 조건 각 1점) ───────────────
  } else if (fc.id === 'fs_learningdevice') {
    val = computeLearningDeviceScore(game, player);
    return Math.min(4, val);

  // ── 다우징 머신: 지식 트랙 (미구현, 0점) ───────────────────
  } else if (fc.id === 'fs_dowsing') {
    val = 0; // 지식 트랙 미구현 → 항상 0
  }

  // 공통 thresholds/rewards 계산
  let best = 0;
  (fc.thresholds || []).forEach((t, i) => { if (val >= t) best = fc.rewards?.[i] ?? 0; });
  return Math.min(4, best);
}

// 학습 장치 체크리스트 계산
function computeLearningDeviceScore(game, player) {
  let score = 0;

  // 1. 물 칸 모두 연결
  const waterTiles = game.map.tiles.filter(t => t.type === 'water');
  if (waterTiles.length > 0 && areTilesConnected(game.map, waterTiles)) score++;

  // 2. 바위 칸 모두 연결
  const rockTiles = game.map.tiles.filter(t => t.type === 'rock');
  if (rockTiles.length > 0 && areTilesConnected(game.map, rockTiles)) score++;

  // 3. 가장자리 칸 모두 덮음 (edge tiles all covered by buildings)
  const edgeTiles = game.map.tiles.filter(t =>
    t.type === 'empty' && Board.isBorderSpace(game.map, t.q, t.r));
  if (edgeTiles.length > 0 && edgeTiles.every(t => player.zooBuildings.has(Board.key(t.q, t.r)))) score++;

  // 4. 빈 칸 모두 덮음
  const buildableTiles = game.map.tiles.filter(t => t.type === 'empty');
  if (buildableTiles.length > 0 && buildableTiles.every(t => player.zooBuildings.has(Board.key(t.q, t.r)))) score++;

  return score;
}

// 타일 연결 여부 (BFS)
function areTilesConnected(map, tiles) {
  if (tiles.length <= 1) return true;
  const tileSet = new Set(tiles.map(t => Board.key(t.q, t.r)));
  const visited = new Set();
  const queue = [tiles[0]];
  visited.add(Board.key(tiles[0].q, tiles[0].r));
  while (queue.length) {
    const { q, r } = queue.shift();
    for (const n of Board.neighbors(q, r)) {
      const k = Board.key(n.q, n.r);
      if (!visited.has(k) && tileSet.has(k)) {
        visited.add(k);
        queue.push(n);
      }
    }
  }
  return visited.size === tiles.length;
}
