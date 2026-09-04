// ============================================================================
// abilities.js — 동물 카드 능력 전체 자동화
// abilityKey별 처리 함수 (동물 127장 30개 키 전부 커버)
// ============================================================================
import { MAX_X_TOKENS } from './config.js';

// engine.js 함수들을 동적으로 사용 (순환참조 방지용 지연 import)
async function eng() { return await import('./engine.js'); }

// ─── 핵심 헬퍼 ──────────────────────────────────────────────────
function gainMoney(player, n)       { player.money += n; }
function gainAppeal(player, n)      { player.appeal = Math.min(113, player.appeal + n); }
function gainXToken(player, n)      { player.xTokens = Math.min(MAX_X_TOKENS, player.xTokens + n); }

function drawFromDeck(game, player, n) {
  let drawn = 0;
  for (let i = 0; i < n && game.deck.length; i++) { player.hand.push(game.deck.shift()); drawn++; }
  return drawn;
}

function countIcons(player, type) {
  // 배치된 모든 카드 위의 해당 타입 아이콘 수
  const counts = player.iconCounts || {};
  return counts[type] || 0;
}

// ─── 각 abilityKey 핸들러 ───────────────────────────────────────
const HANDLERS = {

  // ── 뽑기 계열 ──────────────────────────────────────────────────

  // 명랑: 덱에서 1장 뽑기
  draw_from_deck: (game, player, card) => {
    const n = card.abilityLevel || 1;
    const drawn = drawFromDeck(game, player, n);
    return `${card.name} [명랑]: 덱에서 ${drawn}장 뽑음`;
  },

  // 속공: 버린 더미 섞어서 N장 뽑기
  shuffle_discard_draw: (game, player, card) => {
    const n = card.abilityLevel || 2;
    // 버린 더미를 덱 뒤에 섞어 넣기
    while (game.discard.length) game.deck.push(game.discard.pop());
    game.deck.sort(() => Math.random() - 0.5);
    const drawn = drawFromDeck(game, player, n);
    return `${card.name} [속공]: 버린 더미 섞어 ${drawn}장 뽑음`;
  },

  // 화력: 덱에서 N장 뽑아 절반 보관, 나머지 버림
  draw_keep_discard: (game, player, card) => {
    const total = card.abilityLevel || 4;
    const keep = Math.floor(total / 2);
    const drawn = [];
    for (let i = 0; i < total && game.deck.length; i++) drawn.push(game.deck.shift());
    player.hand.push(...drawn.slice(0, keep));
    game.discard.push(...drawn.slice(keep));
    return `${card.name} [화력]: ${drawn.length}장 중 ${Math.min(keep, drawn.length)}장 보관`;
  },

  // 장난꾸러기: 덱 위 N장 보고 포켓몬 1장 획득, 나머지 버림
  naughty_peek_take: (game, player, card) => {
    const n = card.abilityLevel || 4;
    const peeked = [];
    for (let i = 0; i < n && game.deck.length; i++) peeked.push(game.deck.shift());
    const pokemon = peeked.find(c => c.kind === 'animal');
    if (pokemon) {
      player.hand.push(pokemon);
      game.discard.push(...peeked.filter(c => c !== pokemon));
      return `${card.name} [장난꾸러기]: ${pokemon.name} 획득, ${peeked.length - 1}장 버림`;
    } else {
      game.discard.push(...peeked);
      return `${card.name} [장난꾸러기]: 포켓몬 없음, ${peeked.length}장 버림`;
    }
  },

  // 개구쟁이: 필드에서 카드 1장 가져오기
  mischief_take_from_display: (game, player, card) => {
    // ctx.prompts에 추가 → UI에서 처리
    return `${card.name} [개구쟁이]: 필드에서 카드 1장 선택 (UI에서 처리)`;
    // 실제 UI에서 모달로 처리됨
  },

  // 건방: 필드의 도움 카드 전부 손으로
  arrogant_take_all_sponsors: (game, player, card) => {
    const sponsors = game.display.filter(c => c.kind === 'sponsor');
    player.hand.push(...sponsors);
    game.display = game.display.filter(c => c.kind !== 'sponsor');
    // 보충
    while (game.display.length < 6 && game.deck.length) game.display.push(game.deck.shift());
    return `${card.name} [건방]: 필드 도움 카드 ${sponsors.length}장 획득`;
  },

  // ── 돈 계열 ────────────────────────────────────────────────────

  // 덜렁: 손에서 N장까지 버리고 각 4원
  discard_for_money: (game, player, card) => {
    // ctx.prompts에 추가 → UI에서 처리 (선택적)
    // 자동: 손패 1장 버리고 4원 (최소 동작)
    const maxDiscard = card.abilityLevel || 3;
    return `${card.name} [덜렁]: 손패 최대 ${maxDiscard}장 버리고 각 4원 (UI에서 선택)`;
  },

  // 손패 팔기 (덜렁 변형)
  sell_cards: (game, player, card) => {
    const max = card.abilityLevel || 2;
    return `${card.name} [덜렁]: 손패 최대 ${max}장 각 4원에 팔기 (UI에서 선택)`;
  },

  // 성급: 휴식 토큰 2칸 전진 + 2원
  impatient_break_money: (game, player, card) => {
    const steps = card.abilityLevel || 2;
    game.breakTrack.position = Math.min(game.breakTrack.length, game.breakTrack.position + steps);
    const money = steps;
    gainMoney(player, money);
    return `${card.name} [성급]: 휴식 ${steps}칸 전진, ${money}원 획득`;
  },

  // 무사태평: 매력도 1위에게서 5원 또는 손패 1장
  carefree_take_from_leader: (game, player, card) => {
    const leader = game.players
      .filter(p => p.id !== player.id)
      .sort((a, b) => b.appeal - a.appeal)[0];
    if (!leader) return `${card.name} [무사태평]: 대상 없음`;
    if (leader.money >= 5) {
      leader.money -= 5; gainMoney(player, 5);
      return `${card.name} [무사태평]: ${leader.name}에게서 5원 획득`;
    } else if (leader.hand.length > 0) {
      const taken = leader.hand.pop();
      player.hand.push(taken);
      return `${card.name} [무사태평]: ${leader.name}에게서 카드 1장 획득`;
    }
    return `${card.name} [무사태평]: ${leader.name}이 돈/카드 없음`;
  },

  // ── 매력도 계열 ────────────────────────────────────────────────

  // 화석: 화석 아이콘 개수 × 3 매력도
  fossil_appeal_per_icon: (game, player, card) => {
    const count = countIcons(player, 'fossil');
    const appeal = count * 3;
    gainAppeal(player, appeal);
    return `${card.name} [화석]: 화석 아이콘 ${count}개 × 3 = 매력도 +${appeal}`;
  },

  // 고집: 격투 아이콘 개수 × 1 매력도 (타입별 분기)
  stubborn_appeal_per_type_icon: (game, player, card) => {
    // abilityText에서 타입 추출 (격투/물/불/풀/에스퍼)
    const text = card.abilityText || '';
    const typeMap = { '격투':'fighting','물':'water','불':'fire','풀':'grass','에스퍼':'psychic','화석':'fossil' };
    const matchedType = Object.entries(typeMap).find(([ko]) => text.includes(ko))?.[1] || 'fighting';
    const count = countIcons(player, matchedType);
    gainAppeal(player, count);
    return `${card.name} [고집]: ${matchedType} 아이콘 ${count}개 = 매력도 +${count}`;
  },

  // 겁쟁이: 손패 N장을 카드 아래에 넣고 각 2 매력도
  coward_appeal_per_card: (game, player, card) => {
    const n = card.abilityLevel || 2;
    const toTuck = Math.min(n, player.hand.length);
    if (toTuck > 0) {
      card._tuckedCards = (card._tuckedCards || 0) + toTuck;
      player.hand.splice(0, toTuck);
      gainAppeal(player, toTuck * 2);
    }
    return `${card.name} [겁쟁이]: 카드 ${toTuck}장 집어넣기, 매력도 +${toTuck * 2}`;
  },

  // 수줍음: 모든 플레이어의 특정 지역 아이콘 합산 → 매력도 (최대 8)
  shy_region: (game, player, card) => {
    const text = card.abilityText || '';
    const regionMap = { '관동':'관동','성도':'성도','호연':'호연','신오':'신오','하나':'하나' };
    const region = Object.keys(regionMap).find(r => text.includes(r)) || '호연';
    const total = game.players.reduce((s, p) => s + countIcons(p, region), 0);
    const gain = Math.min(8, total);
    gainAppeal(player, gain);
    return `${card.name} [수줍음]: 전체 ${region} 아이콘 ${total}개 → 매력도 +${gain}`;
  },

  // ── X-토큰 계열 ────────────────────────────────────────────────

  gain_xtoken: (game, player, card) => {
    const n = card.abilityLevel || 1;
    gainXToken(player, n);
    return `${card.name} [대담]: X-토큰 +${n}`;
  },

  // 대담(불): 불 아이콘 1/3/5개마다 X-토큰 1/2/3개
  bold_xtokens_per_icon: (game, player, card) => {
    const count = countIcons(player, 'fire');
    let tokens = 0;
    if (count >= 5) tokens = 3;
    else if (count >= 3) tokens = 2;
    else if (count >= 1) tokens = 1;
    gainXToken(player, tokens);
    return `${card.name} [대담]: 불 아이콘 ${count}개 → X-토큰 +${tokens}`;
  },

  // ── 행동 카드 배치 계열 ─────────────────────────────────────────

  // 변덕: 도움 카드를 레벨 1 또는 5에 배치
  mood_place_action_card: (game, player, card) => {
    // after_finishing 효과 — UI에서 처리
    player._pendingAfterFinishing = player._pendingAfterFinishing || [];
    player._pendingAfterFinishing.push({ type: 'mood', card });
    return `${card.name} [변덕]: 행동 후 도움 카드를 슬롯 1 또는 5에 배치 가능`;
  },

  // 노력: 행동 후 아무 행동 카드를 슬롯 1에 배치
  effort_place_action_card: (game, player, card) => {
    player._pendingAfterFinishing = player._pendingAfterFinishing || [];
    player._pendingAfterFinishing.push({ type: 'effort', card });
    return `${card.name} [노력]: 행동 후 아무 행동 카드를 슬롯 1에 배치 가능`;
  },

  // ── 추가 행동 계열 ─────────────────────────────────────────────

  // 쌍두: 행동 후 아무 행동 1개 추가 수행
  extra_action: (game, player, card) => {
    player._pendingExtraAction = true;
    return `${card.name} [쌍두]: 행동 후 추가 행동 1개 사용 가능`;
  },

  // 성실: 특정 행동 1개 추가 수행
  diligent_build:        (game, player, card) => { player._pendingExtraAction = 'build';        return `${card.name} [성실]: 행동 후 건설 1회 추가`; },
  diligent_cards:        (game, player, card) => { player._pendingExtraAction = 'cards';        return `${card.name} [성실]: 행동 후 모험 1회 추가`; },
  diligent_association:  (game, player, card) => { player._pendingExtraAction = 'association';  return `${card.name} [성실]: 행동 후 협회 1회 추가`; },
  diligent_sponsors:     (game, player, card) => { player._pendingExtraAction = 'sponsors';     return `${card.name} [성실]: 행동 후 도움 1회 추가`; },

  // ── X2 토큰 계열 ───────────────────────────────────────────────

  // 온순: 특정 행동 카드에 x2 토큰 올리기
  docile_multiplier_build:    (game, player, card) => { setX2Token(player, 'build');    return `${card.name} [온순]: 건설 카드에 x2 토큰`; },
  docile_multiplier_sponsors: (game, player, card) => { setX2Token(player, 'sponsors'); return `${card.name} [온순]: 도움 카드에 x2 토큰`; },
  docile_multiplier_cards:    (game, player, card) => { setX2Token(player, 'cards');    return `${card.name} [온순]: 모험 카드에 x2 토큰`; },

  // ── 건설 계열 ──────────────────────────────────────────────────

  // 내구: 매점 또는 파빌리온 1개 무료 건설
  free_kiosk_pavilion: (game, player, card) => {
    player._pendingFreeBuilding = { kinds: ['kiosk', 'pavilion'] };
    return `${card.name} [내구]: 매점 또는 파빌리온 1개 무료 건설 가능 (UI에서 처리)`;
  },

  // ── 협회 계열 ──────────────────────────────────────────────────

  // 용감: 협회 일꾼 1명 추가 고용
  hire_worker: (game, player, card) => {
    player.associationWorkers.active++;
    return `${card.name} [용감]: 협회 일꾼 +1 (현재 ${player.associationWorkers.active}명)`;
  },

  // ── 독 계열 ────────────────────────────────────────────────────

  // 냉정: 매력도 높은 플레이어들에게 독 토큰
  venom: (game, player, card) => {
    const level = card.abilityLevel || 1;
    const targets = game.players.filter(p => p.id !== player.id && p.appeal > player.appeal);
    targets.forEach(p => {
      p._venomTokens = (p._venomTokens || 0) + level;
    });
    return `${card.name} [냉정]: ${targets.length}명에게 독 토큰 ${level}개`;
  },

  // ── 수입형 (휴식마다) ──────────────────────────────────────────
  income_per_break: (game, player, card) => {
    // runBreak에서 자동 처리됨
    return `${card.name}: 매 휴식마다 ${card.abilityAmount || 0}원 수입 등록`;
  },

  // ── 최종 점수형 ────────────────────────────────────────────────
  end_game_appeal: (game, player, card) => {
    return `${card.name}: 최종 점수 시 매력도 +${card.abilityAmount || 0}`;
  },

  // ── 수동 처리 ──────────────────────────────────────────────────
  manual: (game, player, card) => {
    return `${card.name}: ⚠ 수동 처리 필요 — ${card.abilityText || ''}`;
  },
};

