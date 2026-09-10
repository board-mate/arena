# BoardMate Arena — GPT 인수인계 README

> **기준 릴리스:** `v11.4.27 MERGED`  
> **작성일:** 2026-09-08  
> **GitHub 저장소:** `https://github.com/board-mate/arena`  
> **GitHub Pages:** `https://board-mate.github.io/arena/index.html#/`  
> **현재 작업 기준 패키지:** `BoardMate_Arena_V11_4_27_MERGED_FULL.zip`

---

## 0. 다음 GPT에게 가장 먼저 전달할 지시

이 프로젝트를 수정할 때는 **이 README와 `BoardMate_Arena_V11_4_27_MERGED_FULL.zip`을 기준 소스(source of truth)로 사용**한다.

중요:

1. GitHub 라이브 사이트가 반드시 v11.4.27이라고 가정하지 말고, 작업 시작 시 저장소/Pages의 실제 배포 상태를 먼저 확인한다.
2. 예전 `v11.4.26 GAME_POLISH` 또는 `v11.4.26 GAME_STATUS_CANCEL` 중 한쪽만 기준으로 덮어쓰지 않는다. v11.4.27은 두 가지 가지(branch)의 수정사항을 병합한 버전이다.
3. 새 수정은 **기존 기능을 보존한 채 증분 패치**로 적용한다.
4. Supabase SQL은 파일 실행 순서/과거 마이그레이션 때문에 게임 목록이나 RPC가 되돌아간 전력이 있으므로, 개별 SQL을 무작정 재실행하지 말고 현재 통합 Repair SQL을 우선 사용한다.
5. DB 스키마를 바꾸는 업데이트라면 `SUPABASE_REPAIR_ALL_GAMES_Vxx.sql`과 `SUPABASE_VERIFY_ALL_GAMES_Vxx.sql`을 함께 갱신한다.
6. 서비스워커를 건드리는 배포에서는 `sw.js`의 cache key 버전도 함께 올린다.
7. 엘도라도/사무라이처럼 맵이 방 상태에 저장되는 게임은 **업데이트 후 새 방/새 게임으로 테스트**한다. 기존 진행방은 옛 맵 상태를 계속 들고 있을 수 있다.

---



    ## v11.4.28 업데이트
    - Avalon: 5라운드 전체 원정대 인원 게임판 표시
    - Secret Hitler: 파시스트 트랙 효과 표시를 셀형 UI로 안정화
    - Plakoro: 에너지코로 타입 이모지 표시, 기술 카드의 캐릭터코로 면 조건 배지, setup pair RPC의 `seat` ambiguity 수정
    - No-Touch Kraken: 라운드 전환 애니메이션 강화
    - Social/Plakoro cancel: unanimous cancellation RPC에 `plakoro` 추가
    - DB 기준 SQL: `SUPABASE_REPAIR_ALL_GAMES_V28.sql`, `SUPABASE_VERIFY_ALL_GAMES_V28.sql`
    
## 1. 프로젝트 목적

BoardMate Arena는 보드게임 모임원이 웹에서 함께 플레이하기 위한 통합 웹 아케이드다.

- 정적 호스팅: GitHub Pages
- 다인플 상태/방/로그인/랭킹: Supabase RPC 중심
- 일부 다인플 게임: 순차 턴제
- 일부 소셜/동시진행 게임: realtime 모드
- 1인플 게임: 대부분 브라우저 `localStorage` 저장
- PWA 설치 지원

사용자는 기능 추가 시 **기존 패치가 롤백되는 것을 특히 원하지 않는다.** 새 버전은 항상 최신 통합본을 베이스로 병합해야 한다.

---

## 2. 현재 최신 릴리스 v11.4.27 구성

v11.4.27은 다음 두 v11.4.26 계열을 병합한 릴리스다.

- `v11.4.26 GAME_POLISH`
- `v11.4.26 GAME_STATUS_CANCEL`

