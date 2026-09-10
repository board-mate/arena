# v11.4.48 GitHub 업로드

현재 배포본 위에 아래 파일을 덮어쓰면 됩니다.

- `index.html`
- `app.js`
- `styles.css`
- `online-calico.html`
- `multi-common.js`
- `sw.js`
- `HANDOFF_VERSION.txt`

`solo-etchinstone.html`은 기존 파일 내용이 그대로지만, 패치 ZIP에도 함께 넣어 누락된 배포에서 복구할 수 있게 했습니다.

추가 Supabase SQL 실행은 필요하지 않습니다. 배포 후 현재 진행 중인 Calico 방에서 **새 방을 만들지 말고** 페이지를 한 번 새로고침한 뒤 계속 플레이하면 됩니다. 기존 방 상태는 호환 로더가 그대로 이어받습니다.
