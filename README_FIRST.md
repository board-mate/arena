# BoardMate Arcade v6 — 설치 / 운영 메모

이 버전도 npm / 터미널 / 빌드 없이 GitHub Pages에 파일을 그대로 올리는 방식입니다.

## 1. GitHub Pages

1. 이 폴더의 파일을 GitHub 저장소에 전부 덮어쓰기
2. Settings → Pages → Deploy from a branch
3. `main` / `/ (root)` 선택
4. `config.js`에는 기존 Supabase Project URL / anon(publishable) key 유지

## 2. v6에서는 supabase.sql을 다시 실행하세요

Supabase → SQL Editor → New query → `supabase.sql` 전체 복사 → Run

기존 데이터는 `create table if not exists`, `add column if not exists` 방식으로 유지됩니다.

v6 추가 내용:

- 관리자 여부
- 회원 정지 기간 / 정지 사유
- 영구 퇴출 닉네임 차단 목록
- 관리자 회원 목록 / 정지 / 정지 해제 / 퇴출 RPC

## 3. 최초 관리자 지정

먼저 사이트에서 본인 닉네임을 하나 가입한 뒤, Supabase SQL Editor에서 한 번만 실행합니다.

```sql
select public.admin_set_boardmate_admin('내닉네임', true);
```

그다음 다시 로그인하면 `마이페이지 → 회원 관리`가 보입니다.

관리자는 사이트에서:

- 회원 목록 확인
- 1~3650일 계정 정지
- 정지 해제
- 영구 퇴출

을 할 수 있습니다.

퇴출된 닉네임은 다시 가입할 수 없습니다. 퇴출 해제가 필요하면 SQL Editor에서:

```sql
delete from public.boardmate_bans
where nickname_key = lower('닉네임');
```

비밀번호 원문은 관리자도 볼 수 없습니다. 잊어버린 회원의 비밀번호만 초기화할 수 있습니다.

```sql
select public.admin_reset_boardmate_password('닉네임', '1234');
```

## 4. 로그인 / 마이페이지

- 로그인/회원가입: 메인 → 마이페이지 또는 다인플 → 로그인
- 계정 관리와 비밀번호 변경은 `마이페이지`에만 있습니다.
- 비밀번호/PIN 최소 길이는 4자입니다.
- 이메일 인증은 사용하지 않습니다.

## 5. 1인플 저장

BoardMate가 직접 보관하는 1인플은 서버를 쓰지 않고 브라우저 `localStorage`에 저장합니다.

- 마스크맨: 자동 저장 + `이어하기`
- 어콰이어: 기존 저장/불러오기 + 자동 저장
- 더 게임: 자동 저장 + `이어하기`

이 저장은 같은 브라우저/기기에서만 이어집니다. 브라우저 저장 데이터를 지우면 없어집니다.

캘리코(MyAutoma), 캐스캐디아(cascadiagame.github.io)는 외부 사이트를 iframe으로 여는 방식이라 BoardMate가 게임 내부 상태에 접근할 수 없습니다. 따라서 BoardMate 자동 저장 대상이 아닙니다.

모든 1인플 화면 왼쪽 위에 `홈` / `1인플` 버튼을 넣었습니다.

## 6. 다인플 자동 저장 / 재접속

온라인 게임은 행동할 때마다 `boardmate_room_state`에 저장합니다.

- 진행 중인 게임 목록
- 이어하기
- 약 20초 이상 신호가 없으면 `끊김` 표시
- 돌아오면 같은 좌석으로 재접속
- 대기실 방장 강퇴

게임을 시작한 뒤에는 좌석/비밀정보/손패가 게임 상태에 들어가므로, 진행 중 강퇴로 좌석을 즉시 삭제하면 게임 상태가 깨질 수 있습니다. v6의 방장 강퇴는 대기실에서 사용합니다.

## 7. 방 만들기 UI

다인플 화면에서 `＋ 방 만들기`를 누르면 별도 페이지로 이동합니다.

드롭다운 대신 1인플 페이지처럼 게임 카드가 보이고, 게임을 선택한 뒤 방을 만듭니다. 게임 종류가 늘어나도 긴 셀렉트 메뉴가 되지 않습니다.

현재 온라인 방:

- 마스크맨
- 어콰이어
- 캘리코
- 더 게임
- 노터치 크라켄

## 8. 캐스캐디아 다인플

기술적으로 가능합니다. 현재 공개 Cascadia 사이트는 한 브라우저 안에서 1~4인 게임을 진행하는 구현이므로, BoardMate 다인플로 만들려면 게임 상태/개인 보드/드래프트/동물 토큰/점수 계산을 Supabase 공유 상태로 옮기는 별도 온라인판이 필요합니다.

v6에는 아직 캐스캐디아 온라인 방을 넣지 않았습니다. 다음 단계에서 구현하는 것이 안전합니다.

## 9. 리코셰 벽 규칙 v6

8×8 사분면 1장마다 정확히:

- 완성 보드 바깥쪽 두 변에 1칸 벽 1개씩 = 2개
- 서로 닿지 않는 ㄱ자 벽 4개

전체 16×16:

- 외곽 1칸 벽 8개
- ㄱ자 벽 16개

이 되도록 생성합니다.

장식용 검은 외곽 프레임은 제거했습니다. 벽 색도 검정이 아닌 갈색 계열로 바꿨습니다. 이동은 화면 테두리 선이 없어도 보드 경계에서 정상적으로 멈춥니다.

## 10. 룰북 PDF

v6 ZIP에는 룰북 PDF를 넣지 않습니다. 용량을 줄이기 위해 게임 코드와 필요한 HTML/JS/CSS만 포함합니다.

## 주요 파일

- `index.html` — 메인
- `app.js` — 데일리 게임 / 메뉴 / 로그인 / 마이페이지 / 방 UI
- `styles.css` — 메인 디자인
- `config.js` — Supabase 주소/키
- `supabase.sql` — DB / 회원 / 관리자 / 방 / ELO
- `multi-common.js` — 온라인 게임 공통 저장/재접속
- `solo-maskmen.html`
- `solo-acquire.html`
- `solo-thegame.html`
- `solo-calico.html` — 외부 캘리코 wrapper
- `solo-cascadia.html` — 외부 캐스캐디아 wrapper
- `online-maskmen.html`
- `online-acquire.html`
- `online-calico.html`
- `online-thegame.html`
- `online-kraken.html`
