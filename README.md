# BoardMate Arena v11.4.48 · CLEAN FULL

이 패키지는 **v11.4.48 런타임을 그대로 유지하면서 배포/보관에 불필요한 과거 파일을 정리한 통합본**입니다. 게임 로직 버전은 v11.4.48이며, 정리 작업만 했기 때문에 서비스워커 캐시나 게임 상태 버전은 올리지 않았습니다.

## 바로 배포할 파일

GitHub Pages 저장소 루트에 이 패키지의 내용을 사용하면 됩니다. 핵심 공용 파일은 `index.html`, `app.js`, `styles.css`, `config.js`, `multi-common.js`, `solo-save-ui.js`, `sw.js`, `manifest.webmanifest`, `icons/`이며 각 게임의 `online-*.html`, `solo-*.html`도 함께 유지합니다.

현재 다인플은 18개 게임 런타임을 포함합니다: 마스크맨, 어콰이어, 캘리코, 더 게임, 노터치 크라켄, 캐스캐디아, 판타지 왕국, 프라코로 포켓몬, 파워그리드, 돌팔이 약장수, 맨덤의 던전, 행성 X를 찾아서, 사무라이, 엘도라도, 에어 랜드 & 씨, 아발론, 시크릿 히틀러, 한밤의 늑대인간.

1인플은 마스크맨, 어콰이어, 에친스톤의 용들, 캘리코, 캐스캐디아, 더 게임, 커피 로스터를 포함합니다. **포켓몬 미니마는 포함하지 않으며**, `프라코로 포켓몬`은 별도 게임으로 유지합니다.

## v11.4.48에서 유지되는 최신 수정

- 캘리코: 오른쪽 위 루미 판정/배치, 현재 보드 조건 재검사, 게임 취소 진입 버튼, 진행 중인 v47 이하 호환 상태 유지.
- 에친스톤: 1인플 메뉴 복구 및 자동 저장/이어하기.
- 행성 X: 원형 보드 이벤트 표시, `가설` → `논문` UI 용어, 원형/기존 네모 기록지 전환, 기록지 이모지 각주, 참조표 하단 배치.
- 파워그리드: 현재 지원 지도는 독일/미국이며, 독일은 포함된 `germany.webp`, 미국은 Leaflet/OpenStreetMap 기반 표시를 사용합니다.

## 정리한 내용

CLEAN FULL에서는 다음 과거/개발용 파일을 제외했습니다.

- 버전별 `README_V*`, `UPLOAD_TO_GITHUB_V*`, `VERIFY_V*` 등 누적 Markdown 문서
- 과거 `.patch`, 체크섬, 통합 manifest, validation 파일
- `tests/`, `__pycache__`, 테스트 HTML 및 디버그 페이지
- 과거 Supabase migration/verify SQL 묶음
- 현재 런타임에서 참조하지 않는 중복 `social-common.js`, `local-no-touch-kraken.html`
- 현재 파워그리드 런타임에서 사용하지 않는 한국 지도 이미지/미리보기, 미국 원본 보드 이미지, `map-rules-v23.js`, 지도 디버그 도구
- 현재 앱에서 참조하지 않는 예전 Pensterdam JPG 자료

문서 내용은 이 `README.md` 하나로 통합했습니다.

## Supabase

**v11.4.48에서 정상 운영 중인 기존 DB라면 CLEAN FULL 때문에 새 SQL을 실행할 필요가 없습니다.**

`database/SUPABASE_CURRENT_UPDATE.sql`은 과거에 여러 파일로 흩어져 있던 현재 BoardMate v11.x용 repair/update 체인을 한 파일로 묶은 것입니다. 기존 BoardMate 스키마가 있는 환경을 복구/갱신할 때만 사용하세요. 빈 Supabase 프로젝트를 처음부터 만드는 bootstrap 스키마는 아닙니다.

`config.js`에는 브라우저에서 사용 가능한 Supabase URL과 anon/publishable key만 넣고 service-role key 같은 비밀 키는 넣지 마세요.

## 검증

정리 전 원본 v11.4.48에서 다음 테스트를 통과한 상태를 기준으로 만들었습니다.

- v11.4.48 정적 릴리스 검사: 활성 다인플 18개/1인플 7개 파일 연결, 포켓몬 미니마 제거, 에친스톤 복구
- Headless Chromium E2E: 캘리코 데스크톱/모바일 오른쪽 위 루미 배치, 누락 루미 재검색, 기존 진행방 상태 유지, 에친스톤 저장/이어하기, 취소 패널 진입

CLEAN FULL 생성 후에도 모든 정적 로컬 `src`/`href`/module import 경로와 필수 게임 파일 존재 여부를 다시 검사합니다.

## 배포 시 주의

GitHub 웹 UI에서 ZIP 파일을 단순 덮어쓰기만 하면 저장소에 있던 과거 문서/테스트 파일이 자동 삭제되지는 않습니다. 저장소 자체도 정리하려면 기존 파일을 삭제한 뒤 이 CLEAN FULL의 파일 구조로 교체하거나, 로컬 Git에서 불필요 파일을 제거한 커밋을 push하는 방식이 가장 확실합니다.

## 업데이트 이력 / 롤백 보존

CLEAN 배포본에서도 과거 업데이트·검증·배포 기록과 Supabase SQL 이력은 삭제하지 않습니다. 관련 자료는 `docs/history/`와 `database/history/`에 보관합니다. 과거 정상 버전으로 실제 코드를 되돌릴 수 있도록 GitHub 배포 시 버전 태그/커밋도 함께 유지하는 것을 권장합니다.

