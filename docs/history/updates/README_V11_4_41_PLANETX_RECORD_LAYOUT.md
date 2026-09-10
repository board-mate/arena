# BoardMate Arena v11.4.41 · Planet X record layout fix

## Changes
- The `내 기록지` card is no longer sticky under any desktop breakpoint.
- Added a hard CSS override (`position: static !important`) to prevent older sticky rules from winning.
- Moved `내 기록지` to the bottom of the right sidebar.
- Changed `내 기록지` to a collapsed `<details>` panel by default.
- Kept `내 비공개 조사 기록` directly under the solar-system board.
- Moved reference material, research topic titles, public conference info, and public log above the private record sheet.
- Research topic titles A–F are expanded by default.
- Bumped service-worker cache to `boardmate-shell-v11.4.41` and app query to `app.js?v=41` to reduce stale v11.4.39/v11.4.40 UI cache issues.

No Supabase schema/RPC changes are required.
