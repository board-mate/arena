# Current test status — v11.4.57

## Planet X
- `online-planetx.html` inline module JavaScript syntax: **PASS**.
- Legacy live-game public log conversion: **PASS**.
  - Separate `상현 · 틀린 논문 패널티 시간 +1` + existing detailed review row is rendered as one detailed row with player, sector, object, absence fact, and +1 penalty.
  - Same check passed for a second player/object in the same review timestamp.
- Adjacent-sector helper: **PASS**.
  - Standard: X=9 → left 8 / right 10.
  - Standard: X=1 → left 12 / right 2.
  - Expert: X=1 → left 18 / right 2.
- No Planet X DB/RPC change.

## Alarm / web tab
- `alarm.js`, `app.js`, `multi-common.js` JavaScript syntax: **PASS**.
- Browser-title state test with mocked room state: **PASS**.
  - My turn → title starts `🔔 내 차례 ·`.
  - Opponent turn → prefix is removed.
  - Multi-room list with a my-turn room → prefix is restored.
- Initial-turn notification + same-turn dedupe + later return-turn notification test: **PASS**.
- Wake/focus polling hooks are installed in multiplayer page watcher and main multiplayer SPA.

## Package
- Service-worker cache key: `boardmate-shell-v11.4.57`.
- History and database-history directories retained.
- No migration required for v11.4.57.

Known limit: OS background notification delivery cannot be guaranteed after the browser/PWA is fully terminated because server-side Web Push is not part of this release.


## v11.4.57 통합 보완 (2026-09-10)
- 행성 X 찾기: X 후보 섹터 선택 시 왼쪽/오른쪽 인접 섹터 번호를 명시. 예: 9 → 8 / 10.
- 게임 종료: 모든 섹터 실제 개체 + 행성 X 위치/양옆 개체 공개.
- 기존 v11.4.57 공개 기록 복구, 알림 재확인, 브라우저 탭 `🔔 내 차례` 표시 유지.
