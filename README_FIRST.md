# BoardMate Arcade — GitHub Pages + Supabase 설치

이 버전도 **npm / 터미널 / 빌드가 필요 없습니다.** ZIP을 풀어 GitHub 저장소의 기존 파일에 덮어쓰면 됩니다.

## 이번 버전에서 달라진 점

### 펜토리니
- 7×9 날짜판 아래에 **가운데 5칸 도움 타일 주차칸**을 추가했습니다.
- 12개 펜토미노 + 1×1 도움 타일 5개를 모두 사용합니다.
- 도움 타일은 처음에는 아래 5칸에 놓여 있습니다.
- 도움 타일을 날짜판으로 옮기면 그만큼 펜토미노가 아래 주차칸까지 내려갈 수 있습니다.
- 순위: **사용한 도움칸 수가 적을수록 우선 → 같으면 먼저 완성한 사람**.
- English / 한자 요일 선택은 브라우저에 기억됩니다.
- 게임 도중 요일을 바꿔도 전체 배치는 초기화하지 않습니다. 새 요일 칸과 겹친 타일만 회수합니다.

### 리코셰
- 벽을 임의로 흩뿌리는 방식 대신 **고정 8×8 보드 4장을 회전/배치해 16×16을 만드는 방식**으로 변경했습니다.
- 보드 전체 바깥쪽은 항상 벽으로 막혀 있습니다.
- 각 보드의 L자 벽은 서로 붙지 않도록 떨어져 있습니다.
- 날짜별로 4개 보드의 위치/회전과 로봇/목표가 결정됩니다.
- 너무 짧은 문제를 피하기 위해 생성 후보 중 6수 이상 문제를 우선 선택합니다.
- 로봇을 보드에서 직접 누른 뒤 같은 행/열의 방향 칸을 누르면 이동합니다. 오른쪽 방향 버튼/키보드도 그대로 됩니다.

### 1인플
- `solo-maskmen.html` — 업로드한 마스크맨 AI 대전판
- `solo-acquire.html` — 업로드한 어콰이어 AI 대전판
- 메인 화면의 **1인플** 메뉴에서 들어갑니다.

### 다인플
- 닉네임 + 비밀번호 회원가입/로그인
- 방 제목 / 게임 / 최대 인원(3~6명)으로 방 만들기
- 열린 방 목록 / 참가 / 로비 / 참여 인원 표시
- 마스크맨 온라인 플레이
- 어콰이어 온라인 플레이
- 게임별 비공개 ELO + 공개 배지
  - ELO 전체 1~5위: `#1` ~ `#5`
  - 그 외 2승 이상 + 승률 50% 이상: 골드
  - 그 외 1승 이상: 실버
  - 나머지: 브론즈
- N인 게임 결과는 1등에게 1승, 나머지 각 플레이어에게 `1/(N-1)`패가 기록됩니다. 4인 게임이면 2~4등이 각각 1/3패입니다.
- ELO 숫자는 공개 View에 포함하지 않고, 1~5위의 **순위만** 공개합니다.

## 1) GitHub Pages

1. GitHub 저장소에 이 폴더의 파일을 전부 업로드
2. `Settings → Pages`
3. `Deploy from a branch`
4. Branch `main`, Folder `/ (root)`
5. Save

## 2) Supabase 연결

기존에 순위표만 쓰던 프로젝트가 있어도 **이번에는 `supabase.sql`을 다시 전체 실행해야 합니다.**
온라인 회원/방/게임 상태/레이팅 테이블과 함수가 추가되었기 때문입니다.

1. Supabase 프로젝트 → `SQL Editor → New query`
2. `supabase.sql` 전체 복사 → Run
3. `Project Settings → API`에서
   - Project URL
   - anon / publishable key
4. `config.js`에 입력

```js
window.BOARDMATE_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "여기에_키"
};
```

5. **Authentication → Providers → Email → Confirm email을 OFF**로 설정

BoardMate 화면에서는 이메일을 받지 않습니다. 닉네임을 SHA-256으로 변환한 내부용 이메일 주소를 자동으로 만들어 Supabase Auth의 비밀번호 인증만 사용합니다.

## 3) 파일 구조

- `index.html` — 메인 사이트
- `app.js` — 데일리 게임 / 1인플 / 회원 / 방 / 로비
- `styles.css` — 메인 스타일
- `config.js` — Supabase URL / anon key
- `supabase.sql` — 공유 순위 + 회원 + 방 + 레이팅 DB
- `multi-common.js` — 온라인 게임 공통 연결 코드
- `online-maskmen.html` — 마스크맨 온라인
- `online-acquire.html` — 어콰이어 온라인
- `solo-maskmen.html` — 마스크맨 AI
- `solo-acquire.html` — 어콰이어 AI

## 온라인 게임 구현 방식 / 주의

GitHub Pages는 서버 코드를 실행할 수 없기 때문에, 온라인 게임 상태는 Supabase의 `boardmate_room_state` JSON에 저장하고 참가자 브라우저들이 짧은 간격으로 동기화합니다. 상태 업데이트는 revision 번호를 이용해 동시에 눌렀을 때의 덮어쓰기를 방지합니다.

현재 버전은 **보드메이트 모임원끼리 사용하는 신뢰 기반 버전**입니다. 화면에서는 다른 플레이어의 손패를 숨기지만, 방 참가자가 개발자도구로 Supabase의 공유 게임 상태 JSON을 직접 확인하는 것까지는 막지 않습니다. 완전한 비공개 손패/서버 판정/부정행위 방지가 필요하면 다음 단계에서 Supabase Edge Function 또는 별도 서버로 게임 엔진을 옮기는 것이 좋습니다.

## 기존 Supabase 키 관련

`anon / publishable key`는 웹사이트에 넣는 공개용 키입니다. `service_role` 키는 절대 GitHub에 올리지 마세요.
