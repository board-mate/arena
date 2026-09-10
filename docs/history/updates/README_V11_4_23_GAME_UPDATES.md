# BoardMate Arcade v11.4.23 — Game Updates

## Included
1. Social deduction (Avalon / Secret Hitler / One Night Werewolf): unanimous game-cancel control is mounted from `social/social-common.js`.
2. Fantasy Realms: own hand preview is shown while configuring card abilities; only the current player's hand is exposed.
3. Pokemon Minima: official-artwork image URLs are shown on the local game cards/zoo; fixed an existing duplicate `nextTurn` declaration in the standalone game and bumped cache query.
4. Plakoro: ported the uploaded `online-plakoro-multiplayer-setup-v3(1).html` update into BoardMate PvP: 6 Pokemon, 7 moves per Pokemon / choose 4, 3 energy dice with A/B/C face structure, new move effects, and setup-state restore.
5. No-Touch Kraken: round-transition overlay and game-end overlay.
6. Secret Hitler: fascist-track effect labels are shown for 5–6 / 7–8 / 9–10 player counts, plus current executive power notice.

## Supabase
Run `SUPABASE_PLAKORO_PVP_V4.sql` only after the existing BoardMate catalog / Plakoro V3 migration. It does not modify the room-game check constraint.
Then run `SUPABASE_VERIFY_PLAKORO_V4.sql`.

Do not run the older `SUPABASE_FANTASY_REALMS_UNIFIED.sql` because it narrows the room game constraint list.
