# BoardMate Arena v11.4.42 · Planet X bug fix

## Fixed
1. `내 기록지` no longer collapses whenever a sector mark is clicked.
   - The open/closed UI state is preserved across full re-renders.
   - Sector mark clicks now update only the clicked button instead of rebuilding the whole game UI.
2. `가설 배치` can recover from a transient RPC/state-sync failure.
   - The current player gets a `가설 배치 계속` retry button.
   - A failed automatic placement retries after 1.5 seconds.
   - This prevents one temporary failure from leaving the room permanently stuck in `theory-place`.
3. Cache version bumped to `boardmate-shell-v11.4.42` and `app.js?v=42`.

## Deployment
No new Supabase schema change is required for these two fixes. Upload the changed web files and reload once so the new service-worker cache becomes active.
