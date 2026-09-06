# Power Grid Germany β v3 — v11.4.8에서 바로 적용

현재 기준은 **BoardMate Arena v11.4.10 / Power Grid Germany β v3**입니다.

## 선행 버전

**BoardMate Arena integrated v11.4.8이면 충분합니다. v11.4.9는 설치하지 않아도 됩니다.**

이 overlay 안에는 v11.4.9에서 처음 추가됐던 파워그리드 필수 파일(발전소 42장 이미지/엔진/UI/공통 Room 통합 SQL)과 v11.4.10 독일맵 자동 그래프 파일을 모두 포함합니다.

## 방향

- 파워그리드는 **2~6인 온라인 다인플 전용**입니다.
- 1인플/AI/핫시트 진입점은 추가하지 않습니다.
- 지도는 **독일만 활성화**합니다.
- 독일 42개 도시 / 83개 연결비 그래프로 건설 연결비를 자동 계산합니다.
- 미국/한국은 이후 단계에서 독일맵 검증이 끝난 뒤 추가합니다.

## v11.4.8 repo에 적용

1. overlay 파일을 arena 저장소 루트에 덮어씁니다.
2. `solo-powergrid.html` / `tests/powergrid_v2_test.cjs`가 혹시 남아 있다면 삭제합니다. v11.4.8에는 원래 없으므로 대부분 아무 작업도 하지 않습니다.
3. Supabase에서 `SUPABASE_POWERGRID_UNIFIED.sql`을 1회 실행합니다.
4. `SUPABASE_VERIFY_POWERGRID.sql`을 실행해 전부 true인지 확인합니다.
5. 테스트:

```bash
node tests/powergrid_germany_v3_test.cjs
python tests/verify_integrated_release.py
python tests/verify_powergrid_direct_install.py
```

## 기존 v11.4.9에 적용해도 되는가?

예. overlay는 v11.4.9에도 덮어쓸 수 있습니다. 다만 이 패키지의 핵심 목적은 **v11.4.8 → v11.4.10 직접 업그레이드**입니다.

## Supabase

v11.4.8 DB에는 Power Grid game id/RPC 지원이 없으므로 `SUPABASE_POWERGRID_UNIFIED.sql`이 필수입니다.
새 파워그리드 전용 테이블은 만들지 않으며 기존 `boardmate_room_state`를 사용합니다.

## 기존 진행 중 Power Grid β v2 방

v3는 state kind를 `powergrid-v3-germany-boardmate`로 사용합니다. v2 상태를 자동 변환하지 않습니다.
온라인 페이지에서 v2 상태를 감지하면 방장이 새 독일맵 게임을 시작해 같은 방 state를 v3로 재초기화합니다.
