# BoardMate Arena v11.4.10 — Power Grid Germany β v3

Direct base: **BoardMate Arena integrated v11.4.8**  
v11.4.9 prerequisite: **NO**

## 직접 적용 패키지에 포함된 것

v11.4.9에서 처음 추가됐던 파워그리드 필수 기반과 v11.4.10 독일맵 개발분을 한 번에 포함합니다.

- BoardMate 게임 선택에 `파워그리드 독일 β` 2~6인 추가
- 공통 Room / `boardmate_room_state` 사용
- Realtime revision-only Broadcast + 10초 polling fallback
- 발전소 카드 42장 이미지/수치 데이터
- Step 3 카드 이미지
- 파워그리드 엔진/UI/CSS
- Power Grid Supabase 공통방 migration
- 1인/AI/핫시트 미제공
- 독일맵만 활성화
- 독일 42도시 / 83연결 가중 그래프
- 인원수에 따라 3/3/4/5/5개 지역 선택
- 선택 지역 연결성 자동 검증
- Dijkstra 기반 최저 연결비 자동 계산
- 선택하지 않은 지역은 건설/경로 경유에서 제외
- 실제 독일 보드 이미지 위 도시 마커 + 모바일 도시 목록
- v2 상태 감지 시 방장 v3 재초기화
- `germany_map_debug.html` 및 edge audit CSV

## 상태

`MULTIPLAYER_ONLY / GERMANY_AUTO_GRAPH_BETA / PLAYABLE_BETA_AFTER_SUPABASE_MIGRATION / RULE_AUDIT_PENDING / ONLINE_E2E_UNVERIFIED`

## 아직 완료로 간주하지 않는 이유

Germany graph는 공개 network dataset에서 가져와 사용자 제공 보드 이미지에 맞춰 구현했지만 83개 edge/cost의 최종 전수 시각 검증이 남아 있습니다.
또 발전소 초기 세팅, 인원별 카드 제거, Step 2/3 시장 처리, 자원 보충/종료 조건 및 관료 단계의 공식 규칙 전수 감사가 필요합니다.
