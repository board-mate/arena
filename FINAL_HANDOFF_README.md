# BoardMate Arcade Final Consolidated Handoff

This package consolidates the BoardMate Arcade v11.4 Realtime base with:
- Fantasy Realms 3-6 player integration (v11.4.1)
- Calico V4/V5/V6/V7/V8 updates, including static printed-edge data and existing-game token repair
- Existing Supabase Realtime setup files

Upload the contents of this ZIP to the GitHub repository root, replacing the existing files.

Supabase: use the existing v11.4 SQL/setup files. No additional SQL is required specifically for the Calico V8 client repair.

Important: an already-running Calico browser tab will not magically update. After deployment, refresh the host/browser running the active room so the V8 repair code loads and can re-save the corrected state.
