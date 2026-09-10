# BoardMate Arcade FINAL v11.4.7 — Consolidated Handoff

This package is the single consolidated GitHub upload for the BoardMate Arcade work completed so far.

## Included
- BoardMate Arcade v11.4 Realtime base
- Fantasy Realms 3–6 player support, now unified with the normal BoardMate Supabase room flow
- Calico V4–V8 fixes: board preview, turn undo/finish flow, static 88 printed-edge data, automatic cat/button validation, and repair of invalid cat tokens in existing saved games
- Pocket Nova assets and existing online/solo games

## Fantasy Realms architecture
Fantasy Realms no longer uses the separate PeerJS room/lobby. It uses:
- `boardmate_rooms` / `boardmate_room_members`
- BoardMate room creation / join / start flow
- Supabase Realtime Broadcast for state-change and action signaling
- `boardmate_room_state` for public/redacted state
- `boardmate_game_private_states` for secret hands/actions

Opponent hands are not placed in the public state. The authoritative host keeps the full game state and writes the redacted public state plus private seat states atomically.

## GitHub deployment
Upload the entire contents of this ZIP to the repository root and replace the old files.

## Supabase deployment
For an existing BoardMate database, run:
- `SUPABASE_FANTASY_REALMS_UNIFIED.sql`

This migration registers `fantasyrealms` as a normal BoardMate game, updates min/max/name/turn handling, adds the private-state table, and adds the Fantasy Realms private/public state RPCs.

If the database has not yet received the previous BoardMate v11/v11.4 migrations, apply those first; do not use this migration as a replacement for the base schema.

## How to use
1. Log in to BoardMate.
2. Open `다인플` → `＋ 방 만들기`.
3. Select `🏰 판타지 왕국`.
4. Create the room and invite 3–6 members.
5. Start the room from the normal BoardMate room page.
6. The game page opens as `online-fantasy-realms.html?room=<room UUID>`.

## Existing Calico games
After deploying the new Calico file, an active Calico room should be refreshed. The V8 repair code can revalidate the current board and remove an invalid existing cat token when the current board still fails that token's condition.
