# BoardMate Arcade — 진짜 간단 설치법

이 버전은 **npm / 터미널 / 빌드가 전혀 필요 없습니다.**
파일을 GitHub에 올리면 바로 사이트가 뜹니다.

## 1) 먼저 그냥 사이트부터 올리기

1. GitHub 로그인
2. 새 저장소(repository) 만들기. 예: `boardmate-games`
3. 이 폴더 안의 파일을 **전부** 업로드
4. 저장소에서 `Settings` → `Pages`
5. `Build and deployment`에서 `Deploy from a branch`
6. Branch는 `main`, Folder는 `/ (root)` 선택 후 Save
7. 잠시 뒤 `https://내아이디.github.io/boardmate-games/` 같은 주소가 생김

이 상태에서도 게임은 전부 됩니다.
단, 아직은 각 사람의 기록이 **자기 브라우저에만** 저장됩니다.

---

## 2) 모임원 100명이 같은 순위표를 보게 만들기

GitHub Pages는 파일만 보여주는 서비스라서, 점수를 저장할 DB 하나가 필요합니다.
무료 Supabase를 한 번만 연결하면 됩니다.

1. https://supabase.com 에서 무료 프로젝트 생성
2. 왼쪽 `SQL Editor` → `New query`
3. 이 폴더의 `supabase.sql` 내용을 전부 복사해서 붙여넣기 → `Run`
4. Supabase의 `Project Settings` → `API`에서 아래 2개를 복사
   - Project URL
   - anon / publishable key
5. 이 폴더의 `config.js`를 메모장으로 열기
6. 아래처럼 붙여넣기

```js
window.BOARDMATE_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "여기에_키"
};
```

7. 수정한 `config.js`를 GitHub에 다시 업로드하고 기존 파일 덮어쓰기
8. 끝. 이제 모든 모임원이 같은 순위표를 봅니다.

※ `anon/publishable key`는 웹사이트에 넣는 공개용 키라서 여기에 넣는 것이 정상입니다. `service_role` 키는 절대 넣지 마세요.

---

## 들어 있는 기능

- 모임명: **보드메이트 / BoardMate**
- 모임 링크: Instagram / 소모임 / 마플샵
- 리코셰: 매일 문제, 무제한 재도전, 도전 초기화, 보드의 로봇 직접 선택, 방향 버튼/키보드 방향키 조작, 오늘 순위
- 펜토미노: 실제 캘린더형 7×9 보드, 오늘의 월/일/요일 3칸을 비우고 12 펜토미노 타일로 채우기, 타일 모양/색상 표시, 기준 칸(흰 점) 배치 방식, 도전 초기화, 최초 클리어 시각 순위
- Yahtzee: 13라운드, Hold, 3회 굴림, Upper Bonus, Yahtzee Bonus, Forced Joker, 올타임 순위
- 각 순위표 홈 TOP 5 + 더보기
- Yahtzee 종료 팝업에 예상 등수 표시

## 수정할 곳

- 모임 링크: `app.js` 맨 위 `LINKS`
- Supabase: `config.js`
- 색/디자인: `styles.css`

## 중요

이 간단 버전은 모임원끼리 사용하는 것을 전제로 점수 제출값을 신뢰합니다.
누군가 개발자도구로 억지로 API를 조작하는 것까지 막으려면 나중에 서버 검증을 추가하면 됩니다.

## 이번 수정 반영

- 리코셰의 `출제 조건` 표시는 화면에서 숨겼습니다.
- 리코셰 로봇은 오른쪽 색 버튼뿐 아니라 보드 위 로봇을 직접 눌러 선택할 수 있습니다.
- `펜스테르담` 표시는 `펜토미노`로 바꿨습니다. 단, 기존 Supabase 데이터와 호환되도록 내부 게임 키는 `pensterdam`을 그대로 사용합니다.
- 캘린더의 날씨 아이콘 4칸은 빈 칸으로 표시됩니다.
- 펜토미노 타일 선택부는 알파벳 대신 실제 모양과 색으로 표시됩니다.
- 타일 미리보기의 흰 점이 기준 칸이며, 보드에서 클릭한 칸과 흰 점 칸이 맞춰져 배치됩니다. 기준 칸은 항상 타일 내부 칸입니다.
