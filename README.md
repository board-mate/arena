# BoardMate Arena — app.js Power Grid merge

Base: latest known v11.4.16 DIRECT_RESUME app.js.

Merged only the Power Grid-specific change from the user-supplied app.js:
- Power Grid display name: `파워그리드`
- Player count: minimum 3, maximum 6
- Entry page remains `online-powergrid.html`

Other unrelated differences in the supplied app.js were intentionally not copied, so the latest BoardMate app features remain intact (Pokemon Minima replacement, Fantasy Realms, direct resume, home UI, etc.).

Replace the repository-root `app.js` with this file.
Supabase SQL is not changed by this app.js-only merge.
