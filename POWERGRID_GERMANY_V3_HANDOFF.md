# Power Grid Germany β v3 — 개발 인수인계


## 0. 직접 적용 기준

이 handoff의 `repo-overlay`는 **BoardMate integrated v11.4.8에서 직접 적용 가능**합니다.
v11.4.9를 선행 설치할 필요가 없습니다. v11.4.9에서 추가됐던 Power Grid 기반 파일과 v11.4.10 Germany v3 변경이 모두 포함되어 있습니다.

v11.4.8 DB에서는 `SUPABASE_POWERGRID_UNIFIED.sql`을 1회 실행해야 합니다. `config.js`는 overlay에 포함하지 않으므로 기존 운영 설정을 보존합니다.

## 1. 현재 목표

파워그리드는 이제 **다인플만 개발**합니다. AI/솔로는 범위 밖입니다.
독일맵을 먼저 완성하고 검증한 뒤에만 미국 → 한국 순으로 확장합니다.

## 2. 현재 실행 구조

```text
BoardMate 방 (powergrid, 2~6명)
  ↓
online-powergrid.html
  ↓
powergrid/data/germany-map.js
  ↓
powergrid/engine.js  ← 순수 상태/규칙
  ↓
powergrid/ui.js      ← DOM/UI
  ↓
multi-common.js
  ↓
boardmate_room_state + Realtime revision broadcast
```

Broadcast에는 state를 싣지 않고 revision만 전송하며, 상태는 기존 권한 RPC로 재조회합니다. 이 공통 구조를 깨지 마세요.

## 3. Power Grid state

현재 kind:

```text
powergrid-v3-germany-boardmate
```

주요 map 필드:

```js
map: {
  mode: 'auto',
  boardId: 'germany',
  regionIds: ['red','blue','yellow'],
  cityNames: ['OSNABRUCK', ...]
}
```

v2 state는 자동 migration하지 않습니다. 온라인 페이지가 v2를 감지하면 host setup 화면으로 돌아가 새 v3 state로 덮어쓰게 합니다.

## 4. 독일 지도 데이터

`powergrid/data/germany-map.js`

- 도시: 42
- 지역: 6 × 7도시
- 연결: 83
- 연결비: 가중치 포함
- UI 좌표: 사용자 제공 `germany.webp` 675×900 기준

Network source는 Richard Darst의 board-game-networks Germany dataset입니다(CC-BY 4.0). Upstream README는 데이터 정확성 무보증/미검증을 경고하고 Germany entry에도 Recharged 보드와 동일한지 확인 필요라는 fixme가 있습니다.

따라서 데이터는 **구현 기준 후보**로 사용하되 `powergrid/tools/germany_map_debug.html`로 사용자 제공 보드와 83개를 전수 확인해야 합니다.

이번 단계에서 바로잡은 source 표기 차이:

- Hanover → Hannover
- Dressen → Dresden
- source의 Purple section이 node color를 blue로 기록한 부분 → 실제 보드 기준 purple로 복원
- Frankfurt-O / Frankfurt-M → 각각 `FRANKFURT_ODER`, `FRANKFURT_MAIN`으로 내부 ID 분리

## 5. 건설비 계산

첫 도시는 연결비 0 + 도시 슬롯 10.
그 다음부터 선택 지역의 그래프 안에서 자신의 기존 도시들 중 대상까지 최저 비용을 계산합니다.

```text
총 건설비 = 최저 연결비 + 현재 도시의 비어 있는 슬롯 비용(10/15/20)
```

다른 플레이어가 점유한 도시는 경로를 막지 않습니다. 다만 Step에 따른 도시 정원이 차면 그 도시에 새 집은 놓을 수 없습니다.

## 6. 지역 선택

현재 엔진 상수:

```text
2인 3지역
3인 3지역
4인 4지역
5인 5지역
6인 5지역
```

Host setup에서 정확한 수를 고르고, 선택 지역들이 그래프상 연결되어 있는지 검사합니다.
선택하지 않은 지역의 도시를 Dijkstra 경로가 통과하지 못하도록 처리했습니다.

## 7. 이번 버전에서 제거한 것

- `solo-powergrid.html`
- 1인플 메뉴의 파워그리드 카드
- AI 결정/자동 진행 API
- 프로토타입 가상 지도 선택
- 미국/한국 게임 시작 선택
- 실제 지도 수동 연결비 입력 액션

미국/한국 이미지 자산이 이전 repo에 남아 있어도 현재 runtime은 참조하지 않습니다.

## 8. 알려진 플레이 정확도 경계

현재 Germany v3는 방 생성 → 경매 → 자원 구매 → 도시 건설 → 자동 관료 정산 → 다음 라운드의 상태 흐름을 갖고 있어 테스트 플레이가 가능합니다. 다만 다음은 아직 공식 룰 전수 감사 전입니다.

- 발전소 초기 시장/덱 및 인원별 카드 제거 수치
- 할인 발전소 처리
- Step 2/3 전환 타이밍과 시장 처리
- 인원/Step별 자원 보충량
- 종료 도시 수와 마지막 관료 단계
- 관료 단계에서 어떤 발전소를 가동하고 어떤 연료를 소비할지에 대한 플레이어 선택 자유도. 현재 엔진은 최대 공급 도시 수를 기준으로 자동 조합을 선택하므로 자원 보존 의사결정과 차이가 날 수 있습니다.

따라서 현재 표기는 `PLAYABLE_BETA_AFTER_SUPABASE_MIGRATION`이지 `RULES_COMPLETE`가 아닙니다.

## 9. P0 — 다음 개발자가 먼저 할 일

1. `powergrid/tools/germany_map_debug.html`로 83개 edge/cost를 사용자 제공 보드와 전수 대조.
2. `POWERGRID_GERMANY_EDGE_AUDIT.csv`의 `visual_status`를 `verified`로 하나씩 변경.
3. 도시 마커 좌표를 모바일/PC 양쪽에서 보드의 도시 중심에 맞게 미세 조정.
4. v2에서 상속한 공식 룰 수치 전수 감사:
   - 초기 발전소 시장/덱
   - 인원별 발전소 카드 제거
   - 할인 발전소 처리
   - Step 2/Step 3 전환 타이밍
   - 자원 보충량
   - 게임 종료 도시 수와 마지막 관료 단계
5. 실제 2/3/4/5/6 브라우저 온라인 E2E.
6. 재접속, revision conflict, Realtime 끊김 → 10초 fallback 검증.

## 10. 완료 기준

독일맵을 `PLAYABLE`로 승격하려면 최소:

- 42도시 이름/지역 100% 확인
- 83연결/비용 100% 확인
- 2~6인 지역 선택 검증
- 공식 룰 세팅/Step/보급 표 감사 완료
- 2~6인 E2E 중 최소 2인과 6인 완주
- 모바일에서 지도/도시 선택 가능
- 재접속 후 동일 state 유지

## 11. 금지선

- 독일 검증 전에 미국/한국을 다시 활성화하지 말 것.
- AI/솔로 코드를 다시 공용 engine에 섞지 말 것.
- 연결비가 불확실하면 추측해서 확정하지 말 것.
- `multi-common.js`의 revision-only Broadcast 구조를 파워그리드 때문에 별도 변형하지 말 것.
- `service_role` key를 client/config에 넣지 말 것.
