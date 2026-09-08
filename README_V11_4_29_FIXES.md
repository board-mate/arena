# BoardMate Arena v11.4.29 — gameplay hotfix

기준: v11.4.28 전체본

## 수정 내용

1. **프라코로 포켓몬 준비 오류**
   - 최신 웹 클라이언트의 기술 ID(`pikachu-bite` 등)와 예전 Supabase V3의 숫자 ID(`pikachu-0` 등)가 충돌하던 경우를 복구했습니다.
   - `SUPABASE_PLAKORO_PVP_V6.sql`은 V3/V4/V5 위에 그대로 실행할 수 있으며, 두 형식의 기술 ID를 모두 받아 최신 ID로 정규화합니다.
   - setup pair RPC의 `seat` 모호성 수정도 포함합니다.
   - 웹 화면에서도 구버전 RPC가 감지되면 실행해야 할 V6 SQL 파일을 정확히 안내합니다.

2. **게임 취소 완료 안내**
   - `multi-common.js`가 실제 취소 RPC 응답 필드(`cancelled`, `yes`, `total`)를 읽도록 수정했습니다.
   - 마지막 참가자가 취소에 동의한 즉시 전체 화면에 `게임이 취소되었습니다` 안내가 표시됩니다.
   - 방 화면으로 돌아온 경우에도 `finished + unanimous cancel` 상태를 확인해 취소 안내를 보여줍니다.

3. **판타지 왕국 스크롤 초기화**
   - 10초 폴링에서 revision이 바뀌지 않았으면 다시 렌더링하지 않습니다.
   - 실제 상태 변경으로 렌더링하는 경우에도 페이지 세로 위치, 버린 카드 가로 스크롤, 각 플레이어 손패 가로 스크롤 위치를 저장/복원합니다.

4. **판타지 왕국 효과 팝업 잠깐 내리기**
   - 특수 카드 효과 팝업에 `↓ 내 카드 잠깐 보기` 버튼을 추가했습니다.
   - 누르면 팝업이 내려가고 실제 카드 영역을 볼 수 있습니다.
   - 화면 아래 `↑ 효과 설정 계속하기` 버튼으로 같은 선택 상태를 유지한 채 다시 열 수 있습니다.
   - Esc 키도 같은 '잠깐 내리기' 동작으로 처리합니다.

## 배포

1. 저장소 루트에 v11.4.29 파일을 덮어씁니다.
2. Supabase SQL Editor에서 `SUPABASE_PLAKORO_PVP_V6.sql`을 **한 번 실행**합니다.
3. 필요하면 `SUPABASE_VERIFY_PLAKORO_V6.sql`로 RPC 설치 여부를 확인합니다.
4. GitHub Pages 배포 후 한 번 강력 새로고침합니다. 서비스워커 캐시는 `boardmate-shell-v11.4.29`입니다.

전체 DB repair가 필요한 환경에서는 `SUPABASE_REPAIR_ALL_GAMES_V29.sql`을 사용합니다.
