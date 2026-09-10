# 🚦 START HERE — BoardMate Arena v11.4.60

이 파일은 **새 채팅 / 새 개발자 / 오랜만에 다시 작업하는 사람**을 위한 첫 진입점입니다.

## 5분 안에 현재 상태 파악하기

1. **`README.md`** — 프로젝트와 최근 기능 전체 개요
2. **`docs/current/HANDOFF_CURRENT.md`** — 지금 코드에서 반드시 알아야 할 내용
3. **`docs/current/TEST_STATUS_CURRENT.md`** — 무엇을 검증했고 무엇은 아직 한계인지
4. **`docs/current/NEXT_CHAT_PROMPT.md`** — 다음 ChatGPT/개발 세션에 그대로 전달할 문맥
5. **`docs/current/RELEASE_CHECKLIST.md`** — 패치/배포 전후 확인 항목

필요할 때 이어서 읽기:

- `docs/current/DEPLOYMENT_CURRENT.md` — GitHub Pages 배포
- `docs/current/PROJECT_STRUCTURE.md` — 파일 구조
- `docs/current/CHANGELOG_MASTER.md` — 버전 흐름 탐색
- `docs/current/DATABASE_CURRENT.md` — Supabase 상태
- `docs/history/ROLLBACK_GUIDE.md` — 롤백 원칙

## 현재 핵심 한 줄 요약

**v11.4.60은 v11.4.59의 행성 X/알림 기능을 유지하면서, 메인 `app.js`의 누락된 `renderRoom()` 닫는 중괄호를 복구한 긴급 부팅 수정 기준본입니다. PC 탭 `🔔 내 차례`/페이지 배너/브라우저 시스템 알림은 유지되며, 완전히 종료된 브라우저 대상 서버 Web Push는 범위 밖입니다.**

## 절대 지우지 말 것

- `docs/history/`
- `database/history/`

과거 정상 동작 근거와 SQL 원문은 롤백을 위해 보존합니다.
