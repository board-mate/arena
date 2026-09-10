# BoardMate Arena v11.4.34 · GitHub / Supabase 배포

## 1. GitHub에 파일 업로드

전체본이면 ZIP을 풀어 저장소 루트(`/arena`)에 그대로 덮어씁니다.

패치본이면 아래 파일만 덮어씁니다.

- `app.js`
- `index.html`
- `sw.js`
- `online-planetx.html`
- `SUPABASE_PLANETX_PVP_V1.sql`
- `README_V11_4_34_PLANETX_PVP.md`
- `UPLOAD_TO_GITHUB_V34.md`

기존 `online-mandom.html`, `online-plakoro.html`, `SUPABASE_PLAKORO_PVP_V6.sql`은 삭제하거나 구버전으로 되돌리지 마세요.

## 2. Supabase SQL 1회 실행 — 필수

**중요:** v11.4.29/V33 Repair SQL을 다시 실행할 일이 있다면 그것을 먼저 실행하고, Planet X SQL을 반드시 마지막에 실행하세요. 구버전 Repair SQL은 `planetx`가 생기기 전의 게임 목록을 다시 설치할 수 있습니다.

Supabase Dashboard → SQL Editor → New query에서 저장소의

`SUPABASE_PLANETX_PVP_V1.sql`

전체 내용을 붙여 넣고 **Run** 합니다.

성공 후 PostgREST schema cache가 갱신될 때까지 수 초 기다립니다.

> 기존 v11.4.29 배포에서 `SUPABASE_PLAKORO_PVP_V6.sql`을 이미 실행했다면 다시 실행할 필요 없습니다. 이번 SQL은 행성 X용 추가 패치입니다.

## 3. GitHub Pages 갱신 확인

Pages 배포가 끝난 뒤 브라우저에서 강력 새로고침합니다.

- Windows: `Ctrl + Shift + R`
- macOS: `Cmd + Shift + R`
- 모바일: 사이트 데이터/캐시를 새로고침하거나 새 탭에서 다시 진입

## 4. 2명 이상으로 테스트

1. 서로 다른 BoardMate 계정/브라우저로 접속
2. 새 방 만들기 → `행성 X를 찾아서`
3. 2~4명 입장 후 방 시작
4. 방장이 표준/전문가 모드를 골라 숨은 태양계 생성
5. 각자 시작 정보 난이도를 선택하고 준비 완료
6. 방장이 관측 시작
7. 각자 액션 결과가 본인 화면에만 보이는지 확인
8. 가설 단계에서 개체 종류가 다른 사람 화면에 `?`로 유지되는지 확인
9. 교차 검증 때만 개체 종류/정오가 공개되는지 확인
10. 한 명이 행성 X를 찾은 뒤 마지막 점수 기회와 최종 점수가 정상 작동하는지 확인

## 5. 오류가 `boardmate_planetx_*` / `지원하지 않는 게임`으로 나오면

대부분 `SUPABASE_PLANETX_PVP_V1.sql` 미실행 또는 schema cache 갱신 전입니다. SQL 실행 성공 여부를 확인하고 10~20초 뒤 다시 접속하세요.
