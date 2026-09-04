# 다음 작업 시작용 — BoardMate Arcade v11.3

다음 대화에서 **`README_FIRST.md`의 v11.3 섹션 → 이 문서 순서로 읽고 시작**하세요.

## 현재 정상 확인된 것
- Supabase 방 만들기 정상
- 게임 취소 투표 정상
- 캘리코 디자인 목표: 각 플레이어가 자기 것 직접 선택
- 펜토리니: v10 방식으로 원복되어 전체 34% 후보 미리보기 없음

## 이번에 바뀐 것
- 포크노바를 `pocketnova-v3.zip` 본체로 교체
- 내부 키는 `pocketnova`, 사용자명은 `포크노바`
- 포크노바 1인플 카드 추가 + 27턴 솔로/로컬 저장
- 포크노바 온라인 상태 kind: `pocketnova-v3-boardmate`

## 포크노바 파일 지도
- `pocketnova/` : v3 게임 본체 + BoardMate 패치
- `pocketnova/README_SOURCE_V3.md` : 사용자가 준 v3 README 원문
- `pocketnova/README.md` : BoardMate 통합 설명
- `solo-pocketnova.html` : 1인플 iframe wrapper (`?solo=1`)
- `online-pocketnova.html` : Supabase 방 wrapper (`?online=1`)
- `app.js` : 1인플 라이브러리/다인플 게임 등록

## 다음에 가장 먼저 할 테스트
1. 배포된 사이트에서 포크노바 1인플 시작/이어하기
2. 새 포크노바 온라인 2인 방
3. 방장 초기 설정 → 현재 좌석 한 턴 → 상대 화면 동기화
4. 재접속
5. 종료/ELO 반영

## 주의
- v11.3에서 Supabase SQL은 바꾸지 않았습니다. 방 만들기/취소가 이미 정상이라면 SQL을 다시 실행하지 마세요.
- 포크노바 온라인은 상태 형식이 바뀌었으므로 예전 진행 방이 아니라 **새 방**으로 테스트하세요.
- 사용자 제공 v3의 자체 smoke test는 첫 지도 `starterKiosk` 가정 때문에 원본 상태에서도 실패합니다. 이를 BoardMate 통합 회귀로 오해하지 마세요.
