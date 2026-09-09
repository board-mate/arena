# BoardMate Arena v11.4.38 배포 순서

## 1. GitHub 파일 덮어쓰기

`BoardMate_Arena_V11_4_38_PLANETX_UI_PATCH.zip`의 내용물을 저장소 루트에 덮어씁니다.

주요 변경 파일:

- `online-planetx.html`
- `SUPABASE_PLANETX_PVP_V1.sql`
- `SUPABASE_PLANETX_RESEARCH_TOPICS_V2.sql`
- `sw.js`
- `index.html`

## 2. 기존 Supabase 설치라면 SQL 1회 실행

Supabase SQL Editor에서:

`SUPABASE_PLANETX_RESEARCH_TOPICS_V2.sql`

을 실행합니다.

이 SQL은 연구 A–F의 **주제 제목만** 참가자에게 제공하는 RPC를 추가합니다. 숨은 규칙/정답 보드는 반환하지 않습니다.

## 3. GitHub Pages 배포 후 새로고침

- Service Worker: `boardmate-shell-v11.4.38`
- `index.html`: `app.js?v=38`

배포 후 브라우저에서 강력 새로고침을 1회 권장합니다.

## 확인 포인트

1. 행성 X 주제 조사 창에서 `A · [천체 제목]` 형태로 보이는지
2. 표준 기록지에서 혜성 버튼이 2,3,5,7,11에만 보이는지
3. 전문가에서는 13,17도 추가되는지
4. 태양계 상단에 원형 12/18 섹터가 보이는지
5. `1↔7`(표준), `1↔10`(전문가)처럼 정반대 번호가 맞는지
6. 기존 가설/타임 트랙/플레이어 색상 기능이 그대로 동작하는지
