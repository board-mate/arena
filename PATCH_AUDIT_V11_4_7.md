# v11.4.7 패치 적용 감사 결과

기준일: 2026-09-06

## 결론

현재 공개 `board-mate/arena`의 `main`은 이미 **BoardMate Arcade FINAL v11.4.7** 상태입니다.
따라서 이번 통합본은 `arena-main.zip`에 v11.4.7 패치를 다시 억지로 중첩하는 배포가 아니라,
**v11.4.7을 기준선으로 재구성한 뒤 캘리코 모바일 보드 맞춤과 포크노바 v11.7을 추가**한 후속 통합본입니다.

## 업로드 파일 비교

`arena-main.zip` 대비 `BoardMate_Arcade_FINAL_V11_4_7_FANTASY_UNIFIED.zip`:

- 추가된 주요 파일
  - `SUPABASE_REALTIME_V11_4.sql`
  - `SUPABASE_FANTASY_REALMS_UNIFIED.sql`
  - `online-fantasy-realms.html`
  - 캘리코 V4~V8 변경 문서
  - v11.4 Realtime / Fantasy 통합 문서
- 변경된 주요 파일
  - `app.js`
  - `multi-common.js`
  - 온라인 게임 wrapper 7종
  - `online-calico.html`
  - `online-pocketnova.html`
  - `supabase.sql`
- 패치 ZIP에 없는 기존 자산
  - `pensterdam_board.jpg`
  - `pensterdam_play.jpg`
  - 이는 패치 ZIP이 **독립 전체본이 아니라 overlay**라는 뜻이며, 통합본에서는 기존 파일을 보존했습니다.

## 확인된 v11.4.7 기능

### Realtime
`multi-common.js`에 아래 구조가 존재합니다.

- `boardmate:room:<room id>` Broadcast channel
- event `state_changed`
- payload에는 `revision`만 전송
- 실제 state는 membership-protected RPC로 다시 로드
- 기본 fallback polling 10초

### 판타지 왕국
- `app.js` 게임 목록에 `fantasyrealms`, 3~6인 등록
- `online-fantasy-realms.html` 존재
- `SUPABASE_FANTASY_REALMS_UNIFIED.sql` 존재
- public state와 private hand state를 분리하는 RPC 존재

### 캘리코 V8
- 4개 보드 × 22개 = **88개 정적 인쇄 가장자리 데이터** 확인
- `repair-invalid-cat-tokens` 기존 게임 자동 정정 코드 확인

## 발견한 패치 ZIP 주의점

업로드된 `BoardMate_Arcade_FINAL_V11_4_7_FANTASY_UNIFIED.zip`의 `config.js`는:

```js
supabaseUrl: "",
supabaseAnonKey: ""
```

로 비어 있습니다.

이 파일을 원본 위에 그대로 덮으면 온라인 BoardMate 연결이 꺼질 수 있습니다.
현재 공개 GitHub의 `config.js`에는 운영 중인 Supabase URL과 anon publishable key가 유지되어 있습니다.
이번 통합본도 **현재 설정을 보존**했습니다.

> `service_role` 키는 절대로 GitHub/브라우저 JS에 넣지 마세요.
