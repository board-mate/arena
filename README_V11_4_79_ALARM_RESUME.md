# BoardMate Arena v11.4.79 · 알림 복귀 안정화

v11.4.78 Calico 규칙 패치를 포함한 현재 기준본에, 인수인계 P1 알림 복귀 안정화 작업을 이어서 반영했습니다.

## 변경 사항

- `alarm.js`의 방 목록/단일 방 알림 판정을 직렬화해 초기 로드와 복귀 이벤트가 겹쳐도 동일 알림이 중복 발송되지 않도록 했습니다.
- `multi-common.js`의 단일 방 watcher가 진행 중 요청을 버리지 않고 복귀 신호를 한 번 큐에 넣습니다.
- 숨겨진 탭에서는 polling timer를 멈추고, `visibilitychange`, `focus`, `pageshow`, `resume`, `online` 복귀 시 즉시 재확인합니다.
- 홈의 진행 중 게임과 다인플 방 목록도 같은 방식으로 복귀 직후 갱신하며, 오래 걸린 요청이 최신 화면을 덮어쓰지 않도록 직렬화했습니다.
- `app.js`, `multi-common.js`, `sw.js`, `index.html`의 캐시 버전을 `11.4.79`로 올렸습니다.
- 기존 DB/RPC와 진행 중 방 상태 형식은 변경하지 않았습니다.

## 검증

- `node tests/alarm-resume.test.cjs` 통과.
- `node tests/calico-rule-audit.test.cjs` 통과.
- `alarm.js`, `app.js`, `multi-common.js`, `sw.js`와 Calico inline JavaScript 구문 검사 통과.
- 로컬 브라우저에서 홈/다인플 화면의 복귀 이벤트 연결과 기존 Calico 시작 흐름을 확인했습니다.

완전히 종료된 브라우저에서도 동작하는 서버 Web Push는 별도 subscription 저장 및 발송 서버가 필요하므로 현재 범위에 포함하지 않았습니다.
