# BoardMate Arena V11.4.69
## Light Reference Map Patch

기준: V11.4.68

이번 패치는 **팬암 / 사무라이 / 엘도라도**의 지도·레퍼런스 표현을 손보되,
**불필요한 webp 자산을 더 늘리지 않는 방향**으로 정리한 버전입니다.

### 변경 내용

#### 1) Pan Am (`online-panam.html`)
- 기존 항로/도시 좌표는 유지
- 지도 배경을 더 보드게임 보드 느낌이 나도록 개선
- 대륙/해양 라벨을 추가해 실물 보드 분위기를 강화
- 별도 이미지 자산 추가 없음

#### 2) Samurai (`online-samurai.html`)
- `assets/samurai/maps/*.webp`에 의존하던 실물 지도 참고 이미지를 제거
- 2/3/4인 사용 구역을 보여주는 **간이 벡터 지도(SVG)** 로 교체
- 실제 클릭 판정/게임 좌표는 기존 BoardMate 로직 그대로 유지
- 새 webp 파일 추가 없음

#### 3) El Dorado (`online-eldorado.html`)
- `assets/eldorado/map-tiles/*.webp`에 의존하던 실물 지형 참고 이미지를 제거
- 업로드 자료를 참고한 **간이 지형 타일 벡터 레퍼런스(SVG)** 로 교체
- 기존 조립 맵/프리셋/봉쇄선 로직은 유지
- 새 webp 파일 추가 없음

### 포함 파일
- `online-panam.html`
- `online-samurai.html`
- `online-eldorado.html`
- `README_V11_4_69_LIGHT_REFERENCE_MAP_PATCH.md`

### 적용 방법
1. ZIP 압축을 풉니다.
2. 안의 파일을 GitHub 저장소 루트에 그대로 덮어씁니다.
3. 커밋/푸시 후 GitHub Pages 반영을 확인합니다.

### 참고
- 기존에 생성되어 있는 `assets/*.webp` 파일들은 **남아 있어도 무방**하지만,
  이번 패치부터는 새로 추가되는 레퍼런스는 가능한 한 **벡터/SVG 또는 코드 기반 UI** 로 유지하도록 방향을 잡았습니다.
- 즉, **실물 이미지를 그대로 복제하기보다 참고용 느낌만 살리는 방식**으로 관리성을 우선했습니다.
