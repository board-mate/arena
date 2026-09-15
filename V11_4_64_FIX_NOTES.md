# BoardMate Arena v11.4.64 ALPHA

## 수정 1 — 내 차례 배너
- 중앙 배치 → 우측 상단 고정
- `pointer-events:none` 제거
- 클릭 가능 버튼으로 변경
- 내 차례가 1건이면 해당 게임으로 직접 이동
- 2건 이상이면 다인플 목록으로 이동
- 현재 이미 해당 게임 화면이면 클릭 시 화면 상단으로 이동
- 메인 화면뿐 아니라 `multi-common.js`를 사용하는 게임 화면에도 동일 적용

## 수정 2 — 게임 취소 SQL
- 잘못된 `m.nickname` 참조 제거
- `boardmate_room_members m` → `boardmate_profiles p` JOIN 후 `p.nickname` 사용
- 기존 취소 지원 게임 목록을 축소하지 않고 유지
- Eldorado 및 Planet X, Fantasy Realms Greek 포함

## 적용
1. 웹 파일 덮어쓰기
2. Supabase SQL Editor에서 `database/SUPABASE_CANCEL_NICKNAME_FIX_V11_4_64.sql` 1회 실행
3. 브라우저 강력 새로고침 또는 캐시 복구

상태 등급은 계속 ALPHA입니다.
