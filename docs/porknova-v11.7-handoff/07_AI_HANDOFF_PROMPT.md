# 07. 다음 AI/개발 에이전트에 그대로 전달할 프롬프트

아래 내용을 새 대화의 첫 메시지에 이 ZIP과 함께 전달한다.

---

BoardMate Arena의 포크노바(Pocket Nova v3 기반) 개발을 이어서 진행한다.

먼저 이 인수인계 ZIP의 `00_READ_ME_FIRST.md`와 `docs/01`~`06`을 읽고, v11.7을 기준으로 작업한다.

고정 base:
- repo: https://github.com/board-mate/arena
- commit: 73b0537eed516dc845e781cac7f41715dae2fb09
- patch: patch/porknova_v11_7_source_audit_corefix_patch.zip
- online state kind: pocketnova-v3-boardmate

중요 원칙:
1. v11.7은 실행 가능한 개발 프로토타입이지 룰 완성판이 아니다.
2. 전설/보존 프로젝트 32장의 tier는 현재 placeholder다. 원본을 확인하지 않고 추측하지 않는다.
3. 도움 카드 다수는 manual이다. 자동화되지 않은 효과를 자동 처리된 것으로 간주하지 않는다.
4. 최종점수 원본↔v3 불일치는 `source-card-audit.js`를 우선 확인한다.
5. 이미지 레이어는 presentation-only다. 이미지 mapping/localStorage 데이터를 game/Supabase payload에 섞지 않는다.
6. v11.7 core fix는 `apply_v11_7_core_fixes.py`로 fail-closed 적용한다. upstream drift가 나면 억지 치환하지 말고 diff를 다시 검토한다.
7. 온라인 상태 kind `pocketnova-v3-boardmate`를 임의로 바꾸지 않는다.
8. 실제 룰 수정을 할 때는 원본 PDF/스캔 근거 + pure rule test + UI/E2E를 구분한다.
9. 작업 후 새 버전 ZIP과 함께 다음 인수인계 문서를 갱신한다.

가장 먼저 할 개발은 `docs/06_NEXT_WORK_V11_8.md`의 1순위부터 한다: 전설/보존 프로젝트 32장 원본 audit 및 placeholder 제거.

작업 중 현재 public main이 base commit 이후 바뀌었으면 base commit과 최신 main의 pocketnova 관련 diff를 먼저 비교하고, v11.7 변경을 잃지 않도록 수동 merge 전략을 세운다.

---
