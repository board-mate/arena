# BoardMate Arena v11.4.30

## Fixes
- Calico: stop destructive historical cat-token repair; correctly placed Tecolote and other existing cat tokens are preserved. New placement remains validated.
- Secret Hitler: redesigned policy tracks so fascist effects are legible and no longer overlap/break.
- Plakoro: real skill IDs accepted by setup RPC; C-face two-energy arrays validated correctly; skill names show type emojis; left/right face labels are distinct; explicit cancel control remount; multiplayer setup/action flow preserved.
- Fantasy Realms: fixed missing controller export/import; controller can read aggregate private state and write state after takeover; first connected participant can bootstrap an empty game; takeover RPC is atomic.

## Deployment
1. Replace the listed HTML/JS files from the patch ZIP.
2. Run `SUPABASE_TARGETED_FIX_V30.sql` once in Supabase SQL Editor.
3. Run `SUPABASE_VERIFY_TARGETED_V30.sql` and confirm all rows are true.
4. Hard refresh after GitHub Pages deployment.

No `boardmate_rooms_game_check` constraint is modified by this targeted SQL.
