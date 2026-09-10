# BoardMate Arena — MASTER CHANGELOG

> 과거 원문은 `docs/history/updates/`에 그대로 보존되어 있습니다. 이 파일은 빠른 탐색용 통합 색인입니다.

## BoardMate Arena — 저장소 업로드용 통합 패치 + 인수인계
- 원문: `docs/history/updates/00_READ_ME_FIRST.md`
- **레지스탕스 아발론** — 5~10인
- **시크릿 히틀러 기본판** — 5~10인, 확장판 없음
- **한밤의 늑대인간 기본 역할** — 3~10인, 지정된 12종만

## BoardMate Arcade 통합 v11.4.8 개발 인수인계
- 원문: `docs/history/updates/DEVELOPER_HANDOFF_V11_4_8.md`
- v11.4 Realtime Broadcast
- 10초 polling fallback
- 판타지 왕국 3~6인 Supabase 통합

## v11.4.19 - Fantasy Realms / One Night Werewolf connectivity fix
- 원문: `docs/history/updates/FANTASY_WEREWOLF_CONNECTIVITY_FIX_V11_4_19.md`
- `online-fantasy-realms.html` imported Fantasy helpers that were missing from `multi-common.js`.
- Social game pages imported `finalizeSeatWinners` and `socialEndScreen`, but those exports were missing from `social/social-common.js`.
- Module imports are cache-busted to v19.

## BoardMate Arena v11.4.20 — 판타지 왕국 / 한밤의 늑대인간 로딩 복구
- 원문: `docs/history/updates/FANTASY_WEREWOLF_LOAD_FIX_V11_4_20.md`
- `SUPABASE_REPAIR_FANTASY_WEREWOLF_V20.sql` 추가
- 현재 지원 게임 13종 전체를 공용 CHECK/room creator/turn helper에 복원
- 판타지 왕국 private-state table + get/put RPC 복구

## BoardMate Arcade FINAL v11.4.7 — Consolidated Handoff
- 원문: `docs/history/updates/FINAL_HANDOFF_README_pre_20260907.md`
- BoardMate Arcade v11.4 Realtime base
- Fantasy Realms 3–6 player support, now unified with the normal BoardMate Supabase room flow
- Calico V4–V8 fixes: board preview, turn undo/finish flow, static 88 printed-edge data, automatic cat/button validation, and repair of invalid cat tokens in existing saved games

## BoardMate Arena 개발 인수인계 — 2026-09-07
- 원문: `docs/history/updates/HANDOFF_NEXT_CHAT.md`
- 게임 ID: `avalon`
- 5~10인
- 페이지: `online-avalon.html`

## 설치 체크리스트
- 원문: `docs/history/updates/INSTALL_GITHUB_SUPABASE.md`
- [ ] ZIP 내용을 저장소 루트에 덮어쓰기
- [ ] `app.js` 갱신 확인
- [ ] `online-avalon.html` 추가

## Known Issues / Next Work
- 원문: `docs/history/updates/KNOWN_ISSUES.md`
- 현재 사용자 환경에서 실행 불가 문제 남음.
- `pocketnova/index.html`, `pocketnova/js/ui.js` 패치는 보존됨.
- 실제 브라우저 재현 및 의존 모듈 추적 필요.

## BoardMate Arena v11.4.21 — 신규 게임 통합
- 원문: `docs/history/updates/NEW_GAMES_INTEGRATION_V11_4_21.md`
- 🧪 돌팔이 약장수 (`quacks`) — 2~4인, 동시 진행형
- ⚔️ 맨덤의 던전 (`mandom`) — 2~4인, 턴 기반
- ⛩️ 사무라이 PVP (`samurai`) — 2~4인, 턴 기반

## 다음 ChatGPT 대화 시작용 프롬프트
- 원문: `docs/history/updates/NEXT_CHAT_PROMPT.md`
- 레지스탕스 아발론 5~10인
- 시크릿 히틀러 기본판 5~10인 (확장 없음)
- 한밤의 늑대인간 3~10인 (지정된 기본 역할 12종만)

## Power Grid v22 · USA/Korea map data audit
- 원문: `docs/history/updates/POWERGRID_V22_MAP_DATA_AUDIT.md`
- Dataset: https://github.com/rkdarst/board-game-networks
- USA source: `data/power-grid/united-states.yaml`
- Korea source: `data/power-grid/korea.yaml`

## BoardMate Arena · Power Grid v22 patch
- 원문: `docs/history/updates/POWERGRID_V22_PATCH_NOTES.md`
- 상단에 `↩ 되돌리기` 버튼 추가.
- 이 브라우저에서 성공한 본인 액션 상태만 최대 10개 보관.
- 다른 플레이어/기기에서 revision이 바뀌면 Undo 히스토리를 초기화하여 타인의 액션을 되감지 않음.

