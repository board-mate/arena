# 설치 체크리스트

## GitHub

- [ ] ZIP 내용을 저장소 루트에 덮어쓰기
- [ ] `app.js` 갱신 확인
- [ ] `online-avalon.html` 추가
- [ ] `online-secret-hitler.html` 추가
- [ ] `online-one-night-werewolf.html` 추가
- [ ] `social/social-common.js` 추가
- [ ] `social/social-deduction.css` 추가
- [ ] SQL/검증 SQL 추가
- [ ] `git add` 시 `social/`, `docs/`, `tests/` 폴더 누락 없는지 확인
- [ ] commit / push
- [ ] GitHub Pages 배포 완료 확인

## Supabase

Power Grid 패치가 아직이면:
- [ ] `SUPABASE_POWERGRID_UNIFIED.sql`
- [ ] `SUPABASE_VERIFY_POWERGRID.sql`

소셜 3종:
- [ ] `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
- [ ] `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql` 결과 PASS 확인

## 라이브 스모크 테스트

### 아발론
- [ ] 5인 방 생성
- [ ] 모든 참가자 입장
- [ ] 역할 초기화
- [ ] `이번 판 역할` 공개 목록 확인
- [ ] 팀 제안/찬반
- [ ] 임무 성공/실패
- [ ] 3성공 후 암살까지 확인
- [ ] 다른 사람 역할이 네트워크 응답에 노출되지 않는지 확인

### 시크릿 히틀러
- [ ] 5인 방 생성
- [ ] 역할 초기화
- [ ] 정부 지명/투표
- [ ] 대통령 3장, 수상 2장이 각각 본인에게만 보이는지 확인
- [ ] 정책 시행
- [ ] 선거 트래커
- [ ] 가능한 대통령 권한
- [ ] 종료 조건

### 한밤의 늑대인간
- [ ] 3인 방 생성
- [ ] 플레이어 수 + 3장 구성 확인
- [ ] `이번 판 역할` 확인
- [ ] 야간 단계 진행
- [ ] 역할별 개인 정보가 본인에게만 보이는지 확인
- [ ] 낮 투표가 전원 제출 전 공개되지 않는지 확인
- [ ] 최종 카드/중앙 3장/승자 공개 확인
