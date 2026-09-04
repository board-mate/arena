# BoardMate Arcade v11.1 배포 순서

1. GitHub Pages 저장소 root에 v11.1 파일을 덮어씁니다.
2. **실제 Supabase URL/key가 들어 있는 기존 `config.js`는 유지**합니다. ZIP의 예시값으로 덮어쓰지 마세요.
3. Supabase > SQL Editor에서 **`SUPABASE_RPC_FIX_v11_1.sql` 전체를 실행**합니다.
   - `create_boardmate_room_v8` 방 생성 RPC 복구
   - 게임 취소 RPC 복구
   - `notify pgrst, 'reload schema'` 실행
4. SQL 마지막 조회 결과에 다음 3개 함수가 표시되는지 확인합니다.
   - `create_boardmate_room_v8`
   - `boardmate_get_cancel_status`
   - `boardmate_set_cancel_vote`
5. 브라우저에서 강력 새로고침 후 방 만들기를 다시 테스트합니다.
6. 펜토리니는 v10 동작으로 복귀했으므로 보드 전체의 34% 후보 미리보기가 표시되지 않는지 확인합니다.

## 참고
- 프론트는 `create_boardmate_room_v8`이 schema cache에 없으면 `create_boardmate_room_v7`로 한 번 fallback합니다.
- 다만 포크노바(`pocketnova`) 방까지 정상 생성하려면 v8 SQL 패치가 필요합니다.
- 새 캘리코/캐스캐디아는 기존 v11 교체본을 그대로 유지합니다.
