# Fantasy Realms — BoardMate unified multiplayer integration

Supersedes the original v11.4.1 PeerJS-only integration.

## Current architecture
Fantasy Realms is a normal BoardMate multiplayer game:

`다인플 → 방 만들기 → 판타지 왕국 → 3~6인 → 게임 시작`

The game uses the shared BoardMate Supabase room and Realtime infrastructure. The old standalone PeerJS lobby/room-code flow is no longer used.

## State privacy
The public game state contains turn/order/discard/deck-count/player-name information only. Hands and special-card selections are kept in `boardmate_game_private_states`.

Normal participants receive only their own private state. The host receives the full private map because the current client architecture uses an authoritative host to apply game actions.

## Required Supabase migration
Run `SUPABASE_FANTASY_REALMS_UNIFIED.sql` once on an existing v11/v11.4 database.
