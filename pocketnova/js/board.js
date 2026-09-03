// ============================================================================
// board.js — hex-grid zoo map (사파리존).
// 지도 F13 (바위 압벽) 및 지도 F15 (테라포밍 구역) 실제 구현.
// ============================================================================

import { HEX_ADJACENT_DIRS } from './config.js';

export const TILE = {
  EMPTY: 'empty',
  ROCK: 'rock',
  WATER: 'water',
  BONUS: 'bonus',
  BLOCKED: 'blocked', // 건설 불가 (빙하, 나무 등 장식)
};

// ─────────────────────────────────────────────────────────────────
// 지도 F13 — 바위 압벽 (Rock Wall)
// 아이스/설원 테마. 중앙 큰 빙하(BLOCKED) + 왼쪽 호수(WATER 클러스터).
// 실제 지도에서 육안으로 읽은 좌표 (axial q,r).
// ─────────────────────────────────────────────────────────────────
export function makeMapF13() {
  // 전체 플레이 영역: 대략 12열 × 9행 (비대칭 오프셋)
  // q: -5..6, r: -4..4 범위의 유효 칸만 포함
  const raw = [
    // r=-4
    { q:0, r:-4, type:'empty' }, { q:1, r:-4, type:'empty' },
    { q:2, r:-4, type:'empty' }, { q:3, r:-4, type:'empty' },
    { q:4, r:-4, type:'empty' }, { q:5, r:-4, type:'empty' },
    // r=-3
    { q:-1,r:-3, type:'empty' }, { q:0, r:-3, type:'empty' },
    { q:1, r:-3, type:'empty' }, { q:2, r:-3, type:'empty' },
    { q:3, r:-3, type:'empty' }, { q:4, r:-3, type:'empty' },
    { q:5, r:-3, type:'empty' }, { q:6, r:-3, type:'empty' },
    // r=-2
    { q:-2,r:-2, type:'empty' }, { q:-1,r:-2, type:'empty' },
    { q:0, r:-2, type:'empty' }, { q:1, r:-2, type:'empty' },
    { q:2, r:-2, type:'empty' }, { q:3, r:-2, type:'empty' },
    { q:4, r:-2, type:'empty' }, { q:5, r:-2, type:'empty' },
    { q:6, r:-2, type:'empty' },
    // r=-1
    { q:-3,r:-1, type:'empty' }, { q:-2,r:-1, type:'empty' },
    { q:-1,r:-1, type:'empty' }, { q:0, r:-1, type:'empty' },
    { q:1, r:-1, type:'empty' }, { q:2, r:-1, type:'empty' },
    { q:3, r:-1, type:'empty' }, { q:4, r:-1, type:'empty' },
    { q:5, r:-1, type:'empty' }, { q:6, r:-1, type:'empty' },
    // r=0
    { q:-4,r:0,  type:'empty' }, { q:-3,r:0, type:'empty' },
    { q:-2,r:0,  type:'empty' }, { q:-1,r:0, type:'empty' },
    { q:0, r:0,  type:'empty' }, { q:1, r:0, type:'empty' },
    { q:2, r:0,  type:'empty' }, { q:3, r:0, type:'empty' },
    { q:4, r:0,  type:'empty' }, { q:5, r:0, type:'empty' },
    // r=1
    { q:-4,r:1,  type:'empty' }, { q:-3,r:1, type:'empty' },
    { q:-2,r:1,  type:'empty' }, { q:-1,r:1, type:'empty' },
    { q:0, r:1,  type:'empty' }, { q:1, r:1, type:'empty' },
    { q:2, r:1,  type:'empty' }, { q:3, r:1, type:'empty' },
    { q:4, r:1,  type:'empty' },
    // r=2
    { q:-4,r:2,  type:'empty' }, { q:-3,r:2, type:'empty' },
    { q:-2,r:2,  type:'empty' }, { q:-1,r:2, type:'empty' },
    { q:0, r:2,  type:'empty' }, { q:1, r:2, type:'empty' },
    { q:2, r:2,  type:'empty' }, { q:3, r:2, type:'empty' },
    // r=3
    { q:-3,r:3,  type:'empty' }, { q:-2,r:3, type:'empty' },
    { q:-1,r:3,  type:'empty' }, { q:0, r:3, type:'empty' },
    { q:1, r:3,  type:'empty' }, { q:2, r:3, type:'empty' },
    // r=4
    { q:-2,r:4,  type:'empty' }, { q:-1,r:4, type:'empty' },
    { q:0, r:4,  type:'empty' }, { q:1, r:4, type:'empty' },
  ];

  const tiles = raw.map(t => ({ ...t }));

  const setType = (q, r, type, bonus) => {
    const t = tiles.find(t => t.q === q && t.r === r);
    if (t) { t.type = type; if (bonus) t.bonus = bonus; }
  };

  // 중앙 빙하 (BLOCKED — 건설 불가, 가운데 흰 영역)
  [[1,-1],[2,-1],[3,-1],[1,0],[2,0],[3,0],[1,1],[2,1]].forEach(([q,r]) => setType(q,r,'blocked'));

  // 왼쪽 호수 (WATER 클러스터)
  [[-3,0],[-3,1],[-2,1],[-2,2],[-1,1]].forEach(([q,r]) => setType(q,r,'water'));

  // 오른쪽 작은 호수
  [[4,0],[5,0],[4,1]].forEach(([q,r]) => setType(q,r,'water'));

  // 보너스 칸 (노란 아이콘 위치)
  setType(-4,0,'bonus',{ kind:'money', amount:6 });
  setType(0,-4,'bonus',{ kind:'money', amount:1 });
  setType(5,-3,'bonus',{ kind:'money', amount:1 });
  setType(0,3,'bonus', { kind:'xtoken', amount:1 });
  setType(-2,4,'bonus',{ kind:'money', amount:5 });
  setType(2,-2,'bonus',{ kind:'money', amount:5 });
  setType(-3,-1,'bonus',{ kind:'reputation', amount:1 });
  setType(5,-1,'bonus',{ kind:'money', amount:1 });
  setType(1,3,'bonus', { kind:'conservation', amount:1 });

  // 특수 구역 (빨간 — 업그레이드 필요)
  setType(-2,-2,'bonus',{ kind:'upgrade_required' });
  setType(0,-2,'bonus', { kind:'upgrade_required' });
  setType(3,-3,'bonus', { kind:'upgrade_required' });
  setType(4,-2,'bonus', { kind:'upgrade_required' });

  return {
    id: 'F13',
    name: '바위 압벽',
    theme: 'ice',
    tiles,
    // 이 매점에서부터 건설 시작 (지도 하단 텍스트)
    starterKiosk: { q:-4, r:2 },
    // 왼쪽 면을 모두 덮음 / 오른쪽 면을 모두 덮음 (보너스)
    coverBonus: { left: { kind:'money', amount:6 }, right: { kind:'money', amount:6 } },
    specialRule: '이 매점에서부터 건설 시작.',
  };
}

