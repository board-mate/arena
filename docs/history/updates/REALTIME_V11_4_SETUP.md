# BoardMate Arcade v11.4 — Realtime 적용 가이드

## 무엇이 바뀌었나

기존 온라인 게임의 상태 동기화:

`게임 행동 → Supabase DB 저장 → 1~1.7초 polling → 상대 화면`

을 다음처럼 변경했습니다.

`게임 행동 → Supabase DB 저장 + Realtime Broadcast(state_changed) → 상대가 즉시 loadState()`

Realtime 메시지에는 **게임 상태/손패/비밀정보를 넣지 않고 revision 번호만** 보냅니다.

수신자는 Broadcast를 받으면 기존 `get_boardmate_room_state` RPC를 다시 호출합니다. 따라서 다른 사람이 임의의 Broadcast를 보내더라도 방 참가 권한을 우회할 수 없습니다.

또한 Realtime 연결이 실패하면 **10초 polling이 안전망으로 작동**합니다.

## 적용 파일

이번 패키지에서 실제로 바뀐 핵심 파일:

- `multi-common.js`
- `online-acquire.html`
- `online-calico.html`
- `online-cascadia.html`
- `online-kraken.html`
- `online-maskmen.html`
- `online-pokemon-minima.html`
- `online-thegame.html`

추가 파일:

- `SUPABASE_REALTIME_V11_4.sql`

## 1. GitHub 업로드

현재 ZIP의 `boardmate_arcade_v11_3_handoff` 폴더 안 **파일 전체를 기존 GitHub 저장소에 덮어쓰기**합니다.

특히 기존 `config.js`의 Supabase URL과 anon/publishable key는 유지합니다.

`service_role` key는 절대 넣지 않습니다.

## 2. Supabase

### 필수 DB 변경

**없습니다.**

v11.4는 Postgres Changes가 아니라 Realtime Broadcast를 사용합니다.

따라서 `boardmate_room_state`를 `supabase_realtime` publication에 추가할 필요가 없습니다.

### 권장 확인

Supabase → SQL Editor → New query에서:

`SUPABASE_REALTIME_V11_4.sql`

전체를 실행합니다.

5개 결과가 모두 다음과 같으면 정상입니다.

- `room_state_table_exists` = true
- `put_state_rpc_exists` = true
- `get_state_rpc_exists` = true
- `anon_can_put_state` = true
- `anon_can_get_state` = true

이 SQL은 테이블이나 데이터를 삭제하지 않습니다.

## 3. GitHub Pages 배포 후 테스트

실제 계정 2개로 같은 게임방에 들어갑니다.

### 테스트 A — 즉시 동기화

1. 브라우저 A / B에서 같은 방에 입장
2. A가 자기 차례 행동
3. A 화면에 `동기화됨`
4. B 화면이 약 1.5초 polling을 기다리지 않고 즉시 변경되는지 확인

### 테스트 B — Realtime 장애 fallback

Realtime이 연결되지 않는 환경에서도 게임이 멈추지 않아야 합니다.

최대 약 10초 이내에 polling으로 상태가 따라옵니다.

### 테스트 C — 재접속

1. A가 게임 중 브라우저를 새로고침
2. 다시 방에 입장
3. 최신 revision/state가 정상 표시되는지 확인

### 테스트 D — revision conflict

두 브라우저에서 거의 동시에 행동했을 때 기존 revision 충돌 복구가 정상 작동하는지 확인합니다.

## 4. 개발자도구에서 Realtime 확인

Chrome → F12 → Console에서 다음 로그가 보일 수 있습니다.

정상:
- 별도의 오류 없음
- 게임 행동 후 상대 화면 즉시 갱신

Realtime 연결 실패:
- `[BoardMate Realtime] subscription failed; polling fallback active.`
- 또는 broadcast 실패 경고

이 경우에도 게임 자체는 10초 polling으로 계속 동작합니다.

## 5. 중요한 설계 선택

### 왜 Broadcast만 쓰나?

BoardMate는 Supabase Auth가 아니라 자체 닉네임+PIN 세션을 사용합니다.

따라서 Realtime private channel의 `auth.uid()` 기반 접근제어를 그대로 적용하기 어렵습니다.

그래서 v11.4에서는 PUBLIC Broadcast를 사용하되:

- Broadcast에는 `revision`만 포함
- 실제 state는 RPC로 다시 읽음
- RPC는 자체 세션 token + room membership를 확인

하는 방식으로 구성했습니다.

즉 **Broadcast는 알림이고, 권한 있는 DB RPC가 실제 데이터 접근을 담당합니다.**

## 6. 왜 polling을 없애지 않았나?

실서비스에서 WebSocket/Reatime 연결은 네트워크, 브라우저 백그라운드, 모바일 절전 등의 이유로 끊길 수 있습니다.

그래서 처음부터 polling을 완전히 제거하지 않고:

- Realtime = 주 통신
- 10초 polling = 복구 통신

으로 구성했습니다.

충분한 실전 테스트가 끝난 후에도 필요하다면 polling을 15~30초로 늘릴 수 있습니다.

## 7. 현재 게임별 fallback

모든 온라인 게임의 기존 1~1.7초 polling fallback을 10초로 변경했습니다.

- 어콰이어
- 캘리코
- 캐스캐디아
- 크라켄
- 마스크맨
- 포켓몬 미니마
- 더 게임

Realtime이 정상이라면 평상시 게임 행동은 Broadcast로 즉시 전달됩니다.

## 8. Supabase 비용 측면

기존 1~1.7초 polling보다 DB 읽기 횟수가 크게 줄어듭니다.

게임 행동이 있을 때:

`DB write → Broadcast → 필요한 클라이언트만 loadState()`

가 되고, 아무 행동도 없는 동안에는 10초 fallback polling만 수행합니다.

100명 규모의 Board Mate에는 기존 구조보다 훨씬 적합한 방향입니다.

## 9. 되돌리기

문제가 생기면 GitHub에서 이전 `multi-common.js`와 온라인 HTML 7개를 되돌리면 됩니다.

DB 변경이 없으므로 v11.4 때문에 데이터 rollback SQL을 실행할 필요가 없습니다.
