# 독일 그래프 데이터 출처

독일 42도시/83연결 가중치의 구현 기준은 다음 공개 dataset입니다.

- Repository: https://github.com/rkdarst/board-game-networks
- Raw Germany data: https://raw.githubusercontent.com/rkdarst/board-game-networks/master/data/power-grid/germany.yaml
- Processed Germany GEXF: https://raw.githubusercontent.com/rkdarst/board-game-networks/gh-pages/power-grid/germany.gexf
- Original data license: CC-BY 4.0
- Collector/curator: Richard Darst

Upstream README는 네트워크 정확성에 대한 보증이 없으며 심각한 용도 전에 검증하라고 명시합니다. Germany entry에도 Power Grid와 Recharged 보드가 동일한지 확인이 필요하다는 `fixme`가 있습니다.

따라서 BoardMate에서는 이 데이터를 자동 계산 엔진의 **현재 기준 후보**로 사용하되, 사용자 제공 Germany 보드 이미지와 83개 연결을 전수 대조하기 전에는 독일맵을 완성판으로 표시하지 않습니다.
