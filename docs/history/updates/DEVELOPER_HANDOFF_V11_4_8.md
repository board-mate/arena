# BoardMate Arcade 통합 v11.4.8 개발 인수인계

기준일: 2026-09-06

## 한 줄 상태

`V11_4_7_BASE + CALICO_V8_MOBILE_FIT + PORKNOVA_V11_7_DEV`

## 현재 배포 기준

BoardMate 공통 시스템:
- v11.4 Realtime Broadcast
- 10초 polling fallback
- 판타지 왕국 3~6인 Supabase 통합
- 캘리코 V8 정적 88 edge + invalid cat repair

이번 통합 추가:
- 캘리코 모바일에서 720×580 논리 보드를 화면 폭에 맞게 전체 축소
- 포크노바 v11.7 개발 체크포인트/이미지 자산/core fix 통합

## 절대 호환성을 깨면 안 되는 것

### 공통
- `config.js`의 anon publishable key만 클라이언트에 둡니다.
- service_role key 금지.
- Realtime Broadcast에는 state/손패를 넣지 않고 revision 신호만 보냅니다.
- 실제 state는 기존 membership RPC로 재조회합니다.

### 판타지 왕국
- public state와 private hand state 분리 유지.
- `boardmate_game_private_states`를 브라우저에서 직접 CRUD하도록 바꾸지 않습니다.

### 캘리코
- 저장 state의 `VERSION = 8`은 이번 모바일 표시 패치 때문에 올리지 않았습니다.
- 보드 룰 좌표는 720×580/기존 absolute geometry 그대로 유지합니다.
- 모바일은 **표시 transform만** 사용합니다.
- 정적 edge catalog 4×22=88을 이미지 런타임 판정으로 되돌리지 않습니다.
- invalid cat repair 로직 유지.

### 포크노바
- 온라인 state kind `pocketnova-v3-boardmate` 유지.
- 이미지 매핑을 Supabase 게임 state에 섞지 않습니다.
- 현재 상태는 `PLAYABLE_PROTOTYPE / NOT_RULES_COMPLETE / ONLINE_E2E_UNVERIFIED`.
- 전설 프로젝트 tier, 불일치 최종점수를 추측으로 확정하지 않습니다.

## 핵심 파일

### BoardMate
- `app.js` — 게임 목록/방/라우팅
- `multi-common.js` — 공통 Supabase state + Realtime
- `config.js` — Supabase URL/anon key
- `supabase.sql` — 신규 DB 전체 기준
- `SUPABASE_FANTASY_REALMS_UNIFIED.sql` — 기존 DB Fantasy migration

### 캘리코
- `online-calico.html`
- 모바일 fit:
  - `#boardViewport`
  - `#boardFitShell`
  - `<script id="calico-mobile-board-fit">`
- V8:
  - `CALICO_EDGE_CATALOG`
  - `repair-invalid-cat-tokens`

### 포크노바
- `online-pocketnova.html` — BoardMate 온라인 wrapper
- `pocketnova/index.html`
- `pocketnova/js/image-layer.js`
- `pocketnova/js/asset-matcher.js`
- `pocketnova/assets/*`
- `pocketnova/tools/*`
- 상세 인수인계: `docs/porknova-v11.7-handoff/`

## 로컬 정적 검증

```bash
python tests/verify_integrated_release.py
node --check app.js
node --check multi-common.js
node pocketnova/tools/test_asset_matcher.mjs
python pocketnova/tools/test_v11_7_core_patch.py
python pocketnova/tools/validate_image_assets.py
```

## 반드시 실제 배포 후 확인할 것

1. 모바일 Chrome 320~430px 캘리코 보드 전체 표시
2. 캘리코 육각 터치 좌표가 축소 후에도 정확한지
3. 캘리코 세로↔가로 회전 후 재맞춤
4. 캘리코 2브라우저 Realtime
5. 판타지 왕국 private hand 새로고침/재접속
6. 포크노바 새 방 2브라우저 state 동기화
7. 포크노바 이미지 레이어가 게임 state를 변경하지 않는지

## 다음 개발 우선순위

P0:
- 실제 GitHub Pages/Supabase E2E
- 캘리코 모바일 터치/회전 실기기 확인

P1:
- 포크노바 v11.8: 전설 프로젝트 32장 원본 검증 및 placeholder tier 제거
- 나머지 최종점수 규칙 감사
- 도움 카드 자동화 확대

P2:
- 캐시 버전 표기/배포 버전 UI
- 브라우저별 회귀 테스트 자동화
