# BoardMate Arena v11.4.20 — 판타지 왕국 / 한밤의 늑대인간 로딩 복구

## 확인된 원인

v11.4.19에서 JavaScript export/import 누락은 이미 보완되어 있었지만, SQL 마이그레이션 파일들이 서로 다른 시점의 **공용 게임 목록/도우미 함수**를 다시 정의하고 있었습니다.

특히 기존 `SUPABASE_FANTASY_REALMS_UNIFIED.sql`은 `fantasyrealms`까지만 포함한 오래된 게임 CHECK 제약조건을 다시 만들었습니다. 이 파일을 Social Deduction/PowerGrid/Plakoro 이후에 실행하면 최신 게임이 공용 제약조건에서 빠질 수 있고, 반대로 이미 최신 게임 행이 존재하면 제약조건 추가 단계에서 SQL 전체가 중단되어 뒤쪽의 `get_boardmate_fantasy_state` / `put_boardmate_fantasy_state`가 생성되지 않을 수 있습니다.

기존 `SUPABASE_SOCIAL_DEDUCTION_V1.sql`과 `SUPABASE_POWERGRID_UNIFIED.sql`도 최신 `plakoro`와 포켓몬 미니마의 `currentPlayer` 필드를 보존하지 않는 구버전 공용 함수를 다시 정의할 수 있었습니다.

판타지 왕국 화면은 첫 게임 상태 저장 실패를 `false`로만 처리해, 필수 RPC가 없을 때 실제 원인을 숨기고 로딩이 멈춘 것처럼 보이는 문제도 있었습니다.

## v11.4.20 수정

- `SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql` 추가
  - 현재 지원 게임 13종 전체를 공용 CHECK/room creator/turn helper에 복원
  - 판타지 왕국 private-state table + get/put RPC 복구
  - Social Deduction table + init/view/action RPC 복구
  - 기존 방/평점/게임 상태를 삭제하지 않음
- `SUPABASE_FANTASY_REALMS_UNIFIED.sql`, `SUPABASE_SOCIAL_DEDUCTION_V1.sql`, `SUPABASE_POWERGRID_UNIFIED.sql`을 최신 카탈로그를 보존하도록 갱신
- 판타지 왕국 최초 저장이 실패하면 오류를 더 이상 삼키지 않고 설치해야 할 repair SQL을 안내
- 한밤의 늑대인간도 Social RPC/schema cache 누락 시 같은 repair SQL을 안내
- 두 페이지 import cache-bust를 `v=20`으로 갱신
- Service Worker shell cache를 `v11.4.20`으로 갱신

## 배포 순서

1. 이 패키지의 변경 파일을 GitHub Pages 저장소에 업로드/커밋합니다.
2. Supabase SQL Editor에서 **`SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql` 전체를 한 번 실행**합니다.
3. 이어서 `SUPABASE_VERIFY_FANTASY_WEREWOLF_V20.sql`을 실행합니다. 모든 `ok`가 `true`인지 확인합니다.
4. GitHub Pages 배포 완료 후 브라우저에서 새로고침합니다. 설치형 PWA에서 오래된 화면이 남으면 앱을 완전히 종료했다가 다시 여세요.
5. 3인 이상 방에서 판타지 왕국과 한밤의 늑대인간을 각각 새 방으로 테스트합니다.

## 주의

앞으로 개별 게임 SQL을 다시 실행해도 최신 카탈로그가 줄어들지 않도록 관련 migration 파일 자체도 수정했습니다. 그래도 운영 DB 복구에는 `SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql`을 기준으로 사용하는 것을 권장합니다.
