# 포켓노바 (Pocket Nova)

아크노바(Ark Nova) 룰 기반 포켓몬 리스킨 보드게임 웹 구현체.  
빌드 없이 정적 호스팅에 올리면 바로 동작. 로컬 hotseat 2~4인.

```bash
python3 -m http.server 8000  # http://localhost:8000
```

---

# ★ Claude에게 — 다음 대화 즉시 작업을 위한 맥락 문서

> ZIP 첨부 후 이 README를 먼저 읽으면 오늘 대화 없이 바로 이어서 작업 가능.

---

## 파일 구조

```
index.html
css/style.css               다크모드 포켓몬 도감 디자인
js/
  config.js                 수치 테이블 (매력도→수입, 보존→목표치 전체)
  board.js                  지도 F13/F15 + 헥스그리드 로직
  state.js                  게임/플레이어 상태 모델
  engine.js                 5개 행동 + 휴식 + 종료 + 점수
  abilities.js              동물카드 능력 41개 abilityKey 핸들러
  network.js                멀티플레이어 어댑터 (Arcade 스텁)
  ui.js                     렌더링 + 입력
data/
  cards-animals.js          동물카드 127장
  cards-sponsors.js         스폰서카드 64장
  cards-legendary.js        보존프로젝트 32장
  cards-finalscoring.js     최종점수카드 11장
  actionCards.js            행동카드 5장 (I/II면)
```

---

## 카드 데이터 필드명 — 가장 중요한 quirk

### 동물카드 (`data/cards-animals.js`)

```js
{
  id: 'an_1',
  kind: 'animal',           // 이미 'animal'로 설정됨
  type: 'water',            // ★ 단수! 'types'(복수) 아님
  name: '갸라도스',
  regions: ['관동'],         // 배열
  enclosureSize: 2,         // ★ 'size' 아님
  waterReq: 0,              // ★ 'requiresWater' 아님
  rockReq: 0,               // ★ 'requiresRock' 아님
  specialEnclosure: null,
  cost: 13,
  appeal: 6,
  conservationGain: 0,
  reputationGain: 0,
  condition: null,
  abilityName: '냉정',
  abilityLevel: 2,          // null 가능
  abilityText: '...',       // ★ 'ability' 아님
  abilityKey: 'venom',
  note: null,
}
```

**UI에서 카드 렌더링 시:**
```js
// 타입 접근
const types = card.types ? card.types : (card.type ? [card.type] : []);
// 능력 텍스트
card.abilityText || card.ability
// appeal null 방어 (핫삼 1장)
card.appeal ?? 0
```

### 스폰서카드 (`data/cards-sponsors.js`)

```js
{
  id: 'sp_콘',
  kind: 'sponsor',
  name: '콘',
  level: 3,                 // ★ cost 필드 없음 — level만 있음
  abilityText: '수입: ...',
  abilityKey: 'manual',     // 64장 전부 'manual' (자동화 미완)
  condition: null,
  icon: null,
}
```

### 보존프로젝트카드 (`data/cards-legendary.js`)

```js
{
  id: 'leg_가이오가',
  kind: 'legendary',
  type: 'icon',             // 'icon' | 'release'
  name: '가이오가',
  requirement: '사파리존에 물 타입 아이콘 필요',
  iconLabel: '물 타입 아이콘',
  tiers: {
    counts: [5, 4, 2],      // 조건 달성 기준
    points: [4, 3, 2],      // 획득 보존점수
  },
  verified: false,
}
```

### 최종점수카드 (`data/cards-finalscoring.js`)

```js
// 자동 계산되는 3장
{ id: 'fs_masterball', thresholds: [...], rewards: [...] }  // 큰 포켓몬(4+) 수
{ id: 'fs_monsterball', thresholds: [...], rewards: [...] } // 작은 포켓몬(2-) 수
{ id: 'fs_contacts', thresholds: [...], rewards: [...] }    // 스폰서 카드 수

// 수동 집계 8장 (special 필드 있음)
{ id: 'fs_pokedex',       special: 'compare_right_player_types' }
{ id: 'fs_learningdevice',special: 'checklist' }
// 나머지 6장: metric 텍스트 있음, thresholds/rewards 있음, 집계 로직만 없음
```

---

## 핵심 설계 결정 — 왜 이렇게 돼 있는지

### 협회 업무 비용 공식
아크노바 룰을 잘못 구현하면 틀리는 부분.  
**강도를 "소비"하는 게 아니라, 각 업무마다 "최소 요구 강도"가 있음.**

```js
// engine.js resolveAssociation
// task.value = 업무 가치 (명성=2, 파트너동물원=3, 대학=4, 보존프로젝트=5)
// II면: 모든 업무 value 합이 budget 이하여야 함
// I면: 업무 1개만, budget >= task.minStrength 이면 수행 가능
```

### 필드명 불일치 수정 이력
초기 코드에서 틀렸다가 수정됨:
- `card.types` → `card.type` (단수)
- `card.requiresWater` → `card.waterReq`
- `card.requiresRock` → `card.rockReq`
- `card.ability` → `card.abilityText`
- `card.cost` (스폰서) → 존재하지 않음, `card.level` 사용

