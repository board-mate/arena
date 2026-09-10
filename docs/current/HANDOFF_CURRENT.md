# BoardMate Arena CURRENT HANDOFF — v11.4.57

## Current release
- Runtime/package baseline: **v11.4.57**
- Service-worker cache: `boardmate-shell-v11.4.57`
- New Supabase SQL/RPC: **none**
- Existing rooms/private record sheets remain compatible.

## Planet X — v11.4.57
- Public peer-review log rendering now repairs legacy/live-game rows that only say `틀린 논문 패널티 시간 +1`.
- The repair uses already-public theory token state retained in the game state (`ownerSeat`, `sector`, `object`, `correct=false`) and merges the penalty into one detailed public row. It does **not** mutate the server game state.
- If a v11.4.55 game contains both a detailed wrong-theory row and a separate penalty row, the renderer merges them and suppresses the duplicate older row.
- `행성 X 찾기` dynamically labels adjacent sectors. Sector 9 means left=8 and right=10; sector 1 wraps to 12/18 on the left and 2 on the right.
- Existing Planet X rules retained: 🌑 asteroid display, theory scoring reference, circular/square note toggle, sector 1 at 12 o'clock, academic-festival/conference markers.

## Alarm / browser-tab indicator — v11.4.57
- Initial entry while it is already the user's turn now triggers one my-turn alert if that specific turn has not been seen before.
- Per-room turn signatures are stored locally to prevent repeated alerts for the same turn after refresh.
- Turn changes observed while the page is open still alert normally.
- Multiplayer pages poll approximately every 3 seconds and immediately refresh on `visibilitychange`, `focus`, `pageshow`, and `online`.
- Turn-based rooms add `🔔 내 차례 ·` to the browser tab title while it is the user's turn. This indicator works even if system notification permission is disabled.
- Fully closed browser/PWA background Web Push is still not implemented; that requires push subscriptions and a server/Edge Function sender.

## Preserve on future patches
- Keep `docs/history/` and `database/history/` for rollback.
- Update `HANDOFF_VERSION.txt`, service-worker cache, README/START_HERE, current handoff/test/deployment docs, and changelog on every release.


## v11.4.57 통합 보완 (2026-09-10)
- 행성 X 찾기: X 후보 섹터 선택 시 왼쪽/오른쪽 인접 섹터 번호를 명시. 예: 9 → 8 / 10.
- 게임 종료: 모든 섹터 실제 개체 + 행성 X 위치/양옆 개체 공개.
- 기존 v11.4.57 공개 기록 복구, 알림 재확인, 브라우저 탭 `🔔 내 차례` 표시 유지.
