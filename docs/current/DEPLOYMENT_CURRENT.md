# 🚀 Deployment Guide — v11.4.57

## 권장 배포 순서

1. 현재 GitHub 저장소의 정상 상태를 커밋합니다.
2. 가능하면 태그를 생성합니다. 예: `v11.4.57-before-next-change`.
3. 통합 FULL ZIP의 **내용물**을 저장소 루트에 반영합니다.
4. Git diff를 확인합니다.
5. `HANDOFF_VERSION.txt`와 `sw.js` 캐시 키를 확인합니다.
6. 커밋/푸시 후 GitHub Pages 배포 완료를 기다립니다.
7. 웹에서 BoardMate를 한 번 새로고침합니다.
8. `docs/current/RELEASE_CHECKLIST.md`의 배포 후 점검을 수행합니다.

## v11.4.57 확인 포인트

- 행성 X 진행 중 방의 구형 `틀린 논문 패널티 시간 +1` 공개 기록이 상세 정보로 표시되는지
- 행성 X 찾기에서 X=9 → 왼쪽 8 / 오른쪽 10인지
- 게임 종료 시 전체 섹터 + X 위치가 표시되는지
- 턴 기반 게임에서 내 차례 시 탭 제목이 `🔔 내 차례 ·`로 바뀌는지
- 알림 설정에서 테스트 알림이 브라우저/OS 권한에 따라 표시되는지

## PWA 캐시

현재 캐시 키: `boardmate-shell-v11.4.57`

새 버전 릴리스에서는 반드시 캐시 키도 버전과 함께 올립니다. 배포 후 오래된 화면이 보이면:

1. 일반 새로고침
2. 강력 새로고침
3. 설치형 PWA 완전 종료 후 재실행
4. 아이콘 캐시 문제라면 홈 화면 앱 삭제 후 재설치

순서로 확인합니다.

## Database

v11.4.57은 **새 Supabase SQL/RPC가 없습니다.**

기존 DB를 새로 만들거나 복구해야 할 때만 `database/SUPABASE_CURRENT_UPDATE.sql`과 `database/history/`를 검토합니다. DB SQL을 되돌리는 작업은 코드 롤백과 별개입니다.
