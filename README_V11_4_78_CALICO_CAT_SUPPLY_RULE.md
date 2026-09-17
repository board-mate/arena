# BoardMate Arena V11.4.78 · Calico cat supply rule

이번 패치는 사용자가 확인한 캘리코 규칙을 현재 GitHub `main`(실제 `HANDOFF_VERSION.txt` = `11.4.75`)에 최소 변경으로 반영한 것입니다.

## 사용자 요청

특정 고양이 실물 토큰이 모두 소진되어도 해당 고양이 점수 타일 뒷면의 고양이 토큰을 대체품으로 사용하므로, 조건을 만족한 고양이는 계속 획득할 수 있어야 합니다.

## 변경 파일

- `online-calico.html`
- `tests/calico-rule-audit.test.cjs`
- `README_V11_4_78_CALICO_CAT_SUPPLY_RULE.md`

## 적용한 내용

- 고양이 실물 구성물 수량을 공식 목록에 맞췄습니다: 밀리 12, 캘리 10, 티빗 10, 루미 8, 코코넛 8, 테콜로테 8, 시라(Cira) 6, 아몬드 6, 기네비어(그웬) 6, 레오 6. 합계 80개입니다.
- 재고가 0인 고양이도 합법적인 무늬 그룹이면 획득 후보로 만듭니다.
- 대체 토큰을 놓을 때 재고가 음수가 되지 않도록 0에서 유지합니다. 보드에 놓인 고양이 토큰과 점수는 정상적으로 기록됩니다.
- 저장된 진행 중 방을 다시 열거나 토큰 재검사를 해도 재고 0 때문에 후보가 사라지지 않습니다.
- 함께 확인된 디자인 목표 점수 오기도 수정했습니다: `AAA-BBB` 한 조건 8점, `AA-BB-C-D` 양 조건 8점.

## ZIP에 포함하지 않은 문서 지시

전달된 V11.4.76 문서에는 President Maker를 추가하라는 내용이 있지만, 최신 인수인계 문서의 사용자 결정은 President Maker 대기입니다. V11.4.77에는 Coldwater Crown과 Supabase SQL이 포함되어 있으나 이번 요청과 무관하고 현재 `main`에 적용됐다는 근거가 없어 병합하지 않았습니다. 두 ZIP의 캘리코 파일에는 재고 0 차단 조건이 남아 있어 그대로 덮어쓰지 않았습니다.

## 규칙 근거

- [AEG/Flatout 공식 Calico 규칙서](https://www.alderac.com/wp-content/uploads/2025/02/Calico_Rulebook.pdf): 고양이 실물 토큰이 소진되면 점수 타일 뒷면 토큰을 사용한다는 안내, 디자인 목표 점수표.
- [BoardGameGeek Calico 구성물 목록](https://boardgamegeek.com/boardgame/283155/calico/wiki): 고양이 토큰 종류별 80개 구성.

## 검증

- `node tests/calico-rule-audit.test.cjs` 통과(3개).
- 캘리코 inline JavaScript와 `app.js` `node --check` 통과.
- 로컬 브라우저에서 설정 → 디자인 타일 → 게임 시작 흐름 확인.
- 시작 화면에서 수정된 목표 점수 `8 / 13`, `5 / 8` 표시 확인.
- 브라우저 콘솔 오류/경고 없음.

Supabase SQL 변경 없음 · 신규 이미지 자산 0개 · 기존 상태 스키마 유지.
