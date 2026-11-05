# 현재 릴리스: v11.4.95 · 2026-11-05

크립티드 3~5인 ALPHA를 추가했습니다. 실물 지도 타일 6개 기반 기본·고급 지도, 본인만 보는 단서, 초기 큐브 공유, 자동 질문 응답·시계 방향 탐색·추가 말·승리 판정을 지원합니다.

- 자동 테스트 123개 통과. 게임 페이지 30개의 스크립트·로컬 참조 검사 포함.
- Arena 운영 DB에 `database/SUPABASE_CRYPTID_ALPHA_V11_4_95.sql` 적용 완료. 지도 8개·RLS 테이블 2개·전용 API 4개 확인.
- 기존 22개 온라인 게임의 최소·최대 인원 유지. 기존 방·회원·게임 상태·평점 데이터 초기화 없음.
- 데스크톱·390px 모바일에서 로컬 연습, 단서 표시, 큐브 배치와 차례 전환 확인.
- ALPHA 제한: 지도 배치 8종, 질문·탐색 자동 응답, 힌트 투표·2인 변형·ELO 미지원. 실제 여러 기기 간 완주와 OS 알림 도착은 미검증.
- 캐시: `boardmate-shell-v11.4.95-cryptid-alpha-20261105`
- 상세: `README_V11_4_95_CRYPTID_ALPHA.md`

아래는 이전 릴리스 기록입니다.

---

# 현재 릴리스: v11.4.85 · 2026-10-12

Note 연동 해제, 이벤트 메뉴, 공개 대진표와 대회 관리자 권한 추가·해지를 지원합니다. 상현·관리자는 해지할 수 없는 최상위 관리자입니다.

- 기준 커밋: 이전 main `10d4e56`
- 서비스워커: `boardmate-shell-v11.4.85`
- 필수 SQL: `database/SUPABASE_EVENTS_V11_4_84.sql` (Arena DB에만 적용)
- 자동 테스트 22개 통과, 별도 테스트 DB와 데스크톱/390px 모바일 브라우저 검증 완료. Arena 운영 DB에 SQL 적용 완료: 기존 다섯 회원과 두 최상위 관리자 확인, 공개 조회 성공·익명 쓰기 거부 확인.
- [v11.4.85 전체 이용·검증·배포 안내](../../README_V11_4_84_SPLENDOR_EVENT.md)

아래는 이전 릴리스 기록입니다. 현재 Note 연동 설명은 위 릴리스 안내를 우선합니다.

---

# 🗄️ Current Database Status — v11.4.83

- 이번 릴리스의 신규 SQL/RPC: **없음**
- 현재 통합 repair/update 체인: `database/SUPABASE_CURRENT_UPDATE.sql`
- 과거 SQL 원문: `database/history/`
- `SUPABASE_CURRENT_UPDATE.sql`은 **빈 프로젝트 bootstrap 전체 스키마가 아니라 기존 BoardMate DB 복구/갱신 체인**입니다.
- DB 롤백은 코드 롤백과 별개로 검토합니다. 데이터 손실 위험 때문에 자동 역적용하지 않습니다.
- `config.js`에는 브라우저에서 노출 가능한 Supabase URL + anon/publishable key만 사용합니다.
- **service-role key, DB 비밀번호, 개인 access token을 프론트 파일/README/history에 넣지 않습니다.**

## v11.4.83 호환성

BoardMate Note의 공지와 `arena_public_schedules` 뷰의 일정만 홈에서 조회합니다. 비공개 일정은 뷰에서 제외됩니다. Arena 측 데이터 쓰기나 스키마 변경은 없습니다. 공개 일정 뷰는 Note v10 마이그레이션에 포함됩니다. 행성 X 공개 로그 복구, 알림 복귀 안정화, Calico 고양이 토큰 대체 규칙도 클라이언트 측 로직입니다.