function setX2Token(player, actionType) {
  player.tokensOnActionCards = player.tokensOnActionCards || {};
  player.tokensOnActionCards[actionType] = { multiplier: true };
}

// ─── 공개 API ───────────────────────────────────────────────────
export function resolveAbility(game, player, card, ctx = {}) {
  if (!card.abilityKey) return '';
  const handler = HANDLERS[card.abilityKey];
  if (handler) {
    try { return handler(game, player, card, ctx) || ''; }
    catch (e) { return `${card.name}: 능력 처리 오류 — ${e.message}`; }
  }
  return `${card.name}: 알 수 없는 능력(${card.abilityKey}) — 수동 처리`;
}

export function hasAfterFinishingEffect(card) {
  return ['mood_place_action_card', 'effort_place_action_card',
          'extra_action', 'diligent_build', 'diligent_cards',
          'diligent_association', 'diligent_sponsors'].includes(card.abilityKey);
}

// ─────────────────────────────────────────────────────────────
// ★ 스폰서 능력 — 수입형 / 트리거형 / 즉시형
// ─────────────────────────────────────────────────────────────

// ── income_icon_money: 휴식마다 아이콘 수에 따라 수입
//   아이콘 1개 → 3원, 3개 → 6원, 6개 → 9원 (콘/팟/풍&란/덴트/자두)
HANDLERS['income_icon_money'] = (game, player, card) => {
  // 이 핸들러는 resolveAbility가 아닌 runBreak에서 호출됨.
  // resolveAbility 호출 시에는 등록 메시지만 반환.
  return `${card.name}: 매 휴식마다 ${card.abilityIconType} 아이콘 수에 따라 수입 (등록됨)`;
};

