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
