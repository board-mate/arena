# BoardMate v11.4.10 — Power Grid Germany β v3 직접 적용본

이 ZIP은 **BoardMate Arena v11.4.8에 v11.4.9를 먼저 설치하지 않고 바로 적용**하는 인수인계/배포 패키지입니다.

## 기준

- 출발점: `BoardMate_Arena_INTEGRATED_V11_4_8_CALICO_MOBILE_PORKNOVA_V11_7`
- v11.4.9 선행 설치: **필요 없음**
- 도착점: BoardMate v11.4.10 / Power Grid Germany β v3
- 파워그리드: **2~6인 온라인 다인플 전용**
- 활성 지도: **독일만**
- 1인플 / AI / 핫시트: 범위 밖

현재 상태:

```text
MULTIPLAYER_ONLY
GERMANY_AUTO_GRAPH_BETA
PLAYABLE_BETA_AFTER_SUPABASE_MIGRATION
RULE_AUDIT_PENDING
ONLINE_E2E_UNVERIFIED
```

## 적용 순서

1. 현재 GitHub Desktop의 `arena` 저장소가 v11.4.8 기준인지 확인합니다.
2. 이 ZIP은 **repo root-ready**입니다. 압축을 푼 폴더의 내용물을 GitHub Desktop의 `arena` 저장소 루트에 그대로 덮어씁니다.

3. Supabase SQL Editor에서 **처음 한 번만** 실행합니다.

```text
SUPABASE_POWERGRID_UNIFIED.sql
```

4. 이어서 확인합니다.

```text
SUPABASE_VERIFY_POWERGRID.sql
```

5. 로컬 검증:

```bash
node tests/powergrid_germany_v3_test.cjs
python tests/verify_integrated_release.py
python tests/verify_powergrid_direct_install.py
```

6. GitHub Desktop에서 Commit → Push origin.

## 적용 후 플레이 경로

```text
BoardMate 홈
→ 다인플 · 온라인 방
→ 파워그리드 독일 β
→ 방 생성
→ 2~6명 입장
→ 방장이 독일 지역 선택
→ 독일맵 게임 시작
```

독일 지도는 42개 도시 / 83개 연결비 그래프를 내장하고 있어 도시 건설 시 연결비가 자동 계산됩니다.

## 매우 중요

- 이 패치는 `config.js`를 포함하지 않습니다. 현재 정상 동작 중인 Supabase URL/anon key를 그대로 보존합니다.
- v11.4.9 ZIP은 설치하지 않아도 됩니다.
- 현재 Germany graph 및 v2에서 상속한 일부 공식 규칙 수치는 전수 감사가 남아 있으므로 `RULES_COMPLETE`는 아닙니다.
- 실제 2~6브라우저 E2E가 끝나기 전까지 완성판으로 표시하지 마세요.

다음 개발자는 `POWERGRID_GERMANY_V3_HANDOFF.md`와 `POWERGRID_NEXT_AI_PROMPT.md`를 먼저 읽으세요.