// ── income_xtoken: 휴식마다 X-토큰 획득 (실버)
HANDLERS['income_xtoken'] = (game, player, card) => {
  return `${card.name}: 매 휴식마다 X-토큰 +${card.abilityAmount || 1} (등록됨)`;
};

// ── on_animal_type_money: 특정 타입 아이콘 카드 배치 때마다 수입
//   (강연: 불→2원, 블레리: 초→2원, 규리: 화석→2원)
//   engine.js resolveAnimals에서 동물 배치 후 호출됨
HANDLERS['on_animal_type_money'] = (game, player, card, ctx = {}) => {
  const animalCard = ctx.placedCard;
  if (!animalCard) return `${card.name}: 동물 배치 없음`;
  const cardType = animalCard.type || (animalCard.types && animalCard.types[0]);
  if (cardType !== card.abilityIconType) return '';
  const amount = card.abilityAmount || 2;
  gainMoney(player, amount);
  return `${card.name}: ${cardType} 타입 배치 → ${amount}원 획득`;
};

// ── on_animal_type_xtoken: 특정 타입 아이콘 카드 배치 때마다 X-토큰
//   (민지: 불→X토큰 1개)
HANDLERS['on_animal_type_xtoken'] = (game, player, card, ctx = {}) => {
  const animalCard = ctx.placedCard;
  if (!animalCard) return `${card.name}: 동물 배치 없음`;
  const cardType = animalCard.type || (animalCard.types && animalCard.types[0]);
  if (cardType !== card.abilityIconType) return '';
  gainXToken(player, 1);
  return `${card.name}: ${cardType} 타입 배치 → X-토큰 +1`;
};

