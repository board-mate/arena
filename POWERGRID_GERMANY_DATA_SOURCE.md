# Power Grid Germany graph data — source/attribution

`powergrid/data/germany-map.js`의 42도시 / 83개 weighted edge는 Richard Darst의 **board-game-networks** Germany dataset을 구현 기준으로 사용했습니다.

- https://github.com/rkdarst/board-game-networks
- https://raw.githubusercontent.com/rkdarst/board-game-networks/master/data/power-grid/germany.yaml
- Original data license: CC-BY 4.0
- Collector/curator: Richard Darst

Upstream은 정확성을 보증하지 않으며 Germany entry에도 Power Grid와 Recharged 보드가 같은지 확인할 필요가 있다는 메모가 있습니다. 따라서 BoardMate의 현재 graph는 `source-imported` 상태이며 사용자 제공 Germany 보드와 전수 visual audit 후에만 `verified`로 승격합니다.

BoardMate UI 좌표(x/y)는 사용자 제공 `germany.webp`에 맞춰 별도로 작성한 것으로 경로 계산에는 사용되지 않습니다.
