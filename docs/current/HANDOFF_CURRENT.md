# BoardMate Arena CURRENT HANDOFF — v11.4.51

## Current release
- Runtime baseline: v11.4.51
- v11.4.50 integrated current/history layout retained.
- v11.4.51 adds BoardMate browser/PWA alarms without a database migration.

## Alarm feature
- Main header now has `🔔 알림` settings.
- Supported alerts while BoardMate is running: new multiplayer room, joined game start, and turn-based `내 차례`.
- Optional short sound and vibration.
- Uses the Web Notifications API and the existing service worker. Notification click opens the relevant room/game.
- No Supabase SQL change is required.
- Fully closed-app background push is NOT implemented; that requires Web Push subscriptions plus a push-capable backend/worker.

## Preserve on future patches
- Keep `docs/history/` and `database/history/` for rollback.
- Update this file, `CHANGELOG_MASTER.md`, `TEST_STATUS_CURRENT.md`, `HANDOFF_VERSION.txt`, and service-worker cache version on every release.
