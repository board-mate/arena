# 01. 현재 개발 상태

## 상태 등급

`PLAYABLE_PROTOTYPE / NOT_RULES_COMPLETE / ONLINE_E2E_UNVERIFIED`

### 무엇이 가능한가

- Pocket Nova v3 화면을 정적 웹서버에서 실행할 수 있다.
- 로컬 hotseat용 게임 구조가 있다.
- BoardMate solo wrapper와 online wrapper가 존재한다.
- 온라인 wrapper는 iframe에서 전달된 직렬화 게임 상태를 BoardMate/Supabase 상태로 저장하고, 다른 클라이언트의 변경을 다시 iframe으로 보낸다.
- 동물/행동/지도 및 일부 카드 이미지를 표시할 수 있는 v11.7 이미지 레이어가 있다.
- 이미지 개인 매핑은 게임 상태와 분리되어 localStorage/BroadcastChannel에 저장된다.
- v11.7 core fixer로 현재 데이터 스키마에 맞는 타입 아이콘 집계와 `다우징 머신` 명성 점수 계산을 적용할 수 있다.

### 무엇이 아직 완성되지 않았는가

1. **전설/보존 프로젝트 32장**
   - 현재 공개 `cards-legendary.js`는 모든 카드가 공통 placeholder tier를 사용한다고 명시한다.
   - 원본 이미지별 tier를 검증하기 전에는 완성 룰로 볼 수 없다.

2. **도움(스폰서) 64장**
   - 텍스트는 들어 있으나 다수가 `abilityKey: 'manual'`이다.
   - 일부 수입/트리거 효과만 자동화되어 있다.
   - 따라서 플레이 중 사람이 카드 텍스트를 보고 수동 처리해야 하는 경우가 많다.

3. **최종점수 11장(v3)**
   - 원본과 확정 대응: `지도`, `포케 도감`; `다우징 머신`은 v11.7 core fix 후 확정.
   - 알려진 mismatch: `낚싯대`, `자전거`, `연락처`.
   - 나머지 일부는 원본 13장과 1:1 의미 대응을 아직 확정하지 않았다.

4. **동물 카드 일부 UI 선택 효과**
   - Pocket Nova v3 원본 README는 일부 ability가 로직은 있으나 UI 선택/모달이 필요한 상태라고 기록한다.
   - v11.8 시작 시 실제 현재 `ui.js`와 대조하여 남은 개수를 재검증한다.

5. **온라인 실전 검증**
   - `online-pocketnova.html`의 상태 bridge는 존재한다.
   - 하지만 v11.7 적용 상태에서 실제 GitHub Pages + Supabase 두 브라우저로 방 생성→턴 진행→재접속→종료/ELO까지의 E2E 완료 증거는 없다.

## v11.7에서 확정적으로 추가된 것

- 이미지 asset layer / 확대 / 수동 매핑 작업대
- 동물 234장 OCR 역검색 인덱스
- F13/F15 원본 지도 참조 이미지 연결
- 13장의 실제 최종점수 원본 자산 재분류 및 sourceName
- 원본 카드 ↔ v3 규칙 audit metadata
- 안전한 자동 이미지 매핑 3건만 유지
- `rebuildIconCounts()` 스키마 수정용 fail-closed patcher
- `fs_dowsing`을 `player.reputation`으로 계산하는 patcher
- core fix 적용 여부에 따른 이미지 gate
- 매핑 v2 localStorage + BroadcastChannel 탭 동기화
- asset/matcher/core patch regression tests

## 정적 검증 결과

v11.7 전달본에서 다음은 통과했다.

- asset matcher regression
- core patch: 1회 적용 / idempotent / unknown upstream fail-closed
- asset catalog: animals 234 / sponsors 81 / projects 36 / finals 13 / maps 24
- action card faces 10
- animal trust boundary: verified names 18 / placeholders 216 / OCR 234
- workbench names: sponsors 64 / projects 32 / finals 11
- source audit: verified 2 / verified-after-core-fix 1 / mismatch 3

이 검증은 **전체 게임 룰의 정확성 검증이 아니다.**