// ── on_animal_type_draw_keep1: 특정 타입 배치 때마다 N장 뽑아 1장 보관
//   (민화: 풀→2장 뽑아 1장 보관)
HANDLERS['on_animal_type_draw_keep1'] = (game, player, card, ctx = {}) => {
  const animalCard = ctx.placedCard;
  if (!animalCard) return `${card.name}: 동물 배치 없음`;
  const cardType = animalCard.type || (animalCard.types && animalCard.types[0]);
  if (cardType !== card.abilityIconType) return '';
  const n = card.abilityAmount || 2;
  const drawn = [];
  for (let i = 0; i < n && game.deck.length; i++) drawn.push(game.deck.shift());
  if (!drawn.length) return `${card.name}: 덱이 비어 있음`;
  // 1장 보관 나머지 버림 (자동: 맨 앞 1장 보관)
  player.hand.push(drawn[0]);
  if (drawn.length > 1) game.discard.push(...drawn.slice(1));
  return `${card.name}: ${cardType} 타입 배치 → ${drawn.length}장 중 1장 획득`;
};

// ── on_animal_region_free_pavilion: 특정 지역 동물 배치 때마다 무료 파빌리온 건설 가능
//   (털보박사: 호연→무료 파빌리온)
HANDLERS['on_animal_region_free_pavilion'] = (game, player, card, ctx = {}) => {
  const animalCard = ctx.placedCard;
  if (!animalCard) return `${card.name}: 동물 배치 없음`;
  const regions = animalCard.regions || [];
  if (!regions.includes(card.abilityRegion)) return '';
  // 무료 파빌리온 건설 권한 부여 (플래그)
  player._pendingFreeBuilding = player._pendingFreeBuilding || {};
  player._pendingFreeBuilding.kinds = ['pavilion'];
  player._pendingFreeBuilding.free = true;
  return `${card.name}: ${card.abilityRegion} 지역 배치 → 파빌리온 1개 무료 건설 가능`;
};