또한 업로드된 최신 PowerGrid Germany V32 맵 상태를 보존했다.

### v11.4.27에서 반드시 보존해야 하는 UI/허브 기능

- 우측 상단 `📲 앱 설치` 버튼
- PWA `beforeinstallprompt` 처리
- 게임 선택 목록 데스크톱 4열
- 태블릿 3열, 모바일 2열/1열 반응형
- 이전보다 세로 높이가 작은 compact game card
- 게임 상태 그룹 분리: Stable / ALPHA / BETA
- 서비스워커 캐시 키: `boardmate-shell-v11.4.27`

### 현재 상태 분류

**ALPHA**

- 사무라이 (`samurai`)
- 엘도라도 (`eldorado`)
- 돌팔이 약장수 (`quacks`)

**BETA**

- 에어 랜드 & 씨 (`airlandsea`)
- 캐스캐디아 (`cascadia`)

**Stable / 일반 목록**

- 마스크맨 (`maskmen`)
- 어콰이어 (`acquire`)
- 캘리코 (`calico`)
- 더 게임 (`thegame`)
- 노터치 크라켄 (`kraken`)
- 판타지 왕국 (`fantasyrealms`)
- 프라코로 포켓몬 (`plakoro`)
- 파워그리드 (`powergrid`)
- 맨덤의 던전 (`mandom`)
- 레지스탕스 아발론 (`avalon`)
- 시크릿 히틀러 (`secrethitler`)
- 한밤의 늑대인간 (`onenightwerewolf`)

현재 `app.js`의 selectable multiplayer catalog는 위 17개 게임이다.

---

## 3. 최근 게임별 중요 변경사항

### 프라코로 포켓몬

이전 표시명 `프라코로`를 **`프라코로 포켓몬`**으로 변경했다.

중요 수정:

- 게임 준비에서 `동기화 오류 · 재시도` 후 넘어가지 않던 문제를 보완
- V5 SQL이 `boardmate_plakoro_setups`와 필요한 action/setup 구조를 자체 생성
- 준비 RPC 설치
- 기본 포켓몬 선택값 초기화
- DB 미설치/오류 진단 메시지 개선

관련 파일:

- `online-plakoro.html`
- `SUPABASE_PLAKORO_PVP_V5.sql`
- `SUPABASE_REPAIR_ALL_GAMES_V27.sql`

### 사무라이

표시명 `사무라이 PVP` → **`사무라이`**.

맵 v2 적용:

- 겹치던 육각 좌표 제거
- 일본 열도 형태로 재배치
- 2인: 조각 슬롯 21개
- 3인: 조각 슬롯 30개
- 4인: 조각 슬롯 39개
- 각 인원수에서 공급량과 배치 슬롯이 일치하도록 수정

현재 ALPHA. 실제 플레이테스트를 계속하면서 맵 품질/밸런스를 보완할 대상이다.

### 엘도라도

현재 ALPHA.

- 기본 맵을 약 21열 장거리 코스로 확장
- 봉쇄선 4개
- 봉쇄선을 붉은 점선과 라벨로 명확히 표시
- 통과된 봉쇄는 희미한/완료 상태 표시
- 기존 방에는 옛 맵 데이터가 저장되어 있을 수 있으므로 맵 변경 확인은 새 방에서 수행

### 돌팔이 약장수

현재 ALPHA.

추가된 기능:

- 1~34칸 냄비/점수 트랙
- 트랙 위 플레이어 위치 표시
- 루비칸 표시
- 라운드 정산 시 다음 라운드 주머니 구성 보기
- 현재 주머니 잔여 칩 보기

**중요한 미완성/근사 규칙:**

현재 구현에는 원본 보드 전체 수치가 없어 다음 값이 근사치다.

- `RUBY_POS`
- `GOLD_OF`
- `POINTS_OF`

그리고 현재 버전에서 다음 요소는 생략되어 있다.