### state.js의 비동기 문제 (수정 완료)
초기 버전에서 `import('./board.js').then(...)` 비동기로 starterKiosk를 설정했음.  
현재는 `ui.js`의 `setupStarterKiosk()` 함수에서 동기로 처리.

```js
// ui.js
function setupStarterKiosk() {
  if (!game.map.starterKiosk) return;
  const { q, r } = game.map.starterKiosk;
  game.players.forEach(p => {
    p.zooBuildings.set(Board.key(q, r), {
      kind: 'kiosk', size: 1, occupied: false, cells: [{ q, r }],
    });
  });
}
```

### 아이콘 집계 (`rebuildIconCounts`)
동물/스폰서 카드를 배치할 때마다 호출해야 함.  
보존 프로젝트 조건 판정, fossil/stubborn 능력 계산에 사용.

```js
// state.js
player.iconCounts = {
  water, fire, grass, fighting, psychic, fossil,  // 타입별
  '관동', '성도', '호연', '신오', '하나',           // 지역별
}
// 동물카드의 type은 단수이므로 [card.type]으로 감싸야 함
```

### 지도 좌표계
헥스 axial 좌표 (q, r). 키는 `"q,r"` 문자열.

```js
Board.key(q, r)          // → "-4,2"
Board.tileAt(map, q, r)  // → {q, r, type, bonus?}
Board.neighbors(q, r)    // → [{q,r}, ...] 6개
Board.canPlaceBuilding(map, zooBuildings, cells, isFirstEver)
Board.adjacentWaterRockCounts(map, cells)  // → {water, rock}
```

- **F13 (바위 압벽)**: starterKiosk `{q:-4, r:2}`. 얼음 테마.
- **F15 (테라포밍 구역)**: starterKiosk `{q:1, r:-4}`. 매 휴식마다 바위+물 타일 1개씩 추가.

---

## 현재 자동화 현황

### 동물카드 127장

| 구분 | 장수 |
|---|---|
| 능력 없음 | 9장 |
| **완전 자동 처리** | **106장** |
| UI 선택 필요 (로직 완성, 모달만 없음) | 12장 |
| manual | 0장 |

### 자동화된 41개 abilityKey (abilities.js)

```
venom, discard_for_money, shy_region, mischief_take_from_display,
copycat_use_leader_action, sell_cards, timid_constrict_ahead,
draw_from_deck, shuffle_discard_draw, effort_place_action_card,
docile_multiplier_sponsors, trade_hand_for_card, dignified_final_score_pick,
lonely_share_enclosure, docile_sponsors_plus_lonely, diligent_sponsors,
calm_take_base_legend, coward_appeal_per_card, arrogant_take_all_sponsors,
mood_place_action_card, impatient_break_money, bold_xtokens_per_icon,
carefree_take_from_leader, naive_take_fire_legend, carefree_two_targets,
gain_xtoken, diligent_cards, docile_multiplier_cards, stubborn_appeal_per_type_icon,
naughty_peek_take, bold_xtoken_per_special_plus_hire, docile_association_plus_hire,
hire_worker, diligent_association, docile_multiplier_build, free_kiosk_pavilion,
prudent_free_special_build, draw_keep_discard, extra_action, diligent_build,
fossil_appeal_per_icon
```

### 스폰서카드 64장 — 전부 `abilityKey: 'manual'`

패턴별 분류 (자동화 우선순위):

| 패턴 | 장수 | 대표 카드 | 다음 작업 |
|---|---|---|---|
| 수입형 | 10장 | 콘, 팟, 풍&란, 덴트, 실버, 간호순 | 쉬움. 아이콘 집계 후 수식 |
| 트리거형 (때마다) | 31장 | 털보박사, 강연, 민지, 민화, 블레리 | 보통. 이벤트 구독 패턴 |
| 지형형 (연결/이어진) | 4장 | 호일, 담죽, 태홍, 일목 | 보통. 맵 탐색 필요 |
| 즉시형 | 9장 | 수호, 성호, 꼭두 | 쉬움 |
| 복잡형 | 10장 | 강집, 국화, 아강, 마적 | 어려움, 개별 구현 |

---

## 다음 작업 진입점 (우선순위 순)

### 1. 동물카드 UI 모달 12장 — `ui.js` 수정

**개구쟁이** (대검귀/라프라스 등 6장): 포획 완료 후 필드 카드 선택 모달
```js
// abilities.js에서 이미 ctx.prompts에 추가하거나 player._pendingAfterFinishing 설정됨
// ui.js의 포획 액션 완료 후 아래 처리 추가:
if (player._pendingAfterFinishing) {
  // type === 'mischief' 이면 필드 카드 선택 모달 표시
  // 선택한 카드: player.hand.push(card), game.display.splice(i,1)
}
```

**내구** (로즈레이드 등 5장): 매점 or 파빌리온 위치 선택
```js
// type === 'free_kiosk_pavilion' 이면
// 맵에서 위치 클릭 → Engine.resolveBuild(game, player, {side, buildings:[...], xTokens:0})
// 단, cost 계산 전에 player.money += size*2 로 비용 보전 후 건설
```

