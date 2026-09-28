# v11.4.82 — Instagram 최신 피드 자동 표시

## 변경

- 홈에서 `https://www.instagram.com/board__mate/embed/` 공개 프로필 피드를 표시합니다.
- 프로필 피드의 첫 항목이 최신 공개 게시물이며, 새 글이 올라오면 Instagram 쪽 피드가 갱신됩니다.
- `config.js`에서 게시물 주소를 고치는 절차를 없앴습니다. Instagram 로그인 토큰이나 DB 설정도 필요하지 않습니다.
- 피드 안의 카드/사진을 누르거나 하단 링크로 Instagram을 열 수 있습니다.

## 확인 및 제한

- Instagram 프로필 embed를 직접 열어 최신 게시물이 앞에 표시되는 것을 확인했습니다.
- 로컬 BoardMate 홈 iframe은 현재 미리보기 환경에서 빈 화면으로 관찰됩니다. 외부 iframe 차단 여부는 HTTPS GitHub Pages 배포 화면에서 최종 확인해야 합니다.
- 신규 SQL/RPC 없음. 외부 배포는 하지 않았습니다.
