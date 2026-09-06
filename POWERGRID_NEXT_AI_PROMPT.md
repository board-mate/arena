# 다음 AI/개발자에게 그대로 전달할 프롬프트

BoardMate Arena 파워그리드 개발을 이어서 해줘.

기준은 이 handoff ZIP의 `repo-overlay`이며 현재 버전은 BoardMate v11.4.10 / Power Grid Germany β v3야.
**이 패키지는 BoardMate v11.4.8에서 v11.4.9를 거치지 않고 직접 적용되도록 검증된 기준본**이야.

중요한 방향:
- 파워그리드는 1인/AI/핫시트를 만들지 않는다. 2~6인 온라인 다인플만 개발한다.
- 독일맵을 먼저 완성하기 전까지 미국/한국 runtime을 활성화하지 않는다.
- 현재 독일 데이터는 42도시/83연결이며 source-imported + visual-audit-pending 상태다.
- `powergrid/tools/germany_map_debug.html`과 `audit/POWERGRID_GERMANY_EDGE_AUDIT.csv`를 사용해서 사용자 제공 Germany 보드 이미지와 83개 연결비를 전수 검증한다.
- 검증되지 않은 연결비/룰 수치를 추측해서 확정하지 않는다.
- BoardMate 공통 `boardmate_room_state`, Realtime revision-only Broadcast, 10초 polling fallback 구조를 유지한다.
- `powergrid-v3-germany-boardmate` state kind를 현재 기준으로 사용한다.
- v2에서 상속한 발전소 덱 초기 세팅, 인원별 카드 제거, Step2/3, 자원 보충, 종료 조건을 원본 룰과 전수 감사한다.
- 현재 관료 단계는 자동 정산 방식이므로, 공식 규칙상 필요한 발전소/연료 선택 자유도가 누락되는지 반드시 감사한다.
- 실제 2~6인 브라우저 E2E가 끝날 때까지 PLAYABLE_COMPLETE/RULES_COMPLETE로 표시하지 않는다.

먼저 `00_READ_ME_FIRST.md`, `repo-overlay/POWERGRID_GERMANY_V3_HANDOFF.md`, `DEVELOPMENT_STATE.json`, `DIRECT_FROM_V11_4_8_VALIDATION.md`를 읽고 현재 테스트를 실행한 다음 이어서 수정해라.
