# BoardMate Arcade v4 — GitHub Pages + Supabase 설치

이 버전도 **npm / 터미널 / 빌드가 필요 없습니다.** ZIP을 풀어 GitHub 저장소의 기존 파일에 덮어쓰면 됩니다.

> **중요:** v4는 회원 로그인 방식과 방 DB 구조가 바뀌었습니다. 기존 프로젝트를 쓰더라도 `supabase.sql`을 **전체 다시 실행**해야 합니다.

## 이번 버전 변경사항

### Yahtzee
- Upper Bonus 줄을 `Upper Bonus (현재 Upper 점수 / 63+)` 형태로 표시합니다.
- 예: `Upper Bonus (41 / 63+)`.

### 캘리코
- **1인플:** MyAutoma의 공개 Calico 솔로 데모로 연결합니다.
  - https://myautoma.github.io/games/calico/index.html
- **다인플:** `online-calico.html`을 추가했습니다.
  - 2~4인 온라인 베타
  - 공용 3타일 시장 / 개인 퀼트 / 색·패턴·목표 타일 기반 점수
  - BoardMate용 첫 베타이므로 공식 게임 전체 규칙을 완전히 재현한 버전은 아닙니다.
  - 외부 사이트의 코드/이미지를 복사하지 않고 별도로 구현했습니다.

### 리코셰
- 날짜별 보드 재사용성을 높이기 위해 **24종의 8×8 사분면 템플릿** 중 서로 다른 4개를 골라 회전/배치합니다.
- 4개를 연결해 16×16 보드를 만듭니다.
- 보드 전체 외곽은 항상 막힌 벽입니다.
- 외곽 테두리에서 안쪽으로 짧게 들어오는 벽(stub)도 매일 배치해 실제 보드처럼 가장자리에서 방향을 잡기 어렵게 했습니다.
- L자 내부 벽끼리는 바로 붙지 않도록 생성합니다.
- 로봇 클릭 → 같은 행/열의 원하는 방향 칸 클릭으로 이동할 수 있고, 오른쪽 방향 버튼/키보드도 그대로 지원합니다.
- 일일 문제는 생성 후보 중 **최단 6수 이상**을 우선 선택합니다.

### 펜토리니
- 7×9 날짜판 아래의 1×1 도움 타일 5개를 유지합니다.
- 순위는 `도움 타일 사용 수가 적은 사람 → 같은 수면 먼저 완성한 사람` 순입니다.
- English / 한자 요일 선택은 브라우저에 기억됩니다.
- 게임 중 요일 표시 방식을 바꿔도 전체 배치를 초기화하지 않습니다.

### 다인플 방
- 방 만들 때 **인원수를 정하지 않습니다.**
- 방 제목 + 게임만 고르면 됩니다.
- 방장이 참가 인원을 보고 원하는 순간 시작합니다.
- 대기실에서 방장이 다른 참가자를 **강퇴**할 수 있습니다.
- 참가자는 자유롭게 들어오거나 나갈 수 있습니다.
- 방장이 나가면 남아 있는 참가자 중 앞 순번에게 방장이 자동 승계됩니다.
- 게임 규칙상 내부 최대 인원은 유지합니다.
  - 마스크맨 / 어콰이어: 3~6인
  - 캘리코 온라인 베타: 2~4인

### 계정 / 비밀번호
- v4부터 **Supabase Email Auth를 사용하지 않습니다.**
- 닉네임 + 비밀번호/PIN만 사용합니다.
- 최소 길이는 **4자**입니다.
- 비밀번호 원문은 DB에 저장하지 않고 bcrypt 해시만 저장합니다.
- 로그인 후 `다인플 → 계정 관리`에서 본인이 비밀번호를 변경할 수 있습니다.
- 비밀번호를 잊은 회원은 운영자가 Supabase SQL Editor에서 새 비밀번호로 재설정할 수 있습니다.

운영자 비밀번호 재설정:

```sql
select public.admin_reset_boardmate_password('회원닉네임', '1234');
```

회원 목록 확인:

```sql
select nickname, created_at
from public.boardmate_profiles
order by created_at;
```

**기존 비밀번호 자체를 조회하는 기능은 없습니다.** 해시만 저장되므로 운영자도 원래 비밀번호를 볼 수 없고 새 값으로 재설정만 할 수 있습니다.

