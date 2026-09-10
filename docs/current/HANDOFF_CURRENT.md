# BoardMate Arena CURRENT HANDOFF — v11.4.52

## Current release
- Runtime baseline: v11.4.52
- v11.4.51 browser/PWA alarm feature is retained.
- v11.4.52 aligns Planet X circular board and circular record sheet orientation.

## Planet X v11.4.52
- `online-planetx.html` circular game board already uses sector 1 at 12 o’clock and increases clockwise.
- Circular record sheet now uses the same orientation: **sector 1 at 12 o’clock, then 2, 3, ... clockwise**.
- Standard (12-sector) and Expert (18-sector) record sheets use the same zero-angle origin.
- Existing private record data (`priv.marks`) is unchanged; this is display-coordinate-only.
- Square record sheet, game logic, hidden solar system, turn/time logic, theories/papers, research, conferences and scoring are unchanged.
- No Supabase SQL migration is required.

## Alarm feature retained
- Main header `🔔 알림` settings, new-room/game-start/my-turn alerts, optional sound/vibration and notification click navigation remain from v11.4.51.
- Fully closed-app background Web Push is still not implemented.

## Preserve on future patches
- Keep `docs/history/` and `database/history/` for rollback.
- Update this file, `CHANGELOG_MASTER.md`, `TEST_STATUS_CURRENT.md`, `HANDOFF_VERSION.txt`, and service-worker cache version on every release.