// ── computeBreakSponsorIncome: runBreak에서 호출할 스폰서 수입 계산 공개 함수
// 아이콘 단계별 수입표: 1개→3원, 3개→6원, 6개→9원
export function computeSponsorBreakIncome(player) {
  let total = 0;
  for (const c of player.playedSponsors) {
    if (c.abilityKey === 'income_per_break') {
      total += c.abilityAmount || 0;
    } else if (c.abilityKey === 'income_icon_money') {
      const iconType = c.abilityIconType;
      const count = (player.iconCounts || {})[iconType] || 0;
      // 아크노바 단계: 1/3/6개 → 3/6/9원
      let income = 0;
      if (count >= 6) income = 9;
      else if (count >= 3) income = 6;
      else if (count >= 1) income = 3;
      total += income;
    } else if (c.abilityKey === 'income_xtoken') {
      // X-토큰 수입은 별도 처리 (아래 함수에서)
    }
  }
  return total;
}

export function computeSponsorBreakXTokens(player) {
  let tokens = 0;
  for (const c of player.playedSponsors) {
    if (c.abilityKey === 'income_xtoken') tokens += c.abilityAmount || 1;
  }
  return tokens;
}

// ── triggerSponsorOnAnimalPlaced: engine.js resolveAnimals에서 동물 1장 배치 후 호출
//   ctx.placedCard에 방금 배치된 동물 카드를 넣어서 전달
export function triggerSponsorOnAnimalPlaced(game, player, animalCard) {
  const logs = [];
  for (const sponsor of player.playedSponsors) {
    const triggerKeys = [
      'on_animal_type_money', 'on_animal_type_xtoken',
      'on_animal_type_draw_keep1', 'on_animal_region_free_pavilion',
    ];
    if (!triggerKeys.includes(sponsor.abilityKey)) continue;
    const result = resolveAbility(game, player, sponsor, { placedCard: animalCard });
    if (result) logs.push(result);
  }
  return logs;
}

