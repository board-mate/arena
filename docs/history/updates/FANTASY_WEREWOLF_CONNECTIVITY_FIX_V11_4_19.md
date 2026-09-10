# v11.4.19 - Fantasy Realms / One Night Werewolf connectivity fix

Root causes fixed:
- `online-fantasy-realms.html` imported Fantasy helpers that were missing from `multi-common.js`.
- Social game pages imported `finalizeSeatWinners` and `socialEndScreen`, but those exports were missing from `social/social-common.js`.
- Module imports are cache-busted to v19.

Changed:
- `multi-common.js`
- `social/social-common.js`
- `online-fantasy-realms.html`
- `online-avalon.html`
- `online-secret-hitler.html`
- `online-one-night-werewolf.html`
- included `SUPABASE_FANTASY_REALMS_UNIFIED.sql` for DB verification/migration if needed.

No game rules were changed.
