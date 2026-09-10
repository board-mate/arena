# BoardMate Arena v11.4.58 — 부팅/빈 화면 긴급 복구

## 증상
GitHub Pages 루트에서 배경만 보이고 `#app`이 비어 있으며 새로고침에도 화면이 나타나지 않는 사례.

## 원인/위험 지점
루트 `index.html`이 jsDelivr의 Supabase SDK를 **동기 parser-blocking script**로 먼저 로드했다. CDN 응답이 지연/실패하면 뒤의 `app.js` 실행 자체가 늦어져 빈 화면처럼 보일 수 있다.

## 수정
- Supabase SDK 비동기 로드
- `app.js`의 Supabase client lazy initialization
- SDK 준비 이벤트 수신 후 현재 라우트 재렌더
- 3.5초 부팅 fallback UI
- `recovery.html`: SW/cache만 삭제 후 최신 홈 재진입
- SW cache key v11.4.58

## 데이터 안전
`recovery.html`은 localStorage/session 계정·게임 데이터를 삭제하지 않는다.
