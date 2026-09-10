# 🤝 BoardMate Arena — CURRENT HANDOFF

**Baseline:** v11.4.59  
**Date:** 2026-09-10  
**Service worker cache:** `boardmate-shell-v11.4.59`  
**New DB/RPC in this release:** 없음

---

## 1. 현재 기준본

이 폴더의 런타임이 현재 기준입니다. 기존 진행 중 방과 개인 기록지는 초기화하지 않고 이어서 사용할 수 있도록 패치했습니다.

- 다인플: 18개
- 1인플: 7개
- 포켓몬 미니마: 제거 상태 유지
- 프라코로 포켓몬: 유지
- Power Grid: 독일 / 미국 지원 기준 유지

새 작업을 시작할 때 **먼저 현재 정상 상태를 Git 커밋/태그**로 남기세요.

---

## 2. 행성 X를 찾아서 — 반드시 보존할 현재 동작

### 보드/기록지
- 원형 게임판과 원형 기록지 모두 **맨 위가 1번 섹터**.
- 섹터 번호는 시계방향 증가.
- 표준 12섹터 / 전문가 18섹터.
- 원형 ↔ 기존 네모 기록지 전환 가능.
- 두 레이아웃은 같은 개인 기록 데이터를 공유.
- 소행성 표시는 **🌑**로 통일.

### 논문/교차 검증
- UI에서는 `가설` 대신 **`논문`** 용어 사용.
- 틀린 논문 공개 기록은 가능하면 다음 정보를 한 줄에 포함:
  - 플레이어
  - 섹터
  - 제출 개체
  - `해당 섹터에는 그 개체 없음`
  - 패널티 시간 `+1`
- 실제 개체는 정답 논문으로 섹터가 확정된 경우에만 공개.
- 진행 중 구형 게임에서 `누구 · 틀린 논문 패널티 시간 +1`만 저장된 경우, 공개 theory token 상태가 남아 있으면 **렌더링 시 상세 기록으로 복구**. 서버 상태 자체는 변형하지 않음.

### 행성 X 찾기
- X 후보 섹터를 선택하면 **왼쪽/오른쪽 인접 섹터 번호를 명시**.
- 예: X 후보 9 → `왼쪽 인접 · 섹터 8`, `오른쪽 인접 · 섹터 10`.
- wrap:
  - 표준 X=1 → 왼쪽 12 / 오른쪽 2
  - 전문가 X=1 → 왼쪽 18 / 오른쪽 2
- 각 인접 섹터에서 무엇이 있다고 생각하는지 선택하도록 안내.

### 게임 종료
- 최종 공개 후 **모든 섹터의 실제 개체**를 표시.
- 행성 X 위치를 별도 강조.
- X 양옆 섹터 번호와 실제 개체도 별도 요약.
- 참조표는 화면 맨 아래 유지.
- 논문 점수 참조:
  - 🌑 소행성 2점
  - 혜성 3점
  - 가스 구름 4점
  - 왜소행성 표준 4점 / 전문가 2점
  - 리더 보너스 +1
  - 행성 X 최초 10점 / 후발 2~10점

---

## 3. 알림 / 웹 내 차례 — 현재 구조와 한계

### 현재 구현
- `alarm.js`가 알림 설정/브라우저 알림을 담당.
- 새 방/게임 시작/내 차례 이벤트를 감지.
- 턴 기반 게임은 약 3초 polling + 상태 복귀 이벤트에서 재확인.
- `visibilitychange`, `focus`, `pageshow`, `online`에서 즉시 상태 확인.
- 같은 턴의 반복 알림을 막기 위해 room/turn signature를 localStorage에 저장.
- **내 차례이면 브라우저 탭 제목 앞에 `🔔 내 차례 ·`를 표시**.
- 탭 표시는 Notification permission이 없어도 동작.

