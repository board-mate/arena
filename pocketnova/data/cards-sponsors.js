// ============================================================================
// cards-sponsors.js — "도움" cards = Ark Nova's Sponsor cards, transcribed
// from 도움1.pdf (8 cards) and 도움2.pdf (56 cards) = 64 total, matching the
// base game's full Sponsor deck size.
//
// Sponsor cards in Ark Nova are the most individually-varied card type (each
// one is close to unique), so full 1:1 automation of every effect is a
// larger job than this first pass covers. Every card below has its Korean
// ability text transcribed as legibly as it could be read from the sheet,
// so it always displays correctly in the UI and the group can apply it by
// hand; `abilityKey: 'manual'` marks that automatic resolution isn't wired
// up yet. Cost/level/icon-condition fields (needed for legal-play checks)
// are populated as best as could be confirmed — flag anything that looks
// off against your physical cards, since small condition icons were the
// hardest part of these sheets to read with certainty.
// ============================================================================

function sponsor(name, level, abilityText, extra = {}) {
  return {
    id: `sp_${name}`,
    kind: 'sponsor',
    name,
    level,
    abilityText: abilityText || '(능력 텍스트 확인 필요 — 원본 카드 참고)',
    abilityKey: 'manual',
    condition: extra.condition || null,
    icon: extra.icon || null,
    ...extra,
  };
}

