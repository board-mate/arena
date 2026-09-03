// ============================================================================
// config.js — Pocket Nova 핵심 수치 설정
// 아크노바 룰북 + 실제 보드 데이터 기반
// ============================================================================

export const MAX_APPEAL = 113;
export const MAX_CONSERVATION = 41;
export const MAX_REPUTATION = 15;
export const MAX_X_TOKENS = 5;
export const HAND_LIMIT_DEFAULT = 3;
export const HAND_LIMIT_WITH_UNIVERSITY = 5;

// ────────────────────────────────────────────────
// 매력도 → 수입 테이블 (실제 아크노바 보드 기준)
// ────────────────────────────────────────────────
const APPEAL_INCOME_TABLE = [
  // [appeal, income]
  [0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,7],[7,9],[8,11],[9,13],[10,14],
  [11,15],[12,16],[13,17],[14,18],[15,19],[16,20],[17,21],[18,22],[19,23],[20,24],
  [21,25],[22,26],[23,27],[24,28],[25,29],[26,30],[27,31],[28,32],[29,33],[30,34],
  [31,35],[32,36],[33,37],[34,38],[35,39],[36,40],[37,41],[38,42],[39,43],[40,44],
  [41,45],[42,46],[43,47],[44,48],[45,49],[46,50],[47,51],[48,52],[49,53],[50,54],
  [51,55],[52,56],[53,57],[54,58],[55,59],[56,60],[57,61],[58,62],[59,63],[60,64],
  [61,65],[62,66],[63,67],[64,68],[65,69],[66,70],[67,71],[68,72],[69,73],[70,74],
  [71,75],[72,76],[73,77],[74,78],[75,79],[76,80],[77,81],[78,82],[79,83],[80,84],
  [81,85],[82,86],[83,87],[84,88],[85,89],[86,90],[87,91],[88,92],[89,93],[90,94],
  [91,95],[92,96],[93,97],[94,98],[95,99],[96,100],[97,101],[98,102],[99,103],[100,104],
  [101,105],[102,106],[103,107],[104,108],[105,109],[106,110],[107,111],[108,112],[109,113],[110,113],
];
export function appealIncome(appeal) {
  const a = Math.max(0, Math.min(MAX_APPEAL, Math.floor(appeal)));
  const row = APPEAL_INCOME_TABLE.find(([ap]) => ap === a);
  if (row) return row[1];
  // 보간
  const prev = APPEAL_INCOME_TABLE.filter(([ap]) => ap <= a).pop();
  return prev ? prev[1] : 0;
}

// ────────────────────────────────────────────────
// 보존 점수 → 목표치 (하얀 숫자)
// 실제 아크노바 보드 기반 (룰북 worked examples 앵커 포함)
// ────────────────────────────────────────────────
const CONSERVATION_TARGET_TABLE = [
  [0,0],[1,1],[2,2],[3,4],[4,6],[5,8],[6,10],[7,12],[8,14],[9,16],
  [10,18],[11,20],[12,22],[13,24],[14,26],[15,28],[16,30],[17,32],[18,34],[19,36],
  [20,38],[21,40],[22,42],[23,44],[24,47],[25,50],[26,53],[27,56],[28,59],[29,62],
  [30,65],[31,68],[32,71],[33,74],[34,77],[35,80],[36,83],[37,86],[38,89],[39,92],
  [40,95],[41,113],
];
export function conservationTarget(conservation) {
  const c = Math.max(0, Math.min(MAX_CONSERVATION, Math.floor(conservation)));
  const row = CONSERVATION_TARGET_TABLE.find(([cp]) => cp === c);
  if (row) return row[1];
  const prev = CONSERVATION_TARGET_TABLE.filter(([cp]) => cp <= c).pop();
  return prev ? prev[1] : 0;
}

export const SCORING_AREA_WINDOW = 2;

export const BREAK_TRACK_LENGTH = { 1:14, 2:14, 3:12, 4:10 };
export const BREAK_START_SPACE  = { 1:0,  2:0,  3:3,  4:5  };

export const CONSERVATION_BONUSES = [
  { points:2,  effect:'upgrade_or_worker',   description:'액션카드 업그레이드 또는 협회 일꾼 1명 추가 고용' },
  { points:5,  effect:'money_or_bonus_token', amount:5, description:'5원 또는 보너스 토큰 획득' },
  { points:8,  effect:'money_or_bonus_token', amount:5, description:'5원 또는 보너스 토큰 획득' },
  { points:10, effect:'discard_final_scoring', description:'모든 플레이어가 최종 점수 카드 1장 버림 (최초 1회)' },
];

export const HEX_ADJACENT_DIRS = [
  [+1,0],[+1,-1],[0,-1],[-1,0],[-1,+1],[0,+1],
];

export const ACTION_TYPES = ['cards','build','animals','association','sponsors'];

export const ACTION_LABELS_KO = {
  cards:       '모험',
  build:       '건설',
  animals:     '포획',
  association: '협회',
  sponsors:    '도움',
};

export const TYPE_COLORS = {
  water:    '#2E86C1',
  fire:     '#E4572E',
  grass:    '#3E8E4F',
  fighting: '#C1440E',
  psychic:  '#8E44AD',
  fossil:   '#8D6E63',
  normal:   '#8C8C74',
};

export const TYPE_LABELS_KO = {
  water:'물', fire:'불', grass:'풀',
  fighting:'격투', psychic:'에스퍼', fossil:'화석',
};

export const REGION_COLORS = {
  '관동':'#F1C40F','성도':'#E74C3C','호연':'#2ECC71','신오':'#3498DB','하나':'#F39C12',
};

// 기부 비용 표 (아크노바 보드 기준)
export const DONATION_COSTS = [0, 5, 5, 7, 7, 10, 10, 12];
export function donationCost(filled) {
  return DONATION_COSTS[Math.min(filled, DONATION_COSTS.length-1)] ?? 12;
}