### 게임별 티어 / ELO
- 실제 ELO 숫자는 공개하지 않습니다.
- 게임별 ELO 상위 1~5명: `#1` ~ `#5`
- 그 외 2승 이상 + 승률 50% 이상: 골드
- 그 외 1승 이상: 실버
- 나머지: 브론즈
- N인 게임은 1등에게 1승, 나머지 각 플레이어에게 `1/(N-1)`패를 기록합니다.
  - 4인 게임: 2~4등 각각 1/3패

---

## 1) GitHub Pages에 올리기

1. ZIP 압축 해제
2. 이 폴더 안의 파일을 GitHub 저장소에 모두 업로드 / 기존 파일 덮어쓰기
3. `Settings → Pages`
4. `Deploy from a branch`
5. Branch `main`, Folder `/ (root)`
6. Save

## 2) Supabase 설정 — v4에서는 꼭 다시 실행

1. Supabase 프로젝트 → `SQL Editor → New query`
2. **v4 `supabase.sql` 전체** 복사 → Run
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

5. 수정한 파일을 GitHub에 업로드

### 이제 Supabase Authentication의 Email 설정은 필요 없습니다

v3는 내부 가짜 이메일을 만들어 `auth.signUp()`을 호출했기 때문에 Supabase의 이메일 signup rate limit에 걸릴 수 있었습니다.

v4는 회원가입/로그인을 BoardMate 전용 DB 함수로 처리하므로:
- Confirm email ON/OFF 설정 불필요
- 회원가입 이메일 불필요
- `email rate limit exceeded` 문제와 분리됨

## v3에서 이미 만든 회원이 있다면

v3 회원의 비밀번호는 Supabase Auth 쪽에 있었기 때문에 v4 DB로 원문 비밀번호를 가져올 수 없습니다.
기존 닉네임 행은 남을 수 있지만 `password_hash`가 비어 있으면 로그인할 수 없습니다.

운영자가 한 번 새 비밀번호를 지정해 주세요.

```sql
select public.admin_reset_boardmate_password('기존닉네임', '1234');
```

그 뒤 회원이 로그인해서 `계정 관리`에서 원하는 비밀번호로 변경하면 됩니다.

---

## 파일 구조

- `index.html` — 메인 사이트
- `app.js` — 데일리 게임 / 1인플 / 회원 / 방 / 로비
- `styles.css` — 메인 스타일
- `config.js` — Supabase URL / anon key
- `supabase.sql` — 순위표 + BoardMate 회원 + 방 + 게임 상태 + 비공개 ELO
- `multi-common.js` — 온라인 게임 공통 연결 코드
- `online-maskmen.html` — 마스크맨 온라인
- `online-acquire.html` — 어콰이어 온라인
- `online-calico.html` — 캘리코 온라인 베타
- `solo-maskmen.html` — 마스크맨 AI
- `solo-acquire.html` — 어콰이어 AI

## 온라인 게임 구현 방식 / 주의

GitHub Pages는 서버 프로그램을 직접 실행하지 않으므로 온라인 게임 상태는 Supabase의 `boardmate_room_state` JSON에 저장하고 참가자 브라우저가 짧은 간격으로 동기화합니다. revision 번호로 동시에 조작했을 때의 단순 덮어쓰기를 방지합니다.

현재 온라인판은 **보드메이트 모임원용 신뢰 기반 버전**입니다. 화면에서는 상대 손패를 숨기지만 방 참가자가 개발자도구로 공유 게임 상태 JSON을 분석하는 것까지 완전히 차단하는 서버 권한형 구조는 아닙니다. 완전한 비공개 손패와 서버 판정이 필요하면 이후 Supabase Edge Function 등으로 게임 엔진을 옮기면 됩니다.

## 보안 관련

- `anon / publishable key`는 웹사이트에 넣는 공개용 키입니다.
- `service_role` 키는 **절대 GitHub에 올리지 마세요.**
- BoardMate 비밀번호는 bcrypt 해시로만 저장합니다.
- 4자 PIN도 허용하지만, 생일/전화번호 끝자리/`1234` 같은 쉬운 값은 피하는 편이 좋습니다.
