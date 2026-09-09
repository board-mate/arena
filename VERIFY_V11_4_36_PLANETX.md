# BoardMate Arena v11.4.36 · 정적 검증

## 대상

행성 X PVP `개체 탐사`의 태양계 번호 경계 연속 범위 생성 수정.

## 검증 결과

**전체 통과**

1. `online-planetx.html` 모듈 JavaScript `node --check` 통과.
2. 표준 모드 관찰 하늘 `11,12,1,2,3,4`에서 시작 11 범위가 `11 → 12 → 1 → ...`로 생성됨.
3. 같은 관찰 하늘에서 시작 12 범위가 `12 → 1 → 2 → ...`로 생성됨.
4. 관찰 하늘 `6,7,8,9,10,11`에서 시작 11은 `11`만 허용되며 잘못된 `11 → 6` 범위가 생성되지 않음.
5. 전문가 모드 `17,18,1,2,3,4,5,6,7`에서 시작 18 범위가 `18 → 1 → 2 → ...`로 생성됨.
6. 기존 잘못된 `vis.slice(start).concat(vis.slice(0,start))` 로직이 제거됨.
7. 서버 `SUPABASE_PLANETX_PVP_V1.sql`은 기존부터 `(이전 섹터 % n) + 1`로 12→1 / 18→1 연속성을 허용하므로 SQL 변경 불필요.
8. `online-plakoro.html`, `online-mandom.html`, `online-fantasy-realms.html`, `multi-common.js`, `SUPABASE_PLAKORO_PVP_V6.sql`, `SUPABASE_PLANETX_PVP_V1.sql`은 v11.4.35와 SHA-256 동일.
9. 서비스워커 캐시 `boardmate-shell-v11.4.36` 확인.
10. `index.html`의 `app.js?v=36` 확인.

## 회귀 보존 SHA-256

- `online-plakoro.html`: `e153b8d0f614066c41c4a863539628774880f484734a4fa5a854f8433bac630e`
- `online-mandom.html`: `b1065e1bdc12119067a38069a68ebc5728a93c006dd5b2dca96929d301a8d3de`
- `online-fantasy-realms.html`: `dccbc0a33d08081f7235156d383d43a74a86f9443e67eb980e7b53fd12ae7ac5`
- `multi-common.js`: `74b36c091c0e47c303ae09d67391376aadb4aa0e913f738cb96e919005081159`
- `SUPABASE_PLAKORO_PVP_V6.sql`: `6a12a4b78ae59e39392062de8d7cc27cdb8b0914f067b456cc735e74075d9321`
- `SUPABASE_PLANETX_PVP_V1.sql`: `4a83f7650fae36d6d76a59ac759e9544effb6c7df6c1665d853954cb5896705c`