## BoardMate Arcade 통합 v11.4.8 — 2026-09-06
- 원문: `docs/history/updates/README_FIRST_pre_20260907.md`
- **캘리코 모바일 보드 전체 맞춤**
- 게임 규칙 좌표계와 720×580 보드 데이터는 변경하지 않습니다.
- 모바일(폭 720px 이하)에서는 보드 표시만 실제 사용 가능한 폭에 맞춰 비율 축소합니다.

## BoardMate Arena — GPT 인수인계 README
- 원문: `docs/history/updates/README_HANDOFF_BOARDMATE_ARENA_V11_4_28.md`
- Avalon: 5라운드 전체 원정대 인원 게임판 표시
- Secret Hitler: 파시스트 트랙 효과 표시를 셀형 UI로 안정화
- Plakoro: 에너지코로 타입 이모지 표시, 기술 카드의 캐릭터코로 면 조건 배지, setup pair RPC의 `seat` ambiguity 수정

## BoardMate Power Grid V29 — Germany / USA only
- 원문: `docs/history/updates/README_POWERGRID_V29.md`
- 한국맵을 플레이 가능한 지도 목록에서 제거했습니다.
- Power Grid 시작 맵은 **독일 / 미국 2개만** 표시됩니다.
- 엔진의 `BOARD_MAPS`도 독일/미국만 노출하도록 정리했습니다.

## BoardMate Power Grid V30 — Germany / USA only
- 원문: `docs/history/updates/README_POWERGRID_V30.md`
- 한국맵을 플레이 가능한 지도 목록에서 완전히 제거했습니다.
- Power Grid 런타임은 `Germany + USA`만 지원합니다.
- 독일 지도 데이터는 기존 정상 작동 버전의 `powergrid/data/germany-map.js`를 그대로 유지합니다.

## BoardMate Arena v11.4.11 — 프라코로 + 사이트 안내 + 자동 로그인 패치
- 원문: `docs/history/updates/README_V11_4_11_PLAKORO_SITE.md`
- 판타지 왕국: 내 카드가 가장 위, 버린 카드 영역 다음, 나머지 플레이어를 가로 손패로 아래에 배치하는 현재 레이아웃 유지
- 프라코로: BoardMate 공통 다인플 방에 2인 게임으로 추가
- 포크노바(pocketnova 슬롯): 화면/게임은 포켓몬 미니마로 교체 유지

## BoardMate Arena v11.4.12 — 프라코로 PvP 소스 HTML 적용
- 원문: `docs/history/updates/README_V11_4_12_PLAKORO_PVP.md`
- BoardMate 공통 다인플 방(`plakoro`)에 연결
- 2인 PvP
- 각 플레이어가 자신의 브라우저에서 포켓몬 선택

## BoardMate Arcade v11.4.23 — Game Updates
- 원문: `docs/history/updates/README_V11_4_23_GAME_UPDATES.md`

## v11.4.24 Integrated
- 원문: `docs/history/updates/README_V11_4_24_INTEGRATED.md`
- v11.4.23 gameplay/UI updates
- v11.4.21 multiplayer additions: Quacks, Mandom, Samurai, Eldorado, Air Land & Sea
- v11.4.21 solo Coffee Roaster

## BoardMate Arena v11.4.25 — 1인플 저장 / 게임 포기
- 원문: `docs/history/updates/README_V11_4_25_SOLO_SAVE.md`
- 게임 중 우측 하단에 `💾 저장`, `🏳 게임 포기`가 표시됩니다.
- 지원 게임은 주기적 자동 저장 + 페이지 이탈/백그라운드 전환 시 저장을 수행합니다.
- `게임 포기`는 확인 후 해당 게임 저장 데이터를 삭제하고 초기 화면/새 게임 상태로 돌아갑니다.

## BoardMate Arena v11.4.26 — 게임 수정
- 원문: `docs/history/updates/README_V11_4_26_GAME_POLISH.md`
- 프라코로 → **프라코로 포켓몬**
- 사무라이 PVP → **사무라이**
- **포켓몬 미니마**: Arena 메뉴와 배포 파일에서 제거. 기존 DB 행과 제약조건 충돌 방지를 위해 legacy game id `pocketnova`만 DB 호환용으로 남김.

## BoardMate Arena v11.4.27 merged
- 원문: `docs/history/updates/README_V11_4_27_MERGED.md`
- 프라코로 포켓몬 display name and V5 setup repair
- 사무라이 display name and map v2
- Pokemon Minima removed from the Arena/package

