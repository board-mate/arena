# 08. 주요 결정 기록

## D1. v11.x 이미지 기능은 game state와 분리

이유: 이미지 매핑 오류나 개인 설정이 멀티플레이 동기화/룰 결과를 오염시키지 않게 하기 위해.

결과: localStorage + BroadcastChannel. Supabase payload 비포함.

## D2. 이미지 자동 매핑은 보수적으로

우선순위:

1. 사용자 명시 매핑
2. 사용자가 auto off한 카드 제외
3. 검증 builtin mapping
4. exact name
5. 동물 OCR unique/fuzzy-safe match
6. 애매하면 미연결

잘못된 이미지를 보여주는 것보다 텍스트 카드만 보여주는 것이 낫다.

## D3. 원본과 v3 룰이 다르면 이미지에 맞춰 룰을 자동 수정하지 않음

`source-card-audit.js`에 mismatch를 남기고 후속 검증 대상으로 둔다.

## D4. core source 전체 덮어쓰기 대신 fail-closed patcher

이유: public repo가 움직이는 상황에서 오래된 `state.js`/`engine.js` 전체 복사본으로 다른 수정까지 날리는 것을 방지.

## D5. 다우징 머신 이미지는 core fix gate 뒤에서만 자동 연결

이미지가 보여주는 규칙과 실제 계산이 다르면 플레이어가 UI를 신뢰할 수 없기 때문.

## D6. F13/F15 map image 번호

게임 맵 id가 F13/F15라고 해서 webp 파일이 `map_13`/`map_15`는 아니다. 원본 자료의 해당 지도는 추출 순서상 `map_01.webp`, `map_02.webp`로 연결된다.

## D7. 현재 기준 commit pin

2026-09-06 public repo 기준 `73b0537eed516dc845e781cac7f41715dae2fb09`를 v11.7 재현 base로 고정한다. 이후 main 변경은 별도 merge 대상으로 취급한다.
