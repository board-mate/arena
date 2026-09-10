# BoardMate Arena v11.4.55 · INTEGRATED FULL + HISTORY

이 패키지는 **현재 실행 가능한 BoardMate Arena 전체본**, **현재 기준 인수인계 자료**, **통합 변경 이력**, **버전별 원문**, **검증/배포 기록**, **Supabase SQL 이력**을 한 ZIP에 모은 통합 배포본입니다.

가장 먼저 `START_HERE.md`를 읽으세요.

## 핵심 원칙

- 현재 상태는 `docs/current/`에 한 번에 이해할 수 있도록 통합합니다.
- 예전 업데이트/인수인계/검증/배포/SQL 원문은 롤백을 위해 삭제하지 않고 `docs/history/`, `database/history/`에 보존합니다.
- 캐시, 임시 테스트 산출물, 중복 자산처럼 롤백 가치가 없는 파일만 CLEAN 대상입니다.

## 현재 버전

- 패키지/서비스워커 셸: **v11.4.55**
- 게임 런타임 기능 기준: v11.4.55
- 이번 v11.4.55 변경은 **행성 X 소행성 이모지 `🌑` 전체 통일 + 틀린 논문 교차 검증 상세 표시**이며 새 DB 변경은 없습니다.

## 포함 게임

다인플 18개: 마스크맨, 어콰이어, 캘리코, 더 게임, 노터치 크라켄, 캐스캐디아, 판타지 왕국, 프라코로 포켓몬, 파워그리드, 돌팔이 약장수, 맨덤의 던전, 행성 X를 찾아서, 사무라이, 엘도라도, 에어 랜드 & 씨, 아발론, 시크릿 히틀러, 한밤의 늑대인간.

1인플 7개: 마스크맨, 어콰이어, 에친스톤의 용들, 캘리코, 캐스캐디아, 더 게임, 커피 로스터.

**포켓몬 미니마는 제외 상태 유지.**

## 최근 기능 상태

- 캘리코: 오른쪽 위 루미 판정/배치, 현재 보드 조건 재검사, 게임 취소, 진행 중 방 호환.
- 에친스톤: 1인플 메뉴 및 저장/이어하기 복구.
- 행성 X: 원형 보드 이벤트, `논문` 용어, 원형/네모 기록지 전환, 이모지 각주, 참조표 하단, 원형 게임판/기록지 방향 통일, **소행성은 🌑로 전체 통일**, 참조표에 **논문 점수/리더 보너스/행성 X 점수** 표시, 틀린 논문은 **제출자·섹터·제출 개체와 해당 개체가 그 섹터에 없다는 사실**을 공개. 기존 저장된 조사 기록에 남아 있는 `🪨`도 화면 표시 시 `🌑`로 자동 변환.
- 앱 아이콘: 사용자 제공 BoardMate 로고를 PWA/Apple Touch/favicon에 적용하고 v11.4.54부터 투명 배경 유지.
- 알림: v11.4.51의 새 방/게임 시작/내 차례 브라우저·PWA 알림 기능 유지.

## 문서

- `START_HERE.md`
- `docs/current/HANDOFF_CURRENT.md`
- `docs/current/CHANGELOG_MASTER.md`
- `docs/current/PROJECT_STRUCTURE.md`
- `docs/current/TEST_STATUS_CURRENT.md`
- `docs/current/DEPLOYMENT_CURRENT.md`
- `docs/current/DATABASE_CURRENT.md`
- `docs/HISTORY_INDEX.md`
- `docs/history/` — 과거 원문
- `database/history/` — 과거 SQL

## Supabase

v11.4.55에는 새 SQL이 없습니다. `database/SUPABASE_CURRENT_UPDATE.sql`은 기존 BoardMate 스키마 복구/갱신용 통합 repair/update 체인입니다. 빈 프로젝트 bootstrap 전체 스키마는 아닙니다.

## 롤백

배포 전 Git 커밋/태그를 남기고, 문제가 생기면 정상 태그로 코드를 되돌립니다. DB는 자동 역적용하지 말고 당시 변경 기록과 `database/history/` SQL을 확인해 별도로 복구하세요.
