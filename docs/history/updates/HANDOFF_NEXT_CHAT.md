# BoardMate Arena 개발 인수인계 — 2026-09-07

## 1. 기준본

저장소: `https://github.com/board-mate/arena`

다음 작업의 기준은 반드시:

> **GitHub 현재본 + 이 ZIP의 repo-root overlay를 적용한 상태**

이다. ZIP에 포함된 파일을 GitHub의 이전 버전으로 되돌리지 않는다.

## 2. 이번 패키지에서 구현 완료한 소셜 디덕션 3종

### A. 레지스탕스 아발론

- 게임 ID: `avalon`
- 5~10인
- 페이지: `online-avalon.html`
- 실시간 방: `play_mode='realtime'`
- 서버 상태: `boardmate_social_games`
- RPC: `boardmate_social_init`, `boardmate_social_view`, `boardmate_social_action`

지원 역할:
- 멀린
- 퍼시벌
- 암살자
- 모르가나
- 모드레드
- 오베론
- 아서의 충성스러운 신하
- 모드레드의 하수인

제외:
- 랜슬롯
- 엑스칼리버
- 호수의 여신
- 기타 확장/선택 모듈

구현 규칙:
- 인원별 선/악 인원 자동 구성
- 인원별 임무 팀 크기 자동 처리
- 팀장 제안 → 전원 찬반 비밀 제출 후 동시 공개(개인별 찬반 공개)
- 동수는 부결
- 연속 5팀 부결 시 악 승리
- 임무팀만 임무 카드 제출
- 선 진영은 성공만 제출 가능
- 7인 이상 4번째 임무는 실패 2장 이상이어야 실패
- 임무 완료 후 성공/실패 카드 장수를 공개하고 임무별 결과 이력을 유지
- 5인 퍼시벌 사용 시 모르가나 또는 모드레드 중 하나를 함께 사용하도록 검증
- 선이 임무 3개 성공 시 암살 단계
- 암살자가 멀린을 맞히면 악 승리, 아니면 선 승리

비밀 역할 관계:
- 멀린은 모드레드를 보지 못함
- 멀린은 오베론을 포함한 나머지 악 진영을 봄
- 오베론은 다른 악과 서로 알지 못함
- 퍼시벌은 멀린/모르가나 후보를 구분하지 못한 채 봄

UI 요구 구현:
- `🎭 이번 판 역할` 버튼 상시 표시
- 역할 이름/수량만 공개, 역할-플레이어 매핑은 종료 전 비공개

### B. 시크릿 히틀러

- 게임 ID: `secrethitler`
- **기본판만**, 확장판 없음
- 5~10인
- 페이지: `online-secret-hitler.html`
- 실시간 방

구현:
- 자유당원 / 파시스트 / 히틀러 역할 자동 배정
- 5~6인 / 7~10인의 시작 정보 차이
- 정책 덱: 자유 6 / 파시스트 11
- 대통령 순환
- 수상 후보 자격/연임 제한
- 정부 Ja/Nein 동시 공개(개인별 투표 결과 표시)
- 선거 트래커 및 3회 실패 혼란 정책; 정부가 뽑힌 순간이 아니라 정책이 실제 시행될 때 트래커 리셋
- 대통령 정책 3장 → 1장 폐기
- 수상 정책 2장 → 1장 시행
- 당원 조사
- 특별 선거
- 정책 확인
- 처형
- 파시스트 정책 5장 이후 거부권
- 자유 정책 5장 / 히틀러 처형 자유 승리
- 파시스트 정책 6장 / 파시스트 정책 3장 이후 히틀러 수상 당선 파시스트 승리

보안:
- 정책 손패/폐기 내용은 공용 상태에 두지 않음
- 당원 조사 결과는 조사 대통령 개인에게만 반환
- 히틀러 특수 역할은 조사에서 공개하지 않고 당원만 공개

라이선스:
- 게임 페이지에 원작자와 CC BY-NC-SA 4.0 표기 포함

### C. 한밤의 늑대인간

- 게임 ID: `onenightwerewolf`
- 3~10인
- 페이지: `online-one-night-werewolf.html`
- 확장 없음

지원 역할 12종만:
- doppelganger / 도플갱어
- werewolf / 늑대인간 (최대 2)
- minion / 하수인
- mason / 프리메이슨 (사용 시 반드시 2장 한 쌍)
- seer / 예언자
- robber / 강도
- troublemaker / 말썽쟁이
- drunk / 주정뱅이
- insomniac / 불면증환자
- villager / 마을주민 (최대 3)
- tanner / 무두장이
- hunter / 사냥꾼

구현:
- 정확히 플레이어 수 + 3장 선택
- 나머지 3장은 중앙
- 방장이 역할 수량 선택
- 야간 단계는 모든 플레이어가 각 호출마다 확인 버튼을 눌러 실제 역할 보유자가 진행 속도로 노출되지 않게 함
- 도플갱어 복제 및 즉시 행동 역할 처리
- 단독 늑대인간 중앙 1장 확인
- 하수인/프리메이슨 정보
- 예언자: 플레이어 1장 또는 중앙 2장
- 강도 교환 + 새 카드 확인
- 말썽쟁이 다른 2명 교환
- 주정뱅이 중앙과 강제 교환, 새 카드 미확인
- 불면증환자 최종 카드 확인
- 낮 최종 비밀투표 → 모두 제출 후 동시 공개
- 최다득표 동률 사망
- 최고 득표가 1표뿐이면 아무도 죽지 않음
- 사냥꾼 연쇄 사망
- 최종 카드 기준 마을/늑대/하수인/무두장이 승리판정

