# BoardMate Arena FINAL — 2026-09-07

이 저장소는 사용자가 2026-09-07 GitHub에서 직접 내려받은 `arena-main.zip`을 기준으로 만든 최종 통합본입니다.

## 이번 최종 통합의 핵심

- 기존 **포크노바 런타임을 제거**했습니다.
- 화면 게임은 **포켓몬 미니마**로 교체했습니다.
- DB/랭킹/기존 방 호환성을 위해 내부 게임 키는 의도적으로 `pocketnova`를 유지합니다.
- 포켓몬 미니마 온라인은 **2인 전용**입니다.
- 레지스탕스 아발론 / 시크릿 히틀러 기본판 / 한밤의 늑대인간을 다인플 목록과 Supabase 소셜 디덕션 서버 로직에 통합했습니다.
- 기존 캘리코 모바일 패치, 판타지 왕국, 파워그리드, 기타 현재 GitHub 게임 파일은 fresh `arena-main` 기준으로 보존했습니다.

## 포크노바에서 실제로 삭제한 것

- `pocketnova/`
- `online-pocketnova.html`
- `solo-pocketnova.html`
- `SOURCE_UPLOADS/pocketnova-v3.zip`
- `docs/porknova-v11.7-handoff/`

아래 `pocketnova` 문자열은 삭제 대상이 아닙니다.

- `app.js`와 SQL에서 쓰는 **내부 호환 게임 ID**
- `.pocketnova` CSS 클래스
- 과거 버전 문서의 변경 이력

내부 키까지 `pokemonminima` 같은 새 값으로 바꾸면 운영 중인 Supabase constraint/RPC/rating 데이터를 함께 마이그레이션해야 하므로 이번 통합에서는 하지 않았습니다.

## 새 포켓몬 미니마 파일

- `pokemon-minima.html`
- `solo-pokemon-minima.html`
- `online-pokemon-minima.html`

구현 기준:

- 16장 포켓몬 카드 + 플레이어별 행동 카드 구조
- 2인 시작 드래프트
- 4라운드
- 카드/건설/포켓몬/후원·보존 행동
- ARMIN 솔로 모드
- 온라인 드래프트/턴 좌석 잠금
- Supabase 상태 자동 저장/재접속
- 솔로 localStorage 자동 저장/이어하기

온라인 기존 포크노바 진행 상태와는 호환되지 않습니다. 반드시 **새 포켓몬 미니마 방**을 만드세요.

## 소셜 디덕션 3종

- `avalon` — 레지스탕스 아발론 5~10인
- `secrethitler` — 시크릿 히틀러 기본판 5~10인
- `onenightwerewolf` — 한밤의 늑대인간 3~10인

핵심 파일:

- `online-avalon.html`
- `online-secret-hitler.html`
- `online-one-night-werewolf.html`
- `social/social-common.js`
- `social/social-deduction.css`
- `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
- `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

## GitHub 업로드

이 패키지는 repo root 기준입니다. 기존 저장소를 통째로 교체해도 되지만, 실수 방지를 위해 백업 브랜치를 하나 남기는 것을 권장합니다.

1. ZIP 압축 해제
2. 저장소 root의 기존 파일을 교체하거나 전체 삭제 후 이 폴더의 **내용물 전체** 업로드
3. `config.js`의 현재 Supabase URL/anon key가 유지됐는지 확인
4. GitHub Pages 배포 완료 대기
5. 강력 새로고침

## Supabase — 소셜 3종을 처음 올릴 때 반드시 실행

기존 운영 DB가 현재 arena-main의 파워그리드/판타지 왕국까지 정상 동작 중이라면:

1. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
2. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

`SUPABASE_SOCIAL_DEDUCTION_V1.sql`에는 포켓몬 미니마의 내부 키 `pocketnova`를 **최소 2 / 최대 2명**, 표시명 `포켓몬 미니마`로 맞추는 helper 갱신도 포함되어 있습니다.

파워그리드 SQL을 앞으로 다시 실행해야 할 경우 이 최종본의 `SUPABASE_POWERGRID_UNIFIED.sql`을 사용하세요. 소셜 게임 등록을 보존하도록 수정되어 있습니다.

## 검증 상태

패키징 시 확인:

- `app.js` 문법 PASS
- `multi-common.js` 문법 PASS
- `social/social-common.js` 문법 PASS
- 포켓몬 미니마 본체/온라인 wrapper inline JS 문법 PASS
- 아발론/히틀러/한밤의 늑대인간 inline JS 문법 PASS
- `tests/social_deduction_static_test.cjs` 전체 PASS
- 포켓몬 미니마 16장 카드 데이터/2인 등록/온라인 상태 key 정적 검사 PASS

실제 사용자 Supabase에서 여러 계정/여러 브라우저로 끝까지 플레이하는 E2E는 배포 후 최종 확인이 필요합니다.
