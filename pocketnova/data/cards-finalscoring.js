// ============================================================================
// cards-finalscoring.js — Final Scoring cards, transcribed from 중요한_물품.pdf
// Each card grants 1-4 bonus conservation points at game end, gated on a
// count of something in your zoo. `thresholds` = [count, ...] paired with
// `rewards` = [points, ...] at the same index (per rulebook: max 4 points
// per card, and only the highest threshold you meet counts).
// ============================================================================

export const FINAL_SCORING_CARDS = [
  { id: 'fs_fishingrod', name: '낚싯대', metric: '사파리존에 있는 물 칸 아이콘 수',
    thresholds: [2, 4, 6, 8], rewards: [1, 2, 3, 4] },
  { id: 'fs_dowsing', name: '다우징 머신', metric: '지식 트랙 칸 수',
    thresholds: [6, 9, 12, 15], rewards: [1, 2, 3, 4] },
  { id: 'fs_masterball', name: '마스터볼', metric: '사파리존에 있는 큰 포켓몬(4+ 크기) 수',
    thresholds: [1, 2, 4, 5], rewards: [1, 2, 3, 4] },
  { id: 'fs_monsterball', name: '몬스터볼', metric: '사파리존에 있는 작은 포켓몬(2- 크기) 수',
    thresholds: [3, 6, 8, 10], rewards: [1, 2, 3, 4] },
  { id: 'fs_contacts', name: '연락처', metric: '도움(스폰서) 카드 수',
    thresholds: [3, 6, 8, 10], rewards: [1, 2, 3, 4] },
  { id: 'fs_mysteryegg', name: '이상한 알', metric: '사파리존에 있는 알 아이콘 수',
    thresholds: [3, 4, 5, 6], rewards: [1, 2, 3, 4] },
  { id: 'fs_bicycle', name: '자전거', metric: '사파리존에 있는 바위 칸 아이콘 수',
    thresholds: [1, 3, 5, 7], rewards: [1, 2, 3, 4] },
  { id: 'fs_map', name: '지도', metric: '사파리존의 빈 칸 수',
    thresholds: [6, 12, 18, 24], rewards: [1, 2, 3, 4] },
  { id: 'fs_pokedex', name: '포케 도감',
    metric: '오른쪽 플레이어보다 많이 보유한 포켓몬 타입 수 (최대 4)',
    special: 'compare_right_player_types', maxReward: 4 },
  { id: 'fs_pokemachine', name: '포켓머신', metric: '전설 카드 위에 올려둔 토큰 수',
    thresholds: [3, 4, 5, 6], rewards: [1, 2, 3, 4] },
  { id: 'fs_learningdevice', name: '학습 장치',
    metric: '사파리존의 건물/연결 조건 충족 개수 (아래 4개 중 충족한 개수만큼 1점씩)',
    special: 'checklist',
    checklist: [
      '물 칸을 모두 연결했다면 1점',
      '바위 칸을 모두 연결했다면 1점',
      '가장자리 칸을 모두 덮었다면 1점',
      '사파리존의 빈 칸을 모두 덮었다면 1점',
    ] },
];