// ─────────────────────────────────────────────────────────────────
// 지도 F15 — 테라포밍 구역 (Terraforming Zone)
// 벚꽃 초원 테마. 게임 시작/휴식마다 바위 타일 1개 + 물 타일 1개 놓음.
// ─────────────────────────────────────────────────────────────────
export function makeMapF15() {
  const raw = [
    // 거의 정사각형 그리드 r=-4..4, q=-4..4
    ...(function*() {
      for (let r = -4; r <= 4; r++) {
        const qMin = -4 - Math.min(0, r);
        const qMax =  4 - Math.max(0, r);
        for (let q = qMin; q <= qMax; q++) {
          yield { q, r, type: 'empty' };
        }
      }
    })(),
  ];

  const tiles = raw.map(t => ({ ...t }));
  const setType = (q, r, type, bonus) => {
    const t = tiles.find(t => t.q === q && t.r === r);
    if (t) { t.type = type; if (bonus) t.bonus = bonus; }
  };

  // 큰 나무 클러스터 (BLOCKED)
  [[-4,0],[-3,-1],[-4,1],[-4,2]].forEach(([q,r]) => setType(q,r,'blocked'));
  [[3,0],[4,-1],[3,1],[2,2]].forEach(([q,r]) => setType(q,r,'blocked'));
  [[0,4],[1,3],[1,4]].forEach(([q,r]) => setType(q,r,'blocked'));
  [[-2,-4],[-1,-4]].forEach(([q,r]) => setType(q,r,'blocked'));

  // 특수 구역 (빨간 — 업그레이드 필요)
  setType(-2,0,'bonus',{ kind:'upgrade_required' });
  setType(-1,1,'bonus',{ kind:'upgrade_required' });
  setType(2,-1,'bonus',{ kind:'upgrade_required' });
  setType(3,-2,'bonus',{ kind:'upgrade_required' });

  // 보너스 칸
  setType(0,-4,'bonus',{ kind:'money', amount:5 });
  setType(-3,2,'bonus',{ kind:'money', amount:1 });
  setType(-1,3,'bonus',{ kind:'conservation', amount:1 });
  setType(2,2,'bonus', { kind:'money', amount:1 });
  setType(-2,1,'bonus',{ kind:'xtoken', amount:1 });

  // 가변 타일 (게임 시작/휴식마다 추가) — 처음엔 빈칸
  // 실제로는 맵 생성 시 랜덤으로 배치됨 (specialRule 참고)

  return {
    id: 'F15',
    name: '테라포밍 구역',
    theme: 'cherry',
    tiles,
    starterKiosk: { q:1, r:-4 }, // 경계 칸에서 건설 시작
    specialRule: '게임을 시작할 때, 그리고 휴식할 때마다, 바위 타일 1개와 물 타일 1개를 놓음.',
    dynamicTiles: true,
    dynamicRockPool: [
      {q:-1,r:-2},{q:0,r:-2},{q:1,r:-2},{q:2,r:-2},
      {q:-2,r:0},{q:1,r:0},{q:-1,r:2},{q:0,r:2},
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// 기본(폴백) 맵
// ─────────────────────────────────────────────────────────────────
export function makeDefaultMap() {
  return makeMapF13(); // F13을 기본으로 사용
}

export function getAvailableMaps() {
  return [
    { id: 'F13', name: '바위 압벽', make: makeMapF13 },
    { id: 'F15', name: '테라포밍 구역', make: makeMapF15 },
  ];
}

// ─────────────────────────────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────────────────────────────
export function tileAt(map, q, r) {
  return map.tiles.find(t => t.q === q && t.r === r) || null;
}

export function neighbors(q, r) {
  return HEX_ADJACENT_DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

export function isBorderSpace(map, q, r) {
  return neighbors(q, r).some(n => !tileAt(map, n.q, n.r));
}

export function key(q, r) { return `${q},${r}`; }

export function canPlaceBuilding(map, zooBuildings, cells, isFirstBuildingEver) {
  for (const c of cells) {
    const t = tileAt(map, c.q, c.r);
    if (!t || t.type === TILE.ROCK || t.type === TILE.WATER || t.type === TILE.BLOCKED) return false;
    if (zooBuildings.has(key(c.q, c.r))) return false;
  }
  const touchesExisting = cells.some(c =>
    neighbors(c.q, c.r).some(n => zooBuildings.has(key(n.q, n.r))));
  if (touchesExisting) return true;
  if (isFirstBuildingEver) {
    // 첫 건물: 경계 칸에 닿아야 함
    return cells.some(c => isBorderSpace(map, c.q, c.r));
  }
  return false;
}

export function adjacentWaterRockCounts(map, cells) {
  let water = 0, rock = 0;
  const seen = new Set();
  for (const c of cells) {
    for (const n of neighbors(c.q, c.r)) {
      const nk = key(n.q, n.r);
      if (seen.has(nk)) continue;
      const t = tileAt(map, n.q, n.r);
      if (t?.type === TILE.WATER) { water++; seen.add(nk); }
      if (t?.type === TILE.ROCK)  { rock++;  seen.add(nk); }
      seen.add(nk);
    }
  }
  return { water, rock };
}

export function placementBonusesFor(map, cells) {
  return cells
    .map(c => tileAt(map, c.q, c.r))
    .filter(t => t && t.type === TILE.BONUS && t.bonus && t.bonus.kind !== 'upgrade_required')
    .map(t => t.bonus);
}

// F15 전용: 휴식마다 바위/물 타일 랜덤 배치
export function addDynamicTiles(map, zooBuildings) {
  if (!map.dynamicTiles) return;
  const emptyTiles = map.tiles.filter(t =>
    t.type === TILE.EMPTY && !zooBuildings.has(key(t.q, t.r)));
  if (emptyTiles.length < 2) return;
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  const shuffled = shuffle([...emptyTiles]);
  // 바위 1개
  if (shuffled[0]) shuffled[0].type = TILE.ROCK;
  // 물 1개
  if (shuffled[1]) shuffled[1].type = TILE.WATER;
}
