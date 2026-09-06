# 포크노바 v11.7 개발 인수인계 — START HERE

작성일: 2026-09-06 (KST)

## 한 줄 상태

**v11.7은 실행 가능한 개발 프로토타입이지만, 룰 정확성을 보장한 완성 플레이 버전은 아니다.**

- 공개 Pocket Nova v3 본체는 정적 웹앱으로 로컬 hotseat 2~4인 실행 구조가 있다.
- BoardMate에는 `solo-pocketnova.html`, `online-pocketnova.html` wrapper가 있다.
- v11.7은 여기에 이미지/원본 감사 레이어와 두 개의 안전한 core fix를 얹는 overlay patch다.
- 전설/보존 프로젝트 32장의 tier가 placeholder 상태이며, 도움(스폰서) 카드도 다수가 manual 처리다.
- 최종점수 일부는 원본 카드와 현재 v3 수치/의미가 불일치하거나 대응이 미확정이다.
- 실제 GitHub Pages + Supabase 2브라우저 E2E는 v11.7에서 완료 검증되지 않았다.

따라서 다음 개발자는 이 버전을 **production release**가 아니라 **정확한 다음 개발 기준점**으로 취급해야 한다.

## 고정 기준

- Repository: `https://github.com/board-mate/arena`
- Base commit: `73b0537eed516dc845e781cac7f41715dae2fb09`
- Base date: 2026-09-06
- Runtime game key: `pocketnova`
- Online state kind: `pocketnova-v3-boardmate`
- v11.7 patch: `patch/porknova_v11_7_source_audit_corefix_patch.zip`

**중요:** public `main`이 앞으로 바뀌더라도 v11.7을 재현할 때는 위 commit을 먼저 checkout한 뒤 patch를 적용한다.

## 다음 개발자가 처음 할 일

1. `docs/01_CURRENT_STATUS.md`를 읽는다.
2. `docs/02_ARCHITECTURE_AND_DATA_FLOW.md`를 읽는다.
3. `docs/03_REPRODUCE_AND_RUN.md`대로 base commit + v11.7을 재현한다.
4. `docs/04_TEST_MATRIX.md`의 P0 smoke를 실행한다.
5. `docs/05_KNOWN_ISSUES_AND_GUARDRAILS.md`를 읽고, 추측성 룰 수정을 피한다.
6. `docs/06_NEXT_WORK_V11_8.md` 순서로 개발한다.

다른 AI/개발 도구로 넘길 경우 `docs/07_AI_HANDOFF_PROMPT.md`를 그대로 함께 제공한다.
