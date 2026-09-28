# v11.4.83 — Arena에 공개 일정만 표시

## 변경 사항

- Arena 홈의 일정 읽기 대상을 Note `schedules` 원본 테이블에서 `arena_public_schedules` 뷰로 바꿨습니다.
- 이 뷰는 Note의 `is_public = true` 일정만 제공하므로 비공개 일정은 Arena 홈 공지/일정 카드, 달력, 예정 일정에 나타나지 않습니다.
- Note 안에서 비공개 일정을 작성하고 관리하는 기능은 유지됩니다. Arena는 읽기 전용입니다.
- 앱/서비스워커 캐시를 v11.4.83으로 갱신했습니다.

## 검증

- Note Supabase 공개 일정 뷰: HTTP 200, anon 권한 조회 확인.
- 앱 JavaScript 문법 검사와 홈페이지 공개 피드 코드 정적 확인.
- Arena 신규 DB/RPC 변경 없음. 이 연동은 Note v10 `arena_public_schedules` 뷰 및 anon SELECT 권한에 의존합니다.