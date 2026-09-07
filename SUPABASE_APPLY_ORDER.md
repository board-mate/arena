# Supabase 적용 순서 — BoardMate Arena FINAL 2026-09-07

## 기존 운영 DB가 현재 arena-main에서 정상 동작 중인 경우

이번 최종 통합에서 새로 필요한 DB 작업은 소셜 디덕션 3종입니다.

1. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
2. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

이 migration은 다음을 함께 처리합니다.

- `avalon`, `secrethitler`, `onenightwerewolf` 등록
- 소셜 게임 방 생성 RPC `create_boardmate_room_v10`
- 실시간 소셜 게임용 private state/RPC
- 포켓몬 미니마의 호환 game key `pocketnova`를 최소/최대 2인으로 맞춤
- `boardmate_game_ko('pocketnova')` 표시명을 `포켓몬 미니마`로 갱신

## Power Grid migration을 아직 적용하지 않은 DB

1. `SUPABASE_POWERGRID_UNIFIED.sql`
2. `SUPABASE_VERIFY_POWERGRID.sql`
3. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
4. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

소셜 SQL을 마지막에 실행하는 순서를 권장합니다.

## Fantasy Realms migration도 아직 없는 더 오래된 DB

먼저 기존 버전의 필수 migration을 순서대로 적용한 뒤 위 소셜 SQL을 마지막에 실행하세요.

- `SUPABASE_FANTASY_REALMS_UNIFIED.sql`
- 필요 시 `SUPABASE_POWERGRID_UNIFIED.sql`
- 마지막에 `SUPABASE_SOCIAL_DEDUCTION_V1.sql`

## 완전히 새 Supabase 프로젝트

현재 `supabase.sql`은 역사적으로 누적된 BoardMate 기준 스키마이며 소셜 디덕션 V1은 별도 migration입니다.

1. `supabase.sql`
2. 필요한 기존 통합 migration (`SUPABASE_FANTASY_REALMS_UNIFIED.sql`, `SUPABASE_POWERGRID_UNIFIED.sql`)
3. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
4. 각 VERIFY SQL
5. `config.js`에 새 프로젝트 URL + anon/publishable key 설정

## 주의

- 정상 운영 DB에 `SUPABASE_RPC_FIX_v11_1.sql` 같은 과거 복구용 SQL을 임의로 다시 실행하지 마세요.
- 과거 migration은 최신 게임 constraint를 다시 좁힐 수 있습니다. 꼭 필요하면 최종적으로 `SUPABASE_SOCIAL_DEDUCTION_V1.sql`을 다시 실행해 현재 게임 목록/helper를 복구하세요.
- `service_role` 키를 브라우저 `config.js`에 넣지 마세요.
