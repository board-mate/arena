# v11.4.49 GitHub 배포

필수 변경 파일:

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `HANDOFF_VERSION.txt`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-maskable-192.png`
- `icons/icon-maskable-512.png`
- `icons/apple-touch-icon.png`
- `icons/favicon-32.png`
- `icons/boardmate-logo-source.png`

배포 후 브라우저는 새 서비스워커 캐시를 사용한다. 이미 설치된 PWA의 홈 화면 아이콘은 OS 캐시 때문에 즉시 바뀌지 않을 수 있으며, 그런 경우 앱 삭제 후 다시 설치하면 확실하게 반영된다.
