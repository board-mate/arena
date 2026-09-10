# BoardMate Arena v11.4.25 배포

## 목적
v11.4.24 통합본에 1인플 저장/이어하기/게임 포기 기능을 추가합니다.

## GitHub 업로드
1. `BoardMate_Arena_V11_4_25_SOLO_SAVE_FULL.zip`을 풉니다.
2. `board-mate/arena` 저장소 루트에 파일을 덮어씁니다.
3. commit 후 push 합니다.
4. GitHub Pages 배포가 끝나면 브라우저에서 강력 새로고침을 한 번 합니다.

v11.4.24가 이미 배포되어 있다면 `BoardMate_Arena_V11_4_25_SOLO_SAVE_PATCH_FROM_V24.zip`의 파일만 덮어써도 됩니다.

## Supabase
이번 v11.4.25는 1인플 브라우저 로컬 저장 기능만 변경하므로 새 SQL 실행은 필요 없습니다.

## 확인
- 커피 로스터: 진행 후 새로고침 → 진행 유지
- 포켓몬 미니마 솔로: 진행 후 새로고침 → 진행 유지
- Acquire / 에친스톤 / 마스크맨 / The Game: 우측 하단 `💾 저장`, `🏳 게임 포기` 표시
- 게임 포기 → 해당 게임 저장 삭제 후 초기 상태
- 캘리코 / 캐스캐디아: 외부 사이트이므로 BoardMate 저장 기능 대상 아님
