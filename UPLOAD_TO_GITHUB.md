# BoardMate Arena FINAL — GitHub 업로드 방법

대상: `https://github.com/board-mate/arena`

## 가장 안전한 방법

현재 저장소를 백업 브랜치로 남긴 뒤 최종본으로 교체하세요.

```bash
git checkout -b backup-before-20260907
git push -u origin backup-before-20260907
git checkout main
# 이 최종본의 내용물 전체로 repo root 갱신
git add -A
git commit -m "BoardMate: Pokemon Minima + social deduction games"
git push origin main
```

GitHub 웹 UI만 사용할 경우에도 가능합니다.

1. 이 ZIP을 PC에서 풉니다.
2. 기존 저장소 파일을 삭제합니다. 백업 브랜치를 먼저 만들어 두는 것을 권장합니다.
3. 압축을 푼 `BoardMate_Arena_FINAL_20260907` 폴더 **안의 내용물 전체**를 저장소 root에 올립니다.
4. ZIP 자체를 저장소에 넣지는 않습니다.
5. Pages 배포 완료 후 `Ctrl+F5` 또는 새 시크릿 탭으로 확인합니다.

## 중요: 포크노바 관련

구 `pocketnova/`, `online-pocketnova.html`, `solo-pocketnova.html`은 최종본에 없습니다.
SQL과 `app.js`에 남은 `pocketnova`는 **포켓몬 미니마의 내부 호환 ID**이므로 지우지 마세요.

## Supabase

소셜 3종을 처음 배포하는 경우 SQL Editor에서 순서대로 실행:

1. `SUPABASE_SOCIAL_DEDUCTION_V1.sql`
2. `SUPABASE_VERIFY_SOCIAL_DEDUCTION.sql`

기존 파워그리드가 정상이라면 `SUPABASE_POWERGRID_UNIFIED.sql`을 다시 실행할 필요는 없습니다.

## 배포 후 빠른 확인

- 홈/1인플에 `포켓몬 미니마` 표시
- 다인플 방 생성에서 포켓몬 미니마 `2명부터 · 최대 2명`
- 아발론 / 시크릿 히틀러 / 한밤의 늑대인간 방 생성 카드 표시
- 포켓몬 미니마 2인 새 방 생성 및 드래프트
- 기존 캘리코/캐스캐디아/판타지 왕국/파워그리드 페이지 정상 진입
