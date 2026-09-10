# BoardMate Arena CURRENT HANDOFF — v11.4.53

## Current release
- Runtime baseline: v11.4.53
- v11.4.51 browser/PWA alarm feature is retained.
- v11.4.52 Planet X circular board/record orientation alignment is retained.
- v11.4.53 clarifies the Planet X asteroid symbol and exposes paper scoring in the bottom reference table.

## Planet X v11.4.53
- `online-planetx.html` uses **🪨 for asteroid** instead of the comet-like ☄️ symbol.
- Comet remains **🌠**, so asteroid/comet are visually distinct on the game board, circular record sheet, emoji footnote and revealed paper tokens.
- The bottom `참조표` now shows correct-paper points directly: Asteroid 2, Comet 3, Gas Cloud 4, Dwarf Planet 4 in Standard / 2 in Expert.
- The same reference also shows paper leader bonus (+1 per sector for the earliest correct paper, ties included) and Planet X scoring (first 10; later 2 points per sector behind, 2–10).
- Existing game state, private record data, paper objects, board positions and database schema are unchanged. This is a UI/reference patch.
- No Supabase SQL migration is required.

## Alarm feature retained
- Main header `🔔 알림` settings, new-room/game-start/my-turn alerts, optional sound/vibration and notification click navigation remain from v11.4.51.
- Fully closed-app background Web Push is still not implemented.

## Preserve on future patches
- Keep `docs/history/` and `database/history/` for rollback.
- Update this file, `CHANGELOG_MASTER.md`, `TEST_STATUS_CURRENT.md`, `HANDOFF_VERSION.txt`, and service-worker cache version on every release.
