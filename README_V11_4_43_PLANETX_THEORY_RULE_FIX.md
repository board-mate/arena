# BoardMate Arena v11.4.43 · Planet X theory rule fix

## Fixed

- Keeps the v11.4.42 fixes for the personal record sheet collapsing and theory-placement recovery.
- Expert mode now permits two **different object theory tokens on the same sector** during one theory phase.
- An identical **same sector + same object** theory is still rejected.
- The same rule is applied to the final scoring opportunity.
- Server-side token inventory validation now counts multiple pending choices of the same object type correctly.

## Existing deployment

1. Upload the static patch files to GitHub Pages.
2. Run `SUPABASE_PLANETX_THEORY_SAME_SECTOR_FIX_V3.sql` once in Supabase SQL Editor.
3. Reload the site. The service-worker cache is `boardmate-shell-v11.4.43`.

## Static files changed

- `online-planetx.html`
- `index.html`
- `sw.js`

## Supabase files changed/added

- Added `SUPABASE_PLANETX_THEORY_SAME_SECTOR_FIX_V3.sql` for an existing database.
- Updated `SUPABASE_PLANETX_PVP_V1.sql` so a fresh install finishes with the corrected RPC definitions.
