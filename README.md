# v11.4.21 신규 게임 통합

돌팔이 약장수 / 맨덤의 던전 / 사무라이 PVP / 엘도라도 / 에어 랜드 & 씨를 다인플에, 커피 로스터를 1인플에 추가했습니다.

배포 후 운영 Supabase에서 **`SUPABASE_REPAIR_ALL_GAMES_V21.sql`을 마지막으로 실행**하고 `SUPABASE_VERIFY_ALL_GAMES_V21.sql`로 검증하세요. 자세한 내용은 `NEW_GAMES_INTEGRATION_V11_4_21.md`를 확인하세요.

---

# v11.4.20 current hotfix

판타지 왕국 / 한밤의 늑대인간 로딩 문제는 `FANTASY_WEREWOLF_LOAD_FIX_V11_4_20.md`를 먼저 확인하세요. 운영 Supabase에는 `SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql` 실행 후 `SUPABASE_VERIFY_FANTASY_WEREWOLF_V20.sql`로 검증합니다.

---

# BoardMate Arena — app.js Power Grid merge

Base: latest known v11.4.16 DIRECT_RESUME app.js.

Merged only the Power Grid-specific change from the user-supplied app.js:
- Power Grid display name: `파워그리드`
- Player count: minimum 3, maximum 6
- Entry page remains `online-powergrid.html`

Other unrelated differences in the supplied app.js were intentionally not copied, so the latest BoardMate app features remain intact (Pokemon Minima replacement, Fantasy Realms, direct resume, home UI, etc.).

Replace the repository-root `app.js` with this file.
Supabase SQL is not changed by this app.js-only merge.
