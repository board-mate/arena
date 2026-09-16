# BoardMate Arena V11.4.75
## BGG Rule Audit 2

기준 버전: **V11.4.74**

이번 패치는 BoardGameGeek의 게임 페이지 / Community Wiki / FAQ와 현재 BoardMate 구현을 다시 대조해서,
실제 플레이 결과에 영향을 주는 규칙 오류를 우선 수정했습니다.

> 참고 원칙: BGG/규칙서의 이미지는 게임 구조와 규칙 확인용으로만 사용했습니다.
> 신규 PNG/JPG/WebP 자산은 추가하지 않았습니다.

## 1. 사무라이 (`online-samurai.html`)

- 종료 조건(한 종류 조각 전부 제거 / 동점 제거 4개)이 발생하더라도 **즉시 게임을 끊지 않도록 수정**
  - 종료 조건이 발생한 현재 플레이어는 남아 있는 빠른 타일을 포함해 자신의 턴을 끝까지 진행
  - `턴 종료` 시 최종 게임 종료 처리
- Figure Exchange(조각교환) 후 교환된 두 지역이 이미 둘러싸여 있으면 즉시 포획 판정
- 한 종류 단독 다수만 가진 후보가 여러 명일 때 타이브레이커 수정
  - 나머지 두 세력 중 높은 수 → 낮은 수 → 총 포획 수 순서 비교
- 기존 판본 간 차이가 있는 “아무도 단독 다수가 없을 때” 처리는 기존 BoardMate 방식을 유지

BGG 참고:
- https://boardgamegeek.com/boardgame/3/samurai
- https://boardgamegeek.com/thread/2681751/final-word-on-reiner-knizias-samurai

## 2. 에어, 랜드 & 씨 (`online-airlandsea.html`)

BGG의 Revised Edition 카드 목록과 대조했을 때 Land/Sea의 4·5번 카드가 서로 잘못 배치되어 있던 문제를 수정했습니다.

### 정확한 카드 위치로 수정
- Land 4 = Cover Fire / 엄호 사격
- Land 5 = Disrupt / 방해
- Sea 4 = Redeploy / 재배치
- Sea 5 = Blockade / 봉쇄

### 능력 판정 수정
- Containment
  - 상대 카드뿐 아니라 **누구든** 뒷면 카드를 플레이하면 파괴
  - 자기 Containment 때문에 자기 뒷면 카드가 파괴되는 상황도 처리
- Blockade
  - Blockade 카드가 있는 **인접 전장**에 새 카드를 플레이할 때,
    그 목표 전장에 이미 다른 카드가 3장 이상이면 새 카드를 파괴
  - 앞면/뒷면 플레이 모두 적용
- 파괴된 카드를 남은 6장 덱에 되돌리던 오류 수정
  - 배틀 중 `destroyed` 영역으로 별도 관리
- Reinforce
  - 덱에서 가져온 뒷면 카드도 Containment / Blockade 판정 적용
  - 규칙에 없는 패스 제거
- Cover Fire
  - 모든 전장의 덮인 카드를 힘 4로 만들던 오류 수정
  - **Cover Fire 자신 아래에 놓인 카드만** 힘 4 적용
- Disrupt
  - 상대부터 뒤집던 순서를 **시전자부터**로 수정
  - 각 플레이어가 자신의 덮이지 않은 카드만 선택 가능
  - 뒤집어 앞면이 된 즉시 능력이 있으면 그 능력을 먼저 완전히 해결한 뒤 Disrupt의 다음 절차 진행
- Transport
  - 자기 카드만 이동 대상으로 선택하도록 제한

BGG 참고:
- https://boardgamegeek.com/boardgame/247367/air-land-and-sea
- https://boardgamegeek.com/wiki/page/thing%3A247367%3Amoreinfo

## 3. 맨덤의 던전 (`online-mandom.html`)

- 다음 라운드 시작 플레이어 수정
  - 기존: 직전 도전자 **다음 사람**
  - 수정: 직전 라운드에 실제로 던전에 들어간 **도전자 본인**
  - 단, 그 도전자가 두 번째 실패로 탈락했다면 다음 생존자가 시작

BGG 참고:
- https://boardgamegeek.com/boardgame/150312/welcome-to-the-dungeon

## 4. 더 게임 (`online-thegame.html`, `solo-thegame.html`)

- “다음 플레이어가 최소 필요 장수만큼 낼 수 있는가?” 판정 수정
- 기존에는 현재 보드에서 즉시 가능한 카드 수만 세어서 잘못 패배 처리할 수 있었음
- 이제 실제로 카드를 한 장 내려 더미 값이 바뀐 뒤 **두 번째 카드가 합법이 되는 경우까지 순차 탐색**
- 같은 카드가 여러 더미에 놓일 수 있다는 이유로 가능한 카드 수를 중복 계산하던 1인플 오류도 수정

BGG 기준:
- 덱이 남아 있으면 차례당 최소 2장
- 덱이 비면 최소 1장
- ±10 되돌리기 규칙 포함

BGG 참고:
- https://boardgamegeek.com/boardgame/173090/the-game

## 5. 메인 화면

- 1인플 게임 요약 목록에 `콘세르바스` 누락되어 있던 표시 수정
- 앱/Service Worker 캐시 버전 → `11.4.75`

## 변경 파일

- `app.js`
- `index.html`
- `sw.js`
- `HANDOFF_VERSION.txt`
- `online-samurai.html`
- `online-airlandsea.html`
- `online-mandom.html`
- `online-thegame.html`
- `solo-thegame.html`
- `README_V11_4_75_BGG_RULE_AUDIT_2.md`

## DB 변경

**없음.** Supabase SQL 실행은 필요하지 않습니다.

## 적용

V11.4.74 기준 저장소 루트에 위 파일을 그대로 덮어쓴 뒤 push 하면 됩니다.

## 검증

- 변경된 HTML 내부 JavaScript `node --check` 통과
- `app.js` 구문 검사 통과
- 에어, 랜드 & 씨 카드 ID/능력 위치 정적 검증
- 더 게임의 “첫 카드 이후 두 번째 카드가 합법이 되는 경우” 순차 탐색 회귀 테스트 통과
- 신규 이미지 asset 0개