**신중** (메가니움 1장): 대습지초원(largeBirdAviary) 위치 선택
```js
// type === 'free_special_build', kind === 'largeBirdAviary'
// 맵에서 5칸 선택 → 무료 건설
```

### 2. 스폰서카드 수입형 10장 — `cards-sponsors.js` + `abilities.js`

`cards-sponsors.js`에서 해당 카드 `abilityKey`를 `'manual'`에서 교체:

```js
// 콘, 팟, 풍&란, 덴트 → 'income_icon_money'
// 간호순 → 'income_per_break' (abilityAmount: 1)
// 실버 → 'income_xtoken'
```

`abilities.js`에 핸들러 추가:
```js
HANDLERS['income_icon_money'] = (game, player, card) => {
  // abilityText 파싱: "물 타입 아이콘 1/3/6개마다 3/6/9 획득"
  // iconCounts[type] 집계 후 단계별 수익 계산
  // 휴식마다 동작 → income_per_break 패턴으로
};
```

### 3. 최종점수카드 — `engine.js` `evaluateFinalScoringCard` 함수 확장

```js
// fs_fishingrod: 지도 물 칸 인접 건물 수 집계
//   → player.zooBuildings 순회하며 Board.adjacentWaterRockCounts() 활용
// fs_bicycle: 바위 칸 인접 건물 수
// fs_map: 빈 칸 수 = 전체 빈 타일 - 건물이 없는 타일
// fs_pokedex: 오른쪽 플레이어(game.players[(idx+1)%n]) 타입 수 비교
```

---

## game 객체 구조

```js
game = {
  players: Player[],
  map: { id, name, theme, tiles, starterKiosk, specialRule },
  deck: Card[],
  discard: Card[],
  display: Card[],          // 6장 유지
  breakTrack: { length, position },
  conservationProjectsInPlay: Card[],
  baseConservationProjects: Card[],
  associationBoard: {
    partnerZoosAvailable: ['관동','성도','호연','신오','하나'],
    universitiesAvailable: [...],
    donationsFilled: 0,
  },
  currentPlayerIndex: 0,
  phase: 'setup'|'playing'|'lastRound'|'scoring',
  turnNumber: 1,
  log: [{turn, text}],
}
```

## player 객체 구조

```js
player = {
  id, name, color,
  money: 25,
  appeal: 0,          // 0~113
  conservation: 0,    // 0~41
  reputation: 0,      // 0~15
  xTokens: 0,         // 0~5
  associationWorkers: { active: 1, resting: 3 },
  handLimit: 3,       // 대학 획득 시 5
  hand: Card[],
  playedAnimals: Card[],
  playedSponsors: Card[],
  partnerZoos: ['관동', ...],
  universities: ['일반대학', ...],
  zooBuildings: Map<"q,r", {kind, size, occupied, cells}>,
  conservationTokensAvailable: 7,
  actionSlots: [{slotIndex, actionType, side}],  // 순서가 강도
  finalScoringCards: Card[],
  iconCounts: { water, fire, grass, fighting, psychic, fossil, 관동, 성도, 호연, 신오, 하나 },
  tokensOnActionCards: { [actionType]: {multiplier?} },
  // 능력 처리용 임시 플래그
  _pendingAfterFinishing?: [{type, card, ...}],
  _pendingExtraAction?: boolean | actionType,
  _pendingFreeBuilding?: {kinds},
  _pendingConservationBonus?: milestone,
  _venomTokens?: number,
  _constrictionTokens?: number,
}
```

---

## 알려진 미구현/제한

| 항목 | 상태 | 파일 |
|---|---|---|
| 스폰서 64장 능력 | 전부 manual | cards-sponsors.js, abilities.js |
| 최종점수카드 8장 | 수동 집계 | engine.js evaluateFinalScoringCard() |
| 동물카드 12장 UI 모달 | 로직 완성, 모달만 없음 | ui.js |
| BoardMate Arcade 멀티플레이 | 스텁 | network.js ArcadeAdapter |
| 지식 트랙 | 미구현 (다우징 머신 관련) | — |

---

## 테스트 방법

```bash
# Node.js로 엔진 테스트 (브라우저 없이)
cd pocketnova2
node --input-type=module << 'EOF'
const { createGame, currentPlayer } = await import('./js/state.js');
const Engine = await import('./js/engine.js');
const Board = await import('./js/board.js');

const game = createGame({ playerNames:['재원','수현'], mapId:'F13' });
game.phase = 'playing';
const {q,r} = game.map.starterKiosk;
game.players.forEach(p => {
  p.zooBuildings.set(Board.key(q,r), {kind:'kiosk',size:1,occupied:false,cells:[{q,r}]});
  game.discard.push(...p.hand.splice(4));
});
const p = game.players[0];
Engine.resolveCards(game, p, {side:'I', mode:'draw', discardIndices:[]});
Engine.checkAndRunBreak(game);
console.log('OK — 매력도:', p.appeal, '돈:', p.money);
EOF
```
