# 현재 릴리스: v11.4.85 · 2026-10-12

Note 연동 해제, 이벤트 메뉴, 공개 대진표와 대회 관리자 권한 추가·해지를 지원합니다. 상현·관리자는 해지할 수 없는 최상위 관리자입니다.

- 기준 커밋: 이전 main `10d4e56`
- 서비스워커: `boardmate-shell-v11.4.85`
- 필수 SQL: `database/SUPABASE_EVENTS_V11_4_84.sql` (Arena DB에만 적용)
- 자동 테스트 22개 통과, 별도 테스트 DB와 데스크톱/390px 모바일 브라우저 검증 완료. Arena 운영 DB에 SQL 적용 완료: 기존 다섯 회원과 두 최상위 관리자 확인, 공개 조회 성공·익명 쓰기 거부 확인.
- [v11.4.85 전체 이용·검증·배포 안내](README_V11_4_84_SPLENDOR_EVENT.md)

아래는 이전 릴리스 기록입니다. 현재 Note 연동 설명은 위 릴리스 안내를 우선합니다.

---

# 🚦 START HERE — BoardMate Arena v11.4.83

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

**v11.4.83은 홈 일정에서 Note의 공개 일정 뷰만 읽어 비공개 일정이 Arena에 표시되지 않도록 한 기준본입니다.**

## 절대 지우지 말 것

- `docs/history/`
- `database/history/`

과거 정상 동작 근거와 SQL 원문은 롤백을 위해 보존합니다.
