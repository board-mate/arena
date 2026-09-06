# Supabase — v11.4.8에서 Power Grid 추가

사용자의 현재 BoardMate v11.4.8 DB는 Fantasy Realms unified migration까지 적용된 상태를 기준으로 합니다.

Power Grid Germany를 처음 추가할 때 SQL Editor에서 다음 순서로 실행합니다.

```text
1. repo-overlay/SUPABASE_POWERGRID_UNIFIED.sql
2. repo-overlay/SUPABASE_VERIFY_POWERGRID.sql
```

Verify 결과에서 아래 항목이 모두 `true`여야 합니다.

```text
create_room_v9_exists
powergrid_min_2
powergrid_max_6
powergrid_name_ok
common_get_state_exists
common_put_state_exists
```

이번 Power Grid 통합은 새 전용 상태 테이블을 만들지 않습니다. 기존 `boardmate_room_state`를 사용합니다.
Realtime은 revision-only Broadcast를 사용하므로 상태 테이블을 `supabase_realtime` publication에 추가할 필요가 없습니다.

주의:
- 예전 독립형 Power Grid용 `powergrid_rooms` SQL은 실행하지 않습니다.
- `service_role` key를 `config.js`에 넣지 않습니다.
- 이 overlay는 `config.js`를 포함하지 않아 기존 운영 URL/anon key를 보존합니다.
