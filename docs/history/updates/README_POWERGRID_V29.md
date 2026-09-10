# BoardMate Power Grid V29 — Germany / USA only

기준: 사용자가 올린 `BoardMate_PowerGrid_LATEST_KOREA_FIX_V28.zip` 최신본.

## 변경 내용
- 한국맵을 플레이 가능한 지도 목록에서 제거했습니다.
- Power Grid 시작 맵은 **독일 / 미국 2개만** 표시됩니다.
- 엔진의 `BOARD_MAPS`도 독일/미국만 노출하도록 정리했습니다.
- 기존 방에 남아 있는 한국맵 상태는 새 게임 설정 화면으로 전환되어, 방장이 독일 또는 미국을 다시 선택하도록 했습니다.
- `online-powergrid.html`의 엔진 로딩 버전을 `v=29`로 올려 GitHub Pages 브라우저 캐시를 피하도록 했습니다.

## 교체 대상
- `app.js`
- `online-powergrid.html`
- `powergrid/engine.js`

`powergrid/data/germany-map.js`, `powergrid/pg-styles.css`, `powergrid/ui.js`, `powergrid/map-rules-v23.js` 등 기존 공통 파일은 그대로 사용합니다.
