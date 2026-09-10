# BoardMate Arcade INTEGRATED v11.4.8

## 기준

- BoardMate v11.4.7 Realtime/Fantasy/Calico V8 유지
- 캘리코 모바일 보드 전체 맞춤 추가
- 포크노바 v11.7 개발 체크포인트 통합

## 캘리코 모바일

기존 공개판은 720×580 고정 보드를 모바일에서도 `overflow:auto`로 보여 줘 가로 스크롤이 필요했습니다.

이번 버전은 내부 좌표/룰 데이터를 전혀 바꾸지 않고:

- 720×580 stage를 유지
- `board-fit-shell`로 표시 크기만 축소
- 실제 viewport 폭을 기준으로 scale 계산
- wrapper 높이/폭도 scale에 맞춰 조정
- 720px 이하에서 가로 스크롤 제거
- ResizeObserver + orientation/resize + game-screen 진입 감지

구조로 변경했습니다.

예상 표시 크기(좌우 padding 제외 전 대략치):

현재 모바일 CSS의 app/card/padding까지 고려한 대략적인 보드 표시 폭은:

- 320px 화면: 약 272×219px
- 375px 화면: 약 327×263px
- 390px 화면: 약 342×276px
- 430px 화면: 약 382×308px

실제 값은 브라우저 viewport/스크롤바에 따라 몇 px 달라질 수 있습니다.

## 포크노바 v11.7

포함:

- 390개 계열 이미지 자산
- 동물 OCR 인덱스
- 수동/자동 이미지 매핑 UI
- 지도 F13/F15 이미지
- 검증된 최종점수 이미지 3장 자동 매핑
- v11.7 core fix 적용 완료 상태
- 타입 아이콘 집계 스키마 수정
- 다우징 머신 명성 기반 최종점수 수정

상태:

`PLAYABLE_PROTOTYPE / NOT_RULES_COMPLETE / ONLINE_E2E_UNVERIFIED`

전설 프로젝트 32장 tier 및 일부 최종점수는 계속 검증 대상입니다.

## Supabase

이번 v11.4.8 자체의 새 migration은 없습니다.

v11.4.7 Fantasy 통합 migration을 아직 적용하지 않은 DB만
`SUPABASE_FANTASY_REALMS_UNIFIED.sql`을 적용해야 합니다.
