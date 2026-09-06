# 02. 아키텍처와 데이터 흐름

## 기준 구조

```text
arena/
├─ index.html / app.js                 BoardMate Arcade
├─ config.js                           Supabase 설정
├─ multi-common.js                     다인플 공통 상태/RPC/폴링
├─ solo-pocketnova.html                solo iframe wrapper
├─ online-pocketnova.html              online iframe + Supabase bridge
└─ pocketnova/
   ├─ index.html                       Pocket Nova 본체 진입점
   ├─ css/
   │  ├─ style.css                     원본 v3 UI
   │  └─ image-layer.css               v11.x 이미지 overlay
   ├─ data/
   │  ├─ cards-animals.js
   │  ├─ cards-sponsors.js
   │  ├─ cards-legendary.js
   │  ├─ cards-finalscoring.js
   │  └─ actionCards.js
   ├─ js/
   │  ├─ config.js                     수치 테이블
   │  ├─ board.js                      F13/F15 + hex logic
   │  ├─ state.js                      game/player state
   │  ├─ engine.js                     actions/break/scoring
   │  ├─ abilities.js                  card abilities
   │  ├─ network.js                    Pocket Nova network adapter
   │  ├─ ui.js                         render/input
   │  ├─ asset-matcher.js              v11.x image matching
   │  └─ image-layer.js                v11.x DOM image overlay/workbench
   ├─ assets/                          webp + indexes/audit metadata
   └─ tools/                           validation/core patch scripts
```

## 온라인 상태 흐름

```text
Pocket Nova iframe
  └─ postMessage({type:'game_state', state:<serialized string>})
        ↓
online-pocketnova.html
  └─ wrapper state = {
       kind: 'pocketnova-v3-boardmate',
       payload: <serialized string>,
       currentSeat,
       phase,
       turnNumber
     }
        ↓
multi-common.js / Supabase
        ↓
other browser polls/realtime state
        ↓
online-pocketnova.html
  └─ postMessage({type:'game_state', state: payload})
        ↓
Pocket Nova iframe
```

### 온라인 호환성 불변조건

- `kind: 'pocketnova-v3-boardmate'`를 버전 계획 없이 변경하지 않는다.
- `payload`는 Pocket Nova가 소유하는 직렬화 문자열로 유지한다.
- 이미지 매핑/이미지 표시 상태를 `payload`에 섞지 않는다.
- 이미지 자산 실패가 game state 저장/턴 진행을 막으면 안 된다.
- 상태 포맷을 바꿀 때는 이전 방 migration 또는 명시적 새 방 요구 중 하나를 설계한다.

## 이미지 레이어의 경계

v11.x 이미지 기능은 **presentation-only**가 원칙이다.

```text
Game state / rules  <---절대 의존 금지---  Image mapping/localStorage
       ↑                                    ↓
 engine/state/ui                    image-layer.js
```

- `builtin-image-mappings.js`: 검증된 기본 매핑만 넣는다.
- `source-card-audit.js`: 원본과 v3 규칙의 대응 상태를 기록한다.
- `core-fix-status.js`: core rule fix가 실제 적용됐는지 표시한다.
- `image-layer.js`: `core-fix-status`가 필요한 카드 이미지는 gate한다.
- 사용자 수동 매핑은 localStorage/BroadcastChannel에만 저장한다.

## 카드 데이터에서 중요한 필드

### 동물

- `type` 단수. 과거 코드의 `types`만 읽으면 안 됨.
- `regions` 배열.
- `enclosureSize`.
- `waterReq`, `rockReq`는 **배치 인접 요구조건**이지 카드 타입 아이콘이 아니다.
- `abilityText`, `abilityKey`.

### 도움(스폰서)

- `level`이 비용/강도 기준이며 일반 `cost` 필드에 의존하면 안 됨.
- `abilityKey: 'manual'`이면 자동 해결되지 않는 카드다.

### 전설/보존 프로젝트

- `tiers.counts`, `tiers.points`가 핵심.
- 현재 32장 placeholder이므로 원본 검증 전 일괄 수정 금지.

### 최종점수

- `thresholds/rewards` 또는 `special`을 사용.
- 원본 이미지와 v3의 metric/threshold가 같은지 반드시 audit한 뒤 자동 이미지를 붙인다.