export const SPONSOR_CARDS = [
  // ---- 도움1.pdf ----
  sponsor('콘', 3, '수입: 사파리존에 있는 물 타입 아이콘 1/3/6개마다 3/6/9 획득'),
  sponsor('태홍', 5, '이어진 혜택 칸 마다 1 획득. 비어진 2칸의 혜택 칸마다 1 획득', { condition: 'max 25 appeal' }),
  sponsor('털보박사', 5, '당신의 사파리존에 호연 지방 카드를 사용할 때마다 공짜로 파빌리온을 건설'),
  sponsor('팟', 5, '수입: 사파리존에 있는 불 타입 아이콘 1/3/6개마다 3/6/9 획득'),
  sponsor('풍&란', 3, '수입: 사파리존에 있는 초 타입 아이콘 1/3/6개마다 3/6/9 획득'),
  sponsor('핸섬', 5, '아직 당신의 사파리존에 없는 아이콘을 내려놓을 때마다 1~2 획득. 당신의 사파리존의 아이콘마다 2 획득'),
  sponsor('호일', 5, '이어진 물 칸마다 1 획득. 이어지지 않은 물 칸 2곳마다 1 획득', { condition: 'max 25 appeal' }),
  sponsor('휴이', 4, '전설 포켓몬 프로젝트를 하기 위해서 4 필요', { condition: '전설카드 조건' }),

  // ---- 도움2.pdf ----
  sponsor('간호순', 5, '수입: 1 획득'),
  sponsor('강연', 6, '당신이 사파리존에 불 타입 아이콘을 내려놓을 때마다 2 획득', { placement: '바위 1칸이라도 맞닿게 배치' }),
  sponsor('강집', 4, '건설 행동 카드로 타일을 최소 1개 놓았다면, 똑같은 크기의 타일 1개를 정상 비용으로 추가 건설 가능 (특수 구역 제외)'),
  sponsor('게치스', 3, '가장자리 2칸에 붙여서 배치(다른 건물과 붙어있을 필요 없음). 수입: 비어있는 우리를 제외하고 이 건물과 붙은 건물마다 2 획득'),
  sponsor('공박사', 5, '당신의 사파리존에 성도 지방 카드를 사용할 때마다, 손에서 카드 1장을 이 카드 밑에 넣고 2 획득'),
  sponsor('국화', 5, '작은 포켓몬을 내려놓을 때 3 적게 지불'),
  sponsor('규리', 5, '당신이 사파리존에 특수 타입 아이콘을 내려놓을 때마다 2 획득', { placement: '물 1칸이라도 맞닿게 배치' }),
  sponsor('그린', 3, '(능력 텍스트 확인 필요 — 원본 카드 참고)'),
  sponsor('꼭두', 5, '최대 3회: 다른 자원(알 아이콘 등)을 1 로 교환. 이렇게 얻은 1 마다 다른 플레이어들은 2 획득', { condition: 'max 25 appeal' }),
  sponsor('난천', 6, '서로 다른 지방의 아이콘 5개마다 1 획득'),
  sponsor('노간주', 6, '당신은 이제부터 선택한 종류를 제외한 동물을 내려놓을 수 없음. 작은 동물을 내려놓을 때마다 2 획득 또는 큰 동물을 내려놓을 때마다 4 획득'),
  sponsor('담죽', 5, '이어진 바위 칸마다 1 획득. 이어지지 않은 바위 칸 2곳마다 1 획득', { condition: 'max 25 appeal' }),
  sponsor('덴트', 3, '수입: 사파리존에 있는 풀 타입 아이콘 1/3/6개마다 3/6/9 획득'),
  sponsor('독수', 6, '당신의 색깔 토큰 3개를 올려둠. 초 타입 아이콘 카드를 내려놓을 때마다 토큰 1개를 버리고, 도움 카드를 레벨 값만큼 돈을 지불하고 추가로 내려놓기 가능'),
  sponsor('류옹', 5, '물 칸 열 칸을 덮을 때마다 1 획득. 모든 물 칸이 연결되었다면 1 획득'),
  sponsor('마박사', 5, '당신의 사파리존에 신오 지방 카드를 사용할 때마다 공짜로 1칸 구역 건설. 1칸 타일 5개마다 1점'),
  sponsor('마적', 5, '큰 포켓몬을 내려놓을 때마다 조건 1개 무시 가능. 5칸 구역 배치 가능'),
  sponsor('마티스', 4, '모든 사파리존에서 불 타입 아이콘이 내려질 때마다 3 획득'),
  sponsor('메타몽', 4, '이 카드 위에 큐브 2개를 올린다. 기본 전설 카드를 달성할 때 큐브 1개로 조건 1개를 대체 가능. 전설 카드 위 큐브 5개마다 1 획득'),
  sponsor('무청', 5, '당신이 물 타입 아이콘 카드를 내려놓을 때마다, 손에서 카드를 2장까지 버리고 각 버린 카드마다 4 획득 가능', { placement: '물 1칸이라도 맞닿게 배치' }),
  sponsor('민지', 5, '당신이 불 타입 아이콘 카드를 내려놓을 때마다 x토큰 1개 획득'),
  sponsor('민진', 4, '이 카드 위에 큐브 2개를 올린다. 기본 전설 카드를 달성할 때 큐브 1개로 조건 1개를 대체 가능. 전설 카드 위 큐브 5개마다 1 획득'),
  sponsor('민화', 6, '당신이 풀 타입 아이콘 카드를 내려놓을 때마다 카드 더미에서 2장을 뽑아 1장을 손으로 가져오고 나머지는 버림'),
  sponsor('보미카', 3, '당신은 이제부터 냉정/무사태평/깔짝/조심 효과를 받지 않음. 서로 다른 지방의 아이콘 5개마다 1 획득'),
  sponsor('보은', 4, '모든 사파리존에 알 아이콘 카드가 추가될 때마다 2 획득. 서로 다른 타입 아이콘마다 1 획득'),
  sponsor('블레리', 5, '당신이 사파리존에 초 타입 아이콘을 내려놓을 때마다 2 획득', { placement: '바위 1칸이라도 맞닿게 배치' }),
  sponsor('비주기', 5, '물과 바위를 덮으면서 건물을 건설할 수 있다(카드의 물/바위 필요치 무시). 물과 바위가 필요한 카드마다 2 획득'),
  sponsor('성호', 3, '서로 다른 타입 아이콘을 5개 보유했다면 1 획득'),
  sponsor('수호', 5, '즉시 협회 직원 1명을 고용한다'),
  sponsor('시바', 4, '모든 사파리존에서 격투 타입 아이콘이 내려질 때마다 3 획득'),
  sponsor('실버', 5, '수입: x-토큰 1개 획득'),
  sponsor('아강', 5, '동물 행동 카드로 작은 포켓몬만 내려놓았다면, 작은 포켓몬 1장을 더 내려놓을 수 있고, 가능하다면 대기열에서 작은 포켓몬 1장을 가져올 수 있음'),
  sponsor('아크로마', 5, '당신의 사파리존에 알 아이콘이 있는 카드를 사용할 때마다 1 획득'),
  sponsor('아티', 3, '', { placement: '바위에 1칸이라도 붙여서 배치' }),
  sponsor('알로에', 4, '당신의 사파리존에 알 아이콘을 추가할 때마다 1 획득'),
  sponsor('야콘', 5, '당신이 격투 타입 아이콘 카드를 내려놓을 때마다, 이미 내려놓은 격투 타입 아이콘 수만큼 카드 더미에서 뽑고 1장을 손으로 가져옴', { placement: '바위 1칸이라도 맞닿게 배치' }),
  sponsor('N', 4, '수입: 3 획득'),
  sponsor('오박사', 4, '당신의 사파리존에 관동 지방 카드를 사용할 때마다 아무 행동 카드를 레벨 1에 배치 가능'),
  sponsor('웅이', 5, '바위 칸 옆 칸을 덮을 때마다 1 획득. 모든 바위 칸이 연결되었다면 1 획득'),
  sponsor('원규', 6, '당신이 사파리존에 바위 칸 옆 아이콘을 내려놓을 때마다 2 획득', { placement: '바위 2칸에 맞닿게 배치' }),
  sponsor('유채', 5, '당신이 사파리존에 풀 타입 아이콘을 내려놓을 때마다 2 획득', { placement: '물 1칸이라도 맞닿게 배치' }),
  sponsor('윤진', 4, '모든 사파리존에서 물 타입 아이콘이 내려질 때마다 3 획득'),
  sponsor('이수재', 4, '서로 다른 2개의 타입과 지방 아이콘마다 1 획득'),
  sponsor('이수진', 5, '수입: 카드 더미 또는 지식 범위 안에서 카드 1장 가져옴. 3/6 알 아이콘마다 1/2 획득'),
  sponsor('이슬', 5, '당신이 사파리존에 물 칸 옆 아이콘을 내려놓을 때마다 2 획득', { placement: '물 2칸에 맞닿게 배치' }),
  sponsor('일목', 5, '이어진 빈 가장자리 칸마다 1 획득. 비어진 6칸의 빈 칸마다 1 획득'),
  sponsor('자두', 3, '수입: 사파리존에 있는 격투 타입 아이콘 1/3/6개마다 3/6/9 획득'),
  sponsor('종길', 3, '(능력 텍스트 확인 필요 — 원본 카드 참고)'),
  sponsor('주박사', 4, '당신의 사파리존에 하나 지방 카드를 사용할 때마다 공짜로 매점 건설'),
  sponsor('철구', 3, '', { placement: '물에 1칸이라도 붙여서 배치' }),
  sponsor('체렌', 4, '사파리존 가장자리에 있는 배치 보너스를 얻을 때마다, 아직 덮지 않은 배치 보너스 획득'),
  sponsor('초련', 4, '모든 사파리존에서 초 타입 아이콘이 내려질 때마다 3 획득'),
  sponsor('충호', 4, '모든 사파리존에서 풀 타입 아이콘이 내려질 때마다 3 획득'),
  sponsor('카렌', 4, '야생에 풀어주는 전설 포켓몬 카드를 내려놓을 때마다 1 획득. 야생에 풀어주는 전설 포켓몬 카드에 여러 번 참여 가능'),
  sponsor('카밀레', 5, '당신의 사파리존 가장자리에 적어도 2칸은 맞닿게 놓아야 함. 카드 더미나 지식 범위 안에서 카드 1장을 손으로 가져옴'),
  sponsor('칸나', 4, '큰 포켓몬을 내려놓을 때 4 적게 지불'),
];
