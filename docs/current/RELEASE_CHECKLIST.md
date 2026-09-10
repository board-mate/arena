# 🧪 BoardMate Release Checklist

## 패치 시작 전

- [ ] 현재 정상 Git 커밋/태그 확보
- [ ] `HANDOFF_CURRENT.md` 읽기
- [ ] 변경 대상이 공용 파일인지 확인
- [ ] 진행 중 방 데이터 호환성 검토

## 코드 수정 후

- [ ] JS 문법 검사
- [ ] HTML inline script 문법 검사
- [ ] 로컬 파일 참조 누락 확인
- [ ] 변경한 게임 핵심 시나리오 검사
- [ ] 공용 파일을 바꿨다면 다른 게임 회귀 검사
- [ ] 진행 중 게임 호환 시나리오 확인

## 행성 X 빠른 회귀

- [ ] 표준/전문가에서 원형판 1번 섹터가 12시
- [ ] 원형 기록지 1번 섹터가 12시
- [ ] 원형↔네모 전환 시 기록 유지
- [ ] 소행성 🌑 표기 일관성
- [ ] 틀린 논문 상세 공개 기록
- [ ] X=9 선택 → 왼쪽 8 / 오른쪽 10
- [ ] X=1 wrap 표준 12/2, 전문가 18/2
- [ ] 종료 후 전체 섹터 + X 위치 공개

## 알림 빠른 회귀

- [ ] 알림 설정 창 열림
- [ ] 테스트 알림 동작(권한 허용 시)
- [ ] 내 차례 → 탭 `🔔 내 차례 ·`
- [ ] 상대 차례 → 탭 prefix 제거
- [ ] 같은 턴 중복 알림 방지
- [ ] focus/visibility/online 복귀 재확인

## 릴리스 문서

- [ ] `HANDOFF_VERSION.txt`
- [ ] `sw.js` 캐시 버전
- [ ] `README.md`
- [ ] `START_HERE.md`
- [ ] `docs/current/HANDOFF_CURRENT.md`
- [ ] `docs/current/TEST_STATUS_CURRENT.md`
- [ ] `docs/current/DEPLOYMENT_CURRENT.md`
- [ ] `docs/current/CHANGELOG_MASTER.md`
- [ ] `docs/current/NEXT_CHAT_PROMPT.md`
- [ ] 필요 시 `docs/history/updates/`에 릴리스 원문 추가
- [ ] 필요 시 `docs/history/verification/`에 검증 원문 추가

## GitHub Pages 배포 후

- [ ] 메인 페이지 새로고침
- [ ] 새 service worker 활성 확인
- [ ] 대표 다인플 1개 방 진입
- [ ] 대표 1인플 저장 게임 진입
- [ ] 행성 X 진행 중 방 확인
- [ ] 브라우저 탭 내 차례 표시 확인
- [ ] 모바일/PWA에서 아이콘/화면 확인
