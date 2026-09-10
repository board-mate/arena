# BoardMate Arena v11.4.44 · Planet X account sheet + theory placement rollback

## 변경 사항

- `내 기록지` 저장 위치를 브라우저 `localStorage`에서 **로그인 계정 + 게임방** 기준 Supabase 비공개 저장소로 변경했습니다.
- 기존 브라우저 기록이 있고 계정 저장본이 비어 있으면 최초 접속 시 한 번 서버로 옮긴 뒤 기존 Planet X 기록 키를 삭제합니다.
- 시작 정보, 조사 기록, 연구 결과, 섹터 체크가 같은 계정으로 다른 브라우저/기기에서 복원됩니다.
- 직접 테이블 접근은 `anon/authenticated` 모두 차단하고, 참가자 본인의 기록만 읽고 쓰는 RPC만 공개합니다.
- v11.4.42에서 추가한 `가설 배치 계속` 버튼과 1.5초 자동 재시도는 롤백했습니다. 가설 선택 이후 별도 확정 버튼 없이 원래 자동 배치 흐름을 사용합니다.
- 자동 배치 코드에서 누락되어 있던 `theoryPlacing`, `theoryAutoKey` 상태 변수를 명시적으로 선언해 모듈 스크립트의 `ReferenceError` 가능성을 제거했습니다.
- v11.4.43의 전문가 모드 동일 섹터/서로 다른 종류 가설 허용 수정은 유지합니다.

## 설치

1. 웹 파일을 GitHub Pages 저장소에 덮어씁니다.
2. Supabase SQL Editor에서 `SUPABASE_PLANETX_PRIVATE_SHEET_V4.sql`을 한 번 실행합니다.
3. 기존 v11.4.42 환경에서 v11.4.43 동일 섹터 가설 SQL을 아직 실행하지 않았다면 `SUPABASE_PLANETX_THEORY_SAME_SECTOR_FIX_V3.sql`도 실행합니다.
4. 배포 후 브라우저에서 강력 새로고침합니다. 서비스워커 캐시는 v11.4.44로 갱신됩니다.
