# BoardMate Arena CURRENT HANDOFF — v11.4.55

## Current release
- Runtime baseline: v11.4.55
- v11.4.51 browser/PWA alarm feature is retained.
- v11.4.52 Planet X circular board/record orientation alignment is retained.
- v11.4.53 Planet X scoring reference is retained.
- v11.4.54 transparent BoardMate app-icon assets are retained.
- v11.4.55 updates Planet X peer-review disclosure and unifies the asteroid emoji to `🌑`.

## Planet X v11.4.55
- Asteroid display is `🌑` everywhere derived from `OBJ` / `OBJICON`, including survey/target records, options, theory tokens, circular record sheet and footnote; the reference-table row is also `🌑`. Legacy stored observation/log text containing `🪨` is normalized to `🌑` at display time.
- Incorrect peer-reviewed theories now identify the submitter, sector and submitted object, and explicitly state that the submitted object is not in that sector.
- The actual object is shown only when the same sector becomes confirmed by a correct theory in that peer review. This avoids leaking hidden information when a theory is merely proven wrong.
- The most recent peer-review result remains visible in the Current Progress card for all players; the public log also records each result.
- No Supabase SQL/RPC change is required.

## App icon/background retained from v11.4.54
- PWA/Apple Touch/favicon assets keep the transparent user-provided BoardMate logo.
- Manifest `background_color` remains `transparent`.

## Alarm feature retained
- Main header `🔔 알림` settings, new-room/game-start/my-turn alerts, optional sound/vibration and notification click navigation remain from v11.4.51.
- Fully closed-app background Web Push is still not implemented.

## Preserve on future patches
- Keep `docs/history/` and `database/history/` for rollback.
- Update this file, `CHANGELOG_MASTER.md`, `TEST_STATUS_CURRENT.md`, `HANDOFF_VERSION.txt`, and service-worker cache version on every release.
