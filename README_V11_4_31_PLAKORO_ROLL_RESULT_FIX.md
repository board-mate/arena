# BoardMate Arena v11.4.31 — 프라코로 대전 주사위 결과 수정

기준: v11.4.30

## 원인

`boardmate_plakoro_take_action(...)`은 Supabase/PostgREST에서 `RETURNS TABLE` RPC입니다.
따라서 대기 액션이 1건이어도 브라우저에는 다음처럼 **배열**로 반환됩니다.

```js
[{ seat: 0, action: 'ROLL', payload: {...}, nonce: ... }]
```

기존 `online-plakoro.html`의 `drainSeat()`은 반환값을 객체로 보고 `a.action`을 읽었습니다.
실제 `a`는 배열이므로 `a.action`은 `undefined`가 되고, DB에서 꺼낸 `ROLL` 액션은 처리되지 않은 채 사라졌습니다.
그 결과 기술을 선택하고 주사위 굴리기를 눌러도 캐릭코로/에너지 코로 결과, 데미지, 턴 진행이 전혀 나오지 않았습니다.

## 수정

- `boardmate_plakoro_take_action` 반환값을 배열/단일 객체 양쪽 모두 안전하게 처리합니다.
- 반환된 각 액션의 실제 `seat`를 이용해 `hostAction()`을 호출합니다.
- 액션 처리 중 예외가 나면 상단 연결 상태에 `액션 처리 오류 · 재시도`를 표시합니다.
- 프라코로 내부 상태 버전을 `6`으로 올렸습니다.
- 서비스워커 캐시를 `boardmate-shell-v11.4.31`로 올렸습니다.
- v11.4.30의 `캐릭코로` / `에너지 코로` 명칭 및 에너지 면 중복 제거 수정은 그대로 포함합니다.

## Supabase

추가 SQL은 필요 없습니다.
이미 `SUPABASE_PLAKORO_PVP_V6.sql`이 적용되어 있으면 그대로 사용하면 됩니다.

## 최소 배포 파일

- `online-plakoro.html`
- `sw.js`

GitHub Pages 배포 후 두 플레이어 모두 강력 새로고침(Ctrl+Shift+R)을 권장합니다.