// ============================================================
// ★ 추가 핸들러 — manual 22장 완전 자동화
// ============================================================

// ── 깔짝 (2장: 대짱이, 비버통) ─────────────────────────────
// 행동 후 매력도 1위 플레이어의 슬롯1-3 행동 카드 중 1개 사용
HANDLERS['copycat_use_leader_action'] = (game, player, card) => {
  const leader = game.players
    .filter(p => p.id !== player.id)
    .sort((a, b) => b.appeal - a.appeal)[0];
  if (!leader) return `${card.name} [깔짝]: 대상 없음`;
  // after_finishing 플래그로 UI에서 슬롯1-3 선택
  player._pendingAfterFinishing = player._pendingAfterFinishing || [];
  player._pendingAfterFinishing.push({
    type: 'copycat',
    card,
    leader,
    maxSlot: card.abilityLevel || 3,
    desc: `${leader.name}의 슬롯1~${card.abilityLevel||3} 행동 카드 중 1개 사용 가능`,
  });
  return `${card.name} [깔짝]: 행동 후 ${leader.name}의 레벨1-${card.abilityLevel||3} 행동 사용 가능`;
};

// ── 조심 (3장: 배바닐라, 씨카이져, 탱탱겔) ────────────────
// 보존 트랙 + 매력도 트랙에서 앞선 플레이어에게 속박 토큰 1개씩
HANDLERS['timid_constrict_ahead'] = (game, player, card) => {
  let count = 0;
  for (const other of game.players) {
    if (other.id === player.id) continue;
    let tokens = 0;
    if (other.conservation > player.conservation) tokens++;
    if (other.appeal       > player.appeal)       tokens++;
    if (tokens > 0) {
      other._constrictionTokens = (other._constrictionTokens || 0) + tokens;
      count += tokens;
    }
  }
  return `${card.name} [조심]: ${count}개 속박 토큰 부여 (앞선 플레이어들에게)`;
};

// ── 출랑 (4장: 껍질몬2, 둥실라이드2, 맘박쥐2, 야도킹4) ───
// 손패 1장 버리고 필드 or 덱에서 1장 획득 (최대 abilityLevel회)
HANDLERS['trade_hand_for_card'] = (game, player, card) => {
  const maxTimes = card.abilityLevel || 2;
  if (player.hand.length === 0) return `${card.name} [출랑]: 손패 없음`;
  // 자동: 1회 실행 (덱에서 뽑기, 손패 마지막 장 버리기)
  // 추가 반복은 after_finishing 플래그로 UI 처리
  const discarded = player.hand.pop();
  game.discard.push(discarded);
  const drawn = drawFromDeck(game, player, 1);
  if (maxTimes > 1) {
    player._pendingAfterFinishing = player._pendingAfterFinishing || [];
    player._pendingAfterFinishing.push({
      type: 'trade_hand_for_card',
      card,
      remaining: maxTimes - 1,
      desc: `출랑 추가 ${maxTimes-1}회: 손패 버리고 필드/덱에서 1장`,
    });
  }
  return `${card.name} [출랑]: 손패 1장 버리고 ${drawn}장 획득 (추가 ${maxTimes-1}회 가능)`;
};

