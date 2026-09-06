# 06. 다음 작업 — v11.8 권장 순서

## 목표

v11.8의 목표는 “이미지를 더 많이 붙이기”보다 **게임을 실제로 완주했을 때 규칙 결과를 신뢰할 수 있는 범위를 늘리는 것**이다.

## 1순위 — 전설/보존 프로젝트 32장 placeholder 제거

### 산출물

- `source-project-audit.js` 또는 JSON
- 각 v3 project id ↔ 원본 image asset 대응
- 원본 `counts/points/requirement/type` 기록
- confidence/status: `verified | mismatch | unresolved`
- verified 카드만 `cards-legendary.js`에 반영
- 카드별 pure test

### 완료 조건

- 32장 모두 `verified` 또는 명시적인 `unresolved` 상태를 가진다.
- shared placeholder가 남아 있다면 UI에 “미검증” 표기가 있어야 한다.
- 추측값 0개.

## 2순위 — 도움 카드 자동화 감사

먼저 현재 64장을 다음으로 분류한다.

- already automated and tested
- automated but UI choice missing
- manual-simple
- manual-trigger
- manual-map/spatial
- manual-complex

`manual-simple`부터 처리한다. 자동화할 때 카드 텍스트, trigger timing, 대상 player, income/break timing을 각각 테스트한다.

## 3순위 — 최종점수 11장 확정

- 이미 verified: 지도, 포케 도감
- core-fix verified: 다우징 머신
- mismatch 3장: 정답 source/rule 결정 후 수정
- 미확정 5장: 원본 대응 결정
- `이상한 알`은 egg 데이터 모델이 확정되기 전 숫자 계산을 만들지 않는다.

## 4순위 — 동물 UI 선택 ability 재감사

Pocket Nova v3 README가 지적한 pending choice UI를 실제 현재 `ui.js` 기준으로 재검사한다.

- field card selection
- free kiosk/pavilion placement
- free special enclosure placement
- discard/select/target 효과

룰 함수와 UI 모달을 분리하여 테스트한다.

## 5순위 — 온라인 E2E + 안정화

P0 online matrix 전부 수행.

추가로:

- 빠른 연속 저장에서 revision conflict
- 새로고침 직전/직후 pending save
- host가 나갔다 돌아오는 경우
- scoring 진입 직후 두 클라이언트 order 동일성
- 중복 result submit 방지

## v11.8에서 하지 말 것

- 전체 룰을 한 번에 대규모 rewrite
- 데이터/엔진/UI/네트워크를 한 commit에서 동시에 광범위 변경
- 원본 미검증 카드 자동 이미지 대량 매핑
- 테스트 없이 online state schema 버전 변경

## 권장 commit 단위

1. `audit: legendary source mapping`
2. `fix: verified legendary tiers batch 1`
3. `test: legendary scoring/eligibility`
4. `audit: sponsor automation matrix`
5. `feat: sponsor simple automation batch`
6. `fix: final scoring verified mismatches`
7. `test: online two-browser e2e notes`

각 commit은 되돌릴 수 있게 작게 유지한다.