- 쥐 마커
- 점쟁이 카드 24장

따라서 돌팔이는 ALPHA 유지가 적절하다. 향후 공식 트랙 수치/룰 데이터가 확보되면 우선 보완한다.

### 맨덤의 던전

게임 흐름을 다음 방식으로 수정했다.

1. 플레이어끼리 행동 순서를 합의하고 호스트가 순서를 설정
2. 자신의 턴에:
   - 몬스터를 뽑아 자신만 확인 → 던전에 놓기
   - 몬스터를 뽑아 자신만 확인 → 자신 앞에 가져오고 장비 토큰 1개 가져오기
   - 패스
3. 다른 플레이어가 모두 패스하면 마지막 남은 플레이어가 용사
4. 던전 성공 시 승리 토큰
5. 첫 실패 시 몬스터 목록 카드 빨간 테두리
6. 빨간 상태에서 다시 실패 시 탈락

현재 `pendingDraws`로 자신이 확인 중인 몬스터를 UI상 본인에게만 보여준다.

**보안 한계:** 현재 공용 게임 상태를 사용하므로 일반 화면에는 비밀로 보이지만, 개발자도구/Supabase 데이터 수준까지 완전한 서버 비밀정보는 아니다. 완전한 비밀정보 보장이 필요하면 맨덤 전용 private RPC/filtered view 구조를 만드는 것이 다음 개선 방향이다.

### PowerGrid

현재 업로드본의 **Germany V32** 맵 관련 파일 상태를 보존해야 한다.

주요 디렉터리:

- `powergrid/engine.js`
- `powergrid/map-rules-v23.js`
- `powergrid/map-rules-v30.js`
- `powergrid/pg-styles.css`
- `powergrid/ui.js`

다른 브랜치/예전 ZIP에서 PowerGrid 파일을 덮어쓰지 않는다.

### 판타지 왕국 / 한밤의 늑대인간

과거 로딩 문제를 수정한 상태다.

핵심 역사:

- 단순 JS export/import 문제 이후에도 Supabase SQL 마이그레이션 충돌이 남아 있었음
- 오래된 개별 SQL이 game check/catalog/RPC를 과거 목록으로 되돌릴 수 있었음
- 현재 통합 Repair SQL 방식으로 정리됨

`boardmate_social_action`의 정확한 함수 시그니처는:

```sql
public.boardmate_social_action(text, uuid, jsonb)
```

과거에 잘못 검사했던 4인자 형태 `text,uuid,text,jsonb`를 다시 사용하지 말 것.

---

## 4. 소셜 추리 3종 게임 취소 기능

대상:

- 아발론
- 시크릿 히틀러
- 한밤의 늑대인간

현재는 **참가자 전원 만장일치 취소** 방식이다.

- 취소 투표 상태를 Supabase에 저장
- 현재 방 참가자 전원이 동의하면 방을 `finished` 처리
- 취소는 정상 승패 결과를 제출하지 않음

관련 DB 요소:

- `public.boardmate_game_cancel_votes`
- `public.boardmate_get_cancel_status(text,uuid)`
- `public.boardmate_set_cancel_vote(text,uuid,boolean)`

관련 프론트:

- `social/social-common.js`
- `online-avalon.html`
- `online-secret-hitler.html`
- `online-one-night-werewolf.html`

취소 기능을 수정할 때는 세 게임을 같이 회귀 테스트한다.

---

## 5. 포켓몬 미니마는 삭제된 게임

**포켓몬 미니마는 UI와 배포 런타임에서 제거된 상태를 유지한다. 다시 메뉴에 복구하지 말 것.**

삭제 대상/삭제 유지 파일:

- `online-pokemon-minima.html`
- `online-pocketnova.html`
- `pokemon-minima.html`
- `solo-pokemon-minima.html`
- `solo-pocketnova.html`
- `pocketnova/` 디렉터리

다만 Supabase에는 기존 역사 데이터/제약조건 호환을 위해 legacy DB key `pocketnova`를 남겨둔다.

