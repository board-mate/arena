# v11.4.38 행성 X UI 검증

## 요청 사항

- PASS: 연구 A–F 선택 전에 게임별 주제 제목 표시
- PASS: 우측 참조표에서도 연구 주제 제목 A–F 확인 가능
- PASS: 연구 제목만 공개하고 숨은 논리 규칙은 기존 연구 RPC에서만 반환
- PASS: 표준 혜성 메모는 2, 3, 5, 7, 11 섹터에만 표시
- PASS: 전문가 혜성 메모는 2, 3, 5, 7, 11, 13, 17 섹터에만 표시
- PASS: 원형 12/18 섹터 방향판 추가
- PASS: 표준 정반대 +6 / 전문가 정반대 +9 계산
- PASS: 상세 섹터 카드에도 `↔ 맞은편 N` 표시

## 코드 검증

- PASS: `online-planetx.html` module JavaScript `node --check`
- PASS: `tests/v38_planetx_ui_test.py`
- PASS: 새 게임 상태 버전 `11.4.38`
- PASS: Service Worker `boardmate-shell-v11.4.38`
- PASS: `index.html` `app.js?v=38`

## Supabase

- 기존 설치용 `SUPABASE_PLANETX_RESEARCH_TOPICS_V2.sql` 추가
- 신규 전체 설치용 `SUPABASE_PLANETX_PVP_V1.sql`에도 동일 RPC 포함
- `boardmate_planetx_research_topics` 반환값은 A–F의 `topic` 문자열뿐이며 `rule`/정답 board를 반환하지 않음

## 회귀 확인

아래 핵심 파일은 v11.4.37 원본과 SHA-256 동일:

- `online-mandom.html` — `b1065e1bdc12119067a38069a68ebc5728a93c006dd5b2dca96929d301a8d3de`
- `online-plakoro.html` — `e153b8d0f614066c41c4a863539628774880f484734a4fa5a854f8433bac630e`
- `online-fantasy-realms.html` — `dccbc0a33d08081f7235156d383d43a74a86f9443e67eb980e7b53fd12ae7ac5`
- `multi-common.js` — `74b36c091c0e47c303ae09d67391376aadb4aa0e913f738cb96e919005081159`

저장소의 과거 버전 전용 검증 스크립트 일부는 `boardmate-shell-v11.4.27/29` 또는 handoff `v11.4.26`을 고정값으로 요구해 최신 원본 v11.4.37에서도 실패함을 별도 확인했습니다. 이번 변경으로 새로 발생한 실패가 아닙니다.
