# Current test status — v11.4.53

- Planet X asteroid display symbol: `🪨` in canonical object label/icon constants.
- Legacy comet-like asteroid display `☄️ 소행성`: absent from current Planet X runtime.
- Comet display remains `🌠 혜성`, so the two objects are visually distinct.
- Bottom reference table includes correct-paper points: asteroid 2, comet 3, gas 4, dwarf 4 Standard / 2 Expert.
- Reference table also includes correct-paper leader bonus (+1) and Planet X scoring summary.
- Runtime scoring constants remain consistent with the displayed reference (`asteroid:2`, `comet:3`, `gas:4`, `dwarf:4/2`).
- Planet X circular board/record orientation from v11.4.52 remains unchanged.
- `online-planetx.html` inline JavaScript syntax: checked.
- Service worker JavaScript syntax and cache version `boardmate-shell-v11.4.53`: checked.
- Multiplayer/solo files other than Planet X are unchanged from the v11.4.52 integrated package.
- No database migration required.

Known environment limit: this release changes display/reference text only; live Supabase multi-device behavior was not changed.
