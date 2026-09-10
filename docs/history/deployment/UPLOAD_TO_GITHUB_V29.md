# BoardMate Arena v11.4.29 업로드 안내

## 가장 간단한 적용 순서

1. 이 패키지의 파일을 GitHub 저장소 `board-mate/arena` 루트에 덮어쓰기
2. Supabase SQL Editor에서 `SUPABASE_PLAKORO_PVP_V6.sql` 실행
3. 선택: `SUPABASE_VERIFY_PLAKORO_V6.sql` 실행 후 모든 항목 `true` 확인
4. GitHub Pages 배포 완료 후 브라우저 강력 새로고침

`SUPABASE_PLAKORO_PVP_V6.sql`은 기존 V3/V4/V5 데이터 삭제 없이 함수/테이블을 보수합니다.
전체 통합 repair가 필요한 경우에만 `SUPABASE_REPAIR_ALL_GAMES_V29.sql`을 사용하세요.
