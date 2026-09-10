# BoardMate Arena v11.4.49 — App Icon Update

## 변경 사항

- 사용자가 제공한 `bm.png` BoardMate 로고를 현재 앱 아이콘으로 적용.
- `icons/icon-192.png`, `icons/icon-512.png`: 일반 PWA 아이콘(`purpose: any`).
- `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png`: Android 등 maskable 아이콘. 로고가 원형/둥근 사각 마스크에서 잘리지 않도록 안전 여백과 앱 배경색을 적용.
- `icons/apple-touch-icon.png`: iOS 홈 화면 아이콘.
- `icons/favicon-32.png`: 브라우저 탭 아이콘.
- `icons/boardmate-logo-source.png`: 사용자가 제공한 원본 자산 보존.
- `manifest.webmanifest`에서 `any`와 `maskable` 아이콘을 분리.
- `index.html`에 favicon/Apple Touch Icon 링크 추가.
- 서비스워커 캐시를 `boardmate-shell-v11.4.49`로 갱신.

## 호환성 / 롤백

게임 상태, Supabase 스키마, 개별 게임 로직은 변경하지 않음. 문제가 있으면 v11.4.48 태그/커밋 또는 기존 아이콘 파일과 manifest/index/sw 변경만 되돌리면 됨.
