// ============================================================================
// actionCards.js — the 5 double-sided Action cards, transcribed from
// 행동카드.pdf. These map 1:1 onto Ark Nova's Build / Animals / Sponsors /
// Cards / Association action cards.
// ============================================================================

export const ACTION_CARDS = {
  build: {
    id: 'build',
    labelKo: '건설',
    icon: '🏗️',
    color: '#1f7a8c',
    sideI: {
      text: '레벨(X) 만큼의 크기의 건물 1개 짓기. 1칸마다 2원 지불',
      buildings: ['포켓몬 센터', '쇼핑 센터', '기본 우리', '화석 센터'],
      multi: false,
      costPerSpace: 2,
    },
    sideII: {
      text: '레벨(X) 만큼의 크기의 건물을 여러 개 짓기. 1칸마다 2원 지불',
      buildings: ['포켓몬 센터', '쇼핑 센터', '기본 우리', '화석 센터', '대습지 초원', '대형 수족관'],
      multi: true,
      costPerSpace: 2,
    },
  },

  animals: {
    id: 'animals',
    labelKo: '포획',
    icon: '🎯',
    color: '#d64550',
    sideI: {
      text: '손에서 포켓몬 카드를 레벨(X) 만큼 내려놓기',
      // strength -> number of animal cards playable from hand
      table: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 2 },
      fromDisplay: false,
    },
    sideII: {
      text: '손 또는 필드(추가 비용을 지불하고)에서 포켓몬 카드를 레벨(X) 만큼 내려놓기',
      table: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2 }, // strength 5 = table value + "hand"(free extra) in source; see note
      strength5Bonus: 'plusHandCard', // at strength 5 you may also add 1 more from hand for free (per PDF "🖐️+2")
      fromDisplay: true,
    },
  },

  sponsors: {
    id: 'sponsors',
    labelKo: '도움',
    icon: '🤝',
    color: '#f2a541',
    sideI: {
      text: '레벨(X) 안에서 도움 카드 1장 내려놓기 또는 [전진하고 X 받기]',
      multi: false,
      breakAdvanceMoneyMultiplier: 1,
    },
    sideII: {
      text: '레벨(X)+1 안에서 도움 카드 여러 장 내려놓기(필드 카드는 추가비용 지불) 또는 [전진하고 2×X 받기]',
      multi: true,
      levelBonus: 1,
      breakAdvanceMoneyMultiplier: 2,
    },
  },

  cards: {
    id: 'cards',
    labelKo: '모험',
    icon: '🧭',
    color: '#2e86c1',
    sideI: {
      text: '2칸 전진. 레벨(X) 안에서 덱에서 카드를 뽑거나 낚아채기',
      breakAdvance: 2,
      draw: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 },
      discard: { 1: 1, 2: 0, 3: 1, 4: 0, 5: 1 },
      snapFrom: 5, // strength at which "낚아채기"(snapping) becomes available
      reputationRange: false,
    },
    sideII: {
      text: '2칸 전진. 레벨(X) 안에서 필드나 덱에서 카드를 뽑거나 낚아채기',
      breakAdvance: 2,
      draw: { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 },
      discard: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 },
      snapFrom: 3,
      reputationRange: true,
    },
  },

  association: {
    id: 'association',
    labelKo: '협회',
    icon: '🏛️',
    color: '#6a4c93',
    sideI: {
      text: '레벨(X) 안에서 협회 업무 1개 하기',
      multi: false,
      donation: false,
      legendaryRegister: false,
    },
    sideII: {
      text: '레벨(X) 안에서 협회 업무 여러 개 하기. 추가로 기부 1번 가능. 필드에서 추가 비용을 지불하고 전설 포켓몬을 협회에 등록할 수 있다.',
      multi: true,
      donation: true,
      legendaryRegister: true,
    },
  },
};

export const ACTION_TYPE_ORDER = ['cards', 'build', 'animals', 'association', 'sponsors'];
