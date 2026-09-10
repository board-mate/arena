# 현재 데이터베이스 상태

- v11.4.50: **새 SQL 없음**.
- 현재 통합 repair/update 파일: `database/SUPABASE_CURRENT_UPDATE.sql`.
- 목적: 기존 BoardMate 스키마의 복구/갱신.
- 주의: 빈 Supabase 프로젝트 전체를 처음부터 만드는 bootstrap 스키마가 아닙니다.
- 과거 SQL: `database/history/`에 원문 보존.
- DB 롤백은 Git 코드 롤백과 별개로 검토해야 하며 데이터 손실 위험이 있으므로 자동 역적용하지 않습니다.
- `config.js`에는 브라우저용 Supabase URL과 anon/publishable key만 사용하고 service-role 비밀키를 넣지 않습니다.
