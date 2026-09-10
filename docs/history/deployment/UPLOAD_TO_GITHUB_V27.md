# BoardMate Arena v11.4.27 upload

## Recommended
Upload the contents of the FULL zip to the repository root, replacing files with the same paths.

Delete obsolete Pokemon Minima deploy files if they still exist in GitHub:
- online-pokemon-minima.html
- online-pocketnova.html
- pokemon-minima.html
- solo-pokemon-minima.html
- solo-pocketnova.html
- pocketnova/ (directory)

## Supabase
1. Open Supabase SQL Editor.
2. Run `SUPABASE_REPAIR_ALL_GAMES_V27.sql` in full.
3. Run `SUPABASE_VERIFY_ALL_GAMES_V27.sql`.
4. Confirm every `ok` value is true, including the social-cancel table/status/vote RPC checks.

## Browser cache
The service-worker cache key is `boardmate-shell-v11.4.27`. After GitHub Pages deploys, hard-refresh once if an old shell is still visible.
