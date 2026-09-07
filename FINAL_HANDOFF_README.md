# BoardMate Arena FINAL Handoff — 2026-09-07

## 기준본

사용자가 GitHub에서 직접 다운로드한 `arena-main.zip` (`HANDOFF_VERSION`상 v11.4.10)을 기반으로 통합했습니다. v11.3 ZIP은 역사/의사결정 확인용으로만 참고했습니다.

## 현재 기준 결정

1. 포크노바 런타임은 삭제.
2. 포켓몬 미니마로 교체하되 내부 DB game key는 `pocketnova` 유지.
3. 포켓몬 미니마는 온라인 2인 전용.
4. 아발론 / 시크릿 히틀러 / 한밤의 늑대인간은 구현된 게임으로 유지.
5. 기존 fresh arena-main의 캘리코/판타지 왕국/파워그리드 및 기타 파일은 덮어써서 퇴행시키지 않음.

## 포켓몬 미니마

새 파일:
- `pokemon-minima.html`
- `solo-pokemon-minima.html`
- `online-pokemon-minima.html`

삭제한 구 포크노바 런타임:
- `pocketnova/`
- `online-pocketnova.html`
- `solo-pocketnova.html`
- `SOURCE_UPLOADS/pocketnova-v3.zip`
- `docs/porknova-v11.7-handoff/`

온라인 state kind: `pokemon-minima-v1-boardmate`.
기존 포크노바 방의 state kind와 호환하지 않으므로 새 방을 사용합니다.

## 소셜 디덕션

- `online-avalon.html`
- `online-secret-hitler.html`
- `online-one-night-werewolf.html`
- `social/`
- `SUPABASE_SOCIAL_DEDUCTION_V1.sql`

소셜 게임은 실시간 모드이며 private role/policy/night 정보는 전용 서버 상태/RPC로 분리합니다.

## 반드시 배포 후 확인

1. 포켓몬 미니마 새 2인 방 생성 → 두 브라우저 드래프트 번갈아 선택
2. 상대 턴 조작이 막히는지
3. 행동 후 다른 브라우저에 상태가 즉시/폴백 polling으로 반영되는지
4. 새로고침/재접속 복구
5. 4라운드 종료 및 결과 반영
6. 아발론 최소 인원 1판
7. 시크릿 히틀러 최소 인원 1판
8. 한밤의 늑대인간 최소 인원 1판
9. 기존 캘리코/판타지 왕국/파워그리드 회귀 확인

## 알려진 한계

- 실제 운영 Supabase 다중 브라우저 E2E는 이 패키징 환경에서 실행하지 못했습니다.
- 포켓몬 미니마 UI는 일부 복합 카드 효과에서 브라우저 prompt/confirm을 사용합니다. 규칙 동작을 먼저 연결한 상태이며 향후 전용 모달 UI로 다듬을 수 있습니다.
- 파워그리드 독일의 기존 완전자동화 미완료 항목은 이번 교체 작업 범위에서 변경하지 않았습니다.
