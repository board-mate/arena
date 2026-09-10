# v11.4.51 — BoardMate 알림 기능

## 추가
- 메인 상단 `🔔 알림` 버튼 및 설정 페이지.
- 새 다인플 방 알림.
- 참가 중인 대기방의 게임 시작 알림.
- 턴 기반 게임에서 `내 차례` 전환 알림.
- 알림음/진동 개별 설정과 테스트 알림.
- 알림 클릭 시 관련 방/게임으로 이동.

## 구현
- `alarm.js`를 공용 알림 모듈로 추가.
- `app.js`의 홈/다인플/대기실 room snapshot과 연동.
- `multi-common.js`에 온라인 게임 공용 room alarm watcher 추가.
- `sw.js`에 notification click 처리 추가, 캐시 버전 `boardmate-shell-v11.4.51`.

## 데이터베이스
- 변경 없음. Supabase SQL 불필요.

## 제한
- BoardMate 웹앱/사이트가 실행 중일 때 감지하는 방식이다.
- 앱을 완전히 종료한 상태의 원격 Web Push는 push subscription과 서버/Edge Function 등 추가 백엔드가 필요하므로 이번 릴리스에는 포함하지 않음.
