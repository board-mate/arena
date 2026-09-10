# 🗄️ Current Database Status — v11.4.57

- 이번 릴리스의 신규 SQL/RPC: **없음**
- 현재 통합 repair/update 체인: `database/SUPABASE_CURRENT_UPDATE.sql`
- 과거 SQL 원문: `database/history/`
- `SUPABASE_CURRENT_UPDATE.sql`은 **빈 프로젝트 bootstrap 전체 스키마가 아니라 기존 BoardMate DB 복구/갱신 체인**입니다.
- DB 롤백은 코드 롤백과 별개로 검토합니다. 데이터 손실 위험 때문에 자동 역적용하지 않습니다.
- `config.js`에는 브라우저에서 노출 가능한 Supabase URL + anon/publishable key만 사용합니다.
- **service-role key, DB 비밀번호, 개인 access token을 프론트 파일/README/history에 넣지 않습니다.**

## v11.4.57 호환성

행성 X 공개 로그 복구, 인접 섹터 안내, 최종 정답 공개, 탭 내 차례 표시 모두 **클라이언트 측 호환/표시 로직**이며 DB migration이 필요하지 않습니다.