// ── 의젓 (2장: 나시, 피그킹) ───────────────────────────────
// 최종점수 카드 2장 뽑아 1장 선택
HANDLERS['dignified_final_score_pick'] = (game, player, card) => {
  // finalScoringDeck이 남아있으면 2장 뽑아 선택
  const { FINAL_SCORING_CARDS } = game._finalScoringDeckRef || { FINAL_SCORING_CARDS: [] };
  // game.finalScoringDeckRemaining를 참조 (state에서 관리)
  if (game.finalScoringDeckRemaining && game.finalScoringDeckRemaining.length > 0) {
    const drawn = game.finalScoringDeckRemaining.splice(0, 2);
    player._pendingAfterFinishing = player._pendingAfterFinishing || [];
    player._pendingAfterFinishing.push({
      type: 'pick_final_scoring',
      card,
      options: drawn,
      desc: '의젓: 최종점수 카드 1장 선택',
    });
    return `${card.name} [의젓]: 최종점수 카드 ${drawn.length}장 중 1장 선택 (UI 처리)`;
  }
  return `${card.name} [의젓]: 최종점수 카드 더미 없음`;
};

// ── 외로움 (3장: 돈크로우3, 상델라2, 조로아크3) ───────────
// N+ 크기 초(psychic)타입 포켓몬과 우리 공유 가능
// → 배치 시 규칙 완화 플래그 (자동 처리 불가, 텍스트 + 플래그)
HANDLERS['lonely_share_enclosure'] = (game, player, card) => {
  const minSize = card.abilityLevel || 2;
  // 해당 카드에 공유 가능 플래그 설정
  card._canShareWith = { type: 'psychic', minSize };
  return `${card.name} [외로움]: ${minSize}+ 크기 초타입 포켓몬과 우리 공유 가능`;
};

// ── 드래피온: 온순:도움 + 외로움4 ─────────────────────────
HANDLERS['docile_sponsors_plus_lonely'] = (game, player, card) => {
  // x2 토큰을 도움 카드에
  setX2Token(player, 'sponsors');
  // 외로움 4+ 플래그
  card._canShareWith = { type: 'psychic', minSize: 4 };
  return `${card.name} [온순:도움/외로움]: 도움 카드에 x2 토큰 + 4+ 초타입 우리 공유 가능`;
};

// ── 차분 (2장: 마임맨, 앱솔) ───────────────────────────────
// 사용하지 않은 기본 전설 카드 1장을 손으로 획득
HANDLERS['calm_take_base_legend'] = (game, player, card) => {
  // baseConservationProjects 중 아직 아무도 지원하지 않은 카드
  const unused = game.baseConservationProjects.filter(p =>
    !p.claimedTiers || p.claimedTiers.length === 0);
  if (unused.length > 0) {
    // 첫 번째 미사용 프로젝트를 손패에 추가 (conservationProject 카드로)
    const proj = unused[0];
    player.hand.push({ ...proj, kind: 'conservationProject', id: `hand_${proj.id}` });
    return `${card.name} [차분]: ${proj.name} 전설 카드 획득`;
  }
  // 없으면 덱에서 conservationProject 카드 찾기
  const cpIdx = game.deck.findIndex(c => c.kind === 'conservationProject');
  if (cpIdx >= 0) {
    const [cp] = game.deck.splice(cpIdx, 1);
    player.hand.push(cp);
    return `${card.name} [차분]: 덱에서 전설 카드 획득`;
  }
  return `${card.name} [차분]: 사용 가능한 기본 전설 카드 없음`;
};

