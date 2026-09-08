# BoardMate Arena v11.4.26 배포

1. v11.4.26 ZIP 내용을 GitHub 저장소 루트에 덮어씁니다. 삭제 목록의 포켓몬 미니마 파일도 저장소에서 삭제합니다.
2. Supabase SQL Editor에서 `SUPABASE_REPAIR_ALL_GAMES_V26.sql` 전체를 실행합니다.
3. `SUPABASE_VERIFY_ALL_GAMES_V26.sql`을 실행하고 모든 `ok`가 true인지 확인합니다.
4. GitHub Pages 배포 후 강력 새로고침합니다. Service Worker cache key는 v11.4.26으로 갱신되어 있습니다.
5. 프라코로 포켓몬은 새 2인 방을 만들어 양쪽 준비 완료 → 전투 시작을 확인합니다.
6. 맵 데이터가 상태 안에 저장되는 엘도라도/사무라이는 **새 게임/새 방**에서 새 맵을 확인합니다. 기존 진행방은 저장된 구 맵을 계속 표시할 수 있습니다.