즉:

- UI에는 노출하지 않음
- 새 게임 생성 목록에도 노출하지 않음
- DB의 과거 행이 깨지지 않도록 key 호환만 유지

---

## 6. 1인플 저장/포기 기능

v11.4.25에서 1인플 저장 UX를 통합했고 v11.4.27에서도 유지한다.

BoardMate 자체 솔로 게임에서 공통 UX:

- 자동 저장
- `💾 저장`
- 이어하기/재접속 복원
- `🏳 게임 포기`
- 포기 시 해당 저장 데이터 삭제 후 초기 상태

관련 공통 파일:

- `solo-save-ui.js`

적용 대상:

- `solo-acquire.html`
- `solo-etchinstone.html`
- `solo-maskmen.html`
- `solo-thegame.html`
- `solo-coffee-roaster.html`

외부 사이트 기반:

- `solo-calico.html`
- `solo-cascadia.html`

외부 iframe 내부 상태는 same-origin 보안 때문에 BoardMate가 직접 저장/삭제할 수 없다. 이 둘은 외부 사이트 자체 저장 동작을 따른다.

---

## 7. 핵심 파일 구조

### 앱 셸/라우팅

- `index.html` — 메인 페이지/PWA shell
- `app.js` — 라우팅, 로그인, 게임 카탈로그, 방 생성/목록, PWA install 처리
- `styles.css` — 공통 UI
- `config.js` — Supabase URL/anon 설정. **service-role key나 비밀키를 절대 넣지 말 것.**
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker/cache
- `icons/icon-192.png`
- `icons/icon-512.png`

### 다인플 공통

- `multi-common.js` — 일반 다인플 공통 연결/상태/RPC helper
- `social/social-common.js` — 소셜 추리 공통 helper
- `social/social-deduction.css`

### 다인플 게임 HTML

- `online-acquire.html`
- `online-airlandsea.html`
- `online-avalon.html`
- `online-calico.html`
- `online-cascadia.html`
- `online-eldorado.html`
- `online-fantasy-realms.html`
- `online-kraken.html`
- `online-mandom.html`
- `online-maskmen.html`
- `online-one-night-werewolf.html`
- `online-plakoro.html`
- `online-powergrid.html`
- `online-quacks.html`
- `online-samurai.html`
- `online-secret-hitler.html`
- `online-thegame.html`

### Supabase 최신 통합본

현재 릴리스에서 배포 후 사용하는 기준 SQL:

1. `SUPABASE_REPAIR_ALL_GAMES_V27.sql`
2. `SUPABASE_VERIFY_ALL_GAMES_V27.sql`

**Verify의 모든 `ok`가 true여야 한다.**

개별 과거 SQL 파일이 저장소에 남아 있어도, 수정/복구 시에는 현재 통합 Repair를 기준으로 판단한다.

---

## 8. Supabase 관련 중요한 역사와 주의점

과거 가장 큰 문제는 **개별 SQL 마이그레이션 실행 순서가 서로의 게임 목록/제약조건/RPC를 되돌리는 것**이었다.

따라서:

- 새로운 게임을 추가하면 rooms/ratings/game min/max/turn seat/create room 등 관련 game catalog 전체에 반영할 것
- 기존 게임 ID를 누락한 CHECK constraint를 새로 만들지 말 것
- 과거 개별 SQL을 최신 통합 SQL보다 뒤에 실행하면 카탈로그가 롤백될 수 있으므로 주의
- RPC를 추가하면 Verify에도 정확한 PostgreSQL 시그니처를 추가
- 기존 데이터 삭제를 기본 해결책으로 사용하지 말 것

현재 UI에 노출되는 다인플 게임 ID는 17종이고, legacy `pocketnova` key만 DB 호환용으로 추가 유지된다.

현재 소셜 게임:

- `avalon`
- `secrethitler`
- `onenightwerewolf`

