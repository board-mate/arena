# v11.4.24 Integrated

Base: v11.4.23 GAME UPDATES FULL.

Merged without dropping prior additions:
- v11.4.23 gameplay/UI updates
- v11.4.21 multiplayer additions: Quacks, Mandom, Samurai, Eldorado, Air Land & Sea
- v11.4.21 solo Coffee Roaster
- Fantasy/Werewolf load repair
- corrected Social Action RPC verification: `boardmate_social_action(text,uuid,jsonb)`
- all-game-safe catalog migrations (18 multiplayer ids)

Use `SUPABASE_REPAIR_ALL_GAMES_V24.sql` as the final catalog/repair migration.