## README_V11_4_28_GAME_UPDATES
- 원문: `docs/history/updates/README_V11_4_28_GAME_UPDATES.md`

## BoardMate Arena v11.4.29 — gameplay hotfix
- 원문: `docs/history/updates/README_V11_4_29_FIXES.md`
- 최신 웹 클라이언트의 기술 ID(`pikachu-bite` 등)와 예전 Supabase V3의 숫자 ID(`pikachu-0` 등)가 충돌하던 경우를 복구했습니다.
- `SUPABASE_PLAKORO_PVP_V6.sql`은 V3/V4/V5 위에 그대로 실행할 수 있으며, 두 형식의 기술 ID를 모두 받아 최신 ID로 정규화합니다.
- setup pair RPC의 `seat` 모호성 수정도 포함합니다.

## BoardMate Arena v11.4.29 GAME FIXES
- 원문: `docs/history/updates/README_V11_4_29_GAME_FIXES.md`

## BoardMate Arena v11.4.30
- 원문: `docs/history/updates/README_V11_4_30_GAME_FIXES.md`
- Calico: stop destructive historical cat-token repair; correctly placed Tecolote and other existing cat tokens are preserved. New placement remains validated.
- Secret Hitler: redesigned policy tracks so fascist effects are legible and no longer overlap/break.
- Plakoro: real skill IDs accepted by setup RPC; C-face two-energy arrays validated correctly; skill names show type emojis; left/right face labels are distinct; explicit cancel control remount; multiplayer setup/action flow preserved.

## BoardMate Arena v11.4.30 — 맨덤의 던전 규칙 복구
- 원문: `docs/history/updates/README_V11_4_30_MANDOM_RULE_FIX.md`
- 몬스터 카드를 뽑아 자신만 확인 → 던전에 놓기
- 몬스터 카드를 뽑아 자신만 확인 → 자기 앞에 가져가고 장비 토큰 1개 획득
- 패스

## BoardMate Arena v11.4.31 — 프라코로 대전 주사위 결과 수정
- 원문: `docs/history/updates/README_V11_4_31_PLAKORO_ROLL_RESULT_FIX.md`
- `boardmate_plakoro_take_action` 반환값을 배열/단일 객체 양쪽 모두 안전하게 처리합니다.
- 반환된 각 액션의 실제 `seat`를 이용해 `hostAction()`을 호출합니다.
- 액션 처리 중 예외가 나면 상단 연결 상태에 `액션 처리 오류 · 재시도`를 표시합니다.

## BoardMate Arena v11.4.33 — 맨덤의 던전 룰 흐름 복구
- 원문: `docs/history/updates/README_V11_4_33_MANDOM_RULE_FLOW_RESTORE.md`
- 몬스터 카드를 뽑아 자신만 확인한 뒤 던전에 놓기
- 몬스터 카드를 뽑아 자신만 확인한 뒤 자기 앞에 가져오고 장비 토큰 1개 같이 가져오기
- 패스

## BoardMate Arena v11.4.34 — 행성 X를 찾아서 완전 PVP
- 원문: `docs/history/updates/README_V11_4_34_PLANETX_PVP.md`
- 표준 12섹터 / 전문가 18섹터
- Supabase 서버에서 숨은 태양계 게임을 선택하고 정답은 클라이언트 공개 상태에 저장하지 않음
- GM Kit 100게임(표준 50 / 전문가 50) 서버 카탈로그 포함

## BoardMate Arena v11.4.35 — 행성 X PVP 사용성 패치
- 원문: `docs/history/updates/README_V11_4_35_PLANETX_UI.md`
- 혜성: 가능한 섹터 번호
- 소행성: 각 소행성이 최소 1개의 다른 소행성과 인접
- 왜소행성: 표준/전문가 개수 및 전문가 6섹터 띠 규칙

## BoardMate Arena v11.4.36 — 행성 X 개체 탐사 12→1 연속 범위 수정
- 원문: `docs/history/updates/README_V11_4_36_PLANETX_SURVEY_WRAP_FIX.md`
- 시작 11: `11`, `11→12`, `11→12→1`, `11→12→1→2` ...
- 시작 12: `12`, `12→1`, `12→1→2` ...
- 시작 1: `1`, `1→2`, `1→2→3` ...

## v11.4.37 — 행성 X PVP 플레이어 색상 구분
- 원문: `docs/history/updates/README_V11_4_37_PLANETX_PLAYER_COLORS.md`
- base: BoardMate Arena v11.4.36
- 변경 게임: `online-planetx.html`
- DB/RPC 스키마 변경: 없음

