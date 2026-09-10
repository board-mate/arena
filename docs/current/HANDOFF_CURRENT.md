# BoardMate Arena CURRENT HANDOFF — v11.4.54

## Current release
- Runtime baseline: v11.4.54
- v11.4.51 browser/PWA alarm feature is retained.
- v11.4.52 Planet X circular board/record orientation alignment is retained.
- v11.4.53 Planet X object-symbol/scoring reference patch is retained.
- v11.4.54 makes the BoardMate app icon/background assets transparent instead of using the previous dark maskable/Apple-touch fill.

## App icon/background v11.4.54
- `icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, and `favicon-32.png` are regenerated from the transparent user-provided BoardMate logo without an opaque fill.
- `manifest.webmanifest` uses only the transparent `purpose:any` icons, so Android/PWA install no longer prefers the old dark maskable icon.
- Manifest `background_color` is `transparent`.
- Existing game HTML/JS/DB state is unchanged. No Supabase SQL migration is required.
- Platform note: some launchers, especially iOS home-screen icons, may still composite transparent pixels onto a system-selected background; that behavior is controlled by the OS.

## Alarm feature retained
- Main header `🔔 알림` settings, new-room/game-start/my-turn alerts, optional sound/vibration and notification click navigation remain from v11.4.51.
- Fully closed-app background Web Push is still not implemented.

## Preserve on future patches
- Keep `docs/history/` and `database/history/` for rollback.
- Update this file, `CHANGELOG_MASTER.md`, `TEST_STATUS_CURRENT.md`, `HANDOFF_VERSION.txt`, and service-worker cache version on every release.
