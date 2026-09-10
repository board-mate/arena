# v11.4.44 GitHub Pages 배포

## v11.4.43에서 패치
GitHub 저장소에 아래 파일을 덮어씁니다.

- `online-planetx.html`
- `index.html`
- `sw.js`

그 다음 Supabase SQL Editor에서 `SUPABASE_PLANETX_PRIVATE_SHEET_V4.sql`을 한 번 실행합니다.

## 전체 교체
전체 ZIP의 내용을 저장소 루트에 덮어쓴 뒤, 같은 SQL 파일을 Supabase SQL Editor에서 실행합니다.

## 주의
v11.4.42에서 바로 업데이트하면서 `SUPABASE_PLANETX_THEORY_SAME_SECTOR_FIX_V3.sql`을 실행한 적이 없다면 해당 SQL도 함께 실행하세요.
