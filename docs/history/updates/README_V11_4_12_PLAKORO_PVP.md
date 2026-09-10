# BoardMate Arena v11.4.12 — 프라코로 PvP 소스 HTML 적용

기준 소스: 사용자가 제공한 `online-plakoro(1).html`.

## 적용 내용
- BoardMate 공통 다인플 방(`plakoro`)에 연결
- 2인 PvP
- 각 플레이어가 자신의 브라우저에서 포켓몬 선택
- 제공 HTML의 실제 데이터상 포켓몬별 기술은 4장입니다. 원본 화면 문구의 "7장 중 4장"과 데이터가 불일치하여, 실제 데이터 4장을 모두 선택하는 방식으로 맞췄습니다.
- 에너지코로 3개 × 6면 설정을 온라인 준비 단계에 포함
- 게임 중 선택한 기술은 public room_state에 저장하지 않고 private action RPC에 저장한 뒤 Realtime signal로 방장에게 전달
- 방장 브라우저가 주사위/피해/턴을 권위적으로 계산
- 일반 게임 상태는 BoardMate `saveState/loadState` + Realtime Broadcast 사용
- Realtime 실패 시 기존 공통 polling 복구 경로 사용
- 게임 종료 시 BoardMate 승패 기록 제출

## Supabase
기존 `SUPABASE_BOARDMATE_GAME_CATALOG_V2.sql` 적용 이후 `SUPABASE_PLAKORO_PVP_V3.sql`을 1회 실행합니다.

추가:
- 에너지코로를 저장하는 setup v2 RPC
- private action table
- private action 저장/호스트 회수 RPC

기존 DB 데이터/기존 게임을 삭제하는 migration은 포함하지 않습니다.

## GitHub
`online-plakoro.html`을 기존 저장소 루트에 덮어씁니다.
앱의 게임 목록/방 생성은 기존 `app.js`에 이미 `plakoro`가 등록되어 있으므로 별도 app.js 변경이 필요 없습니다.
