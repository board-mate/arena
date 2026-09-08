# BoardMate Arena v11.4.27 merged

This release merges the v11.4.26 GAME POLISH line with the uploaded v11.4.26 GAME_STATUS_CANCEL line without rolling either branch back.

## Preserved game-polish changes
- 프라코로 포켓몬 display name and V5 setup repair
- 사무라이 display name and map v2
- Pokemon Minima removed from the Arena/package
- El Dorado long course + visible blockade lines
- Quacks 1–34 pot/score track + bag inventory view
- Mandom revised turn order / draw / dungeon / equipment / pass flow
- PowerGrid Germany V32 map files from the uploaded current package are preserved

## Hub/UI changes
- Top-right `📲 앱 설치` PWA install button
- New-room catalog: 4 columns on desktop, 3 on medium screens, 2/1 on mobile
- Game cards are shorter/denser vertically
- Stable / ALPHA / BETA groups
  - ALPHA: 사무라이, 엘도라도, 돌팔이 약장수
  - BETA: 에어 랜드 & 씨, 캐스캐디아
  - Stable: remaining selectable multiplayer games

## Social game cancellation
Avalon, Secret Hitler, and One Night Werewolf expose a unanimous game-cancel vote. All current room participants must agree. On unanimous agreement the room is marked `finished`; the cancellation path does not submit a win/loss result.

Run `SUPABASE_REPAIR_ALL_GAMES_V27.sql` once after deployment, then run `SUPABASE_VERIFY_ALL_GAMES_V27.sql` and confirm all `ok` values are true.
