# BoardMate Arena v11.4.11 — 프라코로 + 사이트 안내 + 자동 로그인 패치

## 기준
현재 BoardMate Arena v11.4.x + Power Grid Germany + Social Deduction + Calico 최신 상태 + 포켓몬 미니마 교체 상태에 덮어쓰는 repo-root overlay입니다.

## 이번 패치
- 판타지 왕국: 내 카드가 가장 위, 버린 카드 영역 다음, 나머지 플레이어를 가로 손패로 아래에 배치하는 현재 레이아웃 유지
- 프라코로: BoardMate 공통 다인플 방에 2인 게임으로 추가
- 포크노바(pocketnova 슬롯): 화면/게임은 포켓몬 미니마로 교체 유지
- 포켓몬 미니마: 1인플 + 2인 온라인 진입. 다인플 방에서는 2인으로 제한
- 자동 로그인: 로그인 화면에서 `이 기기에서 자동 로그인` 선택 가능. 선택 시 localStorage, 해제 시 sessionStorage 사용
- 앱 설치 안내: PWA manifest + service worker + 설치 안내 페이지
- 사이트 안내: 앱 설치 / 이용안내 / 저작권 안내 / 문의 안내를 홈 및 푸터에 추가
- 프라코로 게임: 2026 스타터 6종을 기본 데이터로 구성하고 BoardMate Realtime room/state 흐름 사용
- Realtime: state_changed Broadcast + 기존 10초 polling fallback 구조 유지

## GitHub 적용
이 패키지는 전체 저장소 백업본이 아니라 **repo-root overlay**입니다.
압축 해제 후 파일을 기존 `board-mate/arena` 저장소의 루트에 덮어쓰세요.
기존 저장소 전체를 삭제하고 이 ZIP만 올리지 마세요.

## Supabase 적용
기존 v11.4.x / Power Grid / Social Deduction SQL이 적용되어 있다는 전제입니다.

1. `SUPABASE_BOARDMATE_GAME_CATALOG_V2.sql` 실행
2. `SUPABASE_VERIFY_BOARDMATE_V2.sql` 실행
3. 검증 결과에서 프라코로 = 2~2, 포켓몬 미니마 = 2~2, 생성 RPC/프라코로 setup 함수가 존재하는지 확인

이 migration은 기존 room/state를 삭제하지 않습니다. `boardmate_rooms`/`boardmate_ratings`의 game check와 게임별 helper/RPC를 최신 목록으로 교체합니다.

## PWA
GitHub Pages의 `/arena/` 경로를 기준으로 `manifest.webmanifest`, `sw.js`, `icons/`가 포함됩니다.
첫 접속은 HTTPS에서 해야 브라우저의 설치 기능이 활성화될 수 있습니다.

## 프라코로
원래 프라코로는 2인용 포켓몬 주사위/카드 게임입니다. BoardMate 구현은 커뮤니티용 비공식 디지털 β 구현이며, 제공된 기본 게임 흐름을 중심으로 구현합니다.

## 외부 사이트 참고
`https://plakoro-finder.kr/about`의 직접 fetch는 현재 환경에서 확인되지 않아, 해당 페이지를 그대로 복제하지 않고 사용자가 지정한 메뉴 구성(설명/저작권/문의/앱 설치)과 일반적인 비공식 팬사이트 구조를 기준으로 BoardMate 안내 화면에 반영했습니다.
