# BoardMate Arena v11.4.28 업로드 안내

기준: v11.4.27 MERGED

## GitHub
전체본을 사용할 경우 이 폴더 내용을 저장소 루트에 덮어쓴다.
패치본을 사용할 경우 패치 파일만 교체한다.

## Supabase
DB를 변경하는 경우 권장 순서:
1. `SUPABASE_TARGETED_FIX_V28.sql` 실행 (이번 오류/기능 수정만 적용)
2. `SUPABASE_VERIFY_TARGETED_V28.sql` 실행
3. 전체 통합 Repair를 다시 정리해야 하는 환경이면 `SUPABASE_REPAIR_ALL_GAMES_V28.sql` 실행 후 `SUPABASE_VERIFY_ALL_GAMES_V28.sql` 실행

이번 v11.4.28의 핵심 DB 수정:
- Plakoro setup pair RPC의 `seat` ambiguous 오류 제거
- Avalon / Secret Hitler / ONUW / Plakoro unanimous cancel 지원

## 캐시
`sw.js` cache key는 v11.4.28로 올려져 있다.
배포 후 브라우저에서 hard refresh 한다.