이들은 realtime room으로 생성되어야 한다.

돌팔이 약장수(`quacks`)도 동시 진행형이라 realtime 모드를 유지한다.

---

## 9. 배포 절차

### 권장 방식

`BoardMate_Arena_V11_4_27_MERGED_FULL.zip`의 내용을 GitHub repository root에 덮어쓴다.

삭제된 포켓몬 미니마 파일이 GitHub에 남아 있다면 반드시 삭제한다.

그다음 Supabase SQL Editor에서:

1. `SUPABASE_REPAIR_ALL_GAMES_V27.sql` 전체 실행
2. `SUPABASE_VERIFY_ALL_GAMES_V27.sql` 실행
3. 모든 `ok = true` 확인

배포 후:

- GitHub Pages 반영 확인
- PWA/service worker 때문에 옛 화면이 보이면 hard refresh
- 현재 service worker cache key는 `boardmate-shell-v11.4.27`

새 릴리스에서는 cache key를 반드시 새 버전으로 bump할 것.

---

## 10. 현재 검증 상태

`VALIDATION_V11_4_27.txt` 기준 통과한 항목:

- `app.js` syntax
- social common syntax
- Avalon / Secret Hitler / ONUW module syntax
- v11.4.26 game-polish regression
- 1인플 save/abandon regression
- social deduction static regression
- v11.4.27 merge regression 35 checks
- PowerGrid Germany V32 referenced-file coherence

중요 검증 항목 예:

- 프라코로 포켓몬 이름/V5 setup 유지
- 사무라이 이름/map v2 유지
- Pokemon Minima 배포 파일 삭제 유지
- 엘도라도 20+ columns, 봉쇄선 4개 이상
- Quacks 1~34 트랙, bag composition
- Mandom turn order/pending draw/first-failure state
- 사무라이 2/3/4인 좌표 중복 없음 + 슬롯 21/30/39
- PWA install button
- 4-column catalog
- Alpha/Beta tags
- Social cancel RPC/table/UI
- PowerGrid V32 Germany map

저장소 포함 테스트 중 확인 가능한 파일:

- `tests/social_deduction_static_test.cjs`
- `test_solo_save_v26.py`
- `test_solo_save_v27.py`

새 변경 후에는 최소한 수정된 HTML의 JS syntax + 위 관련 회귀를 다시 확인한다.

---

## 11. 다음 수정에서 절대 롤백하면 안 되는 체크리스트

새 GPT는 수정 완료 전에 아래를 검색/검증한다.

- [ ] `프라코로 포켓몬` 표시명 유지
- [ ] `사무라이` 표시명 유지 (`사무라이 PVP`로 되돌리지 않음)
- [ ] Pokemon Minima/Pocketnova UI 파일이 다시 생기지 않음
- [ ] `pocketnova` legacy DB key는 기존 데이터 호환용으로 유지
- [ ] El Dorado 장거리 맵 + 명시적 봉쇄선 유지
- [ ] Quacks 1~34 track + bag inventory 유지
- [ ] Mandom 합의 순서 + draw-then-decide + pass/challenger 흐름 유지
- [ ] Samurai map v2 유지
- [ ] PowerGrid Germany V32 관련 파일 보존
- [ ] 상단 우측 PWA install 버튼 유지
- [ ] 게임 목록 desktop 4열 compact 유지
- [ ] Alpha/Beta 분류 유지
- [ ] Avalon/Secret Hitler/ONUW unanimous cancel 유지
- [ ] solo save/abandon 유지
- [ ] `boardmate_social_action(text,uuid,jsonb)` 정확한 시그니처 유지
- [ ] `SUPABASE_REPAIR_ALL_GAMES_Vxx.sql`과 Verify를 같이 갱신
- [ ] `sw.js` cache version bump

---

## 12. 알려진 보완 필요 영역 / 다음 우선순위

### 높은 우선순위

