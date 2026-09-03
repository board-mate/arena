# BoardMate Arcade v5 — GitHub Pages + Supabase 설치

이 버전도 **npm / 터미널 / 빌드가 필요 없습니다.** ZIP을 풀어 GitHub 저장소의 기존 파일에 덮어쓰면 됩니다.

> **중요:** v5는 온라인 방의 재접속/접속 상태와 새 게임 2종이 추가됐습니다. 기존 Supabase 프로젝트를 쓰더라도 `supabase.sql`을 **전체 다시 실행**해 주세요.

## v5 변경사항

### 1. 캘리코 규칙 보강
- 한국어 룰북 `rules-calico.pdf` 포함
- 108장 헝겊 타일(6색 × 6무늬 × 3장)
- 손패 2장 / 시장 3장 / 22칸 채우기
- 디자인 타일 6종 중 3종 무작위 사용
- 디자인 타일은 색 또는 무늬 한쪽 충족 시 파란 점수, 둘 다 충족 시 노란 점수
- 같은 색 3개 이상 연결 그룹마다 단추 1개 = 3점
- 6색 단추를 모두 얻으면 무지개 단추 +3점
- 이번 게임에 사용할 고양이 3종과 선호 무늬 2개씩을 무작위 지정
- 고양이 그룹 크기 / 모양 채점 반영

※ 실제 퀼트판 가장자리에 인쇄된 고정 헝겊 타일까지 디지털 보드에 재현한 버전은 아닙니다. 현재는 22개 배치칸과 3개 디자인 타일을 중심으로 공식 채점 규칙을 적용합니다.

### 2. 온라인 자동 저장 / 재접속
- 마스크맨 / 어콰이어 / 캘리코 / 더 게임 / 노터치 크라켄은 행동할 때마다 `boardmate_room_state`에 자동 저장됩니다.
- 브라우저를 닫거나 사이트를 나가도 게임 중 참가자 자리는 삭제되지 않습니다.
- 다인플 첫 화면에 **진행 중인 게임**이 따로 표시됩니다.
- `이어하기`를 누르면 같은 방 / 같은 자리 / 마지막 저장 상태로 복귀합니다.
- 방과 온라인 게임 페이지는 주기적으로 접속 신호를 보냅니다.
- 약 20초 이상 신호가 없으면 방 인원 목록에 `○ 끊김`으로 표시됩니다.
- 다시 들어오면 `● 접속`으로 돌아옵니다.
- 방장 강퇴는 게임 시작 전 대기실에서 계속 사용할 수 있습니다.

### 3. 리코셰 보드 규칙 수정
8×8 사분면 1장 기준:
- 바깥 모서리를 이루는 두 변에 1칸짜리 벽 1개씩 = **2개**
- 서로 닿지 않는 ㄱ자 벽 = **4개**

16×16 전체 보드 기준:
- 1칸짜리 가장자리 벽 = **8개**
- ㄱ자 2칸 벽 = **16개**
- 외곽 전체를 검정 굵은 벽으로 표시하지 않습니다. 로봇은 보드 경계 판정으로 멈춥니다.
- 64종의 8×8 사분면 템플릿을 사용해 날짜별 조합을 늘렸습니다.
- 생성 검증에서 전체 내부 벽 선분은 정확히 40개(8 + 16×2)이며, 외곽 전체 벽은 생성하지 않습니다.
- 일일 문제는 최단 6~10수 후보를 우선 선택합니다.

### 4. 1인플 추가
- 마스크맨 AI
- 어콰이어 AI
- 캘리코 MyAutoma 공개 솔로 구현
- **캐스캐디아** 공개 웹 구현: https://cascadiagame.github.io/
- **더 게임** 업로드 HTML 솔로판

### 5. 다인플 추가
- 마스크맨 3~6인
- 어콰이어 3~6인
- 캘리코 2~4인
- **더 게임 2~5인 온라인 협력**
- **노터치 크라켄 3~8인 온라인 팀전**

더 게임은 기본 규칙 기준으로 온라인 협력 플레이를 구현했습니다. `rules-the-game.pdf`가 포함되어 있습니다.

노터치 크라켄은 기본 게임과 `탐욕스러운 선장의 저주` 옵션을 게임 시작 시 방장이 선택할 수 있습니다. `rules-no-touch-kraken.pdf`가 포함되어 있습니다.

### 온라인 레이팅
- 경쟁 게임: 기존 ELO / 순위 / 골드·실버·브론즈 규칙 유지
- 노터치 크라켄: 승리 팀은 1승, 패배 팀은 1패로 기록하고 팀 평균을 기준으로 숨김 ELO를 갱신
- 더 게임: 공동 승리/패배를 기록하고 1000점 가상 상대 기준으로 숨김 레이팅을 갱신
- 실제 레이팅 숫자는 공개하지 않습니다.

---

## 설치

### 1) GitHub Pages
1. ZIP 압축 해제
2. 안의 파일을 GitHub 저장소에 전부 업로드 / 기존 파일 덮어쓰기
3. `Settings → Pages`
4. `Deploy from a branch`
5. Branch `main`, Folder `/ (root)`
6. Save

### 2) Supabase — v5 SQL 다시 실행
1. Supabase 프로젝트 열기
2. 왼쪽 `SQL Editor`
3. `New query` 또는 기존 `Untitled query` 클릭
4. `supabase.sql` 내용을 **전부 복사**해서 붙여넣기
5. `Run`

SQL Editor에 `Untitled query` 하나만 보여도 정상입니다. 중요한 것은 `supabase.sql`이 오류 없이 실행되는 것입니다.

### 3) config.js
`Project Settings → API`에서 Project URL / anon(publishable) key를 복사합니다.

```js
window.BOARDMATE_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "여기에_키"
};
```

`service_role` 키는 절대 GitHub에 올리지 마세요.

---

## 계정 관리

회원 목록:

```sql
select nickname, created_at
from public.boardmate_profiles
order by created_at;
```

비밀번호 강제 초기화:

```sql
select public.admin_reset_boardmate_password('회원닉네임', '1234');
```

위 SQL은 **Supabase → SQL Editor → New query** 입력창에 붙여넣고 `Run`을 누릅니다.

비밀번호 원문은 저장하지 않으므로 운영자도 기존 비밀번호를 볼 수 없고 새 값으로 재설정만 할 수 있습니다.

---

## 파일 구조
- `index.html` / `app.js` / `styles.css` — 메인 사이트
- `config.js` — Supabase 설정
- `supabase.sql` — 회원 / 방 / 자동 저장 / 접속 상태 / 레이팅
- `multi-common.js` — 온라인 게임 공통 동기화 + 접속 heartbeat
- `online-maskmen.html`
- `online-acquire.html`
- `online-calico.html`
- `online-thegame.html`
- `online-kraken.html`
- `solo-maskmen.html`
- `solo-acquire.html`
- `solo-thegame.html`
- `local-no-touch-kraken.html` — 업로드한 한 기기용 원본 보관
- `rules-calico.pdf`
- `rules-the-game.pdf`
- `rules-no-touch-kraken.pdf`

## 온라인 게임 보안 주의
현재 구조는 모임원끼리 쓰는 신뢰 기반 버전입니다. 화면에서는 상대 비밀 정보를 숨기지만, 방 참가자가 개발자도구로 `boardmate_room_state` JSON을 직접 분석하는 것까지 차단하지는 않습니다. 완전한 비공개 손패/역할이 필요하면 이후 게임 판정을 Supabase Edge Function 등 서버 쪽으로 옮겨야 합니다.
