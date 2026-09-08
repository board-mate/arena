# BoardMate Arena v11.4.25 솔로 저장/포기 업데이트

이 패키지는 사용자가 업로드한 **v11.4.23 GAME UPDATES FULL**을 베이스로 하고, 이전 v11.4.21에서 추가한 신규 게임 6종과 Supabase RPC/카탈로그 수정을 병합한 배포본입니다.

## 보존된 v11.4.23 업데이트
- 소셜 추리 3종: 만장일치 게임 취소 UI
- 판타지 왕국: 능력 설정 중 자신의 손패 미리보기
- 포켓몬 미니마: 카드/도감 이미지 및 기존 중복 선언 수정
- 프라코로: V4 게임 업데이트
- 노터치 크라켄: 라운드/게임 종료 오버레이
- 시크릿 히틀러: 인원별 파시스트 트랙 효과 표시

## 함께 유지되는 신규 게임
다인플: 돌팔이 약장수, 맨덤의 던전, 사무라이 PVP, 엘도라도, 에어 랜드 & 씨

1인플: 커피 로스터

## Supabase 적용 순서
1. `SUPABASE_PLAKORO_PVP_V4.sql` 실행
2. **`SUPABASE_REPAIR_ALL_GAMES_V24.sql`을 마지막으로 실행**
3. `SUPABASE_VERIFY_ALL_GAMES_V24.sql` 실행
4. 모든 `ok`가 `true`인지 확인

`social action RPC exists`의 올바른 함수 시그니처는 **`boardmate_social_action(text,uuid,jsonb)`** 입니다. 이전에 사용된 4인자 검사는 잘못된 검사입니다.

통합본의 `SUPABASE_SOCIAL_DEDUCTION_V1.sql`, `SUPABASE_FANTASY_REALMS_UNIFIED.sql`, `SUPABASE_POWERGRID_UNIFIED.sql`, `SUPABASE_BOARDMATE_GAME_CATALOG_V2.sql`도 18개 다인플 게임 목록을 유지하도록 정리했기 때문에, 개별 SQL을 나중에 다시 실행해도 신규 게임 카탈로그를 과거 목록으로 축소하지 않습니다.

자세한 배포 순서는 `UPLOAD_TO_GITHUB_V24.md`를 확인하세요.

---

# BoardMate Arena — app.js Power Grid merge

Base: latest known v11.4.16 DIRECT_RESUME app.js.

Merged only the Power Grid-specific change from the user-supplied app.js:
- Power Grid display name: `파워그리드`
- Player count: minimum 3, maximum 6
- Entry page remains `online-powergrid.html`

Other unrelated differences in the supplied app.js were intentionally not copied, so the latest BoardMate app features remain intact (Pokemon Minima replacement, Fantasy Realms, direct resume, home UI, etc.).

Replace the repository-root `app.js` with this file.
Supabase SQL is not changed by this app.js-only merge.


## v11.4.25 추가
- 자체 1인플 게임에 공통 `💾 저장` / `🏳 게임 포기` UI 추가
- 커피 로스터 진행 상태 localStorage 자동 저장/복원 추가
- 포켓몬 미니마 솔로 진행 상태 localStorage 자동 저장/복원 추가
- Acquire/에친스톤/마스크맨/The Game의 기존 저장 기능을 공통 UI와 연결
- 게임 포기 시 해당 게임의 저장 데이터를 삭제하고 초기 상태로 복귀
- 캘리코/캐스캐디아는 외부 도메인 iframe이므로 저장은 외부 사이트 자체 기능에 따름
