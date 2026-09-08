# BoardMate v11.4.20 — Fantasy Realms connectivity fix

## Root cause
The unified Fantasy Realms page waited for the Supabase Realtime channel subscription **before** loading the game state. If the WebSocket subscription stalled, the game UI stayed on the room/seat panel even though BoardMate room data had loaded.

The unified game was also host-authoritative. When the room host disconnected before initializing or during a game, connected participants could be left with no controller to process actions.

## Fix
- Realtime subscriptions are now fire-and-forget; they never block initial game-state loading.
- Initial `get_boardmate_fantasy_state` is loaded independently with an explicit timeout.
- If the host is disconnected and no game state exists, a connected participant can initialize the game.
- If the current controller/host is disconnected during an existing game, a connected participant can claim controller authority.
- Controller identity is stored with the Fantasy public/private state and returned by the protected RPC.
- Public Realtime Broadcast remains revision-only. Game state and hands are still fetched through RPC.

## Supabase
Run `SUPABASE_FANTASY_REALMS_UNIFIED.sql` once. It is the corrected safe migration and replaces the older Fantasy migration that narrowed the `boardmate_rooms_game_check` constraint.

Do not run the old Fantasy migration after this file.
