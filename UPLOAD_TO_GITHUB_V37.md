# BoardMate Arena v11.4.37 배포 순서

## v11.4.36에서 업데이트
1. `BoardMate_Arena_V11_4_37_PLANETX_PLAYER_COLORS_PATCH.zip` 압축을 풉니다.
2. 내용물을 GitHub 저장소 루트에 덮어씁니다.
3. GitHub Pages 배포 완료를 기다립니다.
4. 브라우저에서 강력 새로고침을 1회 합니다.

## Supabase
이번 패치는 **추가 SQL 실행이 필요 없습니다.**

## 캐시
- Service Worker: `boardmate-shell-v11.4.37`
- `index.html`: `app.js?v=37`

## 확인 포인트
- 행성 X 방에서 P1 파랑 / P2 빨강 / P3 노랑 / P4 초록으로 표시되는지 확인
- 타임 트랙에 플레이어 색 점이 현재 시간 위치에 표시되는지 확인
- 가설 토큰 소유자 번호/테두리 색이 플레이어 색과 같은지 확인
- 기존 v11.4.36 진행 방도 새 UI로 그대로 열리는지 확인
