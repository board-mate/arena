# BoardMate Arena v11.4.35 · GitHub 배포

기준: **v11.4.34 Planet X PVP가 정상 설치되어 있는 경우**

## 1. GitHub에 덮어쓸 파일

패치본에서는 아래 파일을 저장소 루트(`/arena`)에 덮어씁니다.

- `online-planetx.html`
- `index.html`
- `sw.js`
- `README.md`
- `README_V11_4_35_PLANETX_UI.md`
- `UPLOAD_TO_GITHUB_V35.md`
- `VERIFY_V11_4_35_PLANETX.md`

기존 `online-plakoro.html`, `online-mandom.html`, `online-fantasy-realms.html`, `multi-common.js`는 이번 패치에서 변경하지 않습니다.

## 2. Supabase

v11.4.34에서 `SUPABASE_PLANETX_PVP_V1.sql`을 이미 실행했다면 **추가 SQL 실행 없음**입니다.

새 설치 또는 행성 X SQL을 아직 실행하지 않은 설치라면 기존 파일의 `SUPABASE_PLANETX_PVP_V1.sql`을 1회 실행해야 합니다.

## 3. GitHub Pages 배포 후

서비스워커 캐시가 `boardmate-shell-v11.4.35`로 올라갔습니다. Pages 배포가 완료된 뒤 한 번 강력 새로고침하세요.

- Windows: `Ctrl + Shift + R`
- macOS: `Cmd + Shift + R`
- 모바일: 새 탭으로 다시 접속하거나 사이트 캐시 갱신

## 4. 확인 항목

1. 행성 X PVP에 들어가 우측에 `참조표`가 표시되는지 확인
2. 소행성/가스 구름 등 기본 규칙이 현재 모드에 맞게 표시되는지 확인
3. 페이지 아래로 스크롤한 상태에서 다른 플레이어가 행동하거나 polling이 돌아도 위로 튀지 않는지 확인
4. 공개 회의 정보가 한국어 개체명/한국어 규칙 문장으로 보이는지 확인
5. 주제 조사 결과가 한국어로 보이는지 확인
6. 시작 정보의 `asteroid / gas cloud` 같은 문자열이 한국어로 보이는지 확인
7. 섹터 메모 버튼이 `A/G`가 아니라 `소행성/가스 구름`처럼 표시되는지 확인
