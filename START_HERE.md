# 🚦 START HERE — BoardMate Arena v11.4.80

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

**v11.4.80은 v11.4.79 기능을 유지하면서 BoardMate Note의 공개 공지·일정을 읽기 전용으로 표시하고, Instagram 최근 게시물 요약과 프로필 바로가기를 홈에 추가한 기준본입니다.**

## 절대 지우지 말 것

- `docs/history/`
- `database/history/`

과거 정상 동작 근거와 SQL 원문은 롤백을 위해 보존합니다.
