# BoardMate Arena — 저장소 업로드용 통합 패치 + 인수인계

기준 저장소: `https://github.com/board-mate/arena`

이 패키지는 **현재 GitHub 저장소를 기준본(base)** 으로 하고, 아직 저장소에 올리지 않았던 기존 패치와 이번에 추가한 소셜 디덕션 3종을 한 번에 덮어쓸 수 있도록 만든 **repo-root overlay** 입니다.

## 이번 패키지에서 바로 추가되는 게임

- **레지스탕스 아발론** — 5~10인
- **시크릿 히틀러 기본판** — 5~10인, 확장판 없음
- **한밤의 늑대인간 기본 역할** — 3~10인, 지정된 12종만

게임 페이지, Arena 방 생성 목록, 실시간 방 표시, 서버측 비밀정보 분리 RPC/SQL까지 포함되어 있습니다.

## 기존 미업로드 패치도 같이 포함

- `pocketnova/index.html`
- `pocketnova/js/ui.js`
- `online-calico.html`
- `SUPABASE_POWERGRID_UNIFIED.sql`
- `SUPABASE_VERIFY_POWERGRID.sql`

캘리코 다인플의 **디자인 타일 4개 중 3개 선택 → 선택 순서대로 자기 퀼트의 위쪽 / 왼쪽 아래 / 오른쪽 위치에 표시**하는 변경을 유지합니다.

## GitHub에 올리는 순서

1. ZIP을 풉니다.
2. 압축을 푼 **내용물 전체를 저장소 루트**에 복사합니다.
3. 같은 이름의 기존 파일은 덮어씁니다.
4. 새 파일/폴더도 빠짐없이 Git에 추가합니다.
5. 커밋 후 GitHub Pages 배포가 끝날 때까지 기다립니다.

핵심 신규 파일:

- `online-avalon.html`
- `online-secret-hitler.html`
- `online-one-night-werewolf.html`
- `social/social-common.js`
- `social/social-deduction.css`
- `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
- `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`
- `tests/social_deduction_static_test.cjs`

## Supabase 적용

### Power Grid SQL을 아직 적용하지 않았다면

1. `SUPABASE_POWERGRID_UNIFIED.sql`
2. `SUPABASE_VERIFY_POWERGRID.sql`
3. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
4. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

### Power Grid SQL이 이미 적용되어 있다면

1. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
2. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

`SUPABASE_POWERGRID_UNIFIED.sql`도 이번 통합 패키지에서는 소셜 디덕션 게임 등록을 보존하도록 호환 수정해 두었습니다. 그래도 **Social Deduction SQL을 마지막에 실행하는 순서**를 권장합니다.

## 구현 범위

### 아발론

- 멀린, 퍼시벌, 암살자, 모르가나, 모드레드, 오베론
- 남는 자리는 아서의 충성스러운 신하 / 모드레드의 하수인
- 랜슬롯, 엑스칼리버, 호수의 여신 없음
- 5회 연속 팀 부결, 인원별 임무 인원, 7인 이상 4번째 임무의 2실패 규칙, 멀린 암살 처리
- 팀 찬반 투표와 임무 성공/실패 카드 수를 제출 완료 후 공개
- 5인 퍼시벌 사용 시 모르가나 또는 모드레드 동반 규칙 검증
- 게임 중 언제든 **`🎭 이번 판 역할`**에서 포함 역할과 수량 확인 가능

### 시크릿 히틀러

- **기본판만**
- 자유당원 / 파시스트 / 히틀러
- 6 자유 정책 / 11 파시스트 정책
- 수상 지명, 정부 투표, 입법, 선거 트래커, 혼란 정책
- 당원 조사, 특별 선거, 정책 확인, 처형, 거부권
- 정부 Ja/Nein 투표 완료 후 개인별 투표 공개, 정책 시행 시 선거 트래커 리셋
- 기본판 승리조건 처리
- CC BY-NC-SA 4.0 저작자/라이선스 표기 포함

### 한밤의 늑대인간

지원 역할은 아래 12종만입니다.

- 도플갱어
- 늑대인간
- 하수인
- 프리메이슨
- 예언자
- 강도
- 말썽쟁이
- 주정뱅이
- 불면증환자
- 마을주민
- 무두장이
- 사냥꾼

프리메이슨은 사용할 경우 **항상 2장 한 쌍**으로 넣습니다.

항상 **플레이어 수 + 중앙 3장**으로 구성합니다. 야간 역할 순서, 카드 교환, 단독 늑대인간 중앙 확인, 최종 동시투표, 동률 사망, 사냥꾼 연쇄 사망, 무두장이/마을/늑대/하수인 승리판정을 처리합니다. 게임 중 언제든 `🎭 이번 판 역할`에서 처음 투입된 역할 카드와 수량만 확인할 수 있습니다.

## 비밀정보 보호

세 게임의 비밀 역할/정책 손패/조사 결과/야간 확인 정보는 `boardmate_social_games.secrets`에 저장합니다. 이 테이블은 클라이언트 역할에서 직접 읽지 못하도록 RLS + 권한 회수되어 있고, `boardmate_social_view()`가 현재 참가자에게 허용된 정보만 반환합니다.

## 검증 상태

패키지 생성 시 다음을 확인합니다.

- `app.js` JavaScript 구문 검사
- `social/social-common.js` JavaScript 구문 검사
- 세 온라인 HTML의 module script 구문 검사
- `tests/social_deduction_static_test.cjs` 전체 PASS
- 패키지 파일 SHA-256 생성

다만 이 작업 환경에서는 사용자의 실제 Supabase 프로젝트에 접속할 수 없으므로 **실제 여러 브라우저/여러 계정 E2E는 업로드 후 사용자 Supabase에서 최종 확인이 필요**합니다. 설치 후 `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`을 먼저 실행하면 DB 객체와 기본 보안 구성을 확인할 수 있습니다.

## 아직 남아 있는 기존 작업

- **포크노바 1인플 실행 불가 문제**: 아직 해결되지 않음
- **파워그리드 독일 맵 완전 자동화**: 아직 완료 전
- **캘리코 다인플 디자인 타일 패치**: 이번 패키지에 보존됨

상세 인수인계: `docs/HANDOFF_NEXT_CHAT.md`
