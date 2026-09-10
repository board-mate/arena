# BoardMate Power Grid V30 — Germany / USA only

기준: 현재 BoardMate Arena 저장소(`arena-main`)를 유지하면서 Power Grid의 지원 지도를 **독일 / 미국 2개로 고정**한 버전입니다.

## 핵심 변경
- 한국맵을 플레이 가능한 지도 목록에서 완전히 제거했습니다.
- Power Grid 런타임은 `Germany + USA`만 지원합니다.
- 독일 지도 데이터는 기존 정상 작동 버전의 `powergrid/data/germany-map.js`를 그대로 유지합니다.
- 미국 지도 데이터도 기존 42개 도시 / 87개 연결 그래프를 유지합니다.
- 예전 방에 남아 있는 한국 또는 알 수 없는 지도 상태는 **독일 게임 설정 화면**으로 안전하게 되돌립니다.
- 미국 석탄 저장고 규칙은 유지하며, 저장고는 일반 시장의 석탄이 남아 있어도 8 Elektro/개로 이용할 수 있습니다.
- 브라우저 캐시 방지를 위해 Power Grid 런타임 파일 버전을 `v=30`으로 올렸습니다.

## 런타임 파일
- `online-powergrid.html`
- `powergrid/engine.js`
- `powergrid/ui.js`
- `powergrid/pg-styles.css`
- `powergrid/data/germany-map.js`
- `powergrid/map-rules-v30.js`

한국맵 전용 런타임 코드와 지도 이미지는 배포본에서 제거했습니다.