## BoardMate Arena v11.4.38 — 행성 X 플레이 UI 보강
- 원문: `docs/history/updates/README_V11_4_38_PLANETX_NOTES_ORBIT_TOPICS.md`
- `A · 왜소행성 · 혜성`
- `B · 가스 구름`
- `C · 소행성 · 혜성`

## BoardMate Arena v11.4.39 — 행성 X 게임판 중심 배치
- 원문: `docs/history/updates/README_V11_4_39_PLANETX_BOARD_LAYOUT.md`
- 개체 탐사
- 섹터 지정 조사
- 주제 조사

## BoardMate Arena v11.4.40 — 행성 X 가설 트랙/기록지 개선
- 원문: `docs/history/updates/README_V11_4_40_PLANETX_THEORY_TRACK.md`
- 모든 플레이어가 비공개 선택을 마치면 기존 순서대로 배치 단계가 진행됩니다.
- 자기 배치 차례가 되면 선택 내용이 자동으로 공개 보드에 배치됩니다.
- 개체 종류는 기존과 동일하게 비공개 상태를 유지합니다.

## BoardMate Arena v11.4.41 · Planet X record layout fix
- 원문: `docs/history/updates/README_V11_4_41_PLANETX_RECORD_LAYOUT.md`
- The `내 기록지` card is no longer sticky under any desktop breakpoint.
- Added a hard CSS override (`position: static !important`) to prevent older sticky rules from winning.
- Moved `내 기록지` to the bottom of the right sidebar.

## BoardMate Arena v11.4.42 · Planet X bug fix
- 원문: `docs/history/updates/README_V11_4_42_PLANETX_BUGFIX.md`
- The open/closed UI state is preserved across full re-renders.
- Sector mark clicks now update only the clicked button instead of rebuilding the whole game UI.
- The current player gets a `가설 배치 계속` retry button.

## BoardMate Arena v11.4.43 · Planet X theory rule fix
- 원문: `docs/history/updates/README_V11_4_43_PLANETX_THEORY_RULE_FIX.md`
- Keeps the v11.4.42 fixes for the personal record sheet collapsing and theory-placement recovery.
- Expert mode now permits two **different object theory tokens on the same sector** during one theory phase.
- An identical **same sector + same object** theory is still rejected.

## BoardMate Arena v11.4.44 · Planet X account sheet + theory placement rollback
- 원문: `docs/history/updates/README_V11_4_44_PLANETX_ACCOUNT_SHEET_ROLLBACK.md`
- `내 기록지` 저장 위치를 브라우저 `localStorage`에서 **로그인 계정 + 게임방** 기준 Supabase 비공개 저장소로 변경했습니다.
- 기존 브라우저 기록이 있고 계정 저장본이 비어 있으면 최초 접속 시 한 번 서버로 옮긴 뒤 기존 Planet X 기록 키를 삭제합니다.
- 시작 정보, 조사 기록, 연구 결과, 섹터 체크가 같은 계정으로 다른 브라우저/기기에서 복원됩니다.

## BoardMate Arena v11.4.45 · 행성 X 원형 보드 이벤트/명칭 정리
- 원문: `docs/history/updates/README_V11_4_45_PLANETX_BOARD_EVENTS_TERMINOLOGY.md`
- 원형 태양계 보드 바깥쪽에 **학술제**와 **회의** 발생 지점을 직접 표시합니다.
- 표준: 학술제 3 / 6 / 9 / 12, 회의 X1 = 10
- 전문가: 학술제 3 / 6 / 9 / 12 / 15 / 18, 회의 X1 = 8, X2 = 16

## BoardMate Arena v11.4.46 · 행성 X 원형 기록지
- 원문: `docs/history/updates/README_V11_4_46_PLANETX_CIRCULAR_RECORD_SHEET.md`
- `내 기록지 > 섹터 메모`를 기존 사각 카드 목록에서 **원형 기록지**로 변경했습니다.
- 표준 모드는 12섹터, 전문가 모드는 18섹터로 자동 렌더링됩니다.
- 실물 기록지의 방향을 참고해 바깥쪽에 섹터 번호, 안쪽으로 `행성 X → 비어 보임 → 가스 구름 → 왜소행성 → 소행성 → 혜성` 순으로 기록 아이콘을 배치했습니다.