// ── 천진난만 (1장: 폭타) ───────────────────────────────────
// 기본 불 타입 전설 카드가 게임에 없으면 손으로 가져옴
HANDLERS['naive_take_fire_legend'] = (game, player, card) => {
  // baseConservationProjects 중 fire 관련 (간략: 이름에 '불' 포함 or type 체크)
  const fireProj = game.baseConservationProjects.find(p =>
    p.type === 'fire' || p.name?.includes('불') || p.requiredType === 'fire');
  if (!fireProj) {
    // 불 전설 카드가 없음 → 덱에서 fire conservationProject 찾아 손으로
    const cpIdx = game.deck.findIndex(c =>
      c.kind === 'conservationProject' && (c.type === 'fire' || c.requiredType === 'fire'));
    if (cpIdx >= 0) {
      const [cp] = game.deck.splice(cpIdx, 1);
      player.hand.push(cp);
      return `${card.name} [천진난만]: 불 전설 카드 획득`;
    }
    // 없으면 그냥 conservationProject 1장
    const anyIdx = game.deck.findIndex(c => c.kind === 'conservationProject');
    if (anyIdx >= 0) {
      const [cp] = game.deck.splice(anyIdx, 1);
      player.hand.push(cp);
      return `${card.name} [천진난만]: 전설 카드 획득 (불 타입 없음)`;
    }
  }
  return `${card.name} [천진난만]: 기본 불 전설 카드 이미 있음`;
};

// ── 무사태평 level=2 (1장: 썬더볼트) ──────────────────────
// 매력도 1위, 2위에게서 각각 돈5 or 손패1 선택
HANDLERS['carefree_two_targets'] = (game, player, card) => {
  const others = game.players
    .filter(p => p.id !== player.id)
    .sort((a, b) => b.appeal - a.appeal);
  const targets = others.slice(0, 2);
  let log = `${card.name} [무사태평]: `;
  const results = [];
  for (const target of targets) {
    if (target.money >= 5) {
      target.money -= 5;
      gainMoney(player, 5);
      results.push(`${target.name}에게서 5원`);
    } else if (target.hand.length > 0) {
      const taken = target.hand.pop();
      player.hand.push(taken);
      results.push(`${target.name}에게서 카드 1장`);
    } else {
      results.push(`${target.name}: 자원 없음`);
    }
  }
  return log + results.join(', ');
};

// ── 너트령: 대담+용감 복합 ─────────────────────────────────
// 특수 아이콘(특수 우리 수)당 X토큰 1개 (최대3) + 일꾼 고용
HANDLERS['bold_xtoken_per_special_plus_hire'] = (game, player, card) => {
  // 특수 우리 수 = reptileHouse + pettingZoo + largeBirdAviary
  const specialCount = [...player.zooBuildings.values()]
    .filter(b => ['reptileHouse','pettingZoo','largeBirdAviary'].includes(b.kind)).length;
  const tokens = Math.min(3, specialCount);
  gainXToken(player, tokens);
  // 일꾼 고용
  player.associationWorkers.active++;
  return `${card.name} [대담/용감]: 특수우리 ${specialCount}개 → X토큰 +${tokens} + 일꾼 +1`;
};

// ── 루카리오: 온순:협회 + 용감 ─────────────────────────────
HANDLERS['docile_association_plus_hire'] = (game, player, card) => {
  setX2Token(player, 'association');
  player.associationWorkers.active++;
  return `${card.name} [온순:협회/용감]: 협회 카드에 x2 토큰 + 일꾼 +1`;
};

// ── 메가니움: 신중 ─────────────────────────────────────────
// 가능하면 5칸 largeBirdAviary(대습지초원) 무료 건설
HANDLERS['prudent_free_special_build'] = (game, player, card) => {
  // 이미 있으면 패스
  const alreadyHas = [...player.zooBuildings.values()]
    .some(b => b.kind === 'largeBirdAviary');
  if (alreadyHas) return `${card.name} [신중]: 대습지초원 이미 보유`;
  // 무료 건설 플래그 → after_finishing에서 UI 처리
  player._pendingAfterFinishing = player._pendingAfterFinishing || [];
  player._pendingAfterFinishing.push({
    type: 'free_special_build',
    kind: 'largeBirdAviary',
    card,
    desc: '신중: 대습지초원(5칸) 무료 건설 가능',
  });
  return `${card.name} [신중]: 대습지초원 무료 건설 가능 (UI에서 처리)`;
};
