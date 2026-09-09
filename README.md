# BoardMate Arena v11.4.34 — 행성 X를 찾아서 PVP

최신 통합 릴리스는 **v11.4.34**입니다. v11.4.33 전체본을 기준으로 `행성 X를 찾아서` 2~4인 완전 PVP를 추가했습니다. 기존 v11.4.29 프라코로/게임 취소/판타지 왕국 HOTFIX와 v11.4.33 맨덤 룰 흐름 복구 파일은 그대로 유지합니다.

배포 후에는 기존 Repair SQL을 다시 덮어쓰지 말고 **`SUPABASE_PLANETX_PVP_V1.sql`을 마지막에 1회 실행**하세요. 자세한 내용은 `README_V11_4_34_PLANETX_PVP.md`와 `UPLOAD_TO_GITHUB_V34.md`를 참고하세요.

# BoardMate Arena v11.4.27

Latest merged release: v11.4.26 game polish + top-right app install + compact 4-column game catalog + Stable/ALPHA/BETA grouping + unanimous cancellation for Avalon / Secret Hitler / One Night Werewolf. See `README_V11_4_27_MERGED.md`.

# BoardMate Arena v11.4.26

보드메이트 모임용 웹 보드게임 통합본입니다.

## v11.4.26 핵심 변경
- `프라코로` 표시명 → **프라코로 포켓몬**
- `사무라이 PVP` 표시명 → **사무라이**
- **포켓몬 미니마 삭제**: 메뉴와 배포 런타임에서 제거했습니다. 기존 Supabase 행이 깨지지 않도록 legacy DB key `pocketnova`만 호환용으로 남습니다.
- 프라코로 포켓몬: V5 SQL이 준비 테이블/RPC를 자체 생성하고, 기본 포켓몬 선택 초기화 및 오류 표시를 보강했습니다.
- 엘도라도: 기본 맵을 21열 장거리 코스로 늘리고 봉쇄선을 붉은 점선으로 명확하게 표시합니다.
- 돌팔이 약장수: 1~34칸 냄비 트랙과 라운드 종료 주머니 구성 보기를 추가했습니다.
- 맨덤의 던전: 합의한 플레이 순서 설정, `카드 확인→던전/장비`, 패스, 승리 토큰/빨간 테두리/탈락 흐름으로 수정했습니다.
- 사무라이: 좌표 겹침을 제거한 v2 일본 열도 맵으로 교체하고 2/3/4인 조각 배치 슬롯을 공급량과 맞췄습니다.
- v11.4.25의 1인플 저장/게임 포기 기능은 그대로 유지합니다.

## Supabase
배포 후 SQL Editor에서 아래 순서로 실행하세요.

1. `SUPABASE_REPAIR_ALL_GAMES_V26.sql`
2. `SUPABASE_VERIFY_ALL_GAMES_V26.sql`
3. 검증 결과의 모든 `ok`가 `true`인지 확인

특히 프라코로 포켓몬 준비 화면이 `동기화 오류`에서 멈췄던 설치는 V26 Repair가 `boardmate_plakoro_setups` 테이블까지 생성하면서 복구합니다.

세부 변경은 `README_V11_4_26_GAME_POLISH.md`, 배포 순서는 `UPLOAD_TO_GITHUB_V26.md`를 참고하세요.
