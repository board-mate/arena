# v11.4.37 행성 X 플레이어 색상 구분 검증

## 정적 검증
- PASS: `online-planetx.html` JavaScript `node --check`
- PASS: P1~P4 고정 색상 정의
- PASS: 상단 플레이어 카드 색상 띠/점/색상명
- PASS: 타임 트랙 플레이어 색 점
- PASS: 현재 차례 색 점 금색 외곽선
- PASS: 가설 토큰 소유자 색상
- PASS: 가설 준비 상태 색상
- PASS: 현재 진행/가설 배치/마지막 기회 플레이어 색상
- PASS: 공개 기록 플레이어 행동 색상
- PASS: 최종 점수표 플레이어 색상
- PASS: 새 게임 상태 버전 `11.4.37`
- PASS: Service Worker `boardmate-shell-v11.4.37`
- PASS: `index.html` `app.js?v=37`

## 회귀 보존 SHA-256
v11.4.36과 아래 파일의 SHA-256이 동일함을 확인했습니다.

- `online-plakoro.html` — `e153b8d0f614066c41c4a863539628774880f484734a4fa5a854f8433bac630e`
- `online-mandom.html` — `b1065e1bdc12119067a38069a68ebc5728a93c006dd5b2dca96929d301a8d3de`
- `online-fantasy-realms.html` — `dccbc0a33d08081f7235156d383d43a74a86f9443e67eb980e7b53fd12ae7ac5`
- `multi-common.js` — `74b36c091c0e47c303ae09d67391376aadb4aa0e913f738cb96e919005081159`
- `SUPABASE_PLANETX_PVP_V1.sql` — `4a83f7650fae36d6d76a59ac759e9544effb6c7df6c1665d853954cb5896705c`

## DB 호환성
색상은 `seat` 값으로 클라이언트에서 계산합니다. DB 컬럼/RPC/저장 상태 구조를 변경하지 않았으므로 추가 Supabase SQL은 필요 없습니다. v11.4.36에서 진행 중인 행성 X 방도 그대로 이어서 사용할 수 있습니다.