## BoardMate Arena v11.4.47 · 행성 X 기록지 전환 + 이모지 각주
- 원문: `docs/history/updates/README_V11_4_47_PLANETX_RECORD_LAYOUT_TOGGLE.md`
- `내 기록지`에 **◯ 원형 / ▦ 기존 네모** 전환 버튼을 추가했습니다.
- 선택한 기록지 모양은 브라우저에 저장되어 다시 접속해도 유지됩니다.
- 원형/네모 기록지는 동일한 `priv.marks` 데이터를 사용하므로 전환해도 체크 내용이 그대로 유지됩니다.

## BoardMate Arena v11.4.48 — Calico / Etchinstone recovery patch
- 원문: `docs/history/updates/README_V11_4_48_CALICO_ETCH_E2E.md`
- **포켓몬 미니마**: Arena UI/배포 런타임에서 제거 상태를 재검증했고 남아 있던 전용 스타일 잔재를 제거했습니다. `프라코로 포켓몬`은 별도 게임이므로 유지합니다.
- **에친스톤의 용들**: 1인플 홈/목록에 다시 노출하고 `solo-etchinstone.html`로 진입하도록 복구했습니다. 기존 로컬 자동 저장/이어하기 동작을 유지합니다.
- **Calico 진행 중 게임 복구**

## BoardMate Arena v11.4.49 — App Icon Update
- 원문: `docs/history/updates/README_V11_4_49_APP_ICON.md`
- 사용자가 제공한 `bm.png` BoardMate 로고를 현재 앱 아이콘으로 적용.
- `icons/icon-192.png`, `icons/icon-512.png`: 일반 PWA 아이콘(`purpose: any`).
- `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png`: Android 등 maskable 아이콘. 로고가 원형/둥근 사각 마스크에서 잘리지 않도록 안전 여백과 앱 배경색을 적용.

## BoardMate Arcade v11.4 — Realtime 적용 가이드
- 원문: `docs/history/updates/REALTIME_V11_4_SETUP.md`
- `multi-common.js`
- `online-acquire.html`
- `online-calico.html`

## BoardMate Arcade INTEGRATED v11.4.8
- 원문: `docs/history/updates/RELEASE_NOTES_V11_4_8.md`
- BoardMate v11.4.7 Realtime/Fantasy/Calico V8 유지
- 캘리코 모바일 보드 전체 맞춤 추가
- 포크노바 v11.7 개발 체크포인트 통합

## 소셜 디덕션 구현 범위 고정
- 원문: `docs/history/updates/RULE_SCOPE_SOCIAL_DEDUCTION.md`
- 멀린
- 퍼시벌
- 암살자


## v11.4.51 — BoardMate 알림
- 상단 `🔔 알림` 설정 페이지 추가.
- 새 다인플 방 생성, 참가 게임 시작, 턴 기반 게임의 내 차례 알림 추가.
- Web Notifications + 서비스워커 notification click 연동.
- 알림음/진동 토글 및 테스트 알림 제공.
- DB 스키마/RPC 변경 없음.
- 앱 완전 종료 상태의 Web Push는 별도 서버 구성이 필요하므로 이번 버전 범위에서 제외.

## v11.4.52 — 행성 X 원형 섹터 방향 통일
- 원문: `docs/history/updates/README_V11_4_52_PLANETX_SECTOR_ORIENTATION.md`
- 원형 게임판과 원형 기록지 모두 **1번 섹터를 맨 위(12시 방향)**로 통일.
- 2번부터 시계방향으로 증가하도록 좌표계를 일치시킴.
- 표준 12섹터 / 전문가 18섹터 모두 적용.
- 기존 기록 데이터 및 게임/DB 로직 변경 없음.

## v11.4.53 — 행성 X 소행성 아이콘 / 논문 점수 참조표
- 원문: `docs/history/updates/README_V11_4_53_PLANETX_ICON_SCORE_REFERENCE.md`
- 소행성 표시를 혜성처럼 보이는 `☄️`에서 **`🪨`**로 변경했습니다.
- 혜성은 `🌠`를 유지해 두 개체를 빠르게 구분할 수 있습니다.
- 맨 아래 개체 규칙 참조표에 정확한 논문 점수를 직접 표시합니다: 소행성 2점 / 혜성 3점 / 가스 구름 4점 / 왜소행성 표준 4점·전문가 2점.
- 논문 리더 보너스(+1)와 행성 X 발견 점수(최초 10점, 이후 뒤처진 섹터당 2점)를 함께 표시합니다.
- 게임/DB 로직은 변경하지 않았습니다.


## BoardMate Arena v11.4.54 — transparent app icon/background
- BoardMate app icon assets are regenerated from the transparent source logo.
- Removed opaque maskable icon selection from `manifest.webmanifest`.
- `background_color` changed from dark navy to `transparent`.
- No game logic or Supabase schema changes.