UI 요구 구현:
- `🎭 이번 판 역할` 상시 표시
- 공개 창은 처음 투입된 카드 이름/수량만 표시
- 중앙 실제 카드/현재 카드 소유자는 종료 전 공개하지 않음

## 3. 클라이언트 / DB 구조

신규/수정 핵심 파일:

- `app.js`
- `online-avalon.html`
- `online-secret-hitler.html`
- `online-one-night-werewolf.html`
- `social/social-common.js`
- `social/social-deduction.css`
- `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
- `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

DB 설계:

`boardmate_social_games`
- `state`: 모든 참가자에게 공개 가능한 상태만 저장
- `secrets`: 역할, 정책 덱/손패, 개인 확인 정보 등 비밀 상태
- 클라이언트 SELECT 권한 없음
- `boardmate_social_view()`로 현재 사용자에게 허용된 데이터만 필터링
- `boardmate_social_action()`은 row lock으로 동시 행동을 직렬화

중요 보안 수정:
- 한밤의 늑대인간 도플갱어가 복제한 역할은 **원래 도플갱어 플레이어에게만** 개인 view로 반환하도록 제한함. 다른 플레이어 응답에 복제 역할이 노출되면 안 됨.

## 4. 기존 미커밋 패치 보존

### 포크노바

포함 파일:
- `pocketnova/index.html`
- `pocketnova/js/ui.js`

현재 상태:
- 사용자 환경에서 1인플이 실행되지 않는 문제가 아직 남아 있음.
- 이번 ZIP은 기존 미커밋 변경을 보존함.

다음 최우선 기존 작업:
1. `solo-pocketnova.html` 진입 링크 확인
2. `pocketnova/js/state.js`, `board.js`, `engine.js`, `network.js`, `config.js`, `image-layer.js`와 함께 실제 오류 재현
3. 새 게임 → 행동 → 27턴 진행 → 종료 → 새로고침 복구까지 확인

### 파워그리드 독일

포함 파일:
- `SUPABASE_POWERGRID_UNIFIED.sql`
- `SUPABASE_VERIFY_POWERGRID.sql`

이번 통합 패키지에서 Power Grid SQL의 게임 constraint/helper 목록이 소셜 3종을 제거하지 않도록 호환 수정되어 있음.

아직 남은 목표:
- 독일 맵 완전 자동화
- 발전소 시장/덱
- 경매
- 자원시장
- 최저 연결비
- Step 2/3
- 자원 보충
- 관료 단계
- 가동 발전소/연료 전략 선택 보존
- 종료/승자 판정
- 재접속/동기화 E2E

### 캘리코 다인플

`online-calico.html`은 기존 미커밋 패치를 그대로 보존한다.

반드시 유지:
- 시작 시 각 플레이어가 자기 후보 디자인 타일 4개 중 3개 선택
- 선택 순서대로 자기 퀼트의
  1. 위쪽
  2. 왼쪽 아래
  3. 오른쪽
  위치에 표시
- 상대방은 후보/선택 내용이 아니라 준비 완료 여부만 봄
- 모든 플레이어가 완료해야 방장이 시작 가능

## 5. Supabase 적용 순서

Power Grid DB 패치 미적용 환경:
1. `SUPABASE_POWERGRID_UNIFIED.sql`
2. `SUPABASE_VERIFY_POWERGRID.sql`
3. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
4. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

Power Grid DB 패치 적용 완료 환경:
1. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
2. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

Social SQL을 마지막에 실행하는 것을 권장.

## 6. 검증 상태

패키지 생성 시 정적 검사:
- `node --check app.js`
- `node --check social/social-common.js`
- 아발론/시크릿 히틀러/한밤의 늑대인간 inline module syntax check
- `node tests/social_deduction_static_test.cjs`
- SHA-256 파일 생성

정적 검사는 통과하도록 패키징한다.

미검증:
- 실제 사용자의 Supabase 프로젝트에서 SQL 실행
- 여러 실제 로그인 계정으로 다중 브라우저 E2E
- 모바일 실기기 E2E

업로드 직후 최소 1회 각 게임을 최소 인원으로 끝까지 플레이하는 라이브 검증을 권장한다.

## 7. 다음 작업 우선순위

소셜 3종은 이제 **“개발 예정”이 아니라 구현된 코드**로 취급한다. 다음 대화에서는 다시 처음부터 만들지 말고 먼저 업로드본을 검증/수정한다.

추천 순서:
1. 소셜 3종 라이브 Supabase E2E에서 발견되는 오류 수정
2. 포크노바 1인플 실행 복구
3. 파워그리드 독일 완전 자동화
4. 캘리코 다인플 회귀검증
5. 소셜 3종 UX/모바일 개선

## 8. 한 줄 요약

**GitHub 현재본 + 이 ZIP이 새 기준이다. 아발론/시크릿 히틀러 기본판/한밤의 늑대인간은 이미 구현되었고, 기존 포크노바·캘리코·파워그리드 미커밋 패치도 함께 보존되어 있다. 다음에는 소셜 3종 라이브 검증 후 포크노바 1인플과 파워그리드 완전자동화를 이어간다.**