1. **ALPHA 3종 실제 플레이테스트**
   - 사무라이 맵/배치/게임 종료
   - 엘도라도 맵 길이와 봉쇄선 체감
   - 돌팔이 약장수 공식 냄비 트랙/루비/점수/구매력 수치

2. **돌팔이 약장수 공식 룰 정밀화**
   - 현재 일부 점수/루비 위치가 근사치
   - 쥐 마커/점쟁이 카드 미구현

3. **맨덤 비밀정보 서버 분리**
   - 현재 UI 비공개지만 공용 state 안에는 정보 존재
   - 필요 시 private RPC/view 구조로 개선

### 중간 우선순위

4. BETA 게임 실제 사용성 검증
   - Air, Land & Sea
   - Cascadia

5. 소셜 취소 UX 실제 다기기 검증
   - 한 명 동의/철회
   - 전원 동의
   - 방 종료 후 승패 미제출 확인

6. PWA 설치 UX iOS/Android/desktop 차이 확인

---

## 13. 버전 관리 관례

현재 흐름:

- v11.4.24: 신규 게임 통합
- v11.4.25: 1인플 저장/포기
- v11.4.26: game polish 및 별도 status/cancel branch
- v11.4.27: 두 v11.4.26 branch 병합

다음 변경은 예: `v11.4.28`처럼 새 번호로 올리는 것이 안전하다.

새 릴리스마다 권장 산출물:

- `BoardMate_Arena_V11_4_XX_<NAME>_FULL.zip`
- 필요하면 이전 버전 기준 PATCH zip
- `README_V11_4_XX_....md`
- `UPLOAD_TO_GITHUB_VXX.md`
- DB 변경 시 `SUPABASE_REPAIR_ALL_GAMES_VXX.sql`
- DB 변경 시 `SUPABASE_VERIFY_ALL_GAMES_VXX.sql`
- `VALIDATION_V11_4_XX.txt`

---

## 14. 새 대화에 같이 업로드하면 좋은 파일

최소:

1. `README_HANDOFF_BOARDMATE_ARENA_V11_4_27.md` (이 파일)
2. `BoardMate_Arena_V11_4_27_MERGED_FULL.zip`

DB 작업까지 시킬 경우 추가:

3. `SUPABASE_REPAIR_ALL_GAMES_V27.sql`
4. `SUPABASE_VERIFY_ALL_GAMES_V27.sql`
5. `VALIDATION_V11_4_27.txt`

GitHub 배포 작업이면:

6. `UPLOAD_TO_GITHUB_V27.md`

---

## 15. 새 GPT에게 보낼 첫 메시지 예시

다음 문장을 그대로 사용해도 된다.

> 이 README가 BoardMate Arena 프로젝트의 현재 인수인계 문서야. `BoardMate_Arena_V11_4_27_MERGED_FULL.zip`을 현재 기준 소스로 사용해줘. 이전 v26 브랜치로 롤백하지 말고, README의 “절대 롤백하면 안 되는 체크리스트”를 유지하면서 수정해줘. 먼저 현재 GitHub `board-mate/arena`와 Pages 배포 상태를 확인하고, 요청한 수정 후 기존 v27 기능 회귀검사까지 해줘. DB 변경이 있으면 통합 Repair/Verify SQL도 새 버전으로 같이 만들어줘.

---

## 16. 최종 핵심 요약

**현재 기준은 v11.4.27 MERGED다.**

이 버전은 단순 v26 한 가지가 아니라:

- 게임 개선 패치
- 게임 상태/취소 패치
- PWA 설치 버튼
- compact 4-column catalog
- Stable/Alpha/Beta 분류
- social unanimous cancellation
- solo save/abandon
- PowerGrid Germany V32
- Fantasy/Werewolf/Supabase repair 역사

를 합친 상태다.

다음 GPT의 가장 중요한 임무는 **새 기능을 추가하면서 이 병합 상태를 유지하는 것**이다.
