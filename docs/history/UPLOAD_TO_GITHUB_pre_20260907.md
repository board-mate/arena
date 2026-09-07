# GitHub 업로드 방법

대상 저장소: `https://github.com/board-mate/arena`

## 권장: Git 사용

이 ZIP을 푼 뒤 통합본 폴더 안에서 기존 저장소에 파일을 복사하거나,
기존 repo root를 이 통합본 내용으로 갱신합니다.

```bash
git checkout -b integrated-v11.4.8
# 통합본 파일/폴더를 repo root에 덮어쓰기
git add -A
git commit -m "BoardMate v11.4.8: Calico mobile fit + Porknova v11.7"
git push -u origin integrated-v11.4.8
```

브랜치에서 확인 후 `main`으로 merge하는 방식을 권장합니다.

바로 main에 올릴 경우:

```bash
git add -A
git commit -m "BoardMate v11.4.8: Calico mobile fit + Porknova v11.7"
git push origin main
```

## GitHub 웹에서 올리는 경우

1. ZIP을 먼저 PC에서 압축 해제합니다.
2. ZIP 파일 자체를 저장소에 올리지 말고 **통합본 내부 파일/폴더**를 repo root에 업로드합니다.
3. 기존 파일 덮어쓰기를 확인합니다.
4. Pages 배포 완료를 기다립니다.

## 배포 후 확인 URL

- 메인: `https://board-mate.github.io/arena/index.html#/`
- 캘리코: 메인 → 다인플 → 새 캘리코 방
- 포크노바: 메인 → 다인플 → 새 포크노바 방
- 포크노바 단독 UI 확인: `/arena/pocketnova/index.html`

## 캐시 주의

GitHub Pages가 새 파일을 배포한 직후 브라우저 캐시에 이전 HTML/JS가 남을 수 있습니다.

- PC Chrome: `Ctrl + F5`
- 모바일 Chrome: 사이트 데이터/캐시 삭제 후 재접속 또는 새 시크릿 탭

## 배포 후 최소 E2E

### 캘리코
- 모바일 세로폭 320~430px에서 보드 전체가 좌우 스크롤 없이 보이는지
- 보드의 빈 육각 칸 터치가 되는지
- 시장 선택 → 턴 종료 동작
- 2브라우저 Realtime 반영
- 회전(세로↔가로) 후 보드가 다시 맞춰지는지

### 포크노바
- 새 방에서 v11.7 이미지 레이어가 로드되는지
- 상대 브라우저와 state 동기화되는지
- 기존 v3 state kind `pocketnova-v3-boardmate` 유지 확인
- 포크노바는 아직 rules-complete가 아니므로 룰 정확성 완주 테스트는 별도 진행

### 판타지 왕국
- 3인 이상 방 생성
- 참가자 손패가 다른 참가자 public state에 노출되지 않는지
- 새로고침 후 private hand 복구
