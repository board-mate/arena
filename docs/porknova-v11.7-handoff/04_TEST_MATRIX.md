# 04. 테스트 매트릭스

## P0 — 개발 시작 전 반드시

| ID | 테스트 | 기대 결과 |
|---|---|---|
| P0-01 | `node pocketnova/tools/test_asset_matcher.mjs` | PASS |
| P0-02 | `python pocketnova/tools/test_v11_7_core_patch.py` | PASS |
| P0-03 | `python pocketnova/tools/validate_image_assets.py` | 전체 PASS |
| P0-04 | `pocketnova/tools/image_layer_smoke.html` | `PASS=true` |
| P0-05 | `assets/core-fix-status.js` 확인 | `applied:true` (core patch 후) |
| P0-06 | 로컬 새 게임 시작 | setup→playing 진입, console fatal 없음 |

## P0 — 온라인 릴리스 전 반드시

두 브라우저/두 계정 또는 일반창+독립 프로필로 수행.

1. 새 포크노바 방 생성
2. 플레이어 A/B 입장 및 좌석 확인
3. 방장 초기 설정
4. A가 행동 1회 → B 화면에 동일 상태 반영
5. B가 행동 1회 → A 화면에 동일 상태 반영
6. 한 브라우저 새로고침 → 저장 상태 복구
7. 한 브라우저 닫았다 재접속 → 같은 방/같은 상태 복구
8. 연속으로 여러 행동하여 revision 충돌/되감김 없는지 확인
9. 게임 종료 상태에서 양쪽 scoring 화면 확인
10. `game_result`가 한 번만 제출되고 중복 ELO 반영 없는지 확인

### 기록할 것

- 방 ID
- 두 브라우저 종류/버전
- 시작/종료 시각
- 문제 발생 직전 turnNumber/currentSeat/revision
- console error
- Supabase state row의 `kind`, `revision`, `phase`

## 룰 회귀 테스트

### 아이콘 집계

- 물 타입 동물 `type:'water'`, `waterReq:3`인 경우 물 타입 아이콘은 **1**로 집계되어야 한다.
- `waterReq`를 3개의 물 아이콘으로 세면 실패.
- `regions`는 각 지방 아이콘으로 집계.

### 다우징 머신

- core fix 적용 후 `player.reputation` 6/9/12/15에서 1/2/3/4점.
- 6 미만은 0점.

### 이미지

- 이미지 로드 실패가 카드 클릭/행동을 막지 않아야 한다.
- 사용자가 수동 연결한 mapping이 builtin보다 우선.
- 외부 URL / `../` traversal 매핑 import는 거부.
- 같은 origin의 다른 탭에서 mapping 변경이 동기화.

## 다음 카드 자동화 테스트 원칙

새 카드 자동화를 추가할 때는 최소 다음 3층을 나눈다.

1. **data test**: 카드 필드가 원본과 일치
2. **pure rule test**: DOM 없이 effect/scoring 함수 검증
3. **UI/E2E test**: 사용자의 선택이 필요한 경우 modal/board click 검증

UI에서 맞아 보인다는 이유만으로 룰 구현 완료 판정을 내리지 않는다.