### 사용자 보고 및 한계
사용자는 OS 알림이 **올 때도 있고 안 올 때도 있음**을 확인했습니다. 현재 구현은 브라우저가 살아 있는 동안의 best-effort 방식이므로 브라우저 백그라운드 throttling/OS 절전 정책 영향을 받습니다.

**다음 알림 개선의 1순위 후보:**
1. 진짜 Web Push subscription 저장
2. Supabase Edge Function/서버에서 push 발송
3. service worker `push` 이벤트에서 알림 표시
4. room/seat 단위 subscription 정리 및 만료 처리
5. 앱 완전 종료 상태 E2E 검증

이 작업 전까지는 **브라우저 탭 `🔔 내 차례`가 가장 신뢰할 수 있는 웹 표시**입니다.

---

## 4. 최근 다른 게임 보존사항

### 캘리코
- 오른쪽 위 포함 루미 조건 판정/배치 수정 유지.
- `현재 보드 조건 다시 검사` 기능 유지.
- `게임 취소` 진입 유지.
- 진행 중 방 호환 유지.

### 에친스톤의 용들
- 1인플 메뉴 연결 유지.
- 자동 저장 / 이어하기 유지.

### 앱/PWA
- 사용자 제공 BoardMate 로고.
- 투명 배경 아이콘.
- manifest/favicon/Apple Touch 아이콘 유지.

---

## 5. DB / 보안

- v11.4.59 신규 SQL/RPC 없음.
- 현재 체인: `database/SUPABASE_CURRENT_UPDATE.sql`.
- 과거 SQL 원문: `database/history/`.
- DB 역적용은 자동으로 하지 말 것. 데이터 손실 위험을 따로 검토.
- `config.js`에는 브라우저용 Supabase URL + anon/publishable key만 사용. service-role 비밀키 금지.

---

## 6. 다음 패치에서 지켜야 할 것

1. `docs/history/`, `database/history/` 삭제 금지.
2. 공용 런타임을 건드리면 다른 게임 회귀 검사.
3. 진행 중 방 데이터를 파괴하는 migration보다 표시/호환 패치 우선.
4. 릴리스마다 다음을 갱신:
   - `HANDOFF_VERSION.txt`
   - `sw.js` 캐시 키
   - `README.md`
   - `START_HERE.md`
   - `docs/current/HANDOFF_CURRENT.md`
   - `docs/current/TEST_STATUS_CURRENT.md`
   - `docs/current/DEPLOYMENT_CURRENT.md`
   - `docs/current/CHANGELOG_MASTER.md`
   - `docs/current/NEXT_CHAT_PROMPT.md`
5. 정상 릴리스 직전 Git tag 권장.

---

## 7. 다음 작업 우선순위 제안

**P1 — 알림 신뢰성:** 완전 종료 상태에서도 오는 Web Push 설계/구현.  
**P2 — 행성 X 실사용 회귀:** 진행 중 방에서 교차 검증 공개 기록, X 찾기 양옆 선택, 최종 공개까지 실제 2인 이상 E2E.  
**P3 — 전체 게임 E2E 자동화:** 방 생성 → 참가 → 첫 행동 → 종료/취소를 게임별 최소 시나리오로 자동화.

## v11.4.59 긴급 빈 화면 복구
- 루트 `index.html`의 jsDelivr Supabase SDK가 parser-blocking이던 구조를 제거했다.
- 외부 SDK 장애/지연이 있어도 `app.js`가 먼저 실행되어 홈 UI가 렌더링된다.
- SDK가 이후 도착하면 `app.js`가 Supabase client를 lazy-init한다.
- `recovery.html`은 BoardMate SW/cache만 정리하고 localStorage는 보존한다.


## v11.4.59 추가
- 알림 모듈 실패가 메인 부팅을 막지 않음.
- app.js module load 최대 3회 재시도.
- 내 차례: 탭 제목 + 상단 배너 + favicon 표시.
- 시스템 알림 성공 후에만 seen 처리.
- DB 변경 없음.
