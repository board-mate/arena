# BoardMate Arena · Power Grid v22 patch

적용 기준: `board-mate/arena` main의 Power Grid v20 파일 구조 (`online-powergrid.html` + `powergrid/{engine.js,ui.js,pg-styles.css}`).

## 변경 사항

1. **Undo 추가/보강**
   - 상단에 `↩ 되돌리기` 버튼 추가.
   - 이 브라우저에서 성공한 본인 액션 상태만 최대 10개 보관.
   - 다른 플레이어/기기에서 revision이 바뀌면 Undo 히스토리를 초기화하여 타인의 액션을 되감지 않음.
   - revision 충돌 시 서버 최신 상태를 다시 불러옴.
   - 게임 종료 후에는 결과 제출과 충돌하지 않도록 Undo 비활성화.

2. **전력 공급 도시 수 기본값**
   - 관료 단계에서 `공급할 도시 개수`의 기본값을 `0`이 아니라 **현재 내가 보유한 도시 수**로 표시.
   - 발전소 선택/자원/발전 용량이 부족하면 기존 검증 로직대로 확정 버튼이 비활성화되므로 숫자를 낮춰 조정 가능.

3. **모바일 숫자 증감 버튼**
   - 숫자 입력 좌우에 `▼` / `▲` 버튼 추가.
   - 모바일에서 44px 터치 영역 제공.
   - 0과 내 도시 수 한계에서 버튼 자동 비활성화.
   - `inputmode="numeric"`, `step="1"` 적용.

4. **미국 지도 실제 보드 데이터 교정**
   - **42개 도시 / 87개 연결**.
   - 보라, 청록, 노랑, 빨강, 갈색, 초록의 실제 6개 색상 권역으로 재배치.
   - 실제 연결비(0 포함)를 `EDGES`에 반영.

5. **한국 지도 실제 보드 데이터 교정**
   - **42개 도시 / 81개 연결**.
   - 분홍, 빨강, 보라, 갈색, 초록, 노랑의 실제 6개 색상 권역으로 재배치.
   - 북한 도시를 포함한 실제 한국판 도시 세트와 연결비 반영.
   - 북부/남부 자원시장 메타데이터를 도시별 `market` 값으로 보존.
   - 제주 연결은 실제 보드대로 **나주–제주 19**.

6. **기존 USA/Korea 진행방 안전 처리**
   - `MAP_DATA_REV = powergrid-map-v22-physical` 추가.
   - v20/v21 USA/Korea 상태는 도시 ID/그래프가 다르므로 기존 진행방을 그대로 섞지 않고 새 게임 설정 화면으로 유도.
   - 독일 진행방은 기존 상태를 계속 사용할 수 있음.

7. **캐시 무효화**
   - Power Grid CSS/JS 쿼리 버전을 `v=22`로 갱신.

## 데이터 검증

`tests/powergrid_v22_static_test.cjs`에서 다음을 검사합니다.

- 미국 42 도시 / 87 연결, 한국 42 도시 / 81 연결
- 중복 연결/끊어진 도시 ID 없음
- 대표 연결비: Seattle–Portland 3, Cheyenne–Denver 0, New York–Philadelphia 0, 나주–제주 19, 서울–고양 0 등
- 한국 북부시장 15도시 / 남부시장 27도시 메타데이터
- 2~6인 기본 권역 선택의 연결성
- 전력 공급 기본값/모바일 화살표/Undo/cache-bust 정적 검사

실행:

```bash
node tests/powergrid_v22_static_test.cjs
```

## 배포

패치 ZIP을 저장소 루트에 덮어쓰거나, 함께 제공되는 unified diff를 적용한 뒤 커밋하면 됩니다.

```bash
node tests/powergrid_v22_static_test.cjs
git add online-powergrid.html powergrid/engine.js powergrid/ui.js powergrid/pg-styles.css tests/powergrid_v22_static_test.cjs POWERGRID_V22_*.md
git commit -m "fix(powergrid): undo, mobile power input, exact USA/Korea maps"
git push
```

GitHub Pages가 main에서 배포 중이면 push 후 캐시가 갱신되면 `?v=22` 파일이 로드됩니다.
