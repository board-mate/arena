# BoardMate Arena v11.4.62 — ALPHA Safe Merge

## 기준
- 기반: 사용자가 제공한 `BoardMate_Arena_V11_4_62_GREEK_LEGENDS_FULL.zip`의 실제 게임 파일.
- `workshop-*.html`은 게임 엔진 대체 파일이 아니라 설명/참고 페이지로만 추가.
- Arena `app.js`의 등급은 기존대로 `quacks`, `samurai`, `eldorado` 모두 `alpha` 유지.

## 실제 게임 파일
### online-eldorado.html — 수정
원본 게임 로직을 유지하면서 맵 설정 기능만 확장.

유지된 기존 기능:
- Supabase 방/상태 저장 및 polling
- 카드 덱/손패/버림/제거
- 이동 및 특수 카드
- 시장 및 예비 시장 구매
- 봉쇄선 통과/획득 판정
- 2인 2말 / 3~4인 최종 라운드
- 승리 및 동률 판정
- 기존 프리셋 맵 선택

추가된 ALPHA 기능:
- 6개 기본 지형 타일 라이브러리
- 사용자 맵: 서로 다른 타일 3~5개 선택
- 타일 순서 변경
- 타일별 180° 회전
- 무작위 조합 / 기본 조합
- 타일 경계마다 기존 봉쇄선 로직으로 자동 봉쇄선 생성
- `state.mapLayout`에 조립 결과 저장 → 기존 `saveState()`를 통해 참가자 동기화

호환성:
- 기존 `mapId` 기반 저장 상태는 그대로 로드.
- 이전 버전의 `lenient`, `zigzag` 저장 상태도 내부 정의를 남겨 호환.
- 신규 UI에서는 확장 모티브 설명을 노출하지 않음.

### online-samurai.html — 원본 그대로
게임 엔진 수정 없음.

### online-quacks.html — 원본 그대로
게임 엔진 수정 없음.

### app.js / multi-common.js / config.js — 원본 그대로
라우팅, 게임 등급, 공용 멀티플레이 로직 수정 없음.

## workshop 설명 페이지
- `workshop-eldorado.html`: 실제 구현 규칙에 맞게 수정. 9개 고정 맵 설명 대신 프리셋 + 3~5 타일 조립 설명. Heroes & Hexes 관련 표기 없음.
- `workshop-samurai.html`: 실제 빠른 타일/게임 종료 로직에 맞춰 설명 보정.
- `workshop-quacks.html`: BoardMate 구현은 성분책 세트1임을 명확히 표시. TTS의 확장 요소는 참고용/미구현으로 구분.

## 배포
전체 폴더를 GitHub Pages 저장소와 비교해 반영하는 것이 가장 안전합니다.
실제 필수 교체 파일은 `online-eldorado.html` 하나이며, `workshop-*.html`은 신규 설명 페이지로 추가하면 됩니다.
