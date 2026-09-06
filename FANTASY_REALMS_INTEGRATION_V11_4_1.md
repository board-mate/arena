# BoardMate Arcade v11.4.1 — 판타지 왕국 다인플 통합

## 추가된 파일
- `online-fantasy-realms.html` — 판타지 왕국 3~6인 실시간 PvP

## 사이트 통합
- `app.js`의 다인플 페이지에 `🏰 판타지 왕국 · 실시간 3~6인` 바로가기 추가
- 게임 정보에 `fantasyrealms: 3~6인` 추가

## 연결 방식
판타지 왕국은 현재 제공된 원본의 PeerJS/WebRTC 방 구조를 그대로 사용합니다.
- 별도 Supabase 테이블/RPC 필요 없음
- 방장은 `fantasy-realms-{방코드}` Peer ID를 사용
- 참가자는 방 코드로 방장에게 WebRTC 연결
- 방장 브라우저가 게임 상태와 턴을 권위적으로 처리

## 배포
1. ZIP 압축 해제
2. 기존 GitHub Pages 저장소 파일에 덮어쓰기
3. GitHub Pages 배포 완료 후 `#/multi` → 판타지 왕국 → 게임 열기
4. 2대 이상의 브라우저/기기로 테스트

## 주의
판타지 왕국은 현재 BoardMate Supabase 다인플 방 목록과 독립되어 있습니다. 따라서 중앙 방 목록의 `＋ 방 만들기`에서 생성하는 방에는 포함하지 않았습니다. 게임 자체의 방 만들기/참가 화면을 통해 3~6명이 방 코드로 입장합니다.

Supabase SQL 추가 작업은 없습니다.
