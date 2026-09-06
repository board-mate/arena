# Supabase 적용 순서 — BoardMate Arcade 통합 v11.4.8

## 가장 먼저 판단할 것

### A. 현재 `board-mate.github.io/arena`에서 방 만들기와 v11.4.7 기능이 이미 동작하는 운영 DB
먼저 `SUPABASE_VERIFY_INTEGRATED_V11_4_8.sql`만 실행하세요.

검증 결과에서 Fantasy private state/RPC까지 모두 존재하면 **추가 migration은 필요 없습니다.**

### B. v11.3 DB에서 v11.4.7 Fantasy 통합 SQL을 아직 실행하지 않은 경우
다음 순서로 실행하세요.

1. `SUPABASE_FANTASY_REALMS_UNIFIED.sql`
2. `SUPABASE_VERIFY_INTEGRATED_V11_4_8.sql`
3. 필요하면 `SUPABASE_REALTIME_V11_4.sql`로 Realtime 의존 RPC 상태 추가 확인

### C. 완전히 새 Supabase 프로젝트
1. `supabase.sql` 전체를 한 번 실행
2. `SUPABASE_VERIFY_INTEGRATED_V11_4_8.sql` 실행
3. `config.js`의 URL / anon publishable key를 새 프로젝트 값으로 변경

## v11.4 Realtime에서 하지 말아야 할 것

BoardMate v11.4는 **Postgres Changes가 아니라 Realtime Broadcast**를 사용합니다.

따라서:

- `boardmate_room_state`를 `supabase_realtime` publication에 추가할 필요 없음
- Broadcast payload에 게임 state/손패를 넣지 않음
- payload는 revision 신호만 사용
- state는 기존 보호 RPC로 재조회

즉 `SUPABASE_REALTIME_V11_4.sql`은 migration 파일이 아니라 **검증용 SQL**입니다.

## v11.4.7 Fantasy에서 추가되는 DB 요소

`SUPABASE_FANTASY_REALMS_UNIFIED.sql`이 추가/갱신하는 핵심:

- `fantasyrealms` 게임 constraint 등록
- 3~6인 min/max
- `create_boardmate_room_v8` Fantasy 지원
- `boardmate_turn_seat` Fantasy 지원
- `boardmate_game_private_states`
- `get_boardmate_fantasy_state`
- `put_boardmate_fantasy_state`

`boardmate_game_private_states`는 직접 브라우저 CRUD를 허용하지 않고,
security definer RPC를 통해 좌석에 맞는 private state만 반환하도록 설계되어 있습니다.

## 이번 v11.4.8 추가 변경의 DB 영향

### 캘리코 모바일 전체 맞춤
DB 변경 **없음**.

### 포크노바 v11.7 이미지/코어 수정
DB 변경 **없음**.

포크노바 이미지 매핑은 게임 state/Supabase state와 분리되어 있으며
브라우저 localStorage/BroadcastChannel 계층에서 관리됩니다.

## `SUPABASE_RPC_FIX_v11_1.sql`은 언제 쓰나

정상 운영 DB에는 다시 실행할 필요가 없습니다.

다음 오류가 실제로 발생할 때만 복구용으로 사용하세요.

- 방 생성 RPC가 schema cache에서 없음
- 게임 취소 RPC가 없음

그 뒤 verify SQL을 다시 실행하세요.

## config.js

현재 통합 ZIP은 기존 운영 `config.js` 값을 보존합니다.

Supabase 프로젝트를 바꾸는 경우에만:

```js
window.BOARDMATE_CONFIG = {
  supabaseUrl: "https://<project>.supabase.co",
  supabaseAnonKey: "<anon publishable key>"
};
```

로 변경합니다.

**service_role key는 절대 넣지 마세요.**
