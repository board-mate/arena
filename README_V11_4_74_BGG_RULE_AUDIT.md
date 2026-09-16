# BoardMate Arena V11.4.74 — BGG Rule Audit 1차

기준: V11.4.73

BoardGameGeek 게임 정보/규칙 토론과 현재 BoardMate 구현을 대조해, **확실히 수정 가능한 부분만** 반영한 안전 패치입니다.
사용자가 제공한 이미지 및 BGG 이미지는 분석 참고용으로만 사용했으며 새 PNG/JPG/WebP assets는 추가하지 않았습니다.

## 이번에 실제 수정한 게임

### 판타지 왕국 / 판타지 왕국: 그리스의 전설들
- BGG 공식 플레이 인원에 맞춰 3–6인 → **2–6인**으로 수정.
- 기존 손패 7장 / 드로우·버리기 흐름은 그대로 유지.

### Project L
- 현재 BoardMate 구현은 기본판의 단일 흰/검정 퍼즐 행 방식입니다.
- 공식 5–6인 게임은 **Line Clear**(양쪽에 두 번째 행 + 마커 + 동시 진행) 규칙이 필요하므로, 잘못된 5인 순차 플레이를 허용하지 않도록 **2–4인**으로 임시 제한.
- 5인 Line Clear를 제대로 구현할 때 다시 5인 지원을 엽니다.

### 사무라이
- 플레이어 타일 20장의 구성을 원 규칙에 맞게 정리:
  - 세 세력 2/3/4 = 9장
  - 사무라이 1/1/2/2/3 = 5장
  - 로닌 1 = 1장
  - 함선 1/1/2 = 3장
  - 조각교환 = 1장
  - 타일교환 = 1장
- 빠른 타일(侍): 로닌 + 함선 3장 + 조각교환으로 수정.
- 타일교환은 일반 타일로 취급해 턴당 일반 타일 제한을 적용.
- **조각교환 버그 수정:** 도시 전체 조각 묶음을 통째로 교환하던 구현을 폐기하고, 각 위치에서 조각 1개씩 정확히 선택해 교환하도록 변경.
- 교환 후 한 도시에 같은 종류의 조각이 중복되는 경우 차단.
- 특수 타일을 손패에서 눌러도 `__special__` 가상 칸 검증에서 막혀 효과가 시작되지 않던 공통 버그 수정. 조각교환/타일교환은 이제 손패 클릭 즉시 선택 단계가 시작됩니다.
- `ronin1b` 내부 ID는 기존 저장 상태 호환을 위해 유지하지만 의미는 두 번째 사무라이2로 교정.

### 맨덤의 던전
- 횃불 설명에는 오크가 포함되어 있었지만 판정 코드가 공격력 `< 3`이라 오크(3)를 막지 못하던 모순 수정.
- 횃불을 **공격력 3 이하** 몬스터 무력화로 통일.

## 조사했지만 이번에는 변경하지 않은 게임

### Acquire
BGG는 2–6인으로 표기하지만 2인용은 판본별/공식 변형에서 합병 시 뱅커 개입 등 별도 규칙이 존재합니다. 현재 BoardMate에는 이를 구현하지 않았으므로 단순히 최소 인원을 2로 낮추지 않았습니다. 현재 3–6인 유지.

### Maskmen
BGG는 2–6인으로 표기하지만 현재 BoardMate의 2인 배분/점수 처리를 별도로 검증하지 못했으므로 3–6인 유지.

### Power Grid
BGG 공식 표기는 2–6인이지만 BoardMate 프로젝트에서는 사용자 요청에 따라 **3–6인 유지**.

### Avalon / Secret Hitler / One Night Werewolf / Air, Land & Sea / El Dorado / Pan Am / Calico / Cascadia / The Game
현재 BoardMate의 멀티플레이 인원 범위와 BGG 기본 정보 사이에 즉시 고쳐야 할 확실한 충돌을 찾지 못해 이번 패치에서 유지했습니다.

## 포함 파일
- app.js
- index.html
- sw.js
- HANDOFF_VERSION.txt
- online-fantasy-realms.html
- online-fantasy-realms-greek.html
- online-projectl.html
- online-samurai.html
- online-mandom.html
- SUPABASE_BGG_RULE_AUDIT_V1.sql
- README_V11_4_74_BGG_RULE_AUDIT.md

## 적용 순서
1. Supabase SQL Editor에서 `SUPABASE_BGG_RULE_AUDIT_V1.sql` 실행.
2. 나머지 변경 파일을 저장소 루트에 덮어쓰기.
3. GitHub Pages 배포 후 강력 새로고침.

## 중요
이번 패치는 BGG에서 확인 가능한 정보 중 현재 코드와 충돌이 명확하고 안전하게 고칠 수 있는 부분만 수정했습니다.
BGG의 사진/파일을 사이트 asset으로 복제하지 않았습니다.
