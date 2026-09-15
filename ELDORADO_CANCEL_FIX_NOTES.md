# BoardMate Arena v11.4.63 ALPHA — 엘도라도 게임 취소 수정

## 수정 내용
- `online-eldorado.html` 상단에 **게임 취소** 버튼을 명시적으로 추가했습니다.
- 기존 `multi-common.js`의 **참가자 전원 동의 취소 투표** UI를 그대로 사용합니다.
- 엘도라도는 방장 단독 강제 종료가 아니라, 기존 BoardMate 규칙과 동일하게 **참가자 전원이 동의하면 취소**됩니다.
- 취소된 게임은 승패/ELO에 반영되지 않습니다.
- `app.js`가 종료된 엘도라도 방을 다시 열었을 때 취소 여부를 RPC로 확인하도록 수정했습니다.
- `multi-common.js` import 쿼리를 `v=11.4.63`으로 올려 브라우저가 예전 캐시를 계속 쓰는 문제를 피했습니다.
- `index.html`, `sw.js`의 캐시 버전도 11.4.63으로 올렸습니다.

## Supabase 필수 작업
기존 DB에는 취소 RPC의 지원 게임 목록에 `eldorado`가 없기 때문에 HTML만 교체하면 버튼은 보여도 투표가 실패합니다.
Supabase SQL Editor에서 다음 파일을 1회 실행하세요.

`database/SUPABASE_ELDORADO_CANCEL_FIX_V11_4_63.sql`

전체 `SUPABASE_CURRENT_UPDATE.sql`을 새로 적용하는 설치라면 마지막에 동일한 최종 override가 포함되어 있습니다.

## 유지 사항
- ALPHA 유지
- 기존 프리셋 맵 유지
- 사용자 조립 맵 유지
- 기존 카드/이동/시장/봉쇄선/승리판정 유지
- 기존 방 상태 저장 구조 유지
