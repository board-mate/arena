# BoardMate Arena v11.4.24 배포 순서

## 1. GitHub 파일 업로드
이 ZIP의 **내용물 전체를 저장소 루트에 덮어쓰기**합니다. ZIP 자체를 저장소에 올리는 것이 아니라 압축을 푼 파일들을 업로드합니다.

특히 다음 파일이 저장소에 있어야 합니다.
- `app.js`, `index.html`, `sw.js`
- `online-quacks.html`, `online-mandom.html`, `online-samurai.html`, `online-eldorado.html`, `online-airlandsea.html`
- `solo-coffee-roaster.html`
- v11.4.23에서 업데이트된 소셜/판타지/포켓몬/프라코로/크라켄 파일

## 2. Supabase SQL
SQL Editor에서 순서대로 실행합니다.

1. `SUPABASE_PLAKORO_PVP_V4.sql`
2. `SUPABASE_REPAIR_ALL_GAMES_V24.sql` (**반드시 마지막 repair**)
3. `SUPABASE_VERIFY_ALL_GAMES_V24.sql`

검증 결과의 `ok`는 모두 `true`여야 합니다.

### Social Action RPC만 확인
`CHECK_SOCIAL_ACTION_RPC_V24.sql`을 실행합니다. 올바른 함수는:

`public.boardmate_social_action(text,uuid,jsonb)`

## 3. GitHub Pages 확인
배포 완료 후 브라우저를 강력 새로고침합니다. Service Worker 캐시는 `boardmate-shell-v11.4.24`로 변경되어 있습니다.

## 4. 플레이 테스트
- 한밤의 늑대인간 새 방 생성 → 로딩/행동 확인
- 판타지 왕국 새 방 생성 → 상태 저장 확인
- 프라코로 2인 방 → V4 설정 확인
- 신규 5개 다인플 게임이 방 생성 목록에 표시되는지 확인
- 커피 로스터가 1인플 목록에 표시되는지 확인
