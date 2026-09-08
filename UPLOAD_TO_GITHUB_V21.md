# GitHub 업로드 — v11.4.21

저장소: `board-mate/arena`

## 웹에서 업로드할 때
1. GitHub 저장소의 `main` 브랜치를 엽니다.
2. **Add file → Upload files**를 선택합니다.
3. `BoardMate_Arena_V11_4_21_NEW_GAMES_FULL.zip`을 먼저 로컬에서 풀고, 압축을 푼 **내용물 전체**를 저장소 루트에 업로드합니다. ZIP 파일 자체를 저장소에 넣는 방식이 아닙니다.
4. Commit message 예: `v11.4.21 add new BoardMate games`
5. Commit changes를 누릅니다.
6. GitHub Pages가 새 커밋으로 배포되었는지 Actions/Pages에서 확인합니다.
7. Supabase에서 `SUPABASE_REPAIR_ALL_GAMES_V21.sql` → `SUPABASE_VERIFY_ALL_GAMES_V21.sql` 순으로 실행합니다.

## 반드시 포함되어야 하는 신규 실행 파일
- `online-quacks.html`
- `online-mandom.html`
- `online-samurai.html`
- `online-eldorado.html`
- `online-airlandsea.html`
- `solo-coffee-roaster.html`
- 수정된 `app.js`, `index.html`, `sw.js`
- `SUPABASE_REPAIR_ALL_GAMES_V21.sql`
