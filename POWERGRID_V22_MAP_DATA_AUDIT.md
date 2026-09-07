# Power Grid v22 · USA/Korea map data audit

## 기준

첨부된 실물 게임판 사진을 기준으로 도시 구성/색상 권역/연결 구조를 확인하고, 연결비 전사에는 Richard Darst의 **Board game networks** Power Grid 데이터셋을 교차 참조했습니다.

- Dataset: https://github.com/rkdarst/board-game-networks
- USA source: `data/power-grid/united-states.yaml`
- Korea source: `data/power-grid/korea.yaml`
- 원 데이터 라이선스: **CC BY 4.0** (저자/수집: Richard Darst)
- 위경도 좌표는 Leaflet 표시를 위한 위치값이며, 게임 규칙상 연결비 계산은 `EDGES` 값만 사용합니다.

데이터셋 자체도 정확성 무보증을 명시하므로, 이번 패치에서는 첨부된 실물 보드와 도시/연결 구조를 교차 확인했습니다.

## 미국

- 42 cities
- 87 undirected weighted edges
- 6 color regions, each 7 cities

권역별 도시:

- 보라: Seattle, Portland, Boise, Billings, Cheyenne, Omaha, Denver
- 청록: Salt Lake City, San Francisco, Las Vegas, Santa Fe, Los Angeles, Phoenix, San Diego
- 노랑: Duluth, Fargo, Minneapolis, Chicago, St. Louis, Cincinnati, Knoxville
- 빨강: Kansas City, Oklahoma City, Memphis, Dallas, Birmingham, Houston, New Orleans
- 갈색: Detroit, Buffalo, Pittsburgh, Washington, Philadelphia, New York, Boston
- 초록: Norfolk, Raleigh, Atlanta, Savannah, Jacksonville, Tampa, Miami

대표 연결비 검증:

- Seattle–Portland = 3
- Seattle–Billings = 9
- Cheyenne–Denver = 0
- San Francisco–Portland = 24
- Santa Fe–Houston = 21
- Chicago–Detroit = 7
- New York–Philadelphia = 0
- Savannah–Jacksonville = 0
- Tampa–Miami = 4

## 한국

- 42 cities
- 81 undirected weighted edges
- 6 color regions, each 7 cities
- North resource-market metadata: 15 cities
- South resource-market metadata: 27 cities

권역별 도시:

- 분홍: 강계, 신의주, 안주, 평양, 남포, 황주, 해주
- 빨강: 라선, 청진, 경성, 혜산, 김책, 함흥, 원산
- 보라: 개성, 서울, 고양, 인천, 용인, 안양, 수원
- 갈색: 속초, 춘천, 강릉, 원주, 동해, 삼척, 태백
- 초록: 충주, 청주, 대전, 전주, 광주, 나주, 제주
- 노랑: 안동, 상주, 경주, 대구, 울산, 진주, 부산

대표 연결비 검증:

- 강계–신의주 = 25
- 평양–황주 = 4
- 라선–청진 = 8
- 서울–고양 = 0
- 고양–인천 = 0
- 동해–삼척 = 0
- 대전–대구 = 15
- 나주–제주 = 19
- 울산–부산 = 7

### 표기 정리

원 데이터의 영문 표기 `Hwongju`, `Taeraek`, `Daejon`, `Gaesung`, `Rasun` 등은 UI에서 실물 한국판/통상 한국어 지명에 맞춰 `황주`, `태백`, `대전`, `개성`, `라선`으로 표시합니다. 연결 그래프는 동일 노드를 유지합니다.
