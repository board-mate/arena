# BoardMate Arena v11.4.21 — 신규 게임 통합

## 추가 게임

### 다인플
- 🧪 돌팔이 약장수 (`quacks`) — 2~4인, 동시 진행형
- ⚔️ 맨덤의 던전 (`mandom`) — 2~4인, 턴 기반
- ⛩️ 사무라이 PVP (`samurai`) — 2~4인, 턴 기반
- 🧭 엘도라도 (`eldorado`) — 2~4인, 턴 기반
- ✈️ 에어 랜드 & 씨 (`airlandsea`) — 2인, 턴 기반

### 1인플
- ☕ 커피 로스터 — `solo-coffee-roaster.html`

## 배포 순서
1. 이 릴리스의 파일을 GitHub 저장소 루트에 덮어씁니다.
2. Supabase SQL Editor에서 `SUPABASE_REPAIR_ALL_GAMES_V21.sql` 전체를 실행합니다.
3. 이어서 `SUPABASE_VERIFY_ALL_GAMES_V21.sql`을 실행해 `ok = true`를 확인합니다.
4. GitHub Pages 배포가 끝난 뒤 브라우저를 새로고침합니다. Service Worker 캐시는 `v11.4.21`로 올렸습니다.
5. 다인플에서 각 게임으로 새 방을 만들어 테스트합니다. 커피 로스터는 1인플 메뉴에서 바로 실행합니다.

## 통합 메모
- 업로드된 `커피로스터.zip` 및 `Air, Land, & Se.zip`의 `app.js`는 현재 저장소보다 오래된 BoardMate 앱 코드가 포함되어 있어 **복사하지 않았습니다**. 신규 게임 등록 부분만 현재 `app.js`에 병합했습니다.
- 엘도라도 패키지의 개별 `SUPABASE_ELDORADO.sql` 역시 최신 전체 게임 카탈로그보다 좁은 목록을 사용하므로 그대로 적용하지 않았습니다. 엘도라도 등록은 `SUPABASE_REPAIR_ALL_GAMES_V21.sql`에 통합했습니다.
- 판타지 왕국/한밤의 늑대인간 V20 복구 RPC도 V21 SQL에 포함되어 있어 기존 로딩 수정이 유지됩니다.
