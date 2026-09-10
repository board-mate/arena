# Deployment — v11.4.57

## Recommended GitHub Pages deployment
1. Commit/tag the currently working repository before replacing files.
2. Upload the v11.4.57 integrated package, or use the v11.4.57 patch ZIP.
3. Commit and push to GitHub.
4. Reload BoardMate once so `boardmate-shell-v11.4.57` activates.
5. In an existing Planet X game, refresh the page and verify old bare `틀린 논문 패널티 시간 +1` rows are shown as detailed peer-review rows.
6. Open `행성 X 찾기`, choose sector 9, and confirm the labels say left 8 / right 10.
7. Open a turn-based game where it is your turn and confirm the browser tab title starts with `🔔 내 차례 ·`.
8. In `🔔 알림 설정`, send a test alert if OS notification delivery is desired.

## Database
No Supabase SQL/RPC update is required for v11.4.57.

## Existing games
The Planet X public-log repair is display-time compatibility logic; it is specifically intended to work with already-running v11.4.55-era games without resetting the room.
