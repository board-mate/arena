# 🧠 다음 ChatGPT / 개발 세션 시작용 프롬프트

아래 내용을 새 대화 첫 메시지에 붙여 넣고, 그 다음 원하는 수정사항을 말하면 됩니다.

---

BoardMate Arena를 계속 개발한다. 현재 기준본은 **v11.4.60**이다.

먼저 이 패키지의 다음 파일을 읽고 현재 상태를 파악해라.

1. `START_HERE.md`
2. `README.md`
3. `docs/current/HANDOFF_CURRENT.md`
4. `docs/current/TEST_STATUS_CURRENT.md`
5. `docs/current/RELEASE_CHECKLIST.md`
6. 필요하면 `docs/current/CHANGELOG_MASTER.md`와 `docs/history/`를 확인한다.

중요 원칙:

- `docs/history/`와 `database/history/`는 롤백 근거이므로 삭제하지 않는다.
- 기존에 정상 작동하던 다른 게임을 깨지 않게 회귀 검사를 한다.
- 진행 중인 게임은 가능한 한 초기화/파괴하지 않고 호환 패치를 우선한다.
- 공용 파일(`app.js`, `multi-common.js`, `alarm.js`, `sw.js`) 수정 시 전체 게임 영향 범위를 확인한다.
- 실제 파일을 수정한 뒤 문법/정적 검사와 가능한 E2E를 실행하고, 결과를 문서화한다.
- 새 릴리스에서는 `HANDOFF_VERSION.txt`, 서비스워커 캐시, README, START_HERE, current handoff/test/deployment/changelog 문서를 함께 갱신한다.

현재 핵심 상태:

- 다인플 18개 / 1인플 7개.
- 포켓몬 미니마 제거, 프라코로 포켓몬 유지.
- 행성 X: 원형 게임판/기록지 1번 섹터 12시, 원형↔네모 기록지, 🌑 소행성, 논문 상세 공개 기록, 구형 진행방 기록 복구, X 후보 선택 시 좌/우 인접 섹터 번호 안내, 종료 시 전체 섹터/X 위치 공개.
- 알림: 실행 중 브라우저/PWA에서 best-effort 알림. 내 차례에는 브라우저 탭 제목 `🔔 내 차례 ·`. 완전히 종료된 상태의 서버 Web Push는 아직 미구현.
- 캘리코: 루미 오른쪽 위 판정/재검사/게임 취소 유지.
- 에친스톤: 1인플 메뉴와 저장/이어하기 유지.
- 앱 아이콘: 사용자 제공 BoardMate 로고, 투명 배경.
- v11.4.60 신규 Supabase SQL/RPC 없음.

다음 우선순위 후보는 **PC 브라우저 탭/상단 배너/시스템 알림 + 모바일 최소화·복귀 시 알림 재확인 안정화**와 **전체 게임 자동 E2E 회귀 테스트**다. 완전 종료 Web Push는 현재 요구 범위 밖이다.

---


## v11.4.60 추가
- 알림 모듈 실패가 메인 부팅을 막지 않음.
- app.js module load 최대 3회 재시도.
- 내 차례: 탭 제목 + 상단 배너 + favicon 표시.
- 시스템 알림 성공 후에만 seen 처리.
- DB 변경 없음.
