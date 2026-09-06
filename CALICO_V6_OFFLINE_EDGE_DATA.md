# Calico V6 오프라인 가장자리 데이터

V6에서는 런타임 외부 이미지 분석을 제거했다.

## 목표 구조
- 4 boards: blue / green / purple / yellow
- 22 printed-edge positions per board
- total 88 fixed `{color, pattern}` records
- gameplay token validation uses the embedded catalog only
- board/tile images are display-only and do not participate in scoring

## 현재 상태
이 배포본에는 외부 이미지 의존성은 제거되어 있지만, **정확한 88개 레코드를 검증할 원본 보드 이미지 바이트가 현재 빌드 환경에 없어서 catalog를 의도적으로 비워 둔 상태**다.

게임은 `EDGE_CATALOG_READY === false`이면 토큰 자동판정을 시작하지 않고 배치를 막는다. 잘못된 데이터를 임의로 넣어서 오판하는 것보다 안전한 fail-closed 동작이다.

## 필요한 최종 입력
실물/공식 보드 또는 공식 디지털 보드의 다음 4개 원본 이미지가 필요하다.

- blue.jpg
- green.jpg
- purple.jpg
- yellow.jpg

그리고 현재 V5에 있던 36개 타일 아트는 패턴 식별용 템플릿으로만 사용된다. 이미지 바이트를 확보하면 빌드 단계에서 88개를 추출하고, 결과를 `CALICO_EDGE_CATALOG` 상수로 베이크하면 된다.

## 중요한 점
`myautoma.github.io`를 브라우저에서 런타임 호출하지 않아도 되도록 하는 것이 V6의 최종 설계다. 따라서 한번 빌드된 최종 catalog가 들어간 V6는 네트워크/캐시/이미지 로딩 여부와 무관하게 고양이·단추 판정을 수행한다.
